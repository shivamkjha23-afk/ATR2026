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

function renderUnitComparison(rows) {
  const map = {};
  rows.forEach((r) => {
    if (!map[r.unit_name]) map[r.unit_name] = 0;
    if (r.final_status === 'Completed') map[r.unit_name] += 1;
  });
  const labels = Object.keys(map);
  const data = labels.map((l) => map[l]);

  charts.unitComparisonChart?.destroy();
  charts.unitComparisonChart = new Chart(document.getElementById('unitComparisonChart'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Completed by Unit', data, backgroundColor: '#3b82f6' }] }
  });
}

function renderDaily(rows) {
  const map = {};
  rows.forEach((r) => {
    if (!r.update_date) return;
    map[r.update_date] = (map[r.update_date] || 0) + 1;
  });
  const labels = Object.keys(map).sort();
  const data = labels.map((l) => map[l]);

  charts.dailyProgressChart?.destroy();
  charts.dailyProgressChart = new Chart(document.getElementById('dailyProgressChart'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Daily Progress', data, borderColor: '#8b5cf6' }] }
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
  renderUnitComparison(rows);
  renderDaily(rows);
}

async function init() {
  const user = await setupProtectedPage();
  if (!user) return;
  listenInspectionUpdates(render);
}

init();
