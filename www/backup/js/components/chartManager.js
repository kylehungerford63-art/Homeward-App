let goalTimelineChart = null;

export function renderTimelineChart(timeline) {
  const ctx = document.getElementById("goalTimelineChart").getContext("2d");

  if (goalTimelineChart) {
    goalTimelineChart.destroy();
  }

  const labels = timeline.map(p => p.month);
  const values = timeline.map(p => p.balance);

  goalTimelineChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Projected Balance",
        data: values,
        borderColor: "#4caf50",
        backgroundColor: "rgba(76, 175, 80, 0.2)",
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: false }
      }
    }
  });
}
