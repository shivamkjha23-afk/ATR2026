# ATR-2026 Shutdown Inspection Tracker – PATA Plant

Static industrial inspection tracker built with HTML, CSS, Vanilla JavaScript, and JSON data files.

## Deploy on GitHub Pages

1. Push this repository to GitHub with the app files in the repository root.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select the branch (for example `main`) and folder (`/` root).
5. Save and wait for deployment.
6. Open the published URL and start with `index.html`.

## How to edit JSON database

### Inspections data
- File: `data/inspections.json`
- Each inspection object includes:
  - `id`, `unit_name`, `equipment_type`, `equipment_tag_number`, `inspection_type`, `equipment_name`, `last_inspection_year`, `inspection_possible`, `inspection_date`, `status`, `final_status`, `remarks`, `observation`, `recommendation`, `updated_by`, `update_date`.

### Users data
- File: `data/users.json`
- Each user object includes:
  - `username`, `role`, `approved`, `request_date`, `approved_by`.

> Runtime updates are stored in browser `localStorage` for static hosting compatibility.

## Admin workflow

1. Log in as `shivam.jha` from `index.html`.
2. Open **Admin Panel**.
3. Approve pending users using the **Approve** button.
4. In admin **Upload Type (Dropdown)** choose `Inspections` or `Users`.
5. Download the matching Excel format from **Download Excel Template**.
6. Fill rows and upload the Excel:
   - For inspections: existing `id` -> updates same record; blank `id` -> adds new equipment.
   - For users: existing `username` -> updates user; new `username` -> adds user.

## Inspection workflow

- Filter by unit.
- Filter by equipment type tabs.
- Search by equipment tag.
- Edit a row using **Edit**.
- Select one or many rows and use **Mark Selected Completed**.
- Use **Add Equipment** to open the entry form only when needed.

## Observation workflow

- Use **Add New Observation** to open form on demand.
- Attach multiple images.
- Save and view past observations in table.
- Draft email in Outlook-compatible `mailto` format.
- Generate PDF report from observation details.

## Modules

- `js/storage.js` – JSON loading/saving and data operations.
- `js/dashboard.js` – progress calculations and Chart.js rendering.
- `js/app.js` – theme toggle, role checks, inspection workflow, observation workflow, and admin Excel upload.
