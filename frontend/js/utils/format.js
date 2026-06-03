export function formatCurrency(num) {
  return "$" + Number(num).toLocaleString();
}

export function formatPercent(num) {
  return Number(num).toFixed(1) + "%";
}

export function formatNumber(num) {
  return Number(num).toLocaleString();
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}
