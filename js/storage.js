const STORAGE_KEYS = {
  db: 'atr2026_db',
  sessionUser: 'atr2026_session_user',
  syncConfig: 'atr2026_sync_config',
  syncStatus: 'atr2026_sync_status'
};

const DB_TEMPLATE = {
  inspections: [],
  observations: [],
  requisitions: [],
  users: [],
  images: {}
};

let syncInFlight = false;
let syncPending = false;

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function generateId(prefix = 'REC') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowStamp() {
  return new Date().toISOString();
}

function getSessionUser() {
  return localStorage.getItem(STORAGE_KEYS.sessionUser) || '';
}

function getSyncConfig() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.syncConfig) || '{"enabled":false}') || { enabled: false };
}

function setSyncConfig(config) {
  const next = {
    enabled: Boolean(config.enabled),
    owner: (config.owner || '').trim(),
    repo: (config.repo || '').trim(),
    branch: (config.branch || 'main').trim() || 'main',
    token: (config.token || '').trim()
  };
  localStorage.setItem(STORAGE_KEYS.syncConfig, JSON.stringify(next));
}

function setSyncStatus(status) {
  localStorage.setItem(STORAGE_KEYS.syncStatus, JSON.stringify({ ...status, timestamp: nowStamp() }));
  window.dispatchEvent(new CustomEvent('atr-sync-status', { detail: status }));
}

function saveDB(db) {
  localStorage.setItem(STORAGE_KEYS.db, JSON.stringify(db));
  scheduleAutoSync();
}

function readDB() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.db) || 'null') || structuredClone(DB_TEMPLATE);
}

function withAudit(record, isUpdate = false) {
  const user = getSessionUser() || 'system';
  const stamp = nowStamp();
  const next = { ...record, timestamp: stamp };
  if (!isUpdate && !next.entered_by) next.entered_by = user;
  next.updated_by = user;
  return next;
}

function saveCollection(name, rows) {
  const db = readDB();
  db[name] = rows;
  saveDB(db);
}

function getCollection(name) {
  return readDB()[name] || [];
}

function upsertById(name, payload, prefix) {
  const rows = getCollection(name);
  const idx = rows.findIndex((r) => r.id === payload.id && payload.id);
  if (idx >= 0) {
    rows[idx] = withAudit({ ...rows[idx], ...payload, id: rows[idx].id }, true);
  } else {
    rows.push(withAudit({ ...payload, id: payload.id || generateId(prefix) }));
  }
  saveCollection(name, rows);
}

function deleteById(name, id) {
  const rows = getCollection(name).filter((r) => r.id !== id);
  saveCollection(name, rows);
}

function saveImageData(fileName, base64Data) {
  const db = readDB();
  const imagePath = `data/images/${generateId('IMG')}-${fileName}`;
  db.images[imagePath] = base64Data;
  saveDB(db);
  return imagePath;
}

function saveImageDataAtPath(path, base64Data) {
  const db = readDB();
  db.images[path] = base64Data;
  saveDB(db);
  return path;
}

function getImageData(path) {
  return (readDB().images || {})[path] || '';
}

function getUser(username) {
  return getCollection('users').find((u) => u.username === username);
}

function requestAccess(user) {
  const users = getCollection('users');
  users.push(withAudit(user));
  saveCollection('users', users);
}

function approveUser(username, approvedBy = 'shivam.jha') {
  const users = getCollection('users').map((u) => (u.username === username
    ? withAudit({ ...u, approved: true, approved_by: approvedBy }, true)
    : u));
  saveCollection('users', users);
}

async function initializeData() {
  if (localStorage.getItem(STORAGE_KEYS.db)) return;

  const [inspections, users, observations, requisitions] = await Promise.all([
    loadJSON('./data/inspections.json'),
    loadJSON('./data/users.json'),
    loadJSON('./data/observations.json').catch(() => []),
    loadJSON('./data/requisitions.json').catch(() => [])
  ]);

  const db = structuredClone(DB_TEMPLATE);
  db.inspections = inspections.map((r) => withAudit({ ...r, id: r.id || generateId('INSP') }));
  db.users = users.map((u) => withAudit(u));
  db.observations = observations.map((o) => withAudit({ ...o, id: o.id || generateId('OBS') }));
  db.requisitions = requisitions.map((r) => withAudit({ ...r, id: r.id || generateId('REQ') }));
  saveDB(db);
}

function toBase64Utf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function sanitizeName(value) {
  return String(value || 'entry').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'entry';
}

function buildDatabaseFilesPayload() {
  const db = readDB();
  const files = {
    'data/inspections.json': JSON.stringify(db.inspections || [], null, 2),
    'data/users.json': JSON.stringify(db.users || [], null, 2),
    'data/observations.json': JSON.stringify(db.observations || [], null, 2),
    'data/requisitions.json': JSON.stringify(db.requisitions || [], null, 2)
  };

  Object.entries(db.images || {}).forEach(([path, dataUrl]) => {
    files[path] = dataUrl;
  });

  return files;
}

function downloadTextFile(filePath, content) {
  const blob = new Blob([content], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filePath.split('/').pop();
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function githubUpsertFile({ owner, repo, branch, token, path, contentBase64, message }) {
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`
  };

  let sha = '';
  const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, { headers });
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha || '';
  }

  const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: contentBase64, branch, ...(sha ? { sha } : {}) })
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`GitHub sync failed for ${path}: ${err}`);
  }
}

async function syncAllToGitHub(config = getSyncConfig()) {
  if (!config.enabled) return;
  const { owner, repo, branch, token } = config;
  if (!owner || !repo || !token) throw new Error('Missing GitHub sync configuration.');

  const files = buildDatabaseFilesPayload();
  let count = 0;
  for (const [path, content] of Object.entries(files)) {
    const contentBase64 = content.startsWith('data:') ? (content.split(',')[1] || '') : toBase64Utf8(content);
    await githubUpsertFile({ owner, repo, branch, token, path, contentBase64, message: `auto-sync ${path}` });
    count += 1;
  }
  setSyncStatus({ ok: true, message: `Auto sync success (${count} files)` });
}

function scheduleAutoSync() {
  const config = getSyncConfig();
  if (!config.enabled) return;

  if (syncInFlight) {
    syncPending = true;
    return;
  }

  syncInFlight = true;
  syncAllToGitHub(config)
    .catch((err) => setSyncStatus({ ok: false, message: err.message }))
    .finally(() => {
      syncInFlight = false;
      if (syncPending) {
        syncPending = false;
        scheduleAutoSync();
      }
    });
}
