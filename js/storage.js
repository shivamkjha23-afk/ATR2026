
const STORAGE_KEYS = {
  inspections: 'atr2026_inspections',
  users: 'atr2026_users',
  observations: 'atr2026_observations'
};

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function readJSON(key) {
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function addInspection(record) {
  const inspections = readJSON(STORAGE_KEYS.inspections);
  inspections.push(record);
  saveJSON(STORAGE_KEYS.inspections, inspections);
}

function updateInspection(tagNumber, payload) {
  const inspections = readJSON(STORAGE_KEYS.inspections);
  const index = inspections.findIndex((row) => row.equipment_tag_number === tagNumber);
  if (index >= 0) {
    inspections[index] = { ...inspections[index], ...payload };
  } else {
    inspections.push(payload);
  }
  saveJSON(STORAGE_KEYS.inspections, inspections);
}

function requestAccess(user) {
  const users = readJSON(STORAGE_KEYS.users);
  users.push(user);
  saveJSON(STORAGE_KEYS.users, users);
}

function approveUser(username, approvedBy = 'shivam.jha') {
  const users = readJSON(STORAGE_KEYS.users).map((user) => (
    user.username === username
      ? { ...user, approved: true, approved_by: approvedBy }
      : user
  ));
  saveJSON(STORAGE_KEYS.users, users);
}

async function initializeData() {
  if (!localStorage.getItem(STORAGE_KEYS.inspections)) {
    const inspections = await loadJSON('./data/inspections.json');
    saveJSON(STORAGE_KEYS.inspections, inspections);
  }
  if (!localStorage.getItem(STORAGE_KEYS.users)) {
    const users = await loadJSON('./data/users.json');
    saveJSON(STORAGE_KEYS.users, users);
  }
  if (!localStorage.getItem(STORAGE_KEYS.observations)) {
    saveJSON(STORAGE_KEYS.observations, []);
  }
}
