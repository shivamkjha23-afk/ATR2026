import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';
import { storage } from './firebase.js';

export async function uploadInspectionImage(file) {
  const fileRef = ref(storage, `inspection-images/${Date.now()}-${file.name}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}
