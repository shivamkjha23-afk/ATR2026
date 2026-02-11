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

> Note: Runtime updates are stored in browser `localStorage` for static hosting compatibility.

## How admin approves users

1. Log in as `shivam.jha` from `index.html`.
2. Open **Admin Panel**.
3. In **Pending Access Requests**, click **Approve** beside the user.
4. The user status changes to approved and the approver is recorded.

## Modules

- `js/storage.js` – JSON loading/saving and data operations.
- `js/dashboard.js` – progress calculations and Chart.js rendering.
- `js/app.js` – page navigation behavior, user detection, role checks, and UI interactions.
