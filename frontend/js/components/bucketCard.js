import { formatCurrency, formatPercent } from "../utils/format.js";

export function updateBucketUI(data) {
  // DOWN PAYMENT
  document.getElementById("down-payment-progress").innerText =
    formatPercent(data.percent.down_payment_percent);
  document.getElementById("down-payment-bar").style.width =
    data.percent.down_payment_percent + "%";
  document.getElementById("down-payment-current").innerText =
    formatCurrency(data.current.down_payment_current);
  document.getElementById("down-payment-target").innerText =
    formatCurrency(data.targets.down_payment_target);

  // CLOSING COSTS
  document.getElementById("closing-cost-progress").innerText =
    formatPercent(data.percent.closing_cost_percent);
  document.getElementById("closing-cost-bar").style.width =
    data.percent.closing_cost_percent + "%";
  document.getElementById("closing-cost-current").innerText =
    formatCurrency(data.current.closing_cost_current);
  document.getElementById("closing-cost-target").innerText =
    formatCurrency(data.targets.closing_cost_target);

  // MOVING COSTS
  document.getElementById("moving-cost-progress").innerText =
    formatPercent(data.percent.moving_cost_percent);
  document.getElementById("moving-cost-bar").style.width =
    data.percent.moving_cost_percent + "%";
  document.getElementById("moving-cost-current").innerText =
    formatCurrency(data.current.moving_cost_current);
  document.getElementById("moving-cost-target").innerText =
    formatCurrency(data.targets.moving_cost_target);

  // EXTRA SAVINGS
  document.getElementById("extra-progress").innerText =
    formatPercent(data.percent.extra_percent);
  document.getElementById("extra-bar").style.width =
    data.percent.extra_percent + "%";
  document.getElementById("extra-current").innerText =
    formatCurrency(data.current.extra_current);
  document.getElementById("extra-target").innerText =
    formatCurrency(data.targets.extra_target);
}
