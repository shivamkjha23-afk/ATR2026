const STORAGE_KEYS = {
  db: 'atr2026_db_cache',
  sessionUser: 'atr2026_session_user',
  cloudConfig: 'atr2026_cloud_config',
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

function getCloudConfig() {
  const cfg = JSON.parse(localStorage.getItem(STORAGE_KEYS.cloudConfig) || '{}');
  return {
    enabled: Boolean(cfg.enabled),
    jsonbinBinId: (cfg.jsonbinBinId || '').trim(),
    jsonbinApiKey: (cfg.jsonbinApiKey || '').trim()
  };
}

function setCloudConfig(config) {
  const next = {
    enabled: Boolean(config.enabled),
    jsonbinBinId: (config.jsonbinBinId || '').trim(),
    jsonbinApiKey: (config.jsonbinApiKey || '').trim()
  };
  localStorage.setItem(STORAGE_KEYS.cloudConfig, JSON.stringify(next));
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

function saveImageDataAtPath(path, base64Data) {
  const db = readDB();
  db.images[path] = base64Data;
  saveDB(db);
  return path;
}

function saveImageData(fileName, base64Data) {
  return saveImageDataAtPath(`images/${generateId('IMG')}-${fileName}`, base64Data);
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

function ensureDefaultAdmin(db) {
  if (!db.users.some((u) => u.username === 'shivam.jha')) {
    db.users.push(withAudit({
      id: generateId('USR'),
      username: 'shivam.jha',
      password: 'admin@123',
      role: 'admin',
      approved: true,
      request_date: nowStamp().slice(0, 10),
      approved_by: 'system'
    }));
  }
}

async function initializeData() {
  const existing = readDB();
  if (existing.users.length || existing.inspections.length || existing.observations.length || existing.requisitions.length) return;
  const db = structuredClone(DB_TEMPLATE);
  ensureDefaultAdmin(db);
  saveDB(db);
}

function buildDatabaseFilesPayload() {
  const db = readDB();
  return {
    inspections: db.inspections || [],
    observations: db.observations || [],
    requisitions: db.requisitions || [],
    users: db.users || [],
    images: db.images || {},
    _meta: db._meta || { last_updated: nowStamp() }
  };
}

function downloadTextFile(fileName, content) {
  const blob = new Blob([content], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function jsonbinApiUrl(binId) {
  return `https://api.jsonbin.io/v3/b/${binId}`;
}

async function syncAllToCloud(config = getCloudConfig()) {
  if (!config.enabled) return;
  if (!config.jsonbinBinId || !config.jsonbinApiKey) throw new Error('Missing JSONBin Bin ID or API Key.');

  const payload = buildDatabaseFilesPayload();
  const res = await fetch(jsonbinApiUrl(config.jsonbinBinId), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': config.jsonbinApiKey,
      'X-Bin-Versioning': 'false'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`JSONBin sync failed: ${err}`);
  }

  setSyncStatus({ ok: true, message: 'JSONBin auto-sync success.' });
}

async function pullCloudToLocalIfNewer(config = getCloudConfig()) {
  if (!config.enabled || !config.jsonbinBinId || !config.jsonbinApiKey) return;
  const res = await fetch(`${jsonbinApiUrl(config.jsonbinBinId)}/latest`, {
    headers: { 'X-Master-Key': config.jsonbinApiKey }
  });
  if (!res.ok) return;

  const body = await res.json();
  const remote = body.record || null;
  if (!remote || !remote._meta) return;

  const local = readDB();
  const remoteTime = new Date(remote._meta.last_updated || 0).getTime();
  const localTime = new Date(local._meta?.last_updated || 0).getTime();
  if (remoteTime > localTime) {
    suppressSync = true;
    localStorage.setItem(STORAGE_KEYS.db, JSON.stringify(remote));
    suppressSync = false;
    window.dispatchEvent(new CustomEvent('atr-db-updated'));
    setSyncStatus({ ok: true, message: 'Pulled latest data from JSONBin.' });
  }
}

function scheduleAutoSync() {
  const config = getCloudConfig();
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

function startRealtimeSync() {
  if (realtimeStarted) return;
  realtimeStarted = true;
  const poll = () => pullCloudToLocalIfNewer().catch(() => {});
  poll();
  setInterval(poll, 12000);
}
