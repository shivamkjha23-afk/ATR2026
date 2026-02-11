const UNIT_OPTIONS = ['GCU-1', 'GCU-2', 'GPU-1', 'GPU-2', 'HDPE-1', 'HDPE-2', 'LLDPE-1', 'LLDPE-2', 'PP-1', 'PP-2', 'LPG', 'SPHERE', 'YARD', 'FLAKER-1', 'BOG', 'IOP'];
const EQUIPMENT_TYPES = ['Vessel', 'Exchanger', 'Tank', 'Steam Trap', 'Pipeline'];

function getLoggedInUser() {
  return localStorage.getItem('username') || 'WindowsUser';
}

function setHeaderUser() {
  const el = document.getElementById('loggedInUser');
  if (el) el.textContent = getLoggedInUser();
}

function applyRoleVisibility() {
  const username = getLoggedInUser();
  const links = document.querySelectorAll('.admin-only');
  links.forEach((link) => {
    link.style.display = username === 'shivam.jha' ? 'block' : 'none';
  });

  if (document.body.dataset.page === 'admin' && username !== 'shivam.jha') {
    alert('Access denied: Admin only area.');
    window.location.href = 'dashboard.html';
  }
}

function setupLogin() {
  const loginBtn = document.getElementById('loginBtn');
  if (!loginBtn) return;
  loginBtn.addEventListener('click', () => {
    const username = document.getElementById('username').value.trim();
    if (!username) return;
    localStorage.setItem('username', username);

    const users = readJSON(STORAGE_KEYS.users);
    const exists = users.some((u) => u.username === username);
    if (!exists) {
      requestAccess({
        username,
        role: 'inspector',
        approved: username === 'shivam.jha',
        request_date: new Date().toISOString().slice(0, 10),
        approved_by: username === 'shivam.jha' ? 'system' : ''
      });
    }

    window.location.href = 'dashboard.html';
  });
}

function setupInspectionPage() {
  const form = document.getElementById('inspectionForm');
  if (!form) return;

  const unitSelect = document.getElementById('unit_name');
  const typeSelect = document.getElementById('equipment_type');
  UNIT_OPTIONS.forEach((u) => unitSelect.insertAdjacentHTML('beforeend', `<option>${u}</option>`));
  EQUIPMENT_TYPES.forEach((t) => typeSelect.insertAdjacentHTML('beforeend', `<option>${t}</option>`));

  const searchInput = document.getElementById('tagSearch');
  const tbody = document.getElementById('inspectionTableBody');

  const drawRows = (items) => {
    tbody.innerHTML = items.map((item) => {
      const badgeClass = item.final_status === 'Completed' ? 'completed' : item.final_status === 'In Progress' ? 'progress' : 'notstarted';
      return `<tr>
        <td>${item.equipment_tag_number || '-'}</td>
        <td>${item.unit_name || '-'}</td>
        <td>${item.equipment_type || '-'}</td>
        <td>${item.inspection_type || '-'}</td>
        <td><span class="badge ${badgeClass}">${item.final_status || 'Not Started'}</span></td>
        <td>${item.updated_by || '-'}</td>
      </tr>`;
    }).join('');
  };

  const inspections = readJSON(STORAGE_KEYS.inspections);
  drawRows(inspections);

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    drawRows(inspections.filter((item) => (item.equipment_tag_number || '').toLowerCase().includes(q)));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      id: Date.now(),
      unit_name: document.getElementById('unit_name').value,
      equipment_type: document.getElementById('equipment_type').value,
      equipment_tag_number: document.getElementById('equipment_tag_number').value,
      inspection_type: document.getElementById('inspection_type').value,
      equipment_name: document.getElementById('equipment_name').value,
      last_inspection_year: document.getElementById('last_inspection_year').value,
      inspection_possible: document.getElementById('inspection_possible').value,
      inspection_date: document.getElementById('inspection_date').value,
      status: document.getElementById('status').value,
      final_status: document.getElementById('final_status').value,
      remarks: document.getElementById('remarks').value,
      observation: document.getElementById('observation').value,
      recommendation: document.getElementById('recommendation').value,
      updated_by: getLoggedInUser(),
      update_date: new Date().toISOString().slice(0, 10)
    };

    updateInspection(payload.equipment_tag_number, payload);
    alert('Inspection update saved');
    window.location.reload();
  });

  document.getElementById('markCompletedBtn').addEventListener('click', () => {
    const tag = document.getElementById('equipment_tag_number').value;
    if (!tag) {
      alert('Enter equipment tag first.');
      return;
    }
    updateInspection(tag, {
      equipment_tag_number: tag,
      final_status: 'Completed',
      updated_by: getLoggedInUser(),
      update_date: new Date().toISOString().slice(0, 10)
    });
    alert('Marked as completed');
    window.location.reload();
  });
}

function setupObservationPage() {
  const form = document.getElementById('observationForm');
  if (!form) return;

  const imageInput = document.getElementById('obsImage');
  const preview = document.getElementById('imagePreview');
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      preview.src = evt.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const observations = readJSON(STORAGE_KEYS.observations);
    observations.push({
      tag_number: document.getElementById('obsTag').value,
      unit: document.getElementById('obsUnit').value,
      location: document.getElementById('obsLocation').value,
      observation: document.getElementById('obsObservation').value,
      recommendation: document.getElementById('obsRecommendation').value,
      created_by: getLoggedInUser(),
      created_date: new Date().toISOString()
    });
    saveJSON(STORAGE_KEYS.observations, observations);
    alert('Observation saved');
    form.reset();
    preview.style.display = 'none';
  });

  document.getElementById('draftEmailBtn').addEventListener('click', () => {
    const subject = encodeURIComponent('ATR Observation');
    const body = encodeURIComponent(`Tag: ${document.getElementById('obsTag').value}\nUnit: ${document.getElementById('obsUnit').value}\nLocation: ${document.getElementById('obsLocation').value}\n\nObservation:\n${document.getElementById('obsObservation').value}\n\nRecommendation:\n${document.getElementById('obsRecommendation').value}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  });
}

function setupAdminPanel() {
  const tbody = document.getElementById('pendingUsersBody');
  if (!tbody) return;

  const renderUsers = () => {
    const users = readJSON(STORAGE_KEYS.users);
    tbody.innerHTML = users.map((user) => {
      const status = user.approved ? 'Approved' : 'Pending';
      const actionBtn = user.approved
        ? '<span>-</span>'
        : `<button class="btn approve-btn" data-user="${user.username}">Approve</button>`;
      return `<tr>
        <td>${user.username}</td>
        <td>${user.role}</td>
        <td>${user.request_date || '-'}</td>
        <td>${status}</td>
        <td>${actionBtn}</td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.approve-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        approveUser(btn.dataset.user, getLoggedInUser());
        renderUsers();
      });
    });
  };
  renderUsers();

  document.getElementById('bulkUploadBtn').addEventListener('click', () => {
    const file = document.getElementById('bulkUploadFile').files[0];
    const msg = document.getElementById('bulkUploadMessage');
    if (!file) {
      msg.textContent = 'Please select a JSON file.';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        if (Array.isArray(payload.inspections)) saveJSON(STORAGE_KEYS.inspections, payload.inspections);
        if (Array.isArray(payload.users)) saveJSON(STORAGE_KEYS.users, payload.users);
        msg.textContent = 'Bulk upload successful.';
        renderUsers();
      } catch {
        msg.textContent = 'Invalid JSON file.';
      }
    };
    reader.readAsText(file);
  });
}

async function setupDashboard() {
  if (document.body.dataset.page !== 'dashboard') return;
  const inspections = readJSON(STORAGE_KEYS.inspections);
  const summary = calculateProgress(inspections);
  document.getElementById('totalCount').textContent = summary.total;
  document.getElementById('completedCount').textContent = summary.completed;
  document.getElementById('inProgressCount').textContent = summary.inProgress;
  document.getElementById('notStartedCount').textContent = summary.notStarted;
  renderCharts(inspections);
}

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializeData();
  } catch (error) {
    console.error(error);
  }

  setHeaderUser();
  applyRoleVisibility();
  setupLogin();
  setupInspectionPage();
  setupObservationPage();
  setupAdminPanel();
  setupDashboard();
});
