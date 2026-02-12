# ATR2026 Shutdown Inspection Tracker

This repository contains a **fresh full frontend codebase** (no migration/delete steps required) for your ATR2026 web app.

- Frontend: Vanilla JS + HTML/CSS
- Auth & DB: Firebase Authentication + Firestore
- Image hosting: Cloudinary
- Realtime updates: Firestore `onSnapshot`
- Deploy target: GitHub Pages (static site)

---

## File structure (final code)

```text
/
├─ index.html
├─ login.html
├─ dashboard.html
├─ inspection.html
├─ observation.html
├─ requisition.html
├─ admin.html
├─ css/
│  └─ styles.css
└─ js/
   ├─ firebase-config.js
   ├─ firebase.js
   ├─ cloudinary-config.js
   ├─ constants.js
   ├─ auth.js
   ├─ commonPage.js
   ├─ login.js
   ├─ dashboardMain.js
   ├─ inspectionService.js
   ├─ firestoreService.js
   ├─ storageService.js
   ├─ inspectionMain.js
   ├─ observationMain.js
   ├─ requisitionMain.js
   └─ adminMain.js
```

---

## Features included

### Authentication
- Email/password login
- Create account
- Google login (popup)
- Protected pages redirect to login when unauthenticated

### Inspection module
- Add/Edit/Delete inspection records
- Firestore realtime table updates
- Proper dropdowns for unit/equipment/status/final status
- Status workflow includes:
  - Scaffolding Prepared
  - Manhole Opened
  - NDT in Progress
  - Insulation Removed
  - Manhole Box-up
  - Completed

### Observation module
- Add/Edit/Delete observation records
- Upload image to Cloudinary **or** paste OneDrive URL
- Realtime updates from Firestore

### Requisition module
- Add/Edit/Delete requisitions
- Realtime updates from Firestore
- Dropdown options restored (type/unit/size/result)

### Dashboard
- KPI cards
- Vessel / Pipeline / Steam Trap charts
- Unit comparison chart
- Daily progress chart
- Realtime auto-refresh from Firestore

### Admin module
- Admin-only access
- Download inspection Excel template
- Bulk upload inspection records from Excel

### UI/UX
- Sidebar navigation (same style flow as earlier)
- Light/Dark theme toggle on all major pages
- Admin menu shown only for admin emails

---

## Firebase setup (required)

## 1) Create Firebase project
1. Open Firebase Console.
2. Create project.
3. Add Web app.
4. Copy web config values.

## 2) Update `js/firebase-config.js`

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

## 3) Enable Firebase Authentication
Enable these providers:
- Email/Password
- Google

Also ensure your GitHub Pages domain is in **Authorized domains**.

## 4) Enable Firestore Database
Create database and use these collections:

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

---

## Cloudinary setup (required for image upload)

## 1) Create Cloudinary account
## 2) Create unsigned upload preset
## 3) Update `js/cloudinary-config.js`

```js
export const cloudinaryConfig = {
  cloudName: 'YOUR_CLOUD_NAME',
  uploadPreset: 'YOUR_UNSIGNED_UPLOAD_PRESET'
};
```

---

## Admin bulk Excel template columns

Upload file must include these headers:

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

---

## Run locally

```bash
python3 -m http.server 4173 --directory /workspace/ATR2026
```

Open:
- `http://127.0.0.1:4173/login.html`

---

## Deploy to GitHub Pages

1. Push repository to GitHub.
2. Open repository settings → Pages.
3. Deploy from branch (`main`, root).
4. Open published URL.

