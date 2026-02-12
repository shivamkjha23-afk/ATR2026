# ATR2026 Inspection Dashboard (Firebase + GitHub Pages)

This project is a **static web app** (Vanilla JS + HTML/CSS) that runs on **GitHub Pages** and uses Firebase as backend:

- Firebase Authentication (Email/Password)
- Cloud Firestore (real-time updates)
- Firebase Storage (optional image upload)

It no longer relies on JSON/localStorage as the primary application database.

---

## 1) Project structure

```text
/
├─ login.html
├─ index.html
├─ pages/
│  ├─ dashboard.html
│  └─ inspection-updates.html
├─ forms/
│  ├─ inspection-update-form.html
│  ├─ observation-form.html
│  └─ requisition-form.html
├─ js/
│  ├─ firebase.js
│  ├─ auth.js
│  ├─ login.js
│  ├─ inspectionService.js
│  ├─ firestoreService.js
│  ├─ storageService.js
│  ├─ dashboardPage.js
│  └─ inspectionPage.js
└─ css/styles.css
```

---

## 2) Firebase setup (step-by-step)

## 2.1 Create Firebase project
1. Open: <https://console.firebase.google.com>
2. Click **Create a project**.
3. Give name (for example `atr2026-dashboard`).
4. You can disable Google Analytics (optional) for this app.

## 2.2 Register web app
1. In Firebase project, click **Add app** → **Web (</>)**.
2. App nickname: `atr2026-web`.
3. Register app.
4. Copy Firebase config values shown by Firebase.

## 2.3 Configure `js/firebase.js`
Replace placeholders in `js/firebase.js`:

```js
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
};
```

Exports available from this file:
- `db`
- `auth`
- `storage`

## 2.4 Enable Authentication (Email/Password)
1. Firebase Console → **Authentication** → **Get started**.
2. Open **Sign-in method** tab.
3. Enable **Email/Password**.
4. Save.

## 2.5 Create Firestore database
1. Firebase Console → **Firestore Database** → **Create database**.
2. Start in **Production mode** (recommended) or Test mode temporarily.
3. Choose region near users.

### Firestore collections and required fields

## `inspection_updates`
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

> Document ID is generated automatically by Firestore with `addDoc()`.

## `observations`
- `tag`
- `description`
- `location`
- `unit`
- `status`
- `imageUrl`
- `enteredBy`
- `timestamp`

## `requisitions`
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

## 2.6 Enable Firebase Storage
1. Firebase Console → **Storage** → **Get started**.
2. Choose region.
3. Confirm setup.

App upload path used for file upload:
- `inspection-images/`

---

## 3) OneDrive image workflow (your requirement)

You said you keep images in OneDrive:

- OneDrive folder: `ATR2026/images`
- Shared link can be pasted in **Observation form** field: **OneDrive Image URL (optional)**

How this app handles image input now:
1. If user selects local image file → app uploads to Firebase Storage and stores download URL in Firestore `imageUrl`.
2. If no file is selected and OneDrive URL is entered → app stores that URL directly in Firestore `imageUrl`.

So you can use OneDrive-only links if you prefer.

---

## 4) Firestore real-time behavior

Real-time listeners (`onSnapshot`) are used for:
- Inspection updates list
- Observation list
- Requisition list
- Dashboard charts + KPI counters

Dashboard auto-refreshes when data changes.

---

## 5) Authentication and page protection

- `login.html` handles Email/Password sign-in and sign-up.
- Protected pages (`pages/dashboard.html`, `pages/inspection-updates.html`) call `requireAuth()`.
- If not logged in, user is redirected to `login.html`.
- Record metadata:
  - `updated_by` (inspection updates)
  - `enteredBy` (observations/requisitions)

---

## 6) Admin-only delete

Delete buttons are shown only for admin emails from `js/auth.js`:

```js
const ADMIN_EMAILS = ['admin@atr2026.com'];
```

Update this list to your real admin accounts.

---

## 7) Suggested production Firebase rules

Use secure rules according to your org policy. Example baseline:

### Firestore rules (example)
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    match /inspection_updates/{docId} {
      allow read, write: if isSignedIn();
    }
    match /observations/{docId} {
      allow read, write: if isSignedIn();
    }
    match /requisitions/{docId} {
      allow read, write: if isSignedIn();
    }
  }
}
```

### Storage rules (example)
```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /inspection-images/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 8) GitHub Pages deployment

1. Push this repository to GitHub.
2. Go to repository **Settings → Pages**.
3. Source: **Deploy from a branch**.
4. Branch: `main` (or your branch), folder `/root`.
5. Save.
6. Open your Pages URL.

`index.html` redirects to `login.html`.

---

## 9) Local smoke test (no Node backend required)

You can run a local static server:

```bash
python3 -m http.server 4173 --directory /workspace/ATR2026
```

Open:
- `http://127.0.0.1:4173/login.html`

---

## 10) Functional checklist

- [x] Static website compatible with GitHub Pages
- [x] Firebase App initialized
- [x] Firestore enabled with real-time listeners
- [x] Email/Password Authentication
- [x] Storage upload for images
- [x] OneDrive URL supported for image link storage
- [x] Modal forms (not embedded in table)
- [x] Dashboard charts update automatically
- [x] Multi-user ready with cloud backend

