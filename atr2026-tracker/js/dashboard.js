function calculateProgress(inspections) {
  const summary = {
    total: inspections.length,
    completed: 0,
    inProgress: 0,
    notStarted: 0
  };

  inspections.forEach((item) => {
    if (item.final_status === 'Completed') summary.completed += 1;
    else if (item.final_status === 'In Progress') summary.inProgress += 1;
    else summary.notStarted += 1;
  });

  return summary;
}

function typeBreakdown(inspections, typeName) {
  const filtered = inspections.filter((item) => item.equipment_type === typeName);
  const complete = filtered.filter((item) => item.final_status === 'Completed').length;
  const pending = filtered.length - complete;
  return { total: filtered.length, complete, pending };
}

function renderCharts(inspections) {
  const vessel = typeBreakdown(inspections, 'Vessel');
  const pipeline = typeBreakdown(inspections, 'Pipeline');
  const steam = typeBreakdown(inspections, 'Steam Trap');

  const makeDoughnut = (id, info) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Pending'],
        datasets: [{ data: [info.complete, info.pending], backgroundColor: ['#22c55e', '#475569'] }]
      },
      options: { plugins: { legend: { labels: { color: '#e2e8f0' } } } }
    });
  };

  makeDoughnut('vesselChart', vessel);
  makeDoughnut('pipelineChart', pipeline);
  makeDoughnut('steamTrapChart', steam);

  const unitTotals = {};
  inspections.forEach((item) => {
    if (!unitTotals[item.unit_name]) unitTotals[item.unit_name] = { total: 0, completed: 0 };
    unitTotals[item.unit_name].total += 1;
    if (item.final_status === 'Completed') unitTotals[item.unit_name].completed += 1;
  });

  const units = Object.keys(unitTotals);
  const percentages = units.map((u) => {
    const stat = unitTotals[u];
    return Number(((stat.completed / stat.total) * 100).toFixed(1));
  });

  const unitCanvas = document.getElementById('unitProgressChart');
  if (unitCanvas) {
    new Chart(unitCanvas, {
      type: 'bar',
      data: {
        labels: units,
        datasets: [{ label: 'Completion %', data: percentages, backgroundColor: '#0ea5e9' }]
      },
      options: {
        scales: {
          x: { ticks: { color: '#cbd5e1' } },
          y: { beginAtZero: true, max: 100, ticks: { color: '#cbd5e1' } }
        },
        plugins: { legend: { labels: { color: '#e2e8f0' } } }
      }
    });
  }
}
