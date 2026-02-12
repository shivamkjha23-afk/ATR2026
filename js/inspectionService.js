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

const INSPECTION_COLLECTION = 'inspection_updates';

function withMeta(data) {
  return {
    ...data,
    updated_by: auth.currentUser?.email || '',
    update_date: new Date().toISOString().slice(0, 10),
    timestamp: serverTimestamp()
  };
}

export async function addInspectionUpdate(data) {
  return addDoc(collection(db, INSPECTION_COLLECTION), withMeta(data));
}

export async function updateInspectionUpdate(id, data) {
  return updateDoc(doc(db, INSPECTION_COLLECTION, id), withMeta(data));
}

export async function deleteInspectionUpdate(id) {
  return deleteDoc(doc(db, INSPECTION_COLLECTION, id));
}

export function listenInspectionUpdates(callback) {
  const q = query(collection(db, INSPECTION_COLLECTION), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(rows);
  });
}
