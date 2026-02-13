const DASHBOARD_CHARTS = {};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function groupByUnit(rows = []) {
  return rows.reduce((acc, row) => {
    const unit = row.unit_name || row.unit || 'Unknown';
    if (!acc[unit]) acc[unit] = [];
    acc[unit].push(row);
    return acc;
  }, {});
}

function computeSummary(rows = [], opts = {}) {
  const today = todayISO();
  const inspectionMode = opts.mode === 'inspection';
  const requisitionMode = opts.mode === 'requisition';
  const observationMode = opts.mode === 'observation';

  if (observationMode) {
    return {
      total: rows.length,
      inProgress: rows.filter((r) => r.status === 'In Progress').length,
      completed: rows.filter((r) => r.status === 'Completed').length
    };
  }

  if (requisitionMode) {
    const completed = rows.filter((r) => String(r.result || '').toLowerCase() === 'completed').length;
    return {
      total: rows.length,
      planned: rows.length,
      completed,
      todayCompleted: rows.filter((r) => String(r.timestamp || r.requisition_datetime || '').slice(0, 10) === today && String(r.result || '').toLowerCase() === 'completed').length,
      inProgress: Math.max(rows.length - completed, 0),
      percent: rows.length ? Number(((completed / rows.length) * 100).toFixed(1)) : 0
    };
  }

  if (inspectionMode) {
    const planned = rows.filter((r) => r.inspection_type === 'Planned').length;
    const opportunity = rows.filter((r) => ['Opportunity', 'Opportunity Based'].includes(r.inspection_type)).length;
    const inProgress = rows.filter((r) => r.status === 'In Progress' || r.final_status === 'In Progress').length;
    const completed = rows.filter((r) => r.status === 'Completed' || r.final_status === 'Completed').length;
    return {
      total: rows.length,
      planned,
      opportunity,
      inProgress,
      completed,
      todayCompleted: rows.filter((r) => r.inspection_date === today && (r.status === 'Completed' || r.final_status === 'Completed')).length,
      percent: rows.length ? Number(((completed / rows.length) * 100).toFixed(1)) : 0
    };
  }

  return { total: rows.length };
}

function renderBarChart(canvasId, labels, plannedData, completedData, percentData = []) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;

  if (DASHBOARD_CHARTS[canvasId]) DASHBOARD_CHARTS[canvasId].destroy();

  const datasets = [
    { label: 'Planned', data: plannedData, backgroundColor: '#0ea5e9' },
    { label: 'Completed', data: completedData, backgroundColor: '#22c55e' }
  ];

  if (percentData.length) {
    datasets.push({
      label: '% Completed',
      data: percentData,
      type: 'line',
      yAxisID: 'y1',
      borderColor: '#f59e0b',
      backgroundColor: '#f59e0b',
      tension: 0.2
    });
  }

  DASHBOARD_CHARTS[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: { beginAtZero: true },
        y1: percentData.length ? { beginAtZero: true, max: 100, position: 'right', grid: { drawOnChartArea: false } } : undefined
      }
    }
  });
}

function renderSummaryCards(cards = []) {
  return `<section class="cards-grid">${cards.map((c) => `<article class="card"><h3>${c.label}</h3><p>${c.value}</p></article>`).join('')}</section>`;
}

function renderUnitTable(headers, rows) {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>
          ${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="99">No records</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function sectionVessel() {
  const source = getCollection('inspections').filter((r) => r.equipment_type === 'Vessel');
  const summary = computeSummary(source, { mode: 'inspection' });
  const grouped = groupByUnit(source);
  const units = Object.keys(grouped);

  const tableRows = units.map((unit) => {
    const unitSummary = computeSummary(grouped[unit], { mode: 'inspection' });
    return [
      unit,
      unitSummary.planned,
      unitSummary.opportunity,
      unitSummary.todayCompleted,
      unitSummary.completed
    ];
  });

  const plannedData = units.map((u) => computeSummary(grouped[u], { mode: 'inspection' }).planned);
  const opportunityData = units.map((u) => computeSummary(grouped[u], { mode: 'inspection' }).opportunity);
  const completedData = units.map((u) => computeSummary(grouped[u], { mode: 'inspection' }).completed);
  const totalTarget = units.map((_, i) => (plannedData[i] || 0) + (opportunityData[i] || 0));
  const percentData = units.map((_, i) => {
    const target = totalTarget[i];
    return target ? Number(((completedData[i] / target) * 100).toFixed(1)) : 0;
  });

  return {
    html: `
      <section class="table-card">
        <h2>Vessel Dashboard</h2>
        ${renderSummaryCards([
          { label: 'Total Planned', value: summary.planned },
          { label: 'Total Opportunity', value: summary.opportunity },
          { label: 'In Progress', value: summary.inProgress },
          { label: 'Completed', value: summary.completed }
        ])}
        ${renderUnitTable(['Unit', 'Planned', 'Opportunity', 'Completed Today', 'Total Completed'], tableRows)}
        <article class="chart-card"><canvas id="vesselAnalyticsChart"></canvas></article>
      </section>
    `,
    chart: () => {
      const labels = units;
      const canvas = 'vesselAnalyticsChart';
      const chartCanvas = document.getElementById(canvas);
      if (!chartCanvas || typeof Chart === 'undefined') return;
      if (DASHBOARD_CHARTS[canvas]) DASHBOARD_CHARTS[canvas].destroy();
      DASHBOARD_CHARTS[canvas] = new Chart(chartCanvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Planned', data: plannedData, backgroundColor: '#0ea5e9' },
            { label: 'Opportunity', data: opportunityData, backgroundColor: '#a855f7' },
            { label: 'Completed', data: completedData, backgroundColor: '#22c55e' },
            { label: '% Completed', data: percentData, type: 'line', yAxisID: 'y1', borderColor: '#f59e0b', backgroundColor: '#f59e0b', tension: 0.2 }
          ]
        },
        options: {
          responsive: true,
          interaction: { mode: 'index', intersect: false },
          scales: {
            y: { beginAtZero: true },
            y1: { beginAtZero: true, max: 100, position: 'right', grid: { drawOnChartArea: false } }
          }
        }
      });
    }
  };
}

function sectionInspection(title, type, chartId) {
  const source = getCollection('inspections').filter((r) => r.equipment_type === type);
  const grouped = groupByUnit(source);
  const units = Object.keys(grouped);

  const tableRows = units.map((unit) => {
    const unitSummary = computeSummary(grouped[unit], { mode: 'inspection' });
    return [unit, unitSummary.planned, unitSummary.completed, unitSummary.todayCompleted];
  });

  const plannedData = units.map((u) => computeSummary(grouped[u], { mode: 'inspection' }).planned);
  const completedData = units.map((u) => computeSummary(grouped[u], { mode: 'inspection' }).completed);
  const percentData = units.map((_, idx) => {
    const target = plannedData[idx] || 0;
    return target ? Number(((completedData[idx] / target) * 100).toFixed(1)) : 0;
  });

  return {
    html: `
      <section class="table-card">
        <h2>${title}</h2>
        ${renderUnitTable(['Unit', 'Total Planned', 'Total Completed', `Today's Completed`], tableRows)}
        <article class="chart-card"><canvas id="${chartId}"></canvas></article>
      </section>
    `,
    chart: () => renderBarChart(chartId, units, plannedData, completedData, percentData)
  };
}

function sectionRequisitionRT() {
  const allReq = getCollection('requisitions');
  const rt = allReq.filter((r) => (r.type || r.module_type) === 'RT');
  const grouped = groupByUnit(rt);
  const units = Object.keys(grouped);

  const rows = units.map((unit) => {
    const s = computeSummary(grouped[unit], { mode: 'requisition' });
    return [unit, s.total, s.planned, s.completed, `${s.percent}%`];
  });

  const plannedData = units.map((u) => computeSummary(grouped[u], { mode: 'requisition' }).planned);
  const completedData = units.map((u) => computeSummary(grouped[u], { mode: 'requisition' }).completed);
  const percentData = units.map((u) => computeSummary(grouped[u], { mode: 'requisition' }).percent);

  return {
    html: `
      <section class="table-card">
        <h2>Requisition Dashboard (RT)</h2>
        ${renderUnitTable(['Unit', 'Total Requisitions', 'Planned', 'Completed', 'Progress %'], rows)}
        <article class="chart-card"><canvas id="requisitionRtChart"></canvas></article>
      </section>
    `,
    chart: () => renderBarChart('requisitionRtChart', units, plannedData, completedData, percentData)
  };
}

function sectionObservations() {
  const rows = getCollection('observations');
  const s = computeSummary(rows, { mode: 'observation' });

  return `
    <section class="table-card" id="observationDashboardLink" style="cursor:pointer;">
      <h2>Observation Dashboard</h2>
      ${renderSummaryCards([
    { label: 'Total Observations', value: s.total },
    { label: 'In Progress', value: s.inProgress },
    { label: 'Completed', value: s.completed }
  ])}
      <p class="hint">Click this section to open Observation Entry.</p>
    </section>
  `;
}

function renderDashboard() {
  if (document.body.dataset.page !== 'dashboard') return;

  // touch readDB to satisfy request for runtime visibility without schema change
  readDB();

  const root = document.getElementById('dashboardRoot');
  if (!root) return;

  const vessel = sectionVessel();
  const pipeline = sectionInspection('Pipeline Dashboard', 'Pipeline', 'pipelineAnalyticsChart');
  const steamTrap = sectionInspection('Steam Trap Dashboard', 'Steam Trap', 'steamTrapAnalyticsChart');
  const requisition = sectionRequisitionRT();

  root.innerHTML = [
    vessel.html,
    pipeline.html,
    steamTrap.html,
    requisition.html,
    sectionObservations()
  ].join('');

  vessel.chart();
  pipeline.chart();
  steamTrap.chart();
  requisition.chart();

  const obsSection = document.getElementById('observationDashboardLink');
  if (obsSection) {
    obsSection.onclick = () => {
      const navTarget = document.querySelector('a[href="observation.html"]')?.getAttribute('href');
      window.location.href = navTarget || 'pages/observation.html';
    };
  }
}

function calculateProgress(inspections) {
  const summary = computeSummary(inspections, { mode: 'inspection' });
  return {
    total: summary.total,
    completed: summary.completed,
    inProgress: summary.inProgress,
    notStarted: Math.max(summary.total - summary.completed - summary.inProgress, 0),
    todaysProgress: summary.todayCompleted
  };
}

function renderCharts() {
  renderDashboard();
}

window.addEventListener('atr-db-updated', renderDashboard);
window.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'dashboard') renderDashboard();
});
