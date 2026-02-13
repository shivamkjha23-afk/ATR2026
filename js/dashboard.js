const DASHBOARD_CHARTS = {};
const DASHBOARD_STATE = { vesselTypeFilter: 'All' };

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


function normalizeInspectionType(value) {
  return String(value || '').trim().toLowerCase();
}

function renderInspectionChartWithOpportunity(canvasId, labels, plannedData, opportunityData, completedData) {
  const baseData = plannedData.map((v, idx) => v + (opportunityData[idx] || 0));
  const percentData = labels.map((_, idx) => {
    const denom = baseData[idx] || 0;
    return denom ? Number(((completedData[idx] / denom) * 100).toFixed(1)) : 0;
  });

  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  if (DASHBOARD_CHARTS[canvasId]) DASHBOARD_CHARTS[canvasId].destroy();

  DASHBOARD_CHARTS[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Planned', data: plannedData, backgroundColor: '#0ea5e9' },
        { label: 'Opportunity Based', data: opportunityData, backgroundColor: '#f59e0b' },
        { label: 'Completed', data: completedData, backgroundColor: '#22c55e' },
        {
          label: '% Completed',
          data: percentData,
          type: 'line',
          yAxisID: 'y1',
          borderColor: '#a855f7',
          backgroundColor: '#a855f7',
          tension: 0.2
        }
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

function sectionInspection(title, type, chartId, options = {}) {
  const includeOpportunity = options.includeOpportunity === true;
  const enableTypeFilter = options.enableTypeFilter === true;
  const selectedTypeFilter = options.typeFilter || 'All';
  const normalizedSelectedType = normalizeInspectionType(selectedTypeFilter);

  const baseRows = getCollection('inspections').filter((r) => r.equipment_type === type);
  const inspectionTypeOptions = ['All', ...Array.from(new Set(baseRows
    .map((r) => String(r.inspection_type || '').trim())
    .filter(Boolean)))
    .sort((a, b) => a.localeCompare(b))
  ];

  const source = normalizedSelectedType === 'all'
    ? baseRows
    : baseRows.filter((r) => normalizeInspectionType(r.inspection_type) === normalizedSelectedType);

  const summary = computeSummary(source, { mode: 'inspection' });
  const grouped = groupByUnit(source);
  const units = Object.keys(grouped);

  const tableRows = units.map((unit) => {
    const unitRows = grouped[unit];
    const unitSummary = computeSummary(unitRows, { mode: 'inspection' });
    return includeOpportunity
      ? [unit, unitSummary.planned, unitSummary.opportunity, unitSummary.todayCompleted, unitSummary.completed]
      : [unit, unitSummary.planned, unitSummary.completed, unitSummary.todayCompleted];
  });

  const cards = [
    { label: 'Total Planned', value: summary.planned },
    includeOpportunity ? { label: 'Total Opportunity Based', value: summary.opportunity } : null,
    { label: 'In Progress', value: summary.inProgress },
    { label: 'Completed', value: summary.completed }
  ].filter(Boolean);

  const filterHtml = enableTypeFilter
    ? `<div class="filter-tabs dashboard-filter-tabs">${inspectionTypeOptions.map((inspectionType) => {
      const active = normalizeInspectionType(inspectionType) === normalizedSelectedType;
      return `<button type="button" class="btn tab-btn vessel-type-filter-btn ${active ? 'active' : ''}" data-inspection-type="${inspectionType}">${inspectionType}</button>`;
    }).join('')}</div>`
    : '';

  const tableHeaders = includeOpportunity
    ? ['Unit', 'Planned', 'Opportunity Based', 'Completed Today', 'Total Completed']
    : ['Unit', 'Total Planned', 'Total Completed', `Today\'s Completed`];

  const sectionHtml = `
    <section class="table-card">
      <h2>${title}</h2>
      ${filterHtml}
      ${renderSummaryCards(cards)}
      ${renderUnitTable(tableHeaders, tableRows)}
      <article class="chart-card"><canvas id="${chartId}"></canvas></article>
    </section>
  `;

  if (includeOpportunity) {
    const plannedData = units.map((u) => computeSummary(grouped[u], { mode: 'inspection' }).planned);
    const opportunityData = units.map((u) => computeSummary(grouped[u], { mode: 'inspection' }).opportunity);
    const completedData = units.map((u) => computeSummary(grouped[u], { mode: 'inspection' }).completed);
    return {
      html: sectionHtml,
      chart: () => renderInspectionChartWithOpportunity(chartId, units, plannedData, opportunityData, completedData)
    };
  }

  const plannedData = units.map((u) => computeSummary(grouped[u], { mode: 'inspection' }).planned);
  const completedData = units.map((u) => computeSummary(grouped[u], { mode: 'inspection' }).completed);
  const percentData = units.map((u, idx) => {
    const planned = plannedData[idx] || 0;
    return planned ? Number(((completedData[idx] / planned) * 100).toFixed(1)) : 0;
  });

  return { html: sectionHtml, chart: () => renderBarChart(chartId, units, plannedData, completedData, percentData) };
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

  const vessel = sectionInspection('Vessel Dashboard', 'Vessel', 'vesselAnalyticsChart', {
    includeOpportunity: true,
    enableTypeFilter: true,
    typeFilter: DASHBOARD_STATE.vesselTypeFilter
  });
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

  const vesselFilterButtons = root.querySelectorAll('.vessel-type-filter-btn');
  vesselFilterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      DASHBOARD_STATE.vesselTypeFilter = btn.dataset.inspectionType || 'All';
      renderDashboard();
    });
  });

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
