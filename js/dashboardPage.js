import { listenInspectionUpdates } from './inspectionService.js';
import { requireAuth, logout } from './auth.js';

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
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  charts[canvasId]?.destroy();
  charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Not Started', 'In Progress', 'Completed'],
      datasets: [{
        label,
        data: [counts.notStarted, counts.inProgress, counts.completed],
        backgroundColor: [colorForStatus('Not Started'), colorForStatus('In Progress'), colorForStatus('Completed')]
      }]
    }
  });
}

function renderUnitComparison(rows) {
  const byUnit = {};
  rows.forEach((r) => {
    byUnit[r.unit_name] = byUnit[r.unit_name] || 0;
    if (r.final_status === 'Completed') byUnit[r.unit_name] += 1;
  });
  const labels = Object.keys(byUnit);
  const data = labels.map((label) => byUnit[label]);

  charts.unitComparisonChart?.destroy();
  charts.unitComparisonChart = new Chart(document.getElementById('unitComparisonChart'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Completed inspections', data, backgroundColor: '#3b82f6' }] }
  });
}

function renderDailyProgress(rows) {
  const byDate = {};
  rows.forEach((r) => {
    if (!r.update_date) return;
    byDate[r.update_date] = byDate[r.update_date] || 0;
    byDate[r.update_date] += 1;
  });
  const labels = Object.keys(byDate).sort();
  const data = labels.map((l) => byDate[l]);

  charts.dailyProgressChart?.destroy();
  charts.dailyProgressChart = new Chart(document.getElementById('dailyProgressChart'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Daily updates', data, borderColor: '#8b5cf6' }] }
  });
}

function renderKpis(rows) {
  document.getElementById('totalCount').textContent = rows.length;
  document.getElementById('completedCount').textContent = rows.filter((r) => r.final_status === 'Completed').length;
  document.getElementById('inProgressCount').textContent = rows.filter((r) => r.final_status === 'In Progress').length;
  document.getElementById('notStartedCount').textContent = rows.filter((r) => r.final_status === 'Not Started').length;
}

async function init() {
  const user = await requireAuth('../login.html');
  if (!user) return;
  document.getElementById('loggedInUser').textContent = user.email;
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await logout();
    window.location.href = '../login.html';
  });

  listenInspectionUpdates((rows) => {
    renderKpis(rows);
    renderStatusBarChart('vesselChart', 'Vessel progress', countByType(rows, 'Vessel'));
    renderStatusBarChart('pipelineChart', 'Pipeline progress', countByType(rows, 'Pipeline'));
    renderStatusBarChart('steamTrapChart', 'Steam Trap progress', countByType(rows, 'Steam Trap'));
    renderUnitComparison(rows);
    renderDailyProgress(rows);
  });
}

init();
