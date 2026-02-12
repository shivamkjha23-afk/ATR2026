function calculateProgress(inspections) {
  const today = new Date().toISOString().slice(0, 10);
  const summary = {
    total: inspections.length,
    completed: inspections.filter((r) => r.final_status === 'Completed').length,
    inProgress: inspections.filter((r) => r.final_status === 'In Progress').length,
    notStarted: inspections.filter((r) => r.final_status === 'Not Started').length,
    todaysProgress: inspections.filter((r) => (r.timestamp || '').slice(0, 10) === today).length
  };
  return summary;
}

function aggregateByUnit(inspections, equipmentType = '') {
  const map = {};
  inspections.forEach((r) => {
    if (equipmentType && r.equipment_type !== equipmentType) return;
    if (!map[r.unit_name]) map[r.unit_name] = { completed: 0, inProgress: 0, total: 0 };
    map[r.unit_name].total += 1;
    if (r.final_status === 'Completed') map[r.unit_name].completed += 1;
    if (r.final_status === 'In Progress') map[r.unit_name].inProgress += 1;
  });
  return map;
}

function renderCharts(inspections) {
  const unitMap = aggregateByUnit(inspections);
  const units = Object.keys(unitMap);
  const completed = units.map((u) => unitMap[u].completed);
  const inProgress = units.map((u) => unitMap[u].inProgress);

  const unitChart = document.getElementById('unitProgressChart');
  if (unitChart) {
    new Chart(unitChart, {
      type: 'bar',
      data: {
        labels: units,
        datasets: [
          { label: 'Completed', data: completed, backgroundColor: '#22c55e' },
          { label: 'In Progress', data: inProgress, backgroundColor: '#f59e0b' }
        ]
      },
      options: {
        responsive: true,
        onClick(_, elements) {
          if (!elements.length) return;
          const unit = units[elements[0].index];
          const detail = inspections.filter((r) => r.unit_name === unit);
          const info = detail.map((d) => `${d.equipment_tag_number} (${d.equipment_type}) - ${d.final_status}`).join('\n');
          alert(`Equipment Drill-down: ${unit}\n\n${info || 'No records'}`);
        }
      }
    });
  }

  function smallChart(id, type) {
    const el = document.getElementById(id);
    if (!el) return;
    const map = aggregateByUnit(inspections, type);
    const labels = Object.keys(map);
    const data = labels.map((u) => map[u].total);
    new Chart(el, {
      type: 'line',
      data: { labels, datasets: [{ label: `${type} summary`, data, borderColor: '#0ea5e9' }] }
    });
  }

  smallChart('vesselChart', 'Vessel');
  smallChart('pipelineChart', 'Pipeline');
  smallChart('steamTrapChart', 'Steam Trap');
}
