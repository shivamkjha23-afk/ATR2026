import { addInspectionUpdate, updateInspectionUpdate, deleteInspectionUpdate, listenInspectionUpdates } from './inspectionService.js';
import { isAdmin } from './auth.js';
import { setupProtectedPage } from './commonPage.js';

let user;
let editId = '';

function toggle(show) { document.getElementById('inspectionFormPanel').classList.toggle('hidden', !show); }

function bindRows() {
  document.querySelectorAll('.edit-row').forEach((btn) => {
    btn.onclick = () => {
      editId = btn.dataset.id;
      const row = JSON.parse(btn.dataset.row);
      Object.entries(row).forEach(([k, v]) => {
        const el = document.querySelector(`#inspectionForm [name="${k}"]`);
        if (el) el.value = v || '';
      });
      toggle(true);
    };
  });
  document.querySelectorAll('.del-row').forEach((btn) => {
    btn.onclick = async () => { await deleteInspectionUpdate(btn.dataset.id); };
  });
}

function render(rows) {
  const tbody = document.getElementById('inspectionTableBody');
  tbody.innerHTML = rows.map((r) => `<tr>
    <td>${r.unit_name || ''}</td><td>${r.equipment_type || ''}</td><td>${r.equipment_tag_number || ''}</td><td>${r.status || ''}</td><td>${r.final_status || ''}</td><td>${r.update_date || ''}</td>
    <td><button class="btn edit-row" data-id="${r.id}" data-row='${JSON.stringify(r).replaceAll("'", '&apos;')}'>Edit</button>${isAdmin(user?.email) ? `<button class="btn danger del-row" data-id="${r.id}">Delete</button>` : ''}</td>
  </tr>`).join('');
  bindRows();
}

async function init() {
  user = await setupProtectedPage();
  if (!user) return;

  document.getElementById('openAddEquipmentBtn').onclick = () => { editId = ''; document.getElementById('inspectionForm').reset(); toggle(true); };
  document.getElementById('closeInspectionFormBtn').onclick = () => toggle(false);

  document.getElementById('inspectionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (editId) await updateInspectionUpdate(editId, data);
    else await addInspectionUpdate(data);
    toggle(false);
    e.target.reset();
  });

  listenInspectionUpdates(render);
}

init();
