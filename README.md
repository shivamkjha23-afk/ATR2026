# ATR2026 Inspection Dashboard (Firebase Backend)

This is now a **Firebase-only static web app** (GitHub Pages compatible).

- Frontend: Vanilla JavaScript + HTML/CSS
- Backend: Firebase Authentication + Firestore + Storage
- Realtime updates: Firestore `onSnapshot`
- No Node.js backend

---

## Live pages
- `index.html` → redirects to `login.html`
- `login.html`
- `pages/dashboard.html`
- `pages/inspection-updates.html`

---

## Important: configure Firebase first

The app will **not load** until valid keys are set.

Open `js/firebase-config.js` and paste your exact Firebase web config:

```js
export const firebaseConfig = {
  apiKey: '...',
  authDomain: '...firebaseapp.com',
  projectId: '...',
  storageBucket: '...appspot.com',
  messagingSenderId: '...',
  appId: '...'
};
```

If placeholders remain (`YOUR_...`), app throws a clear error intentionally.

---

## Firebase setup (complete)

## 1) Create project
1. Go to Firebase Console.
2. Create project.
3. Add Web App.
4. Copy web config into `js/firebase-config.js`.

## 2) Authentication
1. Firebase Console → Authentication.
2. Enable **Email/Password**.

## 3) Firestore
1. Firebase Console → Firestore Database.
2. Create database.
3. Create these collections:

### `inspection_updates`
Required fields:
- `unit_name`
- `equipment_type`
- `equipment_tag_number`
- `inspection_type`
- `equipment_name`
- `last_inspection_year`
- `inspection_possible`
- `inspection_date`
- `status`
- `final_status`
- `remarks`
- `observation`
- `recommendation`
- `updated_by`
- `update_date`
- `timestamp`

### `observations`
- `tag`
- `description`
- `location`
- `unit`
- `status`
- `imageUrl`
- `enteredBy`
- `timestamp`

### `requisitions`
- `type`
- `tagNo`
- `jobDescription`
- `location`
- `unit`
- `jobSize`
- `result`
- `status2`
- `remarks`
- `timestamp`
- `enteredBy`

## 4) Storage
1. Firebase Console → Storage → Get started.
2. Upload path used by app: `inspection-images/`

---

## OneDrive image usage (your flow)

You can keep images in your OneDrive folder and paste shared URLs.

In Observation form:
- Either upload local image file (saved to Firebase Storage)
- Or paste OneDrive shared link in `OneDrive Image URL`

If URL is provided and no file selected, that URL is saved in Firestore as `imageUrl`.

---

## Firestore realtime features
- Dashboard KPI cards auto update
- Vessel/Pipeline/Steam Trap charts auto update
- Unit comparison chart auto update
- Daily progress chart auto update
- Inspection, Observation, Requisition tables auto update

---

## Deploy to GitHub Pages
1. Push repo to GitHub.
2. Settings → Pages.
3. Deploy from branch (`main`, root).
4. Open site URL.

---

## Cleanup done in this repo
Legacy local JSON/localStorage implementation files were removed to avoid conflicts.

Removed old files include:
- `dashboard.html`, `inspection.html`, `observation.html`, `requisition.html`, `admin.html`
- `js/app.js`, `js/storage.js`, `js/dashboard.js`
- local JSON DB files under `data/*.json`

App now runs only on Firebase-backed pages under `login.html` and `pages/`.
