/* ============================
   DASHBOARD INITIALIZATION
============================ */

import { animateCounter } from "./utils/dom.js";

export function initDashboard() {
  console.log("Dashboard initialized");

  // Load dashboard summary widgets
  loadDashboardSummary();
}


/* ============================
   LOAD DASHBOARD SUMMARY
   (Placeholder for now)
============================ */

function loadDashboardSummary() {
  // ⭐ Replace this with real API call later
  const totalSavings = 69000;

  animateCounter("total-savings", totalSavings);

  // Fake summary ring values for now
  updateGoalRing(35, 42000, 120000);
}


/* ============================
   GOAL RING (SUMMARY ONLY)
============================ */

function updateGoalRing(percent, current, target) {
  const circleLength = 377;
  const offset = circleLength - (percent / 100) * circleLength;

  const ring = document.querySelector(".ring-progress");
  if (!ring) return;

  ring.style.strokeDashoffset = offset;

  const percentEl = document.getElementById("goal-percent");
  const currentEl = document.getElementById("goal-current");
  const targetEl = document.getElementById("goal-target");

  if (percentEl) percentEl.innerText = percent.toFixed(1) + "%";
  if (currentEl) currentEl.innerText = "$" + current.toLocaleString();
  if (targetEl) targetEl.innerText = "$" + target.toLocaleString();
}

