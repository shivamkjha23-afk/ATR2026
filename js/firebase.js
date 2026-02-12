import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';

// TODO: replace with your project values from Firebase Console.
onst firebaseConfig = {
  apiKey: "AIzaSyDam8Q5xWNT5J7AfagEVWcC7TzT2LN8OHU",
  authDomain: "atr2026-6541f.firebaseapp.com",
  projectId: "atr2026-6541f",
  storageBucket: "atr2026-6541f.firebasestorage.app",
  messagingSenderId: "121442875078",
  appId: "1:121442875078:web:741b5ffc315843352149c7",
  measurementId: "G-8JY365XQXP"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
