/* ===================================================
   SWM TVL — Dashboard Charts
   =================================================== */

function initDashboardCharts() {
  initInventoryTrendChart();
  initInOutChart();
  initWhUsageChart();
}

function getChartDefaults() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    textColor: isDark ? 'rgba(148,163,184,0.8)' : 'rgba(100,116,139,0.8)',
    gridColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    tooltipBg: isDark ? '#1a1d2e' : '#ffffff',
    tooltipText: isDark ? '#f1f5f9' : '#1e293b',
  };
}

function initInventoryTrendChart() {
  const canvas = document.getElementById('chart-inventory-trend');
  if (!canvas) return;
  const { textColor, gridColor, tooltipBg, tooltipText } = getChartDefaults();

  const labels = ['19/03', '20/03', '21/03', '22/03', '23/03', '24/03', '25/03'];
  const inbound = [1650, 1820, 1230, 2100, 1950, 1750, 1850];
  const outbound = [1800, 1650, 1900, 1800, 2200, 2000, 2100];
  const stock = [43800, 43970, 43300, 43600, 43350, 43100, 45230];

  new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Tồn kho (tấn)',
          data: stock,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56,189,248,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y1',
        },
        {
          label: 'Nhập (tấn)',
          data: inbound,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.08)',
          fill: false,
          tension: 0.4,
          pointRadius: 4,
          yAxisID: 'y2',
          borderDash: [5, 3],
        },
        {
          label: 'Xuất (tấn)',
          data: outbound,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.08)',
          fill: false,
          tension: 0.4,
          pointRadius: 4,
          yAxisID: 'y2',
          borderDash: [5, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: textColor, font: { size: 12 }, boxWidth: 12, padding: 16 },
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipText,
          bodyColor: textColor,
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.raw.toLocaleString('vi-VN')} tấn`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 11 } },
          grid: { color: gridColor },
        },
        y1: {
          type: 'linear',
          position: 'left',
          ticks: { color: '#38bdf8', font: { size: 11 }, callback: v => (v/1000).toFixed(0) + 'k' },
          grid: { color: gridColor },
        },
        y2: {
          type: 'linear',
          position: 'right',
          ticks: { color: textColor, font: { size: 11 }, callback: v => (v/1000).toFixed(1) + 'k' },
          grid: { display: false },
        },
      },
    },
  });
}

function initInOutChart() {
  const canvas = document.getElementById('chart-in-out');
  if (!canvas) return;
  const { textColor, gridColor, tooltipBg, tooltipText } = getChartDefaults();

  const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const inbound = [1650, 1820, 1230, 2100, 1950, 800, 1850];
  const outbound = [1800, 1650, 1900, 1800, 2200, 900, 2100];

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Nhập kho',
          data: inbound,
          backgroundColor: 'rgba(16,185,129,0.7)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Xuất kho',
          data: outbound,
          backgroundColor: 'rgba(245,158,11,0.7)',
          borderColor: '#f59e0b',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: textColor, font: { size: 12 }, boxWidth: 12 },
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipText,
          bodyColor: textColor,
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.raw.toLocaleString('vi-VN')} tấn`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 11 } },
          grid: { color: gridColor },
        },
        y: {
          ticks: { color: textColor, font: { size: 11 }, callback: v => v.toLocaleString('vi-VN') },
          grid: { color: gridColor },
        },
      },
    },
  });
}

function initWhUsageChart() {
  const canvas = document.getElementById('chart-wh-usage');
  if (!canvas) return;
  const { textColor, tooltipBg, tooltipText } = getChartDefaults();

  const data = [78, 65, 82, 45, 90, 55, 70, 38, 95, 60, 72];
  const labels = ['WH5.1','WH5.2','WH5.3','WH5.4','WH5.5.1','WH5.5.2','WH5.6.1','WH5.6.2','WH5.7','WH5.8','WH5.9'];

  const colors = data.map(v =>
    v >= 90 ? 'rgba(239,68,68,0.8)' :
    v >= 75 ? 'rgba(245,158,11,0.8)' :
    v >= 50 ? 'rgba(59,130,246,0.8)' :
    'rgba(16,185,129,0.8)'
  );

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderColor: 'transparent',
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            font: { size: 10 },
            boxWidth: 10,
            padding: 6,
            generateLabels: (chart) => {
              const d = chart.data;
              return d.labels.map((label, i) => ({
                text: `${label}: ${d.datasets[0].data[i]}%`,
                fillStyle: d.datasets[0].backgroundColor[i],
                index: i,
              }));
            },
          },
        },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tooltipText,
          bodyColor: textColor,
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          callbacks: {
            label: ctx => `Sử dụng: ${ctx.raw}%`,
          },
        },
      },
    },
  });
}
