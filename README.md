# ATR-2026 Shutdown Inspection Tracker – PATA Plant

Static GitHub Pages-ready web app (HTML/CSS/Vanilla JS) using Firebase Firestore as central live database and Cloudinary for images.

## Login / Authentication

- Login page uses modern tabbed flow: **Sign In** and **Create Account**.
- Login requires **User ID + Password**.
- Users are stored in Firebase Firestore (`runtime/runtime` document, chunked in `runtime/runtime/runtime_chunks`).
- Admin can approve new requested users.
- Every created/updated record stores:
  - `entered_by`
  - `timestamp`
  - `updated_by`

Default admin:
- User: `shivam.jha`
- Password: `admin@123`

## Data Model (central runtime DB)

Runtime metadata is stored in Firestore document:
- `runtime/runtime`

Large collections are stored as chunk docs in subcollection:
- `runtime/runtime/runtime_chunks`

Runtime content includes:
- `inspections[]`
- `observations[]`
- `requisitions[]`
- `users[]`
- `images{}` (Cloudinary URL map)
- `_meta.last_updated`

## Central Storage Note (Important)

Because GitHub Pages is static, browser edits do not automatically write back to repository files.

This project now uses **Firebase Firestore + Cloudinary**:
- All add/edit/delete/submit actions sync to Firebase automatically.
- Live updates are pulled from Firebase so all users see shared data.
- Observation images are uploaded to Cloudinary and saved as URLs in the central database.
- Manual force-sync is available from Admin panel.

### What you need to do (One-time setup)
1. Open Firebase console for project `atr2026-6541f`.
2. Enable **Authentication → Sign-in method → Google**.
3. Enable **Firestore Database** in production mode.
4. Create Firestore document path: `runtime/runtime` (or let app create it automatically on first sync).
5. Add your GitHub Pages domain in Firebase Auth authorized domains.
6. In Cloudinary:
   - Create an **unsigned upload preset**.
   - Copy `cloud name` and `upload preset`.
7. Cloud sync is pre-configured in app code:
   - Cloudinary cloud name: `dhlmqtton`
   - Cloudinary upload preset: `ATR-2026-I`
   - Firebase auto-sync: enabled by default
8. Use Google Sign-in (or existing local login). Admin can approve first-time Google users.

### Suggested Firestore security rules
Use admin-approved user list from runtime document for write control. Start with strict authenticated access:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /runtime/{docId} {
      allow read, write: if request.auth != null;

      match /runtime_chunks/{chunkId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

## Admin Excel Upload Rules

From **Admin Panel**:
- Download template from **Download Excel Template**.
- Choose upload type (`Inspections` or `Users`).

Inspections upload rule:
- If Excel row `id` exists in DB => update that record.
- If `id` is blank => new record created with system-generated unique ID.

Users upload rule:
- Upsert by `username`.

## Modules

### Update Inspection
- Unit filter, equipment-type tabs, tag search.
- Unit-wise list panels.
- Row edit opens hidden form.
- Add Equipment button opens hidden form.
- Multi-select and mark selected completed.
- Inspection status dropdown includes:
  - Scaffolding Prepared
  - Manhole Opened
  - NDT in Progress
  - Insulation Removed
  - Manhole Box-up

### Observation
- List view + Add New form.
- Multiple images upload.
- Image preview in table (click to open).
- Status dropdown color coded:
  - Not Started (Red)
  - In Progress (Yellow)
  - Completed (Green)
- Draft Email button pre-fills observation details and image paths.

### Requisition (RT / SR / DPT)
- Form fields include tag, job details, unit, size, datetime, result, remarks.
- If result = `Reshoot`, `Status 2` becomes available.
- Requisition table supports edit.
- Delete is admin-only.

### Dashboard
- Unit comparison chart.
- Vessel / Pipeline / Steam Trap summaries.
- Click on unit comparison chart for equipment drill-down.

## Deploy on GitHub Pages

1. Push repository to GitHub.
2. Open **Settings → Pages**.
3. Choose **Deploy from branch**.
4. Select branch + root (`/`).
5. Open published URL.
