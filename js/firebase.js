import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';
import { firebaseConfig as fileConfig } from './firebase-config.js';

const runtimeConfig = window.__FIREBASE_CONFIG__ || fileConfig;

function hasPlaceholder(cfg) {
  return Object.values(cfg).some((value) => String(value).includes('YOUR_'));
}

if (!runtimeConfig || hasPlaceholder(runtimeConfig)) {
  throw new Error(
    'Firebase config missing. Update js/firebase-config.js with your real project keys from Firebase console.'
  );
}

const app = initializeApp(runtimeConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
