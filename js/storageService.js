import { cloudinaryConfig } from './cloudinary-config.js';

function hasPlaceholder(value) {
  return String(value || '').startsWith('YOUR_');
}

export async function uploadInspectionImage(file) {
  const { cloudName, uploadPreset } = cloudinaryConfig;

  if (!cloudName || !uploadPreset || hasPlaceholder(cloudName) || hasPlaceholder(uploadPreset)) {
    throw new Error('Cloudinary config missing. Update js/cloudinary-config.js with cloudName and unsigned uploadPreset.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errorText}`);
  }

  const json = await response.json();
  return json.secure_url;
}
