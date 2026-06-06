export function initInsights() {
  const trendsEl = document.getElementById("trends");
  if (!trendsEl) return; // safety guard

  trendsEl.innerHTML = `
    <div>This month vs last month: +$120</div>
    <div>Subscriptions detected: 4</div>
    <div>Potential savings: $45/month</div>
  `;
}
