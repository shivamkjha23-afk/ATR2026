# ATR2026 Shutdown Inspection Tracker (Firebase + Cloudinary)

This app keeps the **same main website flow** (Dashboard / Inspection / Observation / Requisition) and now uses cloud backend services:

- **Firebase Authentication** (Email/Password)
- **Firebase Firestore** (inspection, observation, requisition tables with realtime listeners)
- **Cloudinary** (image upload and URL storage)

> Firebase Storage is not required in this setup.

## Pages
- `login.html`
- `dashboard.html`
- `inspection.html`
- `observation.html`
- `requisition.html`

## 1) Firebase setup

1. Create Firebase project and Web app.
2. Enable **Authentication > Email/Password**.
3. Enable **Firestore Database**.
4. Put Web config values in `js/firebase-config.js`.

`js/firebase-config.js`
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

If placeholders stay as `YOUR_*`, app intentionally throws error so misconfiguration is obvious.

## 2) Firestore collections

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

## 3) Cloudinary setup (image hosting)

1. Create Cloudinary account.
2. Create an **unsigned upload preset**.
3. Update `js/cloudinary-config.js`:

```js
export const cloudinaryConfig = {
  cloudName: 'YOUR_CLOUD_NAME',
  uploadPreset: 'YOUR_UNSIGNED_UPLOAD_PRESET'
};
```

Observation form behavior:
- If image file selected -> upload to Cloudinary and save URL in Firestore `imageUrl`
- If no file selected, you can paste OneDrive/cloud URL in `imageUrl`

## 4) Realtime behavior

Using Firestore `onSnapshot`:
- Dashboard cards/charts update automatically
- Inspection table updates automatically
- Observation table updates automatically
- Requisition table updates automatically

## 5) Deploy to GitHub Pages

1. Push repository.
2. GitHub Settings → Pages.
3. Deploy branch `main` (root).
4. Open site URL.

## 6) Local test

```bash
python3 -m http.server 4173 --directory /workspace/ATR2026
```

Open:
- `http://127.0.0.1:4173/login.html`
