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
  images: {},
  _meta: { last_updated: '' }
};

let syncInFlight = false;
let syncPending = false;
let suppressSync = false;
let realtimeStarted = false;

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

function sanitizeName(value) {
  return String(value || 'entry').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'entry';
}

function getSessionUser() {
  return localStorage.getItem(STORAGE_KEYS.sessionUser) || '';
}

function getSyncConfig() {
  const config = JSON.parse(localStorage.getItem(STORAGE_KEYS.syncConfig) || '{}');
  return {
    enabled: Boolean(config.enabled),
    provider: config.provider || 'firebase',
    owner: config.owner || '',
    repo: config.repo || '',
    branch: config.branch || 'main',
    token: config.token || '',
    firebaseUrl: config.firebaseUrl || '',
    firebaseToken: config.firebaseToken || ''
  };
}

function setSyncConfig(config) {
  const next = {
    enabled: Boolean(config.enabled),
    provider: config.provider || 'firebase',
    owner: (config.owner || '').trim(),
    repo: (config.repo || '').trim(),
    branch: (config.branch || 'main').trim() || 'main',
    token: (config.token || '').trim(),
    firebaseUrl: (config.firebaseUrl || '').trim(),
    firebaseToken: (config.firebaseToken || '').trim()
  };
  localStorage.setItem(STORAGE_KEYS.syncConfig, JSON.stringify(next));
}

function setSyncStatus(status) {
  localStorage.setItem(STORAGE_KEYS.syncStatus, JSON.stringify({ ...status, timestamp: nowStamp() }));
  window.dispatchEvent(new CustomEvent('atr-sync-status', { detail: status }));
}

function readDB() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.db) || 'null') || structuredClone(DB_TEMPLATE);
}

function saveDB(db) {
  db._meta = db._meta || {};
  db._meta.last_updated = nowStamp();
  localStorage.setItem(STORAGE_KEYS.db, JSON.stringify(db));
  if (!suppressSync) scheduleAutoSync();
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
  if (idx >= 0) rows[idx] = withAudit({ ...rows[idx], ...payload, id: rows[idx].id }, true);
  else rows.push(withAudit({ ...payload, id: payload.id || generateId(prefix) }));
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
  const users = getCollection('users').map((u) => (u.username === username ? withAudit({ ...u, approved: true, approved_by: approvedBy }, true) : u));
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

function buildDatabaseFilesPayload() {
  const db = readDB();
  const files = {
    'data/inspections.json': JSON.stringify(db.inspections || [], null, 2),
    'data/users.json': JSON.stringify(db.users || [], null, 2),
    'data/observations.json': JSON.stringify(db.observations || [], null, 2),
    'data/requisitions.json': JSON.stringify(db.requisitions || [], null, 2)
  };
  Object.entries(db.images || {}).forEach(([path, dataUrl]) => { files[path] = dataUrl; });
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
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` };

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

function firebaseDbUrl(config) {
  const root = (config.firebaseUrl || '').replace(/\/$/, '');
  if (!root) return '';
  const auth = config.firebaseToken ? `?auth=${encodeURIComponent(config.firebaseToken)}` : '';
  return `${root}/atr2026_db.json${auth}`;
}

async function syncToFirebase(config) {
  const url = firebaseDbUrl(config);
  if (!url) throw new Error('Missing Firebase URL in sync settings.');
  const db = readDB();
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(db)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firebase sync failed: ${err}`);
  }
}

async function fetchFromFirebase(config) {
  const url = firebaseDbUrl(config);
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function syncAllToCloud(config = getSyncConfig()) {
  if (!config.enabled) return;

  if (config.provider === 'github') {
    const { owner, repo, branch, token } = config;
    if (!owner || !repo || !token) throw new Error('Missing GitHub sync configuration.');
    const files = buildDatabaseFilesPayload();
    let count = 0;
    for (const [path, content] of Object.entries(files)) {
      const contentBase64 = content.startsWith('data:') ? (content.split(',')[1] || '') : toBase64Utf8(content);
      await githubUpsertFile({ owner, repo, branch, token, path, contentBase64, message: `auto-sync ${path}` });
      count += 1;
    }
    setSyncStatus({ ok: true, message: `GitHub auto-sync success (${count} files)` });
    return;
  }

  if (config.provider === 'firebase') {
    await syncToFirebase(config);
    setSyncStatus({ ok: true, message: 'Firebase auto-sync success' });
    return;
  }

  throw new Error(`Unknown sync provider: ${config.provider}`);
}

function scheduleAutoSync() {
  const config = getSyncConfig();
  if (!config.enabled) return;

  if (syncInFlight) {
    syncPending = true;
    return;
  }

  syncInFlight = true;
  syncAllToCloud(config)
    .catch((err) => setSyncStatus({ ok: false, message: err.message }))
    .finally(() => {
      syncInFlight = false;
      if (syncPending) {
        syncPending = false;
        scheduleAutoSync();
      }
    });
}

async function pullCloudToLocalIfNewer(config = getSyncConfig()) {
  if (!config.enabled || config.provider !== 'firebase') return;
  const remote = await fetchFromFirebase(config);
  if (!remote || !remote._meta) return;

  const local = readDB();
  const remoteTime = new Date(remote._meta.last_updated || 0).getTime();
  const localTime = new Date(local._meta?.last_updated || 0).getTime();

  if (remoteTime > localTime) {
    suppressSync = true;
    localStorage.setItem(STORAGE_KEYS.db, JSON.stringify(remote));
    suppressSync = false;
    window.dispatchEvent(new CustomEvent('atr-db-updated'));
    setSyncStatus({ ok: true, message: 'Pulled newer cloud data from Firebase' });
  }
}

function startRealtimeSync() {
  if (realtimeStarted) return;
  realtimeStarted = true;
  const poll = () => pullCloudToLocalIfNewer().catch(() => {});
  poll();
  setInterval(poll, 12000);
}
