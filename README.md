# ATR-2026 Shutdown Inspection Tracker (Developer + Maintainer Guide)

This README is a **code-level guide** for understanding and changing the full app: business logic, data save flow, button wiring, page behavior, and extension points.

> Stack: Static multi-page app (**HTML + CSS + Vanilla JS**) with Firebase Firestore as shared runtime DB and Cloudinary for image storage.

---

## 1) What this project is

ATR-2026 is a browser app for plant shutdown tracking with 5 functional modules:

- **Login/Auth** (`index.html`)
- **Inspection** (`inspection.html`)
- **Observation** (`observation.html`)
- **Requisition** (`requisition.html`)
- **Dashboard** (`dashboard.html`)
- **Admin Panel** (`admin.html`)

There is no backend server in this repo. Runtime data is managed client-side and synced to Firebase.

---

## 2) Repository structure (important files)

```text
/ATR2026
├── index.html                # Login page
├── dashboard.html            # Dashboard UI shell
├── inspection.html           # Inspection list/form UI shell
├── observation.html          # Observation list/form UI shell
├── requisition.html          # Requisition list/form UI shell
├── admin.html                # Admin tools (approval, bulk upload, exports)
├── css/
│   └── styles.css            # Shared styling
└── js/
    ├── storage.js            # Data layer: DB model, CRUD, Firebase sync, Cloudinary uploads
    ├── app.js                # App/page controllers, forms, event handlers, auth/role checks
    └── dashboard.js          # Dashboard rendering + charts + PDF export
```

---

## 3) Runtime architecture (how data actually flows)

### 3.1 Data source of truth

- In-browser runtime object: `runtimeDB` in `js/storage.js`.
- Shape template: `DB_TEMPLATE`.

```js
{
  inspections: [],
  observations: [],
  requisitions: [],
  users: [],
  images: {},
  _meta: { last_updated: '' }
}
```

### 3.2 Save lifecycle

When any page does `upsertById(...)` / `deleteById(...)` / `saveCollection(...)`:

1. `saveDB(...)` updates `runtimeDB`.
2. Local cache is written to `localStorage` (`atr2026_runtime_cache`).
3. `scheduleAutoSync()` is triggered.
4. If sync enabled, data is written to Firestore (chunked documents + metadata doc).
5. Realtime listener (`onSnapshot`) pulls remote changes back to clients and emits `atr-db-updated`.

### 3.3 Cloud storage format

- Metadata document: `runtime/runtime`
- Chunk subcollection: `runtime/runtime/runtime_chunks`
- Collections chunked to keep write sizes safe (`MAX_CHUNK_CHARS`, batch limits).

### 3.4 Images

Observation images are uploaded directly to Cloudinary through `uploadToCloudinary(...)`.
Saved observation rows keep URL array in `images` field.

---

## 4) Initialization and page boot order

Entry point is `DOMContentLoaded` handler in `js/app.js`.

High-level order:

1. Apply theme.
2. `initializeData()` (load local cache + Firebase pull/init).
3. `setupLogin()`.
4. `startRealtimeSync()`.
5. UI wiring (`setupSyncStatusUI`, sidebar/menu/footer).
6. Auth guard (`requireAuth`) for non-login pages.
7. Role guard (`applyRoleVisibility`) for admin-only elements.
8. Per-page setups:
   - `setupInspectionPage()`
   - `setupObservationPage()`
   - `setupRequisitionPage()`
   - `setupAdminPanel()`
   - `setupDashboard()`

If you need to add any global startup behavior, this is the place.

---

## 5) Core data/API functions you will modify most

All in `js/storage.js`.

- `getCollection(name)` – read table data.
- `upsertById(name, payload, prefix)` – create/update one row.
- `batchUpsertById(name, payloads, prefix)` – create/update many rows.
- `deleteById(name, id)` – delete one row.
- `saveCollection(name, rows)` – overwrite full collection.
- `withAudit(record, isUpdate)` – auto stamps `timestamp`, `entered_by`, `updated_by`.
- `syncAllToCloud()` – force full push to Firebase.
- `startRealtimeSync()` – realtime listener.
- `saveImageDataAtPath(path, blob)` – Cloudinary upload + image map update.

**Rule of thumb:**
Use these functions instead of writing directly to `runtimeDB` so audit metadata and auto-sync continue working.

---

## 6) Page-by-page logic map (what function controls what)

## 6.1 Login page

Controller: `setupLogin()` in `js/app.js`

Handles:
- Tab switch (Sign In / Create Account)
- Username+password login (users collection)
- Google sign-in flow (`signInWithGoogle`, `consumeGoogleRedirectResult`)
- New user request (`requestAccess`)
- Session storage key: `atr2026_session_user`

Role/approval gates:
- Non-approved users cannot enter app pages.
- Admin user default ensured from storage layer.

## 6.2 Inspection page

Controller: `setupInspectionPage()`

Handles:
- Unit filter, equipment-type tabs, tag search
- Grouped unit-wise rendering
- Add/Edit equipment form
- Mark single or selected rows completed
- Vessel PDF report generation

Primary writes:
- `upsertById('inspections', payload, 'INSP')`
- `batchUpsertById('inspections', updates, 'INSP')`

## 6.3 Observation page

Controller: `setupObservationPage()`

Handles:
- Observation table render
- Add/Edit observation form
- Pull completed inspection tag into observation fields
- Multi-image upload preview and Cloudinary upload
- Inline status dropdown update
- Draft email + observation PDF

Primary writes:
- `upsertById('observations', payload, 'OBS')`
- `deleteById('observations', id)` (admin only button)

## 6.4 Requisition page

Controller: `setupRequisitionPage()`

Handles:
- Requisition table render
- Add/Edit requisition form
- Conditional `status_2` field when result is `Reshoot`
- Delete button shown only to admin

Primary writes:
- `upsertById('requisitions', payload, 'REQ')`
- `deleteById('requisitions', id)`

## 6.5 Admin page

Controller: `setupAdminPanel()`

Handles:
- Approve pending users
- Bulk Excel upload (users / inspections)
- Export inspections template/current data
- Download full runtime backup JSON
- Manual force sync to Firebase

Bulk upload behavior:
- Inspections: upsert by `id`; blank id creates new row.
- Users: upsert by `username`.

## 6.6 Dashboard page

Rendering logic in `js/dashboard.js` (`renderDashboard`, section builders).

Handles:
- Unit summaries by module
- Inspection/Vessel/Pipeline/Steam Trap charts
- Observation summary card + navigation
- Requisition RT summary
- Dashboard+Observation PDF export

---

## 7) How to change business logic safely

## 7.1 Change “add/save logic” (for any module)

Use this pattern:

1. Find page controller submit handler in `js/app.js`.
2. Update payload mapping from form IDs.
3. Keep write via `upsertById`/`batchUpsertById`.
4. Re-render local UI (`render...()` function).

Example locations:
- Inspection submit: inside `setupInspectionPage()`
- Observation submit: inside `setupObservationPage()`
- Requisition submit: inside `setupRequisitionPage()`

## 7.2 Add a new field to a module

You must update in **all places** below:

1. HTML form input/select/textarea (`*.html`).
2. Submit payload in page controller (`js/app.js`).
3. Table render template (if visible in list).
4. Edit binding (populate existing row into form).
5. Optional: dashboard summary/filters if field affects analytics.
6. Optional: admin Excel map/template if field should bulk-import.

If you skip step 4 (edit binding), updates may erase that field.

## 7.3 Change status logic (e.g., what counts as completed)

Primary place: `js/dashboard.js`
- `isCompletedInspection(...)`
- `isInProgressInspection(...)`
- `computeSummary(...)`

If status options themselves change, also update:
- `INSPECTION_STATUS_OPTIONS` in `js/app.js`
- any status dropdown literal arrays in render methods

## 7.4 Change data save destination/behavior

Data layer is centralized in `js/storage.js`.

Common modifications:
- Disable cloud sync: `getCloudConfig().enabled` handling.
- Change Firestore paths: `PRIMARY_RUNTIME_DOC_PATH` / `LEGACY_RUNTIME_DOC_PATH`.
- Tune chunking: `MAX_CHUNK_CHARS`, batch constants.
- Adjust audit fields: `withAudit(...)`.

---

## 8) How to add a new button + new function (step-by-step)

Example: add a new “Archive” button to Inspection rows.

1. **Add button in row template** in `renderInspectionList()` (JS-generated HTML).
2. **Bind click handler** after `innerHTML` assignment:
   - `unitLists.querySelectorAll('.archive-btn').forEach(...)`
3. **Implement function**:
   - read row by id from `getCollection('inspections')`
   - update payload (`archived: true`)
   - call `upsertById('inspections', updated, 'INSP')`
4. **Re-render** list (`renderInspectionList()`).
5. Optional: hide archived by default in `filteredRows()`.

Pattern is identical in observation/requisition tables.

---

## 9) How to add a completely new module/page

1. Create new HTML page with sidebar/header pattern.
2. Add nav link in all page sidebars.
3. Add `data-page="newpage"` on `<body>`.
4. Implement `setupNewPage()` in `js/app.js`.
5. Call `setupNewPage()` inside global `DOMContentLoaded` block.
6. If new data collection needed:
   - add key in `DB_TEMPLATE` (`js/storage.js`)
   - add key in `RUNTIME_COLLECTION_KEYS`
   - create CRUD usage with `upsertById/getCollection/deleteById`
7. If dashboard should include it, add section in `js/dashboard.js`.

---

## 10) Auth, roles, approvals

- Session user is kept in localStorage.
- `requireAuth()` blocks non-login pages unless user exists and approved.
- `isAdmin()` checks role on current user.
- `.admin-only` elements are hidden for non-admin.
- Admin page hard-redirects non-admin users to dashboard.

---

## 11) Excel upload mapping details

Inspection upload mapping passes through:
- `remapInspectionExcelRow(...)`
- `normalizeInspectionPayload(...)`
- `batchUpsertById('inspections', ...)`

If new inspection columns are added:
1. Add normalized header mapping in `remapInspectionExcelRow`.
2. Add field in `normalizeInspectionPayload`.
3. Add field to `INSPECTION_FORM_FIELDS` for export template.

---

## 12) Dashboard extension points

If you add new equipment types or new KPIs:

- Update source filtering and section creation in `sectionInspection(...)` calls.
- Add new summary formulas in `computeSummary(...)`.
- Add chart rendering dataset in `renderBarChart(...)` or dedicated renderer.

For PDF output changes:
- `exportDashboardPdf()` in `js/dashboard.js`.

---

## 13) Common “where do I change X?” quick table

| Change request | Main file/function |
|---|---|
| Add new login behavior | `js/app.js` → `setupLogin()` |
| Change user approval logic | `js/storage.js` → `requestAccess`, `approveUser` |
| Change inspection add/edit fields | `js/app.js` → `setupInspectionPage()` |
| Change observation image save logic | `js/app.js` → `filesToPaths`; `js/storage.js` → `saveImageDataAtPath` |
| Change requisition save logic | `js/app.js` → `setupRequisitionPage()` |
| Change audit fields (`entered_by`, timestamps) | `js/storage.js` → `withAudit()` |
| Change Firebase document path | `js/storage.js` → runtime path constants |
| Change auto-sync behavior | `js/storage.js` → `saveDB`, `scheduleAutoSync`, `syncAllToCloud` |
| Change admin bulk upload logic | `js/app.js` → `setupAdminPanel()` |
| Add/modify dashboard cards/charts | `js/dashboard.js` |
| Change theme toggle behavior | `js/app.js` → `getTheme`, `applyTheme`, `setupThemeToggle` |

---

## 14) Local development

Because this is static HTML + JS, run from any static server (recommended to avoid browser restrictions).

Examples:

```bash
# Python
python3 -m http.server 5500

# Node (if installed)
npx serve .
```

Then open `http://localhost:5500`.

---

## 15) Deployment

Deploy as GitHub Pages static site.

- Push branch/repo.
- Enable Pages: **Deploy from branch**.
- Root folder: `/`.

No server deploy needed.

---

## 16) Safety checklist before making logic changes

- [ ] I used `upsertById`/`saveCollection`/`deleteById` (not direct `runtimeDB` mutation).
- [ ] I updated both submit mapping and edit mapping.
- [ ] I verified filters/search still include the changed fields.
- [ ] I tested admin/non-admin behavior if button visibility changed.
- [ ] I confirmed cloud sync still works after save.
- [ ] I checked `atr-db-updated` listeners for realtime refresh impact.

---

## 17) Default credentials (current seed)

- Username: `shivam.jha`
- Password: `admin@123`

(Defined by default-admin seeding in storage layer.)

