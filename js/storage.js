const STORAGE_KEYS = {
  sessionUser: 'atr2026_session_user',
  cloudConfig: 'atr2026_cloud_config',
  syncStatus: 'atr2026_sync_status'
};

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDam8Q5xWNT5J7AfagEVWcC7TzT2LN8OHU',
  authDomain: 'atr2026-6541f.firebaseapp.com',
  projectId: 'atr2026-6541f',
  storageBucket: 'atr2026-6541f.firebasestorage.app',
  messagingSenderId: '121442875078',
  appId: '1:121442875078:web:741b5ffc315843352149c7',
  measurementId: 'G-8JY365XQXP'
};

const DB_TEMPLATE = {
  inspections: [],
  observations: [],
  requisitions: [],
  users: [],
  images: {},
  _meta: { last_updated: '' }
};

const RUNTIME_DOC_PATH = { collection: 'atr2026', id: 'runtime' };

let firebaseReady = false;
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;

let runtimeDB = structuredClone(DB_TEMPLATE);
let syncInFlight = false;
let syncPending = false;
let suppressSync = false;
let realtimeStarted = false;

function nowStamp() {
  return new Date().toISOString();
}

function generateId(prefix = 'REC') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeName(value) {
  return String(value || 'entry').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'entry';
}

function bootFirebase() {
  if (firebaseReady) return;
  if (!window.firebase) throw new Error('Firebase SDK not loaded.');
  firebaseApp = firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
  firebaseAuth = firebase.auth();
  firebaseDb = firebase.firestore();
  firebaseReady = true;
}

function runtimeDocRef() {
  bootFirebase();
  return firebaseDb.collection(RUNTIME_DOC_PATH.collection).doc(RUNTIME_DOC_PATH.id);
}

function getSessionUser() {
  return localStorage.getItem(STORAGE_KEYS.sessionUser) || '';
}

function getCloudConfig() {
  const cfg = JSON.parse(localStorage.getItem(STORAGE_KEYS.cloudConfig) || '{}');
  return {
    enabled: Boolean(cfg.enabled),
    cloudinaryCloudName: (cfg.cloudinaryCloudName || '').trim(),
    cloudinaryUploadPreset: (cfg.cloudinaryUploadPreset || '').trim()
  };
}

function setCloudConfig(config) {
  const next = {
    enabled: Boolean(config.enabled),
    cloudinaryCloudName: (config.cloudinaryCloudName || '').trim(),
    cloudinaryUploadPreset: (config.cloudinaryUploadPreset || '').trim()
  };
  localStorage.setItem(STORAGE_KEYS.cloudConfig, JSON.stringify(next));
}

function setSyncStatus(status) {
  localStorage.setItem(STORAGE_KEYS.syncStatus, JSON.stringify({ ...status, timestamp: nowStamp() }));
  window.dispatchEvent(new CustomEvent('atr-sync-status', { detail: status }));
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function readDB() {
  return clone(runtimeDB);
}

function saveDB(db) {
  runtimeDB = clone(db);
  runtimeDB._meta = runtimeDB._meta || {};
  runtimeDB._meta.last_updated = nowStamp();
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

async function uploadToCloudinary(fileName, dataUrl) {
  const cfg = getCloudConfig();
  if (!cfg.cloudinaryCloudName || !cfg.cloudinaryUploadPreset) {
    throw new Error('Cloudinary config missing. Fill Cloud Name and Upload Preset in Login > Cloud Sync Settings.');
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cfg.cloudinaryCloudName}/image/upload`;
  const form = new FormData();
  form.append('file', dataUrl);
  form.append('upload_preset', cfg.cloudinaryUploadPreset);
  form.append('public_id', sanitizeName(fileName.replace(/\.[^.]+$/, '')));

  const res = await fetch(endpoint, { method: 'POST', body: form });
  const body = await res.json();
  if (!res.ok || !body.secure_url) throw new Error(body.error?.message || 'Cloudinary upload failed.');
  return body.secure_url;
}

async function saveImageDataAtPath(path, base64Data) {
  const uploadedUrl = await uploadToCloudinary(path, base64Data);
  const db = readDB();
  db.images[path] = uploadedUrl;
  saveDB(db);
  return uploadedUrl;
}

async function saveImageData(fileName, base64Data) {
  return saveImageDataAtPath(`data/images/${generateId('IMG')}-${fileName}`, base64Data);
}

function getImageData(path) {
  const found = readDB().images?.[path];
  if (found) return found;
  if (/^https?:\/\//.test(path || '')) return path;
  return '';
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
  const users = getCollection('users').map((u) => (
    u.username === username ? withAudit({ ...u, approved: true, approved_by: approvedBy }, true) : u
  ));
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

function ensureRuntimeDefaults() {
  runtimeDB = clone({ ...DB_TEMPLATE, ...runtimeDB });
  ensureDefaultAdmin(runtimeDB);
  runtimeDB._meta = runtimeDB._meta || {};
  runtimeDB._meta.last_updated = runtimeDB._meta.last_updated || nowStamp();
}

ensureRuntimeDefaults();


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

async function initializeData() {
  ensureRuntimeDefaults();

  try {
    const ref = runtimeDocRef();
    const snap = await ref.get();

    if (snap.exists && snap.data()) {
      runtimeDB = clone({ ...DB_TEMPLATE, ...snap.data() });
      ensureRuntimeDefaults();
      return;
    }

    await ref.set(buildDatabaseFilesPayload(), { merge: false });
  } catch (err) {
    setSyncStatus({ ok: false, message: `Firebase init fallback: ${err.message}` });
    ensureRuntimeDefaults();
  }
}

async function syncAllToCloud(config = getCloudConfig()) {
  if (!config.enabled) return;
  await runtimeDocRef().set(buildDatabaseFilesPayload(), { merge: false });
  setSyncStatus({ ok: true, message: 'Firebase sync success.' });
}

async function pullCloudToLocalIfNewer(config = getCloudConfig()) {
  if (!config.enabled) return;
  const snap = await runtimeDocRef().get();
  if (!snap.exists || !snap.data()) return;

  const remote = snap.data();
  const local = readDB();
  const remoteTime = new Date(remote._meta?.last_updated || 0).getTime();
  const localTime = new Date(local._meta?.last_updated || 0).getTime();

  if (remoteTime > localTime) {
    suppressSync = true;
    runtimeDB = clone({ ...DB_TEMPLATE, ...remote });
    suppressSync = false;
    window.dispatchEvent(new CustomEvent('atr-db-updated'));
    setSyncStatus({ ok: true, message: 'Pulled latest data from Firebase.' });
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

  const config = getCloudConfig();
  if (!config.enabled) return;

  runtimeDocRef().onSnapshot((snap) => {
    if (!snap.exists || !snap.data()) return;
    const remote = snap.data();
    const local = readDB();
    const remoteTime = new Date(remote._meta?.last_updated || 0).getTime();
    const localTime = new Date(local._meta?.last_updated || 0).getTime();

    if (remoteTime > localTime) {
      suppressSync = true;
      runtimeDB = clone({ ...DB_TEMPLATE, ...remote });
      suppressSync = false;
      window.dispatchEvent(new CustomEvent('atr-db-updated'));
    }
  }, (err) => {
    setSyncStatus({ ok: false, message: err.message || 'Realtime sync failed.' });
  });
}

async function signInWithGoogle() {
  bootFirebase();
  const provider = new firebase.auth.GoogleAuthProvider();
  const result = await firebaseAuth.signInWithPopup(provider);
  return result?.user || null;
}
