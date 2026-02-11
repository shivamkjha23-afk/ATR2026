# ATR-2026 Shutdown Inspection Tracker – PATA Plant

Static web application for tracking shutdown inspections with browser-based JSON persistence and admin approvals.

## Tech Stack
- HTML
- CSS
- Vanilla JavaScript
- JSON files (seed database)
- Deployable to GitHub Pages (no backend)

## Project Structure

```
/atr2026-tracker
  index.html
  dashboard.html
  inspection.html
  observation.html
  admin.html
  /css/styles.css
  /js/app.js
  /js/dashboard.js
  /js/storage.js
  /data/inspections.json
  /data/users.json
  /uploads/
```

## GitHub Pages Deployment
1. Push the repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set source to **Deploy from a branch**.
4. Select the branch (for example `main`) and root folder `/`.
5. Save and wait for GitHub to publish.
6. Open `https://<username>.github.io/<repo>/atr2026-tracker/dashboard.html`.

## How JSON Database Works
- Seed JSON is loaded from:
  - `data/inspections.json`
  - `data/users.json`
- Runtime updates are stored in browser `localStorage` using keys:
  - `atr2026_inspections`
  - `atr2026_users`
  - `atr2026_observations`
- Since GitHub Pages is static, saved edits do not write back to repository files.

## How to Edit JSON Database
1. Open the JSON file under `data/`.
2. Add/update records while keeping valid JSON syntax.
3. Commit and push changes.
4. Reload the app in browser and clear localStorage if old cache persists.

## Admin Approval Process
1. Set login identity by storing `localStorage.username` in browser DevTools.
2. Open **Admin Panel**.
3. Review pending access requests table.
4. Click **Approve** for each user.
5. Approval status is saved to browser localStorage.

## Default Admin
- `shivam.jha`
