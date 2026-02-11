const UNIT_OPTIONS = ['GCU-1', 'GCU-2', 'GPU-1', 'GPU-2', 'HDPE-1', 'HDPE-2', 'LLDPE-1', 'LLDPE-2', 'PP-1', 'PP-2', 'LPG', 'SPHERE', 'YARD', 'FLAKER-1', 'BOG', 'IOP'];
const EQUIPMENT_TYPES = ['Vessel', 'Exchanger', 'Tank', 'Steam Trap', 'Pipeline'];

function getLoggedInUser() {
  return localStorage.getItem('username') || 'WindowsUser';
}

function getTheme() {
  return localStorage.getItem('atr_theme') || 'dark';
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', getTheme());
}

function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  localStorage.setItem('atr_theme', next);
  applyTheme();
}

function setupThemeToggle() {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  btn.addEventListener('click', toggleTheme);
}

function setHeaderUser() {
  const el = document.getElementById('loggedInUser');
  if (el) el.textContent = getLoggedInUser();
}

function applyRoleVisibility() {
  const username = getLoggedInUser();
  document.querySelectorAll('.admin-only').forEach((link) => {
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
    if (!users.some((u) => u.username === username)) {
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

function normalizeInspectionPayload(payload) {
  return {
    id: payload.id ? Number(payload.id) : Date.now(),
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
    recommendation: payload.recommendation || '',
    updated_by: payload.updated_by || getLoggedInUser(),
    update_date: payload.update_date || new Date().toISOString().slice(0, 10)
  };
}

function setupInspectionPage() {
  if (document.body.dataset.page !== 'inspection') return;

  const formPanel = document.getElementById('inspectionFormPanel');
  const form = document.getElementById('inspectionForm');
  const formTitle = document.getElementById('inspectionFormTitle');
  const tableBody = document.getElementById('inspectionTableBody');
  const unitFilter = document.getElementById('unitFilter');
  const tagSearch = document.getElementById('tagSearch');
  const tabs = document.getElementById('equipmentTypeTabs');

  UNIT_OPTIONS.forEach((u) => {
    unitFilter.insertAdjacentHTML('beforeend', `<option value="${u}">${u}</option>`);
    document.getElementById('unit_name').insertAdjacentHTML('beforeend', `<option>${u}</option>`);
  });
  unitFilter.insertAdjacentHTML('afterbegin', '<option value="All">All Units</option>');
  EQUIPMENT_TYPES.forEach((t) => document.getElementById('equipment_type').insertAdjacentHTML('beforeend', `<option>${t}</option>`));

  const typeFilters = ['All', ...EQUIPMENT_TYPES];
  let activeType = 'All';
  let editModeTag = '';

  tabs.innerHTML = typeFilters.map((t) => `<button class="btn tab-btn ${t === 'All' ? 'active' : ''}" data-type="${t}" type="button">${t}</button>`).join('');

  tabs.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeType = btn.dataset.type;
      tabs.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderInspectionRows();
    });
  });

  function getInspections() {
    return readJSON(STORAGE_KEYS.inspections);
  }

  function openForm(title) {
    formPanel.classList.remove('hidden');
    formTitle.textContent = title;
  }

  function closeForm() {
    formPanel.classList.add('hidden');
    form.reset();
    editModeTag = '';
  }

  function fillForm(item) {
    Object.keys(item).forEach((k) => {
      const el = document.getElementById(k);
      if (el) el.value = item[k] || '';
    });
  }

  function renderInspectionRows() {
    const inspections = getInspections();
    const filtered = inspections.filter((item) => {
      const unitOk = unitFilter.value === 'All' || unitFilter.value === item.unit_name;
      const typeOk = activeType === 'All' || activeType === item.equipment_type;
      const tagOk = (item.equipment_tag_number || '').toLowerCase().includes(tagSearch.value.trim().toLowerCase());
      return unitOk && typeOk && tagOk;
    });

    tableBody.innerHTML = filtered.map((item) => {
      const badgeClass = item.final_status === 'Completed' ? 'completed' : item.final_status === 'In Progress' ? 'progress' : 'notstarted';
      return `<tr>
        <td><input type="checkbox" class="inspection-selector" data-tag="${item.equipment_tag_number}" /></td>
        <td>${item.id || '-'}</td>
        <td>${item.equipment_tag_number || '-'}</td>
        <td>${item.unit_name || '-'}</td>
        <td>${item.equipment_type || '-'}</td>
        <td>${item.inspection_type || '-'}</td>
        <td><span class="badge ${badgeClass}">${item.final_status || 'Not Started'}</span></td>
        <td>${item.updated_by || '-'}</td>
        <td><button class="btn edit-equipment-btn" data-tag="${item.equipment_tag_number}" type="button">Edit</button></td>
      </tr>`;
    }).join('');

    tableBody.querySelectorAll('.edit-equipment-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const selected = getInspections().find((i) => i.equipment_tag_number === btn.dataset.tag);
        if (!selected) return;
        editModeTag = selected.equipment_tag_number;
        fillForm(selected);
        openForm('Edit Equipment');
      });
    });
  }

  document.getElementById('openAddEquipmentBtn').addEventListener('click', () => {
    form.reset();
    editModeTag = '';
    openForm('Add Equipment');
  });

  document.getElementById('closeInspectionFormBtn').addEventListener('click', closeForm);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = normalizeInspectionPayload({
      id: document.getElementById('id').value,
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
      updated_by: getLoggedInUser()
    });

    updateInspection(editModeTag || payload.equipment_tag_number, payload);
    alert('Inspection saved.');
    closeForm();
    renderInspectionRows();
  });

  document.getElementById('markCompletedBtn').addEventListener('click', () => {
    const tag = document.getElementById('equipment_tag_number').value;
    if (!tag) return;
    updateInspection(tag, { equipment_tag_number: tag, final_status: 'Completed', updated_by: getLoggedInUser(), update_date: new Date().toISOString().slice(0, 10) });
    renderInspectionRows();
  });

  document.getElementById('markSelectedCompletedBtn').addEventListener('click', () => {
    const selectedTags = Array.from(document.querySelectorAll('.inspection-selector:checked')).map((i) => i.dataset.tag);
    if (!selectedTags.length) {
      alert('Select at least one equipment row.');
      return;
    }
    selectedTags.forEach((tag) => {
      updateInspection(tag, { equipment_tag_number: tag, final_status: 'Completed', updated_by: getLoggedInUser(), update_date: new Date().toISOString().slice(0, 10) });
    });
    renderInspectionRows();
  });

  document.getElementById('selectAllRows').addEventListener('change', (e) => {
    document.querySelectorAll('.inspection-selector').forEach((cb) => {
      cb.checked = e.target.checked;
    });
  });

  unitFilter.addEventListener('change', renderInspectionRows);
  tagSearch.addEventListener('input', renderInspectionRows);
  renderInspectionRows();
}

function wrapText(doc, text, x, yStart, lineHeight, maxWidth) {
  const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line, i) => doc.text(line, x, yStart + i * lineHeight));
  return yStart + lines.length * lineHeight;
}

function setupObservationPage() {
  if (document.body.dataset.page !== 'observation') return;

  const panel = document.getElementById('observationFormPanel');
  const form = document.getElementById('observationForm');
  const imageInput = document.getElementById('obsImage');
  const previewList = document.getElementById('imagePreviewList');
  const tableBody = document.getElementById('observationsTableBody');

  function renderObservationRows() {
    const observations = readJSON(STORAGE_KEYS.observations);
    tableBody.innerHTML = observations.map((item, idx) => `<tr>
      <td>${item.tag_number}</td>
      <td>${item.unit}</td>
      <td>${item.location}</td>
      <td>${item.observation}</td>
      <td>${item.recommendation}</td>
      <td>${(item.images || []).length}</td>
      <td>${(item.created_date || '').slice(0, 10)}</td>
      <td><button class="btn email-observation-btn" data-idx="${idx}" type="button">Email Draft</button></td>
    </tr>`).join('');

    tableBody.querySelectorAll('.email-observation-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const observation = readJSON(STORAGE_KEYS.observations)[Number(btn.dataset.idx)];
        draftObservationEmail(observation);
      });
    });
  }

  function getCurrentFormObservation() {
    const files = Array.from(imageInput.files || []);
    return {
      tag_number: document.getElementById('obsTag').value,
      unit: document.getElementById('obsUnit').value,
      location: document.getElementById('obsLocation').value,
      observation: document.getElementById('obsObservation').value,
      recommendation: document.getElementById('obsRecommendation').value,
      images: files.map((f) => f.name),
      created_by: getLoggedInUser(),
      created_date: new Date().toISOString()
    };
  }

  function draftObservationEmail(observation) {
    const subject = encodeURIComponent('ATR Observation');
    const body = encodeURIComponent(
      `Tag: ${observation.tag_number}\nUnit: ${observation.unit}\nLocation: ${observation.location}\n\nObservation:\n${observation.observation}\n\nRecommendation:\n${observation.recommendation}\n\nImages: ${(observation.images || []).join(', ') || 'N/A'}\n\nNote: Attach images and generated PDF report manually in Outlook.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function downloadObservationPdf(observation) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(16);
    doc.text('ATR-2026 Observation Report', 14, y);
    doc.setFontSize(11);
    y += 10;
    doc.text(`Tag: ${observation.tag_number}`, 14, y);
    y += 7;
    doc.text(`Unit: ${observation.unit}`, 14, y);
    y += 7;
    doc.text(`Location: ${observation.location}`, 14, y);
    y += 10;
    y = wrapText(doc, `Observation: ${observation.observation}`, 14, y, 6, 180);
    y += 4;
    y = wrapText(doc, `Recommendation: ${observation.recommendation}`, 14, y, 6, 180);
    y += 4;
    y = wrapText(doc, `Images: ${(observation.images || []).join(', ') || 'N/A'}`, 14, y, 6, 180);
    doc.save(`ATR_Observation_${observation.tag_number || 'Report'}.pdf`);
  }

  document.getElementById('openObservationFormBtn').addEventListener('click', () => panel.classList.remove('hidden'));
  document.getElementById('closeObservationFormBtn').addEventListener('click', () => panel.classList.add('hidden'));

  imageInput.addEventListener('change', () => {
    previewList.innerHTML = '';
    Array.from(imageInput.files || []).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        previewList.insertAdjacentHTML('beforeend', `<img class="mini-preview" src="${evt.target.result}" alt="preview"/>`);
      };
      reader.readAsDataURL(file);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = getCurrentFormObservation();
    const observations = readJSON(STORAGE_KEYS.observations);
    observations.push(payload);
    saveJSON(STORAGE_KEYS.observations, observations);
    alert('Observation saved.');
    form.reset();
    previewList.innerHTML = '';
    panel.classList.add('hidden');
    renderObservationRows();
  });

  document.getElementById('draftEmailBtn').addEventListener('click', () => draftObservationEmail(getCurrentFormObservation()));
  document.getElementById('downloadObservationPdfBtn').addEventListener('click', () => downloadObservationPdf(getCurrentFormObservation()));

  renderObservationRows();
}

function setupAdminPanel() {
  if (document.body.dataset.page !== 'admin') return;

  const tbody = document.getElementById('pendingUsersBody');
  const message = document.getElementById('bulkUploadMessage');

  function renderUsers() {
    const users = readJSON(STORAGE_KEYS.users);
    tbody.innerHTML = users.map((user) => {
      const action = user.approved ? '-' : `<button class="btn approve-btn" data-user="${user.username}" type="button">Approve</button>`;
      return `<tr>
        <td>${user.username}</td>
        <td>${user.role}</td>
        <td>${user.request_date || '-'}</td>
        <td>${user.approved ? 'Approved' : 'Pending'}</td>
        <td>${action}</td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.approve-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        approveUser(btn.dataset.user, getLoggedInUser());
        renderUsers();
      });
    });
  }

  function applyInspectionExcelRows(rows) {
    const existing = readJSON(STORAGE_KEYS.inspections);
    const byId = new Map(existing.map((item) => [String(item.id), item]));
    let updated = 0;
    let inserted = 0;

    rows.forEach((row) => {
      const normalized = normalizeInspectionPayload(row);
      if (row.id && byId.has(String(row.id))) {
        const old = byId.get(String(row.id));
        Object.assign(old, normalized, { id: Number(row.id) });
        updated += 1;
      } else {
        normalized.id = row.id ? Number(row.id) : Date.now() + inserted;
        existing.push(normalized);
        inserted += 1;
      }
    });

    saveJSON(STORAGE_KEYS.inspections, existing);
    message.textContent = `Excel upload complete. Updated: ${updated}, Added: ${inserted}.`;
  }

  document.getElementById('downloadTemplateBtn').addEventListener('click', () => {
    const templateRow = [{
      id: '', unit_name: 'GCU-1', equipment_type: 'Vessel', equipment_tag_number: 'TAG-001', inspection_type: 'Planned',
      equipment_name: 'Equipment Name', last_inspection_year: '2026', inspection_possible: 'Yes', inspection_date: '2026-01-12',
      status: 'Open', final_status: 'Not Started', remarks: '', observation: '', recommendation: '', updated_by: '', update_date: ''
    }];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateRow);
    XLSX.utils.book_append_sheet(wb, ws, 'inspections_template');
    XLSX.writeFile(wb, 'ATR2026_Inspection_Template.xlsx');
  });

  document.getElementById('bulkUploadBtn').addEventListener('click', () => {
    const file = document.getElementById('bulkUploadFile').files[0];
    if (!file) {
      message.textContent = 'Please select an Excel file first.';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      applyInspectionExcelRows(rows);
    };
    reader.readAsArrayBuffer(file);
  });

  renderUsers();
}

function setupDashboard() {
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
  applyTheme();

  try {
    await initializeData();
  } catch (error) {
    console.error(error);
  }

  setHeaderUser();
  applyRoleVisibility();
  setupThemeToggle();
  setupLogin();
  setupInspectionPage();
  setupObservationPage();
  setupAdminPanel();
  setupDashboard();
});
