const UNIT_OPTIONS = ['GCU-1', 'GCU-2', 'GPU-1', 'GPU-2', 'HDPE-1', 'HDPE-2', 'LLDPE-1', 'LLDPE-2', 'PP-1', 'PP-2', 'LPG', 'SPHERE', 'YARD', 'FLAKER-1', 'BOG', 'IOP'];
const EQUIPMENT_TYPES = ['Pipeline', 'Vessel', 'Exchanger', 'Steam Trap', 'Tank'];
const INSPECTION_STATUS_OPTIONS = ['Scaffolding Prepared', 'Manhole Opened', 'NDT in Progress', 'Insulation Removed', 'Manhole Box-up'];


function buildQuickActions() {
  const pages = [
    { href: 'dashboard.html', label: 'Dashboard' },
    { href: 'inspection.html', label: 'Inspection' },
    { href: 'observation.html', label: 'Observation' },
    { href: 'requisition.html', label: 'Requisition' },
    { href: 'admin.html', label: 'Admin', adminOnly: true }
  ];

  const wrap = document.createElement('div');
  wrap.className = 'quick-actions';
  pages.forEach((p) => {
    if (p.adminOnly && !isAdmin()) return;
    const a = document.createElement('a');
    a.href = p.href;
    a.className = 'btn quick-btn';
    a.textContent = p.label;
    wrap.appendChild(a);
  });
  return wrap;
}

function injectCommonFooter() {
  if (document.querySelector('.site-footer')) return;
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.textContent = '© ATR-2026 Shutdown Inspection Tracker — Designed by Inspection Department';
  document.body.appendChild(footer);
}

function injectQuickActions() {
  if (document.body.dataset.page === 'login') return;
  const content = document.querySelector('.content');
  if (!content || content.querySelector('.quick-actions')) return;
  content.insertBefore(buildQuickActions(), content.firstChild.nextSibling);
}


function getLoggedInUser() {
  return localStorage.getItem(STORAGE_KEYS.sessionUser) || 'WindowsUser';
}

function getCurrentUserObj() {
  return getUser(getLoggedInUser());
}

function isAdmin() {
  const user = getCurrentUserObj();
  return user && user.role === 'admin';
}

function getTheme() {
  return localStorage.getItem('atr_theme') || 'dark';
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', getTheme());
}

function setupThemeToggle() {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  btn.onclick = () => {
    localStorage.setItem('atr_theme', getTheme() === 'dark' ? 'light' : 'dark');
    applyTheme();
  };
}

function setHeaderUser() {
  const el = document.getElementById('loggedInUser');
  if (el) el.textContent = getLoggedInUser();
}

function requireAuth() {
  if (document.body.dataset.page === 'login') return true;
  const user = getCurrentUserObj();
  if (!user || !user.approved) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

function applyRoleVisibility() {
  document.querySelectorAll('.admin-only').forEach((el) => {
    el.style.display = isAdmin() ? 'block' : 'none';
  });
  if (document.body.dataset.page === 'admin' && !isAdmin()) {
    alert('Admin access only');
    window.location.href = 'dashboard.html';
  }
}

function setupLogin() {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const msg = document.getElementById('authMessage');
  const pwd = document.getElementById('password');
  const showPwd = document.getElementById('showPasswordToggle');

  const syncJsonbinBinId = document.getElementById('syncJsonbinBinId');
  const syncJsonbinApiKey = document.getElementById('syncJsonbinApiKey');
  const syncEnabled = document.getElementById('syncEnabled');

  function applySyncConfigFromForm() {
    if (!syncEnabled) return;
    setCloudConfig({
      enabled: syncEnabled.checked,
      jsonbinBinId: syncJsonbinBinId?.value || '',
      jsonbinApiKey: syncJsonbinApiKey?.value || ''
    });
  }

  const config = getCloudConfig();
  if (syncJsonbinBinId) syncJsonbinBinId.value = config.jsonbinBinId || '';
  if (syncJsonbinApiKey) syncJsonbinApiKey.value = config.jsonbinApiKey || '';
  if (syncEnabled) syncEnabled.checked = Boolean(config.enabled);

  if (showPwd && pwd) {
    showPwd.addEventListener('change', () => {
      pwd.type = showPwd.checked ? 'text' : 'password';
    });
  }

  [syncJsonbinBinId, syncJsonbinApiKey, syncEnabled].forEach((el) => {
    if (!el) return;
    el.addEventListener('change', applySyncConfigFromForm);
    el.addEventListener('input', () => {
      if (el === syncJsonbinApiKey || el === syncJsonbinBinId) applySyncConfigFromForm();
    });
  });

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      applySyncConfigFromForm();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      const user = getUser(username);

      if (!user) {
        if (msg) msg.textContent = 'User not found. Please create account request.';
        return;
      }

      if (user.password !== password) {
        if (msg) msg.textContent = 'Password is wrong.';
        alert('Password is wrong.');
        return;
      }

      if (!user.approved) {
        if (msg) msg.textContent = 'Account pending admin approval.';
        return;
      }

      localStorage.setItem(STORAGE_KEYS.sessionUser, username);
      localStorage.setItem('username', username);
      window.location.assign('dashboard.html');
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      applySyncConfigFromForm();

      const username = document.getElementById('newUsername').value.trim();
      const password = document.getElementById('newPassword').value;
      const role = document.getElementById('newRole').value;

      if (!username || !password) {
        if (msg) msg.textContent = 'Username and password are required for account request.';
        return;
      }

      if (getUser(username)) {
        if (msg) msg.textContent = 'User already exists. Please login.';
        return;
      }

      requestAccess({
        username,
        password,
        role,
        approved: false,
        request_date: new Date().toISOString().slice(0, 10),
        approved_by: ''
      });

      if (msg) msg.textContent = 'Account request submitted. Ask admin to approve from Admin Panel.';
      signupForm.reset();
    });
  }
}

function normalizeInspectionPayload(payload) {
  return {
    id: payload.id || '',
    unit_name: payload.unit_name || '',
    equipment_type: payload.equipment_type || '',
    equipment_tag_number: payload.equipment_tag_number || '',
    inspection_type: payload.inspection_type || '',
    equipment_name: payload.equipment_name || '',
    last_inspection_year: payload.last_inspection_year || '',
    inspection_possible: payload.inspection_possible || 'Yes',
    inspection_date: payload.inspection_date || '',
    status: payload.status || '',
    final_status: payload.final_status || 'Not Started',
    remarks: payload.remarks || '',
    observation: payload.observation || '',
    recommendation: payload.recommendation || ''
  };
}

function setupInspectionPage() {
  if (document.body.dataset.page !== 'inspection') return;

  const unitFilter = document.getElementById('unitFilter');
  const tagSearch = document.getElementById('tagSearch');
  const tabs = document.getElementById('equipmentTypeTabs');
  const unitLists = document.getElementById('unitWiseLists');
  const formPanel = document.getElementById('inspectionFormPanel');
  const form = document.getElementById('inspectionForm');
  const statusSelect = document.getElementById('status');

  UNIT_OPTIONS.forEach((u) => {
    unitFilter.insertAdjacentHTML('beforeend', `<option value="${u}">${u}</option>`);
    document.getElementById('unit_name').insertAdjacentHTML('beforeend', `<option>${u}</option>`);
  });
  unitFilter.insertAdjacentHTML('afterbegin', '<option value="All">All Units</option>');
  EQUIPMENT_TYPES.forEach((t) => document.getElementById('equipment_type').insertAdjacentHTML('beforeend', `<option>${t}</option>`));
  INSPECTION_STATUS_OPTIONS.forEach((s) => statusSelect.insertAdjacentHTML('beforeend', `<option>${s}</option>`));

  const typeFilters = ['All', ...EQUIPMENT_TYPES];
  let activeType = 'All';
  let editId = '';

  tabs.innerHTML = typeFilters.map((t) => `<button class="btn tab-btn ${t === 'All' ? 'active' : ''}" data-type="${t}" type="button">${t}</button>`).join('');
  tabs.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.onclick = () => {
      activeType = btn.dataset.type;
      tabs.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderInspectionList();
    };
  });

  function openForm(title) {
    document.getElementById('inspectionFormTitle').textContent = title;
    formPanel.classList.remove('hidden');
  }

  function closeForm() {
    formPanel.classList.add('hidden');
    form.reset();
    editId = '';
  }

  function filteredRows() {
    return getCollection('inspections').filter((r) => {
      const okUnit = unitFilter.value === 'All' || r.unit_name === unitFilter.value;
      const okType = activeType === 'All' || r.equipment_type === activeType;
      const okTag = (r.equipment_tag_number || '').toLowerCase().includes(tagSearch.value.trim().toLowerCase());
      return okUnit && okType && okTag;
    });
  }

  function renderInspectionList() {
    const rows = filteredRows();
    const grouped = {};
    rows.forEach((r) => {
      if (!grouped[r.unit_name]) grouped[r.unit_name] = [];
      grouped[r.unit_name].push(r);
    });

    const units = Object.keys(grouped);
    if (!units.length) {
      unitLists.innerHTML = '<p class="hint">No equipment found.</p>';
      return;
    }

    unitLists.innerHTML = units.map((unit) => `
      <section class="unit-panel">
        <div class="unit-panel-head">
          <h4>${unit}</h4>
          <button class="btn unit-select-all" data-unit="${unit}" type="button">Select All in ${unit}</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Select</th><th>Tag</th><th>Type</th><th>Status</th><th>Final</th><th>Action</th></tr>
            </thead>
            <tbody>
              ${grouped[unit].map((r) => `
                <tr>
                  <td><input type="checkbox" class="inspection-selector" data-id="${r.id}" data-unit="${unit}" /></td>
                  <td>${r.equipment_tag_number}</td>
                  <td>${r.equipment_type}</td>
                  <td>${r.status || '-'}</td>
                  <td>${r.final_status || '-'}</td>
                  <td><button class="btn edit-equipment" data-id="${r.id}" type="button">Edit</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `).join('');

    unitLists.querySelectorAll('.unit-select-all').forEach((btn) => {
      btn.onclick = () => {
        unitLists.querySelectorAll(`.inspection-selector[data-unit="${btn.dataset.unit}"]`).forEach((cb) => { cb.checked = true; });
      };
    });

    unitLists.querySelectorAll('.edit-equipment').forEach((btn) => {
      btn.onclick = () => {
        const row = getCollection('inspections').find((r) => r.id === btn.dataset.id);
        if (!row) return;
        editId = row.id;
        Object.entries(row).forEach(([k, v]) => {
          const el = document.getElementById(k);
          if (el) el.value = v || '';
        });
        openForm('Edit Equipment');
      };
    });
  }

  document.getElementById('openAddEquipmentBtn').onclick = () => { closeForm(); openForm('Add Equipment'); };
  document.getElementById('closeInspectionFormBtn').onclick = closeForm;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = normalizeInspectionPayload({
      id: editId,
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
      recommendation: document.getElementById('recommendation').value
    });
    upsertById('inspections', payload, 'INSP');
    closeForm();
    renderInspectionList();
  });

  document.getElementById('markCompletedBtn').onclick = () => {
    const tag = document.getElementById('equipment_tag_number').value;
    const row = getCollection('inspections').find((r) => r.equipment_tag_number === tag);
    if (row) upsertById('inspections', { ...row, final_status: 'Completed' }, 'INSP');
    renderInspectionList();
  };

  document.getElementById('markSelectedCompletedBtn').onclick = () => {
    const ids = Array.from(document.querySelectorAll('.inspection-selector:checked')).map((i) => i.dataset.id);
    ids.forEach((id) => {
      const row = getCollection('inspections').find((r) => r.id === id);
      if (row) upsertById('inspections', { ...row, final_status: 'Completed' }, 'INSP');
    });
    renderInspectionList();
  };

  unitFilter.onchange = renderInspectionList;
  tagSearch.oninput = renderInspectionList;
  renderInspectionList();
}

async function filesToPaths(fileList, observationId, tagNo) {
  const paths = [];
  const safeTag = sanitizeName(tagNo || 'tag');
  let idx = 1;
  for (const file of Array.from(fileList)) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const standardizedName = `${safeTag}_${observationId}_${String(idx).padStart(2, '0')}.${ext}`;
    const imagePath = `data/images/${standardizedName}`;
    const data = await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = (e) => resolve(e.target.result);
      fr.readAsDataURL(file);
    });
    saveImageDataAtPath(imagePath, data);
    paths.push(imagePath);
    idx += 1;
  }
  return paths;
}

function statusClass(status) {
  if (status === 'Not Started') return 'status-red';
  if (status === 'In Progress') return 'status-yellow';
  if (status === 'Completed') return 'status-green';
  return '';
}

function setupObservationPage() {
  if (document.body.dataset.page !== 'observation') return;

  const form = document.getElementById('observationForm');
  const panel = document.getElementById('observationFormPanel');
  const imageInput = document.getElementById('obsImage');
  const preview = document.getElementById('imagePreviewList');
  const tbody = document.getElementById('observationsTableBody');

  function render() {
    const rows = getCollection('observations');
    tbody.innerHTML = rows.map((r) => `
      <tr>
        <td>${r.tag_number}</td><td>${r.unit}</td><td>${r.location}</td>
        <td>${r.observation}</td><td>${r.recommendation}</td>
        <td><select class="obs-status ${statusClass(r.status)}" data-id="${r.id}">
          ${['Not Started','In Progress','Completed'].map((s) => `<option ${r.status===s?'selected':''}>${s}</option>`).join('')}
        </select></td>
        <td>${(r.images || []).map((p) => `<img class="mini-preview clickable-img" data-src="${getImageData(p)}" src="${getImageData(p)}" alt="img"/>`).join('')}</td>
        <td>
          <button class="btn email-obs" data-id="${r.id}" type="button">Draft Email</button>
          ${isAdmin() ? `<button class="btn delete-obs" data-id="${r.id}" type="button">Delete</button>` : ''}
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.obs-status').forEach((s) => {
      s.onchange = () => {
        const row = getCollection('observations').find((x) => x.id === s.dataset.id);
        if (row) upsertById('observations', { ...row, status: s.value }, 'OBS');
        render();
      };
    });

    tbody.querySelectorAll('.delete-obs').forEach((btn) => {
      btn.onclick = () => { deleteById('observations', btn.dataset.id); render(); };
    });

    tbody.querySelectorAll('.email-obs').forEach((btn) => {
      btn.onclick = () => {
        const row = getCollection('observations').find((x) => x.id === btn.dataset.id);
        if (!row) return;
        const subject = encodeURIComponent(`ATR Observation - ${row.tag_number}`);
        const body = encodeURIComponent(`Tag: ${row.tag_number}\nUnit: ${row.unit}\nLocation: ${row.location}\n\nDescription:\n${row.observation}\n\nRecommendation:\n${row.recommendation}\n\nImage paths:\n${(row.images || []).join('\n')}\n\n(Outlook note: attach images from saved paths.)`);
        window.location.href = `mailto:?subject=${subject}&body=${body}&attachment=${encodeURIComponent((row.images||[]).join(';'))}`;
      };
    });

    tbody.querySelectorAll('.clickable-img').forEach((img) => {
      img.onclick = () => window.open(img.dataset.src, '_blank');
    });
  }

  document.getElementById('openObservationFormBtn').onclick = () => panel.classList.remove('hidden');
  document.getElementById('closeObservationFormBtn').onclick = () => panel.classList.add('hidden');

  imageInput.onchange = () => {
    preview.innerHTML = '';
    Array.from(imageInput.files || []).forEach((file) => {
      const fr = new FileReader();
      fr.onload = (e) => preview.insertAdjacentHTML('beforeend', `<img class="mini-preview" src="${e.target.result}" alt="preview"/>`);
      fr.readAsDataURL(file);
    });
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const observationId = generateId('OBS');
    const tagNo = document.getElementById('obsTag').value;
    const imagePaths = await filesToPaths(imageInput.files || [], observationId, tagNo);
    upsertById('observations', {
      id: observationId,
      tag_number: tagNo,
      unit: document.getElementById('obsUnit').value,
      location: document.getElementById('obsLocation').value,
      observation: document.getElementById('obsObservation').value,
      recommendation: document.getElementById('obsRecommendation').value,
      status: document.getElementById('obsStatus').value,
      images: imagePaths
    }, 'OBS');
    form.reset();
    preview.innerHTML = '';
    panel.classList.add('hidden');
    render();
  });

  render();
}

function setupRequisitionPage() {
  if (document.body.dataset.page !== 'requisition') return;
  const formPanel = document.getElementById('requisitionFormPanel');
  const form = document.getElementById('requisitionForm');
  const tbody = document.getElementById('requisitionTableBody');
  const result = document.getElementById('reqResult');
  const status2Wrap = document.getElementById('status2Wrap');
  let editId = '';

  UNIT_OPTIONS.forEach((u) => document.getElementById('reqUnit').insertAdjacentHTML('beforeend', `<option>${u}</option>`));

  function render() {
    tbody.innerHTML = getCollection('requisitions').map((r) => `
      <tr>
        <td>${r.tag_no}</td><td>${r.job_description}</td><td>${r.location}</td><td>${r.unit}</td>
        <td>${r.module_type}</td><td>${r.result}</td><td>${r.status_2 || '-'}</td><td>${r.remarks || '-'}</td>
        <td>
          <button class="btn edit-req" data-id="${r.id}" type="button">Edit</button>
          ${isAdmin() ? `<button class="btn delete-req" data-id="${r.id}" type="button">Delete</button>` : ''}
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.edit-req').forEach((btn) => {
      btn.onclick = () => {
        const row = getCollection('requisitions').find((x) => x.id === btn.dataset.id);
        if (!row) return;
        editId = row.id;
        const fieldMap = {
          tag_no: 'reqTag',
          module_type: 'reqType',
          job_description: 'reqJobDescription',
          location: 'reqLocation',
          unit: 'reqUnit',
          job_size: 'reqJobSize',
          requisition_datetime: 'reqDateTime',
          result: 'reqResult',
          status_2: 'reqStatus2',
          remarks: 'reqRemarks'
        };
        Object.entries(fieldMap).forEach(([k, id]) => {
          const el = document.getElementById(id);
          if (el) el.value = row[k] || '';
        });
        status2Wrap.classList.toggle('hidden', row.result !== 'Reshoot');
        formPanel.classList.remove('hidden');
      };
    });

    tbody.querySelectorAll('.delete-req').forEach((btn) => {
      btn.onclick = () => { deleteById('requisitions', btn.dataset.id); render(); };
    });
  }

  document.getElementById('openRequisitionFormBtn').onclick = () => {
    editId = '';
    form.reset();
    status2Wrap.classList.add('hidden');
    formPanel.classList.remove('hidden');
  };

  document.getElementById('closeRequisitionFormBtn').onclick = () => formPanel.classList.add('hidden');

  result.onchange = () => status2Wrap.classList.toggle('hidden', result.value !== 'Reshoot');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    upsertById('requisitions', {
      id: editId,
      tag_no: document.getElementById('reqTag').value,
      module_type: document.getElementById('reqType').value,
      job_description: document.getElementById('reqJobDescription').value,
      location: document.getElementById('reqLocation').value,
      unit: document.getElementById('reqUnit').value,
      job_size: document.getElementById('reqJobSize').value,
      requisition_datetime: document.getElementById('reqDateTime').value,
      result: document.getElementById('reqResult').value,
      status_2: document.getElementById('reqStatus2').value,
      remarks: document.getElementById('reqRemarks').value
    }, 'REQ');
    formPanel.classList.add('hidden');
    render();
  });

  render();
}

function setupAdminPanel() {
  if (document.body.dataset.page !== 'admin') return;

  const tbody = document.getElementById('pendingUsersBody');
  const message = document.getElementById('bulkUploadMessage');
  const uploadTypeSelect = document.getElementById('uploadTypeSelect');
  const defaultUploadUnit = document.getElementById('defaultUploadUnit');

  function renderUsers() {
    const users = getCollection('users');
    tbody.innerHTML = users.map((u) => `<tr>
      <td>${u.username}</td><td>${u.role}</td><td>${u.request_date || '-'}</td><td>${u.approved ? 'Approved' : 'Pending'}</td>
      <td>${u.approved ? '-' : `<button class="btn approve-user" data-user="${u.username}" type="button">Approve</button>`}</td>
    </tr>`).join('');
    tbody.querySelectorAll('.approve-user').forEach((btn) => {
      btn.onclick = () => { approveUser(btn.dataset.user, getLoggedInUser()); renderUsers(); };
    });
  }

  function applyInspectionExcelRows(rows) {
    rows.forEach((row) => {
      const payload = normalizeInspectionPayload(row);
      if (!payload.unit_name && defaultUploadUnit.value) payload.unit_name = defaultUploadUnit.value;
      if (row.id) payload.id = String(row.id);
      upsertById('inspections', payload, 'INSP');
    });
  }

  function applyUsersExcelRows(rows) {
    const users = getCollection('users');
    const byUsername = new Map(users.map((u) => [u.username, u]));
    rows.forEach((row) => {
      const username = String(row.username || '').trim();
      if (!username) return;
      const candidate = {
        username,
        password: row.password || 'pass@123',
        role: row.role || 'inspector',
        approved: String(row.approved).toLowerCase() === 'true' || row.approved === true,
        request_date: row.request_date || new Date().toISOString().slice(0, 10),
        approved_by: row.approved_by || ''
      };
      if (byUsername.has(username)) Object.assign(byUsername.get(username), candidate);
      else users.push(candidate);
    });
    saveCollection('users', users.map((u) => withAudit(u, true)));
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    if (uploadTypeSelect.value === 'users') {
      const ws = XLSX.utils.json_to_sheet([{ username: 'new.user', password: 'pass@123', role: 'inspector', approved: false, request_date: '2026-01-20', approved_by: '' }]);
      XLSX.utils.book_append_sheet(wb, ws, 'users_template');
      XLSX.writeFile(wb, 'ATR2026_Users_Template.xlsx');
      return;
    }
    const ws = XLSX.utils.json_to_sheet([{ id: '', unit_name: 'GCU-1', equipment_type: 'Vessel', equipment_tag_number: 'TAG-001', inspection_type: 'Planned', equipment_name: 'Eq Name', status: 'Scaffolding Prepared', final_status: 'Not Started' }]);
    XLSX.utils.book_append_sheet(wb, ws, 'inspections_template');
    XLSX.writeFile(wb, 'ATR2026_Inspection_Template.xlsx');
  }

  async function exportAllRuntimeData() {
    const snapshot = buildDatabaseFilesPayload();
    downloadTextFile('atr2026_runtime_backup.json', JSON.stringify(snapshot, null, 2));
    message.textContent = 'Runtime JSON backup downloaded. JSONBin auto-sync runs on each save/delete/submit.';
  }

  async function syncNow() {
    await syncAllToCloud();
    message.textContent = 'JSONBin sync complete.';
  }

  document.getElementById('downloadTemplateBtn').onclick = downloadTemplate;
  document.getElementById('bulkUploadBtn').onclick = () => {
    const file = document.getElementById('bulkUploadFile').files[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      if (uploadTypeSelect.value === 'users') applyUsersExcelRows(rows);
      else applyInspectionExcelRows(rows);
      message.textContent = `Upload success: ${rows.length} rows processed.`;
      renderUsers();
    };
    fr.readAsArrayBuffer(file);
  };

  const exportBtn = document.getElementById('exportAllDataBtn');
  if (exportBtn) exportBtn.onclick = exportAllRuntimeData;
  const syncBtn = document.getElementById('syncGithubBtn');
  if (syncBtn) syncBtn.onclick = () => syncNow().catch((err) => { message.textContent = err.message; });

  renderUsers();
}

function setupDashboard() {
  if (document.body.dataset.page !== 'dashboard') return;
  const inspections = getCollection('inspections');
  const summary = calculateProgress(inspections);
  document.getElementById('totalCount').textContent = summary.total;
  document.getElementById('completedCount').textContent = summary.completed;
  document.getElementById('inProgressCount').textContent = summary.inProgress;
  document.getElementById('notStartedCount').textContent = summary.notStarted;
  document.getElementById('todaysProgressCount').textContent = summary.todaysProgress;
  renderCharts(inspections);
}

window.addEventListener('DOMContentLoaded', async () => {
  applyTheme();
  await initializeData();
  setupThemeToggle();
  setupLogin();
  startRealtimeSync();
  injectCommonFooter();
  if (!requireAuth()) return;
  setHeaderUser();
  applyRoleVisibility();
  injectQuickActions();
  injectCommonFooter();
  setupInspectionPage();
  setupObservationPage();
  setupRequisitionPage();
  setupAdminPanel();
  setupDashboard();

  window.addEventListener('atr-db-updated', () => {
    if (document.body.dataset.page !== 'login') window.location.reload();
  });
});
