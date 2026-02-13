const STORAGE_KEYS = {
  sessionUser: 'atr2026_session_user',
  cloudConfig: 'atr2026_cloud_config',
  syncStatus: 'atr2026_sync_status',
  localCache: 'atr2026_runtime_cache'
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
let authReadyPromise = null;

function nowStamp() {
  return new Date().toISOString();
}

function generateId(prefix = 'REC') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeName(value) {
  return String(value || 'entry').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'entry';
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
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

async function ensureFirebaseSession() {
  bootFirebase();
  if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
  if (authReadyPromise) return authReadyPromise;

  authReadyPromise = (async () => {
    try {
      const user = await new Promise((resolve, reject) => {
        const unsubscribe = firebaseAuth.onAuthStateChanged((currentUser) => {
          unsubscribe();
          if (currentUser) {
            resolve(currentUser);
            return;
          }
          reject(new Error('Cloud sync requires Google sign-in. Please sign in with Google to use Firebase data.'));
        }, (err) => {
          unsubscribe();
          reject(err);
        });
      });
      setSyncStatus({ ok: true, message: 'Connected to Firebase cloud.' });
      return user;
    } catch (err) {
      setSyncStatus({ ok: false, message: `Firebase auth failed: ${err.message}` });
      throw err;
    } finally {
      authReadyPromise = null;
    }
  })();

  return authReadyPromise;
}

function getSessionUser() {
  return localStorage.getItem(STORAGE_KEYS.sessionUser) || '';
}

function getCloudConfig() {
  const cfg = JSON.parse(localStorage.getItem(STORAGE_KEYS.cloudConfig) || '{}');
  return {
    enabled: cfg.enabled !== false,
    cloudinaryCloudName: (cfg.cloudinaryCloudName || 'dhlmqtton').trim(),
    cloudinaryUploadPreset: (cfg.cloudinaryUploadPreset || 'ATR-2026-I').trim()
  };
}

function setCloudConfig(config) {
  const next = {
    enabled: config.enabled !== false,
    cloudinaryCloudName: (config.cloudinaryCloudName || 'dhlmqtton').trim(),
    cloudinaryUploadPreset: (config.cloudinaryUploadPreset || 'ATR-2026-I').trim()
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

function persistLocalCache() {
  localStorage.setItem(STORAGE_KEYS.localCache, JSON.stringify(runtimeDB));
}

function saveDB(db) {
  runtimeDB = clone(db);
  runtimeDB._meta = runtimeDB._meta || {};
  runtimeDB._meta.last_updated = nowStamp();
  persistLocalCache();
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

function batchUpsertById(name, payloads = [], prefix) {
  if (!Array.isArray(payloads) || !payloads.length) return 0;
  const rows = getCollection(name);
  const byId = new Map(rows.map((row, index) => [row.id, index]));
  let changed = 0;

  payloads.forEach((payload) => {
    const rowId = payload.id || generateId(prefix);
    if (byId.has(rowId)) {
      const idx = byId.get(rowId);
      rows[idx] = withAudit({ ...rows[idx], ...payload, id: rowId }, true);
    } else {
      rows.push(withAudit({ ...payload, id: rowId }));
      byId.set(rowId, rows.length - 1);
    }
    changed += 1;
  });

  saveCollection(name, rows);
  return changed;
}

function deleteById(name, id) {
  const rows = getCollection(name).filter((r) => r.id !== id);
  saveCollection(name, rows);
}

async function uploadToCloudinary(fileName, fileInput) {
  const cfg = getCloudConfig();
  if (!cfg.cloudinaryCloudName || !cfg.cloudinaryUploadPreset) {
    throw new Error('Cloudinary config missing. Fill Cloud Name and Upload Preset in Login > Cloud Sync Settings.');
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cfg.cloudinaryCloudName}/image/upload`;
  const form = new FormData();
  if (fileInput instanceof Blob) form.append('file', fileInput);
  else form.append('file', fileInput);
  form.append('upload_preset', cfg.cloudinaryUploadPreset);
  form.append('public_id', sanitizeName(fileName.replace(/\.[^.]+$/, '')));

  const res = await fetch(endpoint, { method: 'POST', body: form });
  const body = await res.json();
  if (!res.ok || !body.secure_url) throw new Error(body.error?.message || 'Cloudinary upload failed.');
  return body.secure_url;
}

async function saveImageDataAtPath(path, base64DataOrBlob) {
  let uploadedUrl = '';
  try {
    uploadedUrl = await uploadToCloudinary(path, base64DataOrBlob);
  } catch (err) {
    setSyncStatus({ ok: false, message: `Cloudinary upload failed: ${err.message}` });
    throw err;
  }
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
  const normalized = normalizeUsername(username);
  return getCollection('users').find((u) => normalizeUsername(u.username) === normalized);
}

function requestAccess(user) {
  const users = getCollection('users');
  const normalizedUsername = normalizeUsername(user.username);
  const existingIndex = users.findIndex((u) => normalizeUsername(u.username) === normalizedUsername);
  const payload = withAudit({ ...user, username: normalizedUsername }, existingIndex >= 0);
  if (existingIndex >= 0) users[existingIndex] = payload;
  else users.push(payload);
  saveCollection('users', users);
}

function approveUser(username, approvedBy = 'system') {
  const normalizedUsername = normalizeUsername(username);
  const users = getCollection('users').map((u) => (
    normalizeUsername(u.username) === normalizedUsername ? withAudit({ ...u, approved: true, approved_by: approvedBy }, true) : u
  ));
  saveCollection('users', users);
}

function ensureDefaultAdmin(db) {
  if (!db.users.some((u) => normalizeUsername(u.username) === 'shivam.jha')) {
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
  persistLocalCache();
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
  const cached = localStorage.getItem(STORAGE_KEYS.localCache);
  if (cached) {
    try {
      runtimeDB = clone({ ...DB_TEMPLATE, ...JSON.parse(cached) });
      ensureRuntimeDefaults();
    } catch (err) {
      console.warn('Local cache parse failed:', err);
    }
  } else {
    ensureRuntimeDefaults();
  }

  try {
    await ensureFirebaseSession();
    const ref = runtimeDocRef();
    const snap = await ref.get();

    if (snap.exists && snap.data()) {
      runtimeDB = clone({ ...DB_TEMPLATE, ...snap.data() });
      ensureRuntimeDefaults();
      setSyncStatus({ ok: true, message: 'Loaded data from Firebase cloud.' });
      return;
    }

    await ref.set(buildDatabaseFilesPayload(), { merge: false });
    setSyncStatus({ ok: true, message: 'Initialized Firebase cloud document.' });
  } catch (err) {
    setSyncStatus({ ok: false, message: `Firebase init fallback (local cache in use): ${err.message}` });
    ensureRuntimeDefaults();
  }
}

async function syncAllToCloud(config = getCloudConfig()) {
  if (!config.enabled) return;
  await ensureFirebaseSession();
  await runtimeDocRef().set(buildDatabaseFilesPayload(), { merge: false });
  setSyncStatus({ ok: true, message: 'Saved to Firebase cloud successfully.' });
}

async function pullCloudToLocalIfNewer(config = getCloudConfig()) {
  if (!config.enabled) return;
  await ensureFirebaseSession();
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

  ensureFirebaseSession()
    .then(() => runtimeDocRef().onSnapshot((snap) => {
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
  }))
    .catch((err) => setSyncStatus({ ok: false, message: `Realtime setup failed: ${err.message}` }));
}

async function signInWithGoogle() {
  bootFirebase();
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

  try {
    const result = await firebaseAuth.signInWithPopup(provider);
    return result?.user || null;
  } catch (err) {
    if ([
      'auth/popup-blocked',
      'auth/cancelled-popup-request',
      'auth/operation-not-supported-in-this-environment',
      'auth/web-storage-unsupported'
    ].includes(err?.code)) {
      await firebaseAuth.signInWithRedirect(provider);
      return null;
    }
    throw err;
  }
}

async function consumeGoogleRedirectResult() {
  bootFirebase();
  const result = await firebaseAuth.getRedirectResult();
  return result?.user || null;
}
