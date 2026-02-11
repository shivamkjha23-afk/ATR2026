function calculateProgress(inspections = []) {
  const total = inspections.length;
  const completed = inspections.filter((i) => i.final_status === 'Completed').length;
  const inProgress = inspections.filter((i) => i.final_status === 'In Progress').length;
  const notStarted = inspections.filter((i) => !i.final_status || i.final_status === 'Not Started').length;

  const byType = ['Vessel', 'Pipeline', 'Steam Trap'].map((type) => {
    const records = inspections.filter((i) => i.equipment_type === type);
    const done = records.filter((r) => r.final_status === 'Completed').length;
    return {
      type,
      total: records.length,
      done,
      percent: records.length ? Math.round((done / records.length) * 100) : 0
    };
  });

  const unitMap = {};
  inspections.forEach((item) => {
    if (!unitMap[item.unit_name]) unitMap[item.unit_name] = { total: 0, done: 0 };
    unitMap[item.unit_name].total += 1;
    if (item.final_status === 'Completed') unitMap[item.unit_name].done += 1;
  });

  const unitProgress = Object.entries(unitMap).map(([unit, data]) => ({
    unit,
    percent: data.total ? Math.round((data.done / data.total) * 100) : 0
  }));

  return { total, completed, inProgress, notStarted, byType, unitProgress };
}

function renderCharts(progress) {
  const chartTargets = [
    { id: 'vesselChart', label: 'Vessel', data: progress.byType.find((x) => x.type === 'Vessel')?.percent || 0 },
    { id: 'pipelineChart', label: 'Pipeline', data: progress.byType.find((x) => x.type === 'Pipeline')?.percent || 0 },
    { id: 'steamChart', label: 'Steam Trap', data: progress.byType.find((x) => x.type === 'Steam Trap')?.percent || 0 }
  ];

  chartTargets.forEach((target) => {
    const el = document.getElementById(target.id);
    if (!el) return;
    new Chart(el, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Remaining'],
        datasets: [{
          data: [target.data, 100 - target.data],
          backgroundColor: ['#22c55e', '#334155']
        }]
      },
      options: {
        plugins: {
          title: { display: true, text: `${target.label} ${target.data}%`, color: '#e5e7eb' },
          legend: { display: false }
        }
      }
    });
  });

  const unitCanvas = document.getElementById('unitChart');
  if (!unitCanvas) return;
  new Chart(unitCanvas, {
    type: 'bar',
    data: {
      labels: progress.unitProgress.map((u) => u.unit),
      datasets: [{
        label: 'Completion %',
        data: progress.unitProgress.map((u) => u.percent),
        backgroundColor: '#0ea5e9'
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true, max: 100, ticks: { color: '#e5e7eb' } },
        x: { ticks: { color: '#e5e7eb' } }
      },
      plugins: { legend: { labels: { color: '#e5e7eb' } } }
    }
  });
}

window.ATRDashboard = { calculateProgress, renderCharts };
