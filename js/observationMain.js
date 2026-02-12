import { addObservation, updateObservation, deleteObservation, listenObservations } from './firestoreService.js';
import { uploadInspectionImage } from './storageService.js';
import { isAdmin } from './auth.js';
import { setupProtectedPage } from './commonPage.js';
import { UNIT_OPTIONS } from './constants.js';

let user;
let editId = '';

function fillUnits() {
  const el = document.getElementById('obs_unit');
  el.innerHTML = UNIT_OPTIONS.map((u) => `<option>${u}</option>`).join('');
}

function toggle(show) { document.getElementById('observationFormPanel').classList.toggle('hidden', !show); }

function bindRows() {
  document.querySelectorAll('.edit-row').forEach((btn) => {
    btn.onclick = () => {
      editId = btn.dataset.id;
      const row = JSON.parse(btn.dataset.row);
      ['tag', 'description', 'location', 'unit', 'status', 'imageUrl'].forEach((name) => {
        const el = document.querySelector(`#observationForm [name="${name}"]`);
        if (el) el.value = row[name] || '';
      });
      toggle(true);
    };
  });
  document.querySelectorAll('.del-row').forEach((btn) => { btn.onclick = async () => deleteObservation(btn.dataset.id); });
}

function render(rows) {
  const tbody = document.getElementById('observationTableBody');
  tbody.innerHTML = rows.map((r) => `<tr>
    <td>${r.tag || ''}</td><td>${r.description || ''}</td><td>${r.location || ''}</td><td>${r.unit || ''}</td><td>${r.status || ''}</td>
    <td>${r.imageUrl ? `<a target="_blank" href="${r.imageUrl}">View</a>` : '-'}</td>
    <td><button class="btn edit-row" data-id="${r.id}" data-row='${JSON.stringify(r).replaceAll("'", '&apos;')}'>Edit</button>${isAdmin(user?.email) ? `<button class="btn danger del-row" data-id="${r.id}">Delete</button>` : ''}</td>
  </tr>`).join('');
  bindRows();
}

async function init() {
  user = await setupProtectedPage();
  if (!user) return;
  fillUnits();

  document.getElementById('openObservationFormBtn').onclick = () => { editId = ''; document.getElementById('observationForm').reset(); toggle(true); };
  document.getElementById('closeObservationFormBtn').onclick = () => toggle(false);

  document.getElementById('observationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    const f = document.getElementById('observationImage').files[0];
    if (f) data.imageUrl = await uploadInspectionImage(f);
    data.enteredBy = user.email;
    if (editId) await updateObservation(editId, data);
    else await addObservation(data);
    toggle(false);
    e.target.reset();
  });

  listenObservations(render);
}

init();
