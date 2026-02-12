import { addRequisition, updateRequisition, deleteRequisition, listenRequisitions } from './firestoreService.js';
import { isAdmin } from './auth.js';
import { setupProtectedPage } from './commonPage.js';

let user;
let editId = '';

function toggle(show) { document.getElementById('requisitionFormPanel').classList.toggle('hidden', !show); }

function bindRows() {
  document.querySelectorAll('.edit-row').forEach((btn) => {
    btn.onclick = () => {
      editId = btn.dataset.id;
      const row = JSON.parse(btn.dataset.row);
      ['type', 'tagNo', 'jobDescription', 'location', 'unit', 'jobSize', 'result', 'status2', 'remarks'].forEach((name) => {
        const el = document.querySelector(`#requisitionForm [name="${name}"]`);
        if (el) el.value = row[name] || '';
      });
      toggle(true);
    };
  });
  document.querySelectorAll('.del-row').forEach((btn) => { btn.onclick = async () => deleteRequisition(btn.dataset.id); });
}

function render(rows) {
  const tbody = document.getElementById('requisitionTableBody');
  tbody.innerHTML = rows.map((r) => `<tr>
    <td>${r.type || ''}</td><td>${r.tagNo || ''}</td><td>${r.jobDescription || ''}</td><td>${r.location || ''}</td><td>${r.unit || ''}</td><td>${r.jobSize || ''}</td><td>${r.result || ''}</td><td>${r.status2 || ''}</td><td>${r.remarks || ''}</td>
    <td><button class="btn edit-row" data-id="${r.id}" data-row='${JSON.stringify(r).replaceAll("'", '&apos;')}'>Edit</button>${isAdmin(user?.email) ? `<button class="btn danger del-row" data-id="${r.id}">Delete</button>` : ''}</td>
  </tr>`).join('');
  bindRows();
}

async function init() {
  user = await setupProtectedPage();
  if (!user) return;
  document.getElementById('openRequisitionFormBtn').onclick = () => { editId = ''; document.getElementById('requisitionForm').reset(); toggle(true); };
  document.getElementById('closeRequisitionFormBtn').onclick = () => toggle(false);

  document.getElementById('requisitionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.enteredBy = user.email;
    if (editId) await updateRequisition(editId, data);
    else await addRequisition(data);
    toggle(false);
    e.target.reset();
  });

  listenRequisitions(render);
}

init();
