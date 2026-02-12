# ATR2026 Shutdown Inspection Tracker (Full Web - Firebase + Cloudinary)

This project now supports a full web experience close to the earlier version with cloud backend:

- Firebase Authentication (Email/Password + Google Sign-In)
- Firestore realtime collections (separate tables)
- Cloudinary image uploads (instead of Firebase Storage)
- Admin bulk Excel upload for Inspection Updates
- Light/Dark theme toggle across pages

## Pages
- `login.html`
- `dashboard.html`
- `inspection.html`
- `observation.html`
- `requisition.html`
- `admin.html` (admin only)

## Firebase setup

1. Create Firebase project and register web app.
2. Enable Authentication providers:
   - Email/Password
   - Google
3. Enable Firestore database.
4. Paste config in `js/firebase-config.js`.

```js
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
};
```

## Cloudinary setup (image upload)

1. Create Cloudinary account.
2. Create unsigned upload preset.
3. Update `js/cloudinary-config.js`:

```js
export const cloudinaryConfig = {
  cloudName: 'YOUR_CLOUD_NAME',
  uploadPreset: 'YOUR_UNSIGNED_UPLOAD_PRESET'
};
```

Observation image flow:
- upload file => Cloudinary URL saved in Firestore
- or paste OneDrive/cloud URL directly

## Firestore collections and fields

### `inspection_updates`
- unit_name
- equipment_type
- equipment_tag_number
- inspection_type
- equipment_name
- last_inspection_year
- inspection_possible
- inspection_date
- status
- final_status
- remarks
- observation
- recommendation
- updated_by
- update_date
- timestamp

### `observations`
- tag
- description
- location
- unit
- status
- imageUrl
- enteredBy
- timestamp

### `requisitions`
- type
- tagNo
- jobDescription
- location
- unit
- jobSize
- result
- status2
- remarks
- timestamp
- enteredBy

## Admin bulk Excel upload

`admin.html` includes:
- Download Excel template for inspection fields
- Upload `.xlsx/.xls` and insert bulk rows to Firestore

Template column headers:
- unit_name
- equipment_type
- equipment_tag_number
- inspection_type
- equipment_name
- last_inspection_year
- inspection_possible
- inspection_date
- status
- final_status
- remarks
- observation
- recommendation

## UI improvements included
- Separate Login and Create Account sections on login page
- Google login button
- Dropdowns restored for unit/type/status where needed
- Theme toggle restored on all main pages
- Separate tables/pages for inspection/observation/requisition
- Realtime dashboard charts with daily + unit comparison

## Run locally

```bash
python3 -m http.server 4173 --directory /workspace/ATR2026
```

Open `http://127.0.0.1:4173/login.html`
