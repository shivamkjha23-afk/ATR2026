const units = ['GCU-1', 'GCU-2', 'GPU-1', 'GPU-2', 'HDPE-1', 'HDPE-2', 'LLDPE-1', 'LLDPE-2', 'PP-1', 'PP-2', 'LPG', 'SPHERE', 'YARD', 'FLAKER-1', 'BOG', 'IOP'];
const equipmentTypes = ['Vessel', 'Exchanger', 'Tank', 'Steam Trap', 'Pipeline'];
const inspectionTypes = ['Planned', 'Opportunity Based'];
const finalStatuses = ['Not Started', 'In Progress', 'Completed'];

function getCurrentUser() {
  const username = localStorage.getItem('username') || 'WindowsUser';
  localStorage.setItem('username', username);
  const loggedIn = document.getElementById('loggedInUser');
  if (loggedIn) loggedIn.textContent = username;
  return username;
}

function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach((link) => {
    if (link.getAttribute('href') === page) link.classList.add('active');
  });
}

function populateSelect(id, values) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = values.map((v) => `<option value="${v}">${v}</option>`).join('');
}

async function ensureBaseData() {
  await ATRStorage.loadJSON('./data/inspections.json', ATRStorage.DATA_KEYS.inspections);
  await ATRStorage.loadJSON('./data/users.json', ATRStorage.DATA_KEYS.users);
}

function statusChip(status) {
  const safe = status || 'Not Started';
  return `<span class="status-chip">${safe}</span>`;
}

function exportCurrentData() {
  const inspections = localStorage.getItem(ATRStorage.DATA_KEYS.inspections) || '[]';
  const blob = new Blob([inspections], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'inspections-export.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

function roleValidation() {
  const user = getCurrentUser();
  const users = JSON.parse(localStorage.getItem(ATRStorage.DATA_KEYS.users) || '[]');
  const record = users.find((u) => u.username === user);
  if (!record && user !== 'shivam.jha') ATRStorage.requestAccess(user);

  const isAdmin = user === 'shivam.jha' || record?.role === 'admin';
  const adminSection = document.getElementById('adminOnly');
  if (adminSection) adminSection.style.display = isAdmin ? 'block' : 'none';
}

async function initDashboardPage() {
  const target = document.getElementById('dashboardPage');
  if (!target) return;
  const inspections = JSON.parse(localStorage.getItem(ATRStorage.DATA_KEYS.inspections) || '[]');
  const progress = ATRDashboard.calculateProgress(inspections);

  document.getElementById('totalCount').textContent = progress.total;
  document.getElementById('completedCount').textContent = progress.completed;
  document.getElementById('inProgressCount').textContent = progress.inProgress;
  document.getElementById('notStartedCount').textContent = progress.notStarted;

  ATRDashboard.renderCharts(progress);

  const tbody = document.querySelector('#inspectionTable tbody');
  if (tbody) {
    tbody.innerHTML = inspections.map((row) => `
      <tr>
        <td>${row.equipment_tag_number}</td>
        <td>${row.unit_name}</td>
        <td>${row.equipment_type}</td>
        <td>${statusChip(row.final_status)}</td>
        <td>${row.updated_by || '-'}</td>
      </tr>
    `).join('');
  }
}

function initInspectionPage() {
  const form = document.getElementById('inspectionForm');
  if (!form) return;

  populateSelect('unit_name', units);
  populateSelect('equipment_type', equipmentTypes);
  populateSelect('inspection_type', inspectionTypes);
  populateSelect('final_status', finalStatuses);

  const searchBtn = document.getElementById('searchTagBtn');
  searchBtn?.addEventListener('click', () => {
    const tag = document.getElementById('search_tag').value.trim();
    const inspections = JSON.parse(localStorage.getItem(ATRStorage.DATA_KEYS.inspections) || '[]');
    const existing = inspections.find((x) => x.equipment_tag_number === tag);
    if (!existing) return alert('Tag not found.');
    Object.keys(existing).forEach((key) => {
      const field = document.getElementById(key);
      if (field) field.value = existing[key] || '';
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.updated_by = getCurrentUser();
    data.update_date = new Date().toISOString().slice(0, 10);
    const updated = ATRStorage.updateInspection(data.equipment_tag_number, data);
    if (!updated) ATRStorage.addInspection(data);
    alert('Inspection saved.');
  });

  document.getElementById('markCompletedBtn')?.addEventListener('click', () => {
    const tag = document.getElementById('equipment_tag_number').value;
    if (!tag) return alert('Enter equipment tag number.');
    ATRStorage.updateInspection(tag, { final_status: 'Completed', updated_by: getCurrentUser() });
    alert('Marked as completed.');
  });
}

function initObservationPage() {
  const form = document.getElementById('observationForm');
  if (!form) return;

  const imageInput = document.getElementById('obs_image');
  const preview = document.getElementById('imagePreview');
  imageInput?.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const item = Object.fromEntries(new FormData(form).entries());
    const observations = JSON.parse(localStorage.getItem(ATRStorage.DATA_KEYS.observations) || '[]');
    observations.push({ ...item, saved_by: getCurrentUser(), saved_at: new Date().toISOString() });
    ATRStorage.saveJSON(ATRStorage.DATA_KEYS.observations, observations);
    alert('Observation saved.');
  });

  document.getElementById('draftEmailBtn')?.addEventListener('click', () => {
    const obs = encodeURIComponent(document.getElementById('observation').value || 'Observation details');
    window.location.href = `mailto:?subject=ATR Observation&body=${obs}`;
  });
}

function initAdminPage() {
  const adminPage = document.getElementById('adminPage');
  if (!adminPage) return;

  const tbody = document.querySelector('#requestsTable tbody');
  const users = JSON.parse(localStorage.getItem(ATRStorage.DATA_KEYS.users) || '[]');
  const pending = users.filter((u) => !u.approved);
  tbody.innerHTML = pending.map((u) => `
    <tr>
      <td>${u.username}</td>
      <td>${u.role}</td>
      <td>${u.request_date || '-'}</td>
      <td><button data-user="${u.username}" class="approve-btn">Approve</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.approve-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ATRStorage.approveUser(btn.dataset.user, getCurrentUser());
      initAdminPage();
    });
  });

  document.getElementById('bulkUploadBtn')?.addEventListener('click', () => {
    document.getElementById('bulkUploadInput').click();
  });

  document.getElementById('bulkUploadInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const payload = JSON.parse(text);
    ATRStorage.saveJSON(ATRStorage.DATA_KEYS.inspections, payload);
    alert('Bulk upload loaded to browser storage.');
  });

  document.getElementById('exportDataBtn')?.addEventListener('click', exportCurrentData);
}

document.addEventListener('DOMContentLoaded', async () => {
  setActiveNav();
  await ensureBaseData();
  roleValidation();
  initDashboardPage();
  initInspectionPage();
  initObservationPage();
  initAdminPage();
});
