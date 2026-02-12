import { listenInspectionUpdates } from './inspectionService.js';
import { setupProtectedPage } from './commonPage.js';

const charts = {};

function colorForStatus(status) {
  if (status === 'Not Started') return '#ef4444';
  if (status === 'In Progress') return '#f59e0b';
  return '#22c55e';
}

function countByType(rows, equipmentType) {
  const source = rows.filter((r) => r.equipment_type === equipmentType);
  return {
    notStarted: source.filter((r) => r.final_status === 'Not Started').length,
    inProgress: source.filter((r) => r.final_status === 'In Progress').length,
    completed: source.filter((r) => r.final_status === 'Completed').length
  };
}

function renderStatusBarChart(canvasId, label, counts) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  charts[canvasId]?.destroy();
  charts[canvasId] = new Chart(el, {
    type: 'bar',
    data: {
      labels: ['Not Started', 'In Progress', 'Completed'],
      datasets: [{ label, data: [counts.notStarted, counts.inProgress, counts.completed], backgroundColor: [colorForStatus('Not Started'), colorForStatus('In Progress'), colorForStatus('Completed')] }]
    }
  });
}

function render(rows) {
  document.getElementById('totalCount').textContent = rows.length;
  document.getElementById('completedCount').textContent = rows.filter((r) => r.final_status === 'Completed').length;
  document.getElementById('inProgressCount').textContent = rows.filter((r) => r.final_status === 'In Progress').length;
  document.getElementById('notStartedCount').textContent = rows.filter((r) => r.final_status === 'Not Started').length;
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('todaysProgressCount').textContent = rows.filter((r) => r.update_date === today).length;

  renderStatusBarChart('vesselChart', 'Vessel', countByType(rows, 'Vessel'));
  renderStatusBarChart('pipelineChart', 'Pipeline', countByType(rows, 'Pipeline'));
  renderStatusBarChart('steamTrapChart', 'Steam Trap', countByType(rows, 'Steam Trap'));
}

async function init() {
  const user = await setupProtectedPage();
  if (!user) return;
  listenInspectionUpdates(render);
}

init();
