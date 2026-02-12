import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { auth } from './firebase.js';

const ADMIN_EMAILS = ['admin@atr2026.com'];

export function isAdmin(email) {
  return ADMIN_EMAILS.includes((email || '').toLowerCase());
}

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signup(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function requireAuth(redirectPath = '../login.html') {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = redirectPath;
        resolve(null);
        return;
      }
      resolve(user);
    });
  });
}
