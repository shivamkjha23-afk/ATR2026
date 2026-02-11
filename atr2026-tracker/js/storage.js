const DATA_KEYS = {
  inspections: 'atr2026_inspections',
  users: 'atr2026_users',
  observations: 'atr2026_observations'
};

async function loadJSON(path, key) {
  const cached = localStorage.getItem(key);
  if (cached) {
    return JSON.parse(cached);
  }
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load: ${path}`);
  const data = await res.json();
  localStorage.setItem(key, JSON.stringify(data));
  return data;
}

function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function addInspection(record) {
  const inspections = JSON.parse(localStorage.getItem(DATA_KEYS.inspections) || '[]');
  record.id = record.id || `INS-${Date.now()}`;
  inspections.push(record);
  saveJSON(DATA_KEYS.inspections, inspections);
  return record;
}

function updateInspection(tagNumber, updateFields) {
  const inspections = JSON.parse(localStorage.getItem(DATA_KEYS.inspections) || '[]');
  const index = inspections.findIndex((item) => item.equipment_tag_number === tagNumber);
  if (index === -1) return null;
  inspections[index] = {
    ...inspections[index],
    ...updateFields,
    update_date: new Date().toISOString().slice(0, 10)
  };
  saveJSON(DATA_KEYS.inspections, inspections);
  return inspections[index];
}

function requestAccess(username) {
  const users = JSON.parse(localStorage.getItem(DATA_KEYS.users) || '[]');
  const existing = users.find((u) => u.username === username);
  if (existing) return existing;
  const request = {
    username,
    role: 'viewer',
    approved: false,
    request_date: new Date().toISOString().slice(0, 10),
    approved_by: ''
  };
  users.push(request);
  saveJSON(DATA_KEYS.users, users);
  return request;
}

function approveUser(username, approvedBy = 'shivam.jha') {
  const users = JSON.parse(localStorage.getItem(DATA_KEYS.users) || '[]');
  const user = users.find((u) => u.username === username);
  if (!user) return null;
  user.approved = true;
  user.role = user.role || 'inspector';
  user.approved_by = approvedBy;
  saveJSON(DATA_KEYS.users, users);
  return user;
}

window.ATRStorage = {
  DATA_KEYS,
  loadJSON,
  saveJSON,
  addInspection,
  updateInspection,
  requestAccess,
  approveUser
};
