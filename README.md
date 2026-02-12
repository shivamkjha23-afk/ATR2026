# ATR-2026 Shutdown Inspection Tracker – PATA Plant

Static GitHub Pages-ready web app (HTML/CSS/Vanilla JS + JSON seed files + localStorage runtime DB).

## Login / Authentication

- Login requires **User ID + Password**.
- Users are loaded from `data/users.json`.
- Admin can approve new requested users.
- Every created/updated record stores:
  - `entered_by`
  - `timestamp`
  - `updated_by`

Default admin:
- User: `shivam.jha`
- Password: `admin@123`

## Data Model (central runtime DB)

Runtime data is synchronized into one central browser DB object (`atr2026_db`) and seeded from:

- `data/inspections.json`
- `data/observations.json`
- `data/requisitions.json`
- `data/users.json`

Images are stored as data records with path keys under:
- `data/images/` (logical path stored in DB)


## Central Storage Note (Important)

Because GitHub Pages is static, browser edits do not automatically write back to repository files.

This project now includes **Admin → Central Database Sync**:
- **Download Runtime JSON Backup** (local safety export)
- **Sync All Data to GitHub** (pushes updated `data/*.json` + `data/images/*` using GitHub API token)

This resolves the issue where changes were only visible locally.

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
