import {
  addInspectionUpdate,
  updateInspectionUpdate,
  deleteInspectionUpdate,
  listenInspectionUpdates
} from './inspectionService.js';
import {
  addObservation,
  updateObservation,
  deleteObservation,
  listenObservations,
  addRequisition,
  updateRequisition,
  deleteRequisition,
  listenRequisitions
} from './firestoreService.js';
import { uploadInspectionImage } from './storageService.js';
import { requireAuth, logout, isAdmin } from './auth.js';

let currentUser = null;
let editingInspectionId = '';
let editingObservationId = '';
let editingRequisitionId = '';

const inspectionDefaults = {
  unit_name: '', equipment_type: '', equipment_tag_number: '', inspection_type: '', equipment_name: '',
  last_inspection_year: '', inspection_possible: 'Yes', inspection_date: '', status: 'Scaffolding Prepared',
  final_status: 'Not Started', remarks: '', observation: '', recommendation: ''
};

function toggleModal(id, show) {
  document.getElementById(id).classList.toggle('hidden', !show);
}

function rowActions(id, type) {
  const deleteBtn = isAdmin(currentUser?.email)
    ? `<button class="btn danger" data-action="delete-${type}" data-id="${id}">Delete</button>`
    : '';
  return `<button class="btn" data-action="edit-${type}" data-id="${id}">Edit</button>${deleteBtn}`;
}

function attachGlobalEvents() {
  document.addEventListener('click', async (event) => {
    const action = event.target.dataset.action;
    if (!action) return;
    const id = event.target.dataset.id;

    if (action === 'edit-inspection') {
      editingInspectionId = id;
      const row = event.target.closest('tr');
      document.querySelectorAll('#inspectionForm [name]').forEach((input) => {
        input.value = row.dataset[input.name] || '';
      });
      toggleModal('inspectionModal', true);
    }

    if (action === 'delete-inspection' && isAdmin(currentUser?.email)) {
      await deleteInspectionUpdate(id);
    }

    if (action === 'edit-observation') {
      editingObservationId = id;
      const row = event.target.closest('tr');
      document.querySelectorAll('#observationForm [name]').forEach((input) => {
        if (input.type !== 'file') input.value = row.dataset[input.name] || '';
      });
      toggleModal('observationModal', true);
    }

    if (action === 'delete-observation' && isAdmin(currentUser?.email)) {
      await deleteObservation(id);
    }

    if (action === 'edit-requisition') {
      editingRequisitionId = id;
      const row = event.target.closest('tr');
      document.querySelectorAll('#requisitionForm [name]').forEach((input) => {
        input.value = row.dataset[input.name] || '';
      });
      toggleModal('requisitionModal', true);
    }

    if (action === 'delete-requisition' && isAdmin(currentUser?.email)) {
      await deleteRequisition(id);
    }
  });
}

function renderInspectionTable(rows) {
  const tbody = document.getElementById('inspectionUpdatesBody');
  tbody.innerHTML = rows.map((r) => `
    <tr data-unit_name="${r.unit_name || ''}" data-equipment_type="${r.equipment_type || ''}" data-equipment_tag_number="${r.equipment_tag_number || ''}" data-inspection_type="${r.inspection_type || ''}" data-equipment_name="${r.equipment_name || ''}" data-last_inspection_year="${r.last_inspection_year || ''}" data-inspection_possible="${r.inspection_possible || ''}" data-inspection_date="${r.inspection_date || ''}" data-status="${r.status || ''}" data-final_status="${r.final_status || ''}" data-remarks="${r.remarks || ''}" data-observation="${r.observation || ''}" data-recommendation="${r.recommendation || ''}">
      <td>${r.unit_name || ''}</td><td>${r.equipment_type || ''}</td><td>${r.equipment_tag_number || ''}</td>
      <td>${r.status || ''}</td><td>${r.final_status || ''}</td><td>${r.update_date || ''}</td>
      <td>${rowActions(r.id, 'inspection')}</td>
    </tr>
  `).join('');
}

function renderObservationTable(rows) {
  const tbody = document.getElementById('observationsBody');
  tbody.innerHTML = rows.map((r) => `
    <tr data-tag="${r.tag || ''}" data-description="${r.description || ''}" data-location="${r.location || ''}" data-unit="${r.unit || ''}" data-status="${r.status || ''}">
      <td>${r.tag || ''}</td><td>${r.description || ''}</td><td>${r.location || ''}</td><td>${r.unit || ''}</td>
      <td>${r.status || ''}</td><td>${r.imageUrl ? `<a href="${r.imageUrl}" target="_blank">Image</a>` : '-'}</td>
      <td>${rowActions(r.id, 'observation')}</td>
    </tr>
  `).join('');
}

function renderRequisitionTable(rows) {
  const tbody = document.getElementById('requisitionsBody');
  tbody.innerHTML = rows.map((r) => `
    <tr data-type="${r.type || ''}" data-tagno="${r.tagNo || ''}" data-jobdescription="${r.jobDescription || ''}" data-location="${r.location || ''}" data-unit="${r.unit || ''}" data-jobsize="${r.jobSize || ''}" data-result="${r.result || ''}" data-status2="${r.status2 || ''}" data-remarks="${r.remarks || ''}">
      <td>${r.type || ''}</td><td>${r.tagNo || ''}</td><td>${r.unit || ''}</td><td>${r.status2 || ''}</td><td>${r.result || ''}</td>
      <td>${rowActions(r.id, 'requisition')}</td>
    </tr>
  `).join('');
}

async function loadForm(path, target) {
  const html = await fetch(path).then((r) => r.text());
  document.getElementById(target).innerHTML = html;
}

async function init() {
  currentUser = await requireAuth('../login.html');
  if (!currentUser) return;

  document.getElementById('loggedInUser').textContent = currentUser.email;
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await logout();
    window.location.href = '../login.html';
  });

  await Promise.all([
    loadForm('../forms/inspection-update-form.html', 'inspectionFormContainer'),
    loadForm('../forms/observation-form.html', 'observationFormContainer'),
    loadForm('../forms/requisition-form.html', 'requisitionFormContainer')
  ]);

  document.getElementById('openInspectionModalBtn').onclick = () => {
    editingInspectionId = '';
    document.getElementById('inspectionForm').reset();
    Object.entries(inspectionDefaults).forEach(([k, v]) => (document.querySelector(`#inspectionForm [name="${k}"]`).value = v));
    toggleModal('inspectionModal', true);
  };
  document.getElementById('openObservationModalBtn').onclick = () => {
    editingObservationId = '';
    document.getElementById('observationForm').reset();
    toggleModal('observationModal', true);
  };
  document.getElementById('openRequisitionModalBtn').onclick = () => {
    editingRequisitionId = '';
    document.getElementById('requisitionForm').reset();
    toggleModal('requisitionModal', true);
  };

  document.querySelectorAll('.modal .close').forEach((button) => {
    button.onclick = () => toggleModal(button.dataset.modal, false);
  });

  document.getElementById('inspectionForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.target).entries());
    if (editingInspectionId) await updateInspectionUpdate(editingInspectionId, formData);
    else await addInspectionUpdate(formData);
    toggleModal('inspectionModal', false);
    event.target.reset();
  });

  document.getElementById('observationForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.target).entries());
    const imageFile = document.getElementById('observationImage').files[0];
    if (imageFile) {
      formData.imageUrl = await uploadInspectionImage(imageFile);
    } else if (formData.imageUrl) {
      formData.imageUrl = String(formData.imageUrl).trim();
    }
    formData.enteredBy = currentUser.email;
    if (editingObservationId) await updateObservation(editingObservationId, formData);
    else await addObservation(formData);
    toggleModal('observationModal', false);
    event.target.reset();
  });

  document.getElementById('requisitionForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.target).entries());
    formData.enteredBy = currentUser.email;
    if (editingRequisitionId) await updateRequisition(editingRequisitionId, formData);
    else await addRequisition(formData);
    toggleModal('requisitionModal', false);
    event.target.reset();
  });

  attachGlobalEvents();
  listenInspectionUpdates(renderInspectionTable);
  listenObservations(renderObservationTable);
  listenRequisitions(renderRequisitionTable);
}

init();
