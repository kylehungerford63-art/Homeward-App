import { formatCurrency, formatPercent } from "../utils/format.js";

export function updateGoalRing(percent, current, target) {
  const circleLength = 377;
  const offset = circleLength - (percent / 100) * circleLength;

  document.querySelector(".ring-progress").style.strokeDashoffset = offset;
  document.getElementById("goal-percent").innerText = formatPercent(percent);
  document.getElementById("goal-current").innerText = formatCurrency(current);
  document.getElementById("goal-target").innerText = formatCurrency(target);
}

export function updateGoalHealth(score) {
  const el = document.getElementById("goal-health-score");

  el.textContent = score + "%";
  el.className = "health-score";

  if (score >= 80) el.classList.add("health-good");
  else if (score >= 60) el.classList.add("health-warning");
  else el.classList.add("health-bad");
}
