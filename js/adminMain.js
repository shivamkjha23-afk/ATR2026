import { setupProtectedPage } from './commonPage.js';
import { isAdmin } from './auth.js';
import { addInspectionUpdate } from './inspectionService.js';

const TEMPLATE_HEADERS = [
  'unit_name', 'equipment_type', 'equipment_tag_number', 'inspection_type', 'equipment_name',
  'last_inspection_year', 'inspection_possible', 'inspection_date', 'status', 'final_status',
  'remarks', 'observation', 'recommendation'
];

function message(text, isError = false) {
  const el = document.getElementById('adminMessage');
  el.textContent = text;
  el.style.color = isError ? '#ef4444' : '';
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]);
  XLSX.utils.book_append_sheet(wb, ws, 'inspection_updates_template');
  XLSX.writeFile(wb, 'inspection_updates_template.xlsx');
}

async function uploadExcel() {
  const input = document.getElementById('inspectionExcelFile');
  const file = input.files?.[0];
  if (!file) {
    message('Please choose an Excel file first.', true);
    return;
  }

  const data = await file.arrayBuffer();
  const wb = XLSX.read(data);
  const sheetName = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

  if (!rows.length) {
    message('No rows found in Excel.', true);
    return;
  }

  let success = 0;
  for (const row of rows) {
    const payload = {};
    TEMPLATE_HEADERS.forEach((h) => {
      payload[h] = row[h] ?? '';
    });

    if (!payload.unit_name || !payload.equipment_type || !payload.equipment_tag_number) continue;
    await addInspectionUpdate(payload);
    success += 1;
  }

  message(`Excel upload completed. Added ${success} records.`);
  input.value = '';
}

async function init() {
  const user = await setupProtectedPage();
  if (!user) return;

  if (!isAdmin(user.email)) {
    alert('Admin access only');
    window.location.href = './dashboard.html';
    return;
  }

  document.getElementById('downloadTemplateBtn').addEventListener('click', downloadTemplate);
  document.getElementById('uploadExcelBtn').addEventListener('click', uploadExcel);
}

init();
