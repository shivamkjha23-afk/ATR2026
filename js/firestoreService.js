import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { db, auth } from './firebase.js';

function basePayload(data) {
  return {
    ...data,
    enteredBy: auth.currentUser?.email || '',
    timestamp: serverTimestamp()
  };
}

export async function addObservation(data) {
  return addDoc(collection(db, 'observations'), basePayload(data));
}

export async function updateObservation(id, data) {
  return updateDoc(doc(db, 'observations', id), data);
}

export async function deleteObservation(id) {
  return deleteDoc(doc(db, 'observations', id));
}

export function listenObservations(callback) {
  return onSnapshot(query(collection(db, 'observations'), orderBy('timestamp', 'desc')), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function addRequisition(data) {
  return addDoc(collection(db, 'requisitions'), basePayload(data));
}

export async function updateRequisition(id, data) {
  return updateDoc(doc(db, 'requisitions', id), data);
}

export async function deleteRequisition(id) {
  return deleteDoc(doc(db, 'requisitions', id));
}

export function listenRequisitions(callback) {
  return onSnapshot(query(collection(db, 'requisitions'), orderBy('timestamp', 'desc')), (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}
