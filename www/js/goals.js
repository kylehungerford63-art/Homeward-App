// frontend/js/goals.js
// Modal edit flow + bucket editing wired to backend engine.
// Down payment = percent of house price (stored as decimal).
// Closing + moving = dollars (converted to percents/fixed for engine).
// Frontend does proportional bucket splitting when API doesn't provide explicit currents.
// This version enforces strict validation: API currents are trusted only when they sum to progress.current_balance,
// removes accidental fallbacks to progress for targets, and guarantees displayed buckets never exceed total saved.

import { post, get } from "./utils/api.js";

console.log("🔥 goals.js LOADED");

let timelineChart = null;
let saveInProgress = false;
let saveDebounceTimer = null;

// Initialize or update the timeline chart. Uses Chart.js when available, otherwise draws a simple canvas line.
// Replace the existing initOrUpdateTimelineChart function with this full implementation
function initOrUpdateTimelineChart(timeline) {
  const canvas = document.getElementById("goalTimelineChart");
  if (!canvas) return;

  // Ensure the chart container has a height so the canvas isn't 0px tall
  const container = canvas.parentElement;
  if (container && !container.clientHeight) {
    container.style.height = container.style.height || "220px";
  }
  // Ensure canvas has an explicit pixel height for fallback drawing
  if (!canvas.clientHeight) canvas.style.height = canvas.style.height || "220px";

  // Normalize timeline: array of {date: "YYYY-MM-DD", balance: number}
  const safeTimeline = Array.isArray(timeline) ? timeline : [];
  const labels = safeTimeline.map(p => (p && p.date) ? p.date : "");
  const data = safeTimeline.map(p => Number((p && p.balance) || 0));

  // If Chart.js is present, use it
  if (window.Chart && typeof window.Chart === "function") {
    // Create or update Chart.js instance
    try {
      const ctx = canvas.getContext("2d");
      if (!timelineChart) {
        timelineChart = new Chart(ctx, {
          type: "line",
          data: {
            labels: labels,
            datasets: [{
              label: "Projected balance",
              data: data,
              borderColor: "#7bd389",
              backgroundColor: "rgba(123,211,137,0.12)",
              pointRadius: 2,
              fill: true,
              tension: 0.25
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: {
                display: true,
                ticks: { maxRotation: 0, autoSkip: true },
                grid: { display: false }
              },
              y: {
                display: true,
                beginAtZero: false,
                grid: { color: "rgba(255,255,255,0.06)" }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: { mode: "index", intersect: false }
            },
            interaction: { mode: "index", intersect: false }
          }
        });
      } else {
        timelineChart.data.labels = labels;
        timelineChart.data.datasets[0].data = data;
        timelineChart.update();
        try { timelineChart.resize(); } catch (e) { /* ignore resize errors */ }
      }
    } catch (e) {
      // If Chart.js fails for any reason, fall back to canvas drawing below
      console.warn("Chart.js render failed, falling back to canvas draw:", e && e.message);
    }
    // If Chart.js was used, return early (but if it failed above we'll continue to fallback)
    if (timelineChart && timelineChart.data && timelineChart.data.datasets && timelineChart.data.datasets[0]) {
      return;
    }
  }

  // Fallback: simple canvas drawing (no external lib)
  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.clientWidth || 600;
  const h = canvas.height = canvas.clientHeight || 200;
  ctx.clearRect(0, 0, w, h);

  if (!data || data.length === 0) {
    // draw placeholder text
    ctx.fillStyle = "#9aa7b8";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No timeline data", w / 2, h / 2);
    return;
  }

  // compute scale
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pad = Math.max(1, (max - min) * 0.1);
  const yMin = min - pad;
  const yMax = max + pad;
  const xStep = w / Math.max(1, data.length - 1);

  // draw grid lines
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const yy = (h / 4) * i;
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(w, yy);
    ctx.stroke();
  }

  // draw line
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#7bd389";
  for (let i = 0; i < data.length; i++) {
    const x = i * xStep;
    const y = h - ((data[i] - yMin) / (yMax - yMin)) * h;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // draw points
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < data.length; i++) {
    const x = i * xStep;
    const y = h - ((data[i] - yMin) / (yMax - yMin)) * h;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // draw x labels (sparse)
  ctx.fillStyle = "#9aa7b8";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  const maxLabels = Math.min(6, labels.length);
  for (let i = 0; i < maxLabels; i++) {
    const idx = Math.round((i / Math.max(1, maxLabels - 1)) * (labels.length - 1));
    const x = idx * xStep;
    const lbl = labels[idx] || "";
    ctx.fillText(lbl, x, h - 6);
  }
}

// Prefer modal inputs when modal is open
function queryInput(id) {
  const modal = document.querySelector("#edit-goal-modal");
  if (modal && modal.getAttribute("aria-hidden") === "false") {
    const inside = modal.querySelector(`#${id}`);
    if (inside) return inside;
  }
  return document.querySelector(`#${id}`);
}

export function initGoals() {
  console.log("Goals page initialized (modal edit flow)");

  // Page-level controls
  const editOpenBtn = document.querySelector("#edit-goal-open-btn");
  const refreshBtn = document.querySelector("#refresh-goal-btn");
  const modal = document.querySelector("#edit-goal-modal");
  const modalBackdrop = document.querySelector("#modal-backdrop");
  const modalCloseBtn = document.querySelector("#modal-close-btn");
  const modalCancelBtn = document.querySelector("#modal-cancel-btn");
  const modalStatus = document.querySelector("#modal-goal-status");

  // Modal inputs
  const modalForm = modal ? modal.querySelector("#modal-goal-form") : null;
  const modalHousePrice = modal ? modal.querySelector("#house-price") : null;
  const modalCurrentBalance = modal ? modal.querySelector("#current-balance") : null;
  const modalMonthlyContribution = modal ? modal.querySelector("#monthly-contribution") : null;
  const modalTargetDate = modal ? modal.querySelector("#target-date") : null;
  const modalUpdateBtn = modal ? modal.querySelector("#update-goal-btn") : null;

  // Modal bucket inputs
  const modalDownPercent = modal ? modal.querySelector("#modal-down-payment-percent") : null; // percent (e.g. 20)
  const modalClosingTarget = modal ? modal.querySelector("#modal-closing-cost-target") : null; // dollars
  const modalMovingTarget = modal ? modal.querySelector("#modal-moving-cost-target") : null;   // dollars

  // Page-level display
  const statusEl = document.querySelector("#goal-status");
  const goalCurrent = document.querySelector("#goal-current");
  const goalTarget = document.querySelector("#goal-target");
  const goalPercent = document.querySelector("#goal-percent");
  const progressText = document.querySelector("#goal-progress-text");
  const healthEl = document.querySelector("#goal-health-score");

  // Bucket mapping
  const bucketMap = {
    "down-payment": { bar: "#down-payment-bar", pct: "#bucket-down-payment", cur: "#down-payment-current", tgt: "#down-payment-target" },
    "closing-cost": { bar: "#closing-cost-bar", pct: "#bucket-closing-costs", cur: "#closing-cost-current", tgt: "#closing-cost-target" },
    "moving-cost": { bar: "#moving-cost-bar", pct: "#moving-cost-progress", cur: "#moving-cost-current", tgt: "#moving-cost-target" },
    "extra": { bar: "#extra-bar", pct: "#extra-progress", cur: "#extra-current", tgt: "#extra-target" }
  };

  // ---------- Helpers ----------

  function showStatus(msg, isError = false) {
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.style.color = isError ? "crimson" : "#9fe6a0";
      setTimeout(() => { statusEl.textContent = ""; }, 3000);
    } else {
      if (isError) console.error(msg); else console.log(msg);
    }
  }

  function showModalStatus(msg, isError = false) {
    if (modalStatus) {
      modalStatus.textContent = msg;
      modalStatus.style.color = isError ? "crimson" : "#9fe6a0";
      setTimeout(() => { modalStatus.textContent = ""; }, 3000);
    } else {
      if (isError) console.error(msg); else console.log(msg);
    }
  }

  function safeValueById(id) {
    const el = queryInput(id);
    return el ? el.value : null;
  }

  function setFieldError(inputEl, message) {
    if (!inputEl) return;
    let err = inputEl.parentElement && inputEl.parentElement.querySelector(".field-error");
    if (!err) {
      err = document.createElement("div");
      err.className = "field-error";
      inputEl.parentElement.appendChild(err);
    }
    err.textContent = message || "";
  }

  function clearAllFieldErrors() {
    const errs = document.querySelectorAll(".field-error");
    errs.forEach(e => e.textContent = "");
  }

  function validateFormValues(hpVal, cbVal, mcVal, tdVal, downPct, closingT, movingT) {
    const errors = {};
    const hp = Number(hpVal);
    const cb = Number(cbVal);
    const mc = Number(mcVal);
    const dp = downPct !== undefined && downPct !== null && downPct !== "" ? Number(downPct) : null;
    const ct = closingT !== undefined && closingT !== null && closingT !== "" ? Number(closingT) : null;
    const mt = movingT !== undefined && movingT !== null && movingT !== "" ? Number(movingT) : null;

    if (!hp || Number.isNaN(hp) || hp <= 0) errors.house_price = "Enter a valid house price greater than 0";
    if (Number.isNaN(cb) || cb < 0) errors.current_balance = "Current balance must be 0 or more";
    if (hp && !Number.isNaN(cb) && cb > hp) errors.current_balance = "Current balance cannot exceed house price";
    if (Number.isNaN(mc) || mc < 0) errors.monthly_contribution = "Monthly contribution must be 0 or more";
    if (!tdVal) errors.target_date = "Select a target date";
    else {
      const d = new Date(tdVal);
      if (isNaN(d.getTime())) errors.target_date = "Enter a valid date";
    }

    if (dp != null && (Number.isNaN(dp) || dp < 0 || dp > 100)) errors.down_payment_percent = "Enter a percent between 0 and 100";
    if (ct != null && (Number.isNaN(ct) || ct < 0)) errors.closing_cost_target = "Closing cost must be 0 or more";
    if (mt != null && (Number.isNaN(mt) || mt < 0)) errors.moving_cost_target = "Moving cost must be 0 or more";

    return errors;
  }

  async function debouncedSave(payload) {
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    return new Promise((resolve) => {
      saveDebounceTimer = setTimeout(async () => {
        try {
          setButtonLoading(true);
          saveInProgress = true;
          const res = await post("/api/goal/save", payload);
          saveInProgress = false;
          setButtonLoading(false);
          resolve(res);
        } catch (err) {
          saveInProgress = false;
          setButtonLoading(false);
          console.error("Network/save error:", err);
          resolve({ success: false, error: "Network error" });
        }
      }, 250);
    });
  }

  function setButtonLoading(on) {
    if (!modalUpdateBtn) return;
    if (on) {
      modalUpdateBtn.setAttribute("disabled", "disabled");
      modalUpdateBtn.classList.add("btn--loading");
      if (!modalUpdateBtn.querySelector(".btn-spinner")) {
        const s = document.createElement("span");
        s.className = "btn-spinner";
        modalUpdateBtn.prepend(s);
      }
    } else {
      modalUpdateBtn.removeAttribute("disabled");
      modalUpdateBtn.classList.remove("btn--loading");
      const s = modalUpdateBtn.querySelector(".btn-spinner");
      if (s) s.remove();
    }
  }

  // ---------- Modal open/close ----------

  function openModal() {
    if (!modal) return;
    loadSavedGoalIntoModal().finally(() => {
      modal.setAttribute("aria-hidden", "false");
      modal.classList.add("modal-open");
      const first = modal.querySelector("input");
      if (first) first.focus();
    });
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    modal.classList.remove("modal-open");
  }

  if (editOpenBtn) editOpenBtn.addEventListener("click", openModal);
  if (modalBackdrop) modalBackdrop.addEventListener("click", closeModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener("click", closeModal);

  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      showStatus("Refreshing...");
      await refreshFullGoal();
      showStatus("Refreshed");
    });
  }

  // ---------- Modal save ----------

  async function onModalSave(e) {
    e.preventDefault();
    clearAllFieldErrors();

    const hpVal = modalHousePrice ? modalHousePrice.value : safeValueById("house-price");
    const cbVal = modalCurrentBalance ? modalCurrentBalance.value : safeValueById("current-balance");
    const mcVal = modalMonthlyContribution ? modalMonthlyContribution.value : safeValueById("monthly-contribution");
    const tdVal = modalTargetDate ? modalTargetDate.value : safeValueById("target-date");

    const downPctVal = modalDownPercent ? modalDownPercent.value : null;   // percent
    const closingTVal = modalClosingTarget ? modalClosingTarget.value : null; // dollars
    const movingTVal = modalMovingTarget ? modalMovingTarget.value : null;    // dollars

    const errors = validateFormValues(hpVal, cbVal, mcVal, tdVal, downPctVal, closingTVal, movingTVal);
    if (Object.keys(errors).length > 0) {
      if (errors.house_price && modalHousePrice) setFieldError(modalHousePrice, errors.house_price);
      if (errors.current_balance && modalCurrentBalance) setFieldError(modalCurrentBalance, errors.current_balance);
      if (errors.monthly_contribution && modalMonthlyContribution) setFieldError(modalMonthlyContribution, errors.monthly_contribution);
      if (errors.target_date && modalTargetDate) setFieldError(modalTargetDate, errors.target_date);
      if (errors.down_payment_percent && modalDownPercent) setFieldError(modalDownPercent, errors.down_payment_percent);
      if (errors.closing_cost_target && modalClosingTarget) setFieldError(modalClosingTarget, errors.closing_cost_target);
      if (errors.moving_cost_target && modalMovingTarget) setFieldError(modalMovingTarget, errors.moving_cost_target);
      showModalStatus("Fix errors before saving", true);
      return;
    }

    const hpNum = Number(hpVal);

    // Build payload exactly how backend expects it
    const payload = {
      house_price: hpNum,
      current_balance: Number(cbVal),
      monthly_contribution: Number(mcVal),
      target_date: tdVal
    };

    // Down payment: percent -> decimal
    if (downPctVal !== null && downPctVal !== "") {
      payload.down_payment_percent = Number(downPctVal) / 100;
    }

    // Closing: dollars -> percent of house price
    if (closingTVal !== null && closingTVal !== "") {
      const closingD = Number(closingTVal);
      payload.closing_cost_percent = hpNum > 0 ? (closingD / hpNum) : 0;
    }

    // Moving: fixed dollars
    if (movingTVal !== null && movingTVal !== "") {
      payload.moving_cost_fixed = Number(movingTVal);
    }

    // Also store user-facing bucket params for modal (so it can re-open with same values)
    const bucketParams = {};
    if (downPctVal !== null && downPctVal !== "") bucketParams.down_payment_percent = Number(downPctVal) / 100;
    if (closingTVal !== null && closingTVal !== "") {
      bucketParams.closing_cost_target = Number(closingTVal);
      bucketParams.closing_cost_percent = hpNum > 0 ? (Number(closingTVal) / hpNum) : 0;
    }
    if (movingTVal !== null && movingTVal !== "") {
      bucketParams.moving_cost_fixed = Number(movingTVal);
      bucketParams.moving_cost_target = Number(movingTVal);
    }
    if (Object.keys(bucketParams).length > 0) {
      payload.buckets = { params: bucketParams };
    }

    try {
      const saveRes = await debouncedSave(payload);
      if (saveRes && saveRes.success) {
        showModalStatus("Goal saved");
        await refreshFullGoal();
        setTimeout(() => closeModal(), 300);
      } else {
        console.error("Save failed:", saveRes);
        showModalStatus(saveRes && saveRes.error ? saveRes.error : "Save failed", true);
      }
    } catch (err) {
      console.error("Save error:", err);
      showModalStatus("Save failed", true);
    }
  }

  if (modalUpdateBtn) modalUpdateBtn.addEventListener("click", onModalSave);

  // ---------- Prefill modal from page (fallback) ----------

  function prefillModalFromPage() {
    try {
      // House price from goal-target text if needed
      if (modalHousePrice && !modalHousePrice.value) {
        const t = document.querySelector("#goal-target");
        if (t && t.textContent) {
          const num = Number(t.textContent.replace(/[^0-9.-]+/g, ""));
          if (!Number.isNaN(num) && num > 0) modalHousePrice.value = num;
        }
      }

      const hpNum = Number(modalHousePrice ? modalHousePrice.value : 0) || 0;

      // Down payment percent from down-payment-target
      if (modalDownPercent) {
        const t = document.querySelector("#down-payment-target");
        if (t && t.textContent && hpNum > 0) {
          const d = Number(t.textContent.replace(/[^0-9.-]+/g, ""));
          if (!Number.isNaN(d) && d > 0) {
            modalDownPercent.value = Math.round((d / hpNum) * 100 * 10) / 10;
          }
        }
      }

      // Closing target dollars
      if (modalClosingTarget) {
        const t = document.querySelector("#closing-cost-target");
        if (t && t.textContent) {
          const d = Number(t.textContent.replace(/[^0-9.-]+/g, ""));
          if (!Number.isNaN(d) && d >= 0) modalClosingTarget.value = d;
        }
      }

      // Moving target dollars
      if (modalMovingTarget) {
        const t = document.querySelector("#moving-cost-target");
        if (t && t.textContent) {
          const d = Number(t.textContent.replace(/[^0-9.-]+/g, ""));
          if (!Number.isNaN(d) && d >= 0) modalMovingTarget.value = d;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // ---------- Load saved goal into modal ----------

  async function loadSavedGoalIntoModal() {
    try {
      const data = await get("/api/goal/load");
      if (data && data.success && data.found && data.goal) {
        const g = data.goal;

        if (modalHousePrice) modalHousePrice.value = g.house_price ?? "";
        if (modalCurrentBalance) modalCurrentBalance.value = g.current_balance ?? "";
        if (modalMonthlyContribution) modalMonthlyContribution.value = g.monthly_contribution ?? "";
        if (modalTargetDate) modalTargetDate.value = g.target_date ?? "";

        const hpNum = Number(g.house_price || modalHousePrice?.value || 0) || 0;

        const b = g.buckets || {};
        const params = b.params || {};
        const targets = b.targets || {};

        // Down payment percent (stored as decimal either on root or in params)
        if (modalDownPercent) {
          if (g.down_payment_percent != null) {
            modalDownPercent.value = Math.round(Number(g.down_payment_percent) * 100 * 10) / 10;
          } else if (params.down_payment_percent != null) {
            modalDownPercent.value = Math.round(Number(params.down_payment_percent) * 100 * 10) / 10;
          } else if (targets.down_payment_target && hpNum > 0) {
            const d = Number(targets.down_payment_target);
            modalDownPercent.value = Math.round((d / hpNum) * 100 * 10) / 10;
          } else {
            modalDownPercent.value = "";
          }
        }

        // Closing target dollars
        if (modalClosingTarget) {
          if (params.closing_cost_target != null) {
            modalClosingTarget.value = Number(params.closing_cost_target);
          } else if (g.closing_cost_percent != null && hpNum > 0) {
            modalClosingTarget.value = Math.round(Number(g.closing_cost_percent) * hpNum);
          } else if (targets.closing_cost_target != null) {
            modalClosingTarget.value = Number(targets.closing_cost_target);
          } else {
            modalClosingTarget.value = "";
          }
        }

        // Moving target dollars
        if (modalMovingTarget) {
          if (params.moving_cost_target != null) {
            modalMovingTarget.value = Number(params.moving_cost_target);
          } else if (g.moving_cost_fixed != null) {
            modalMovingTarget.value = Number(g.moving_cost_fixed);
          } else if (targets.moving_cost_target != null) {
            modalMovingTarget.value = Number(targets.moving_cost_target);
          } else {
            modalMovingTarget.value = "";
          }
        }
      } else {
        prefillModalFromPage();
      }
    } catch (err) {
      console.error("Failed to load saved goal into modal:", err);
      prefillModalFromPage();
    }
  }

  // ---------- Refresh using saved goal object ----------

  async function refreshFullGoalUsingObject(goalObj) {
    try {
      const payload = {
        house_price: Number(goalObj.house_price || 0),
        current_balance: Number(goalObj.current_balance || 0),
        monthly_contribution: Number(goalObj.monthly_contribution || 0),
        target_date: goalObj.target_date || ""
      };

      if (goalObj.down_payment_percent != null) payload.down_payment_percent = goalObj.down_payment_percent;
      if (goalObj.closing_cost_percent != null) payload.closing_cost_percent = goalObj.closing_cost_percent;
      if (goalObj.moving_cost_fixed != null) payload.moving_cost_fixed = goalObj.moving_cost_fixed;
      if (goalObj.extra_savings_target != null) payload.extra_savings_target = goalObj.extra_savings_target;

      const res = await post("/api/goal/full", payload);
      if (!res || !res.success) {
        console.warn("Full goal API returned error when using saved object", res);
        return;
      }
      applyFullGoalResponse(res);
    } catch (err) {
      console.error("Error in refreshFullGoalUsingObject:", err);
    }
  }

  // ---------- Main refresh (reads current inputs) ----------

  async function refreshFullGoal() {
    try {
      const hp = Number(safeValueById("house-price"));
      const cb = Number(safeValueById("current-balance"));
      const mc = Number(safeValueById("monthly-contribution"));
      const td = safeValueById("target-date");

      if (!hp || !td || Number.isNaN(cb) || Number.isNaN(mc)) {
        console.log("refreshFullGoal: missing or invalid inputs; skipping engine call");
        return;
      }

      const payload = {
        house_price: hp,
        current_balance: cb,
        monthly_contribution: mc,
        target_date: td
      };

      // Include bucket params if modal fields have values
      const downPct = safeValueById("modal-down-payment-percent");
      const closingT = safeValueById("modal-closing-cost-target");
      const movingT = safeValueById("modal-moving-cost-target");

      if (downPct !== null && downPct !== "") payload.down_payment_percent = Number(downPct) / 100;
      if (closingT !== null && closingT !== "") {
        const closingD = Number(closingT);
        payload.closing_cost_percent = hp > 0 ? (closingD / hp) : 0;
      }
      if (movingT !== null && movingT !== "") payload.moving_cost_fixed = Number(movingT);

      const res = await post("/api/goal/full", payload);
      if (!res || !res.success) {
        console.warn("Full goal API returned error", res);
        return;
      }
      applyFullGoalResponse(res);
    } catch (err) {
      console.error("Failed to refresh full goal:", err);
    }
  }

  // ---------- Apply /api/goal/full response to UI ----------

  function applyFullGoalResponse(res) {
    try {
      const progress = res.progress || {};
      const buckets = res.buckets || {};
      // update timeline chart (must be called after progress is set)
      initOrUpdateTimelineChart(progress.timeline || []);

      if (goalCurrent && progress.current_balance != null) goalCurrent.textContent = `$${Number(progress.current_balance).toLocaleString()}`;
      if (goalTarget && progress.target_amount != null) goalTarget.textContent = `$${Number(progress.target_amount).toLocaleString()}`;
      if (goalPercent && progress.percent_complete != null) goalPercent.textContent = `${progress.percent_complete}%`;
      if (progressText && progress.current_balance != null && progress.target_amount != null) {
        progressText.textContent = `Saved: $${Number(progress.current_balance).toLocaleString()} / $${Number(progress.target_amount).toLocaleString()} (${progress.percent_complete}%)`;
      }

      // Ring
      const ring = document.querySelector(".ring-progress");
      if (ring && typeof progress.percent_complete === "number") {
        const r = Number(ring.getAttribute("r")) || 60;
        const circumference = 2 * Math.PI * r;
        ring.style.strokeDasharray = `${circumference}`;
        const pct = Math.max(0, Math.min(100, progress.percent_complete));
        const offset = circumference * (1 - pct / 100);
        ring.style.transition = "stroke-dashoffset 700ms cubic-bezier(.2,.9,.2,1)";
        requestAnimationFrame(() => { ring.style.strokeDashoffset = `${offset}`; });
      }

      // Buckets (frontend weighted splitting, but prefer API currents only when strictly consistent)
      try {
        const bucketsObj = buckets || {};
        const targets = bucketsObj.targets || {};
        const currents = bucketsObj.current || {};
        const params = bucketsObj.params || {};

        // Read targets (support multiple key names). IMPORTANT: do NOT read from progress here.
        const readTarget = (keys, fallback = 0) => {
          for (const k of keys) {
            if (targets[k] != null) return Number(targets[k]);
            if (params[k] != null) return Number(params[k]);
            if (bucketsObj[k] != null) return Number(bucketsObj[k]);
          }
          return Number(fallback);
        };

        const t_down = readTarget(["down_payment_target", "down_payment", "downPayment"], 0);
        const t_closing = readTarget(["closing_cost_target", "closing_cost", "closingCost"], 0);
        const t_moving = readTarget(["moving_cost_target", "moving_cost", "movingCost"], 0);
        const t_extra = readTarget(["extra_target", "extra"], 0);

        // --- Ensure display/rounded bucket variables exist before the UI override runs ---
        let displayDown = 0, displayClosing = 0, displayMoving = 0, displayExtra = 0;
        let rDown = 0, rClosing = 0, rMoving = 0, rExtra = 0;

        // ---------- UI override: force proportional display from progress and targets ----------
        // This ensures the UI always splits progress.current_balance proportionally across targets.
        // It's frontend-only and reversible; remove when backend is fixed.
        (function forceProportionalDisplay() {
          const saved = Math.round(Number(progress.current_balance || 0));
          // If no saved money, nothing to do
          if (!saved || saved <= 0) return;

          // Use targets (fall back to 0)
          const tgtDown = Math.max(0, Math.round(Number(t_down || 0)));
          const tgtClosing = Math.max(0, Math.round(Number(t_closing || 0)));
          const tgtMoving = Math.max(0, Math.round(Number(t_moving || 0)));
          const tgtExtra = Math.max(0, Math.round(Number(t_extra || 0)));

          const sumTargets = Math.max(1, tgtDown + tgtClosing + tgtMoving + tgtExtra);

          // Raw proportional allocation (rounded)
          let pDown = Math.round(saved * (tgtDown / sumTargets));
          let pClosing = Math.round(saved * (tgtClosing / sumTargets));
          let pMoving = Math.round(saved * (tgtMoving / sumTargets));
          let pExtra = Math.round(saved * (tgtExtra / sumTargets));

          // Fix rounding remainder deterministically (give 1$ to buckets in priority order)
          let s = pDown + pClosing + pMoving + pExtra;
          let rem = saved - s;
          const order = ["pDown", "pClosing", "pMoving", "pExtra"];
          let idx = 0;
          while (rem > 0) {
            if (order[idx] === "pDown") pDown++;
            else if (order[idx] === "pClosing") pClosing++;
            else if (order[idx] === "pMoving") pMoving++;
            else pExtra++;
            rem--;
            idx = (idx + 1) % order.length;
          }

          // Clamp to targets (never exceed target)
          pDown = Math.min(pDown, tgtDown);
          pClosing = Math.min(pClosing, tgtClosing);
          pMoving = Math.min(pMoving, tgtMoving);
          pExtra = Math.min(pExtra, tgtExtra);

          // If clamping caused a shortfall, distribute remaining dollars to buckets with capacity
          let sumAfterClamp = pDown + pClosing + pMoving + pExtra;
          let short = saved - sumAfterClamp;
          if (short > 0) {
            const caps = [
              { key: "pDown", cap: Math.max(0, tgtDown - pDown) },
              { key: "pClosing", cap: Math.max(0, tgtClosing - pClosing) },
              { key: "pMoving", cap: Math.max(0, tgtMoving - pMoving) },
              { key: "pExtra", cap: Math.max(0, tgtExtra - pExtra) }
            ];
            // fill by largest capacity first
            caps.sort((a, b) => b.cap - a.cap);
            for (let i = 0; i < caps.length && short > 0; i++) {
              const take = Math.min(short, caps[i].cap);
              if (take <= 0) continue;
              if (caps[i].key === "pDown") pDown += take;
              if (caps[i].key === "pClosing") pClosing += take;
              if (caps[i].key === "pMoving") pMoving += take;
              if (caps[i].key === "pExtra") pExtra += take;
              short -= take;
            }
          }

          // Final safety: ensure sum <= saved
          let finalSum = pDown + pClosing + pMoving + pExtra;
          if (finalSum > saved) {
            // reduce down first deterministically
            let excess = finalSum - saved;
            const reduce = Math.min(excess, pDown);
            pDown -= reduce;
            excess -= reduce;
            if (excess > 0) {
              const r2 = Math.min(excess, pClosing);
              pClosing -= r2;
              excess -= r2;
            }
            if (excess > 0) {
              const r3 = Math.min(excess, pMoving);
              pMoving -= r3;
              excess -= r3;
            }
            if (excess > 0) {
              const r4 = Math.min(excess, pExtra);
              pExtra -= r4;
              excess -= r4;
            }
          }

          // Assign to outer-scope variables used later
          displayDown = pDown;
          displayClosing = pClosing;
          displayMoving = pMoving;
          displayExtra = pExtra;

          rDown = pDown;
          rClosing = pClosing;
          rMoving = pMoving;
          rExtra = pExtra;
        })();

        // Use API-provided currents if available (we'll validate them)
        const actualDown = Number(currents.down_payment_current ?? currents.down_payment ?? 0);
        const actualClosing = Number(currents.closing_cost_current ?? currents.closing_cost ?? 0);
        const actualMoving = Number(currents.moving_cost_current ?? currents.moving_cost ?? 0);
        const actualExtra = Number(currents.extra_current ?? currents.extra ?? 0);

        // total saved (rounded)
        const totalSaved = Number(progress.current_balance ?? 0);
        const roundedTotalSaved = Math.round(totalSaved);

        // weights (from bucketsObj or defaults)
        const defaultWeights = { down: 1.4, closing: 1.0, moving: 0.8, extra: 0.6 };
        const w_down = Number(bucketsObj.weights?.down_payment ?? bucketsObj.weights?.["down-payment"] ?? defaultWeights.down);
        const w_closing = Number(bucketsObj.weights?.closing_cost ?? bucketsObj.weights?.["closing-cost"] ?? defaultWeights.closing);
        const w_moving = Number(bucketsObj.weights?.moving_cost ?? bucketsObj.weights?.["moving-cost"] ?? defaultWeights.moving);
        const w_extra = Number(bucketsObj.weights?.extra ?? defaultWeights.extra);

        const weightedDown = (t_down || 0) * w_down;
        const weightedClosing = (t_closing || 0) * w_closing;
        const weightedMoving = (t_moving || 0) * w_moving;
        const weightedExtra = (t_extra || 0) * w_extra;
        const sumWeighted = Math.max(1, weightedDown + weightedClosing + weightedMoving + weightedExtra);

        // raw (floating) shares (use roundedTotalSaved)
        const rawDown = (roundedTotalSaved * (weightedDown / sumWeighted));
        const rawClosing = (roundedTotalSaved * (weightedClosing / sumWeighted));
        const rawMoving = (roundedTotalSaved * (weightedMoving / sumWeighted));
        const rawExtra = (roundedTotalSaved * (weightedExtra / sumWeighted));

        // clamp to targets (still floating)
        const clampedDown = Math.min(t_down || 0, rawDown);
        const clampedClosing = Math.min(t_closing || 0, rawClosing);
        const clampedMoving = Math.min(t_moving || 0, rawMoving);
        const clampedExtra = Math.min(t_extra || 0, rawExtra);

        // round to dollars
        rDown = Math.round(clampedDown);
        rClosing = Math.round(clampedClosing);
        rMoving = Math.round(clampedMoving);
        rExtra = Math.round(clampedExtra);

        // compute remainder (could be positive or negative due to rounding)
        let sumRounded = rDown + rClosing + rMoving + rExtra;
        let remainder = roundedTotalSaved - sumRounded;

        // helper: buckets array for distributing remainder by weight and remaining capacity
        const bucketsForDist = [
          { key: "down", weight: w_down, cur: rDown, tgt: t_down },
          { key: "closing", weight: w_closing, cur: rClosing, tgt: t_closing },
          { key: "moving", weight: w_moving, cur: rMoving, tgt: t_moving },
          { key: "extra", weight: w_extra, cur: rExtra, tgt: t_extra }
        ];

        // sort by weight descending so higher priority buckets get remainder first
        bucketsForDist.sort((a, b) => b.weight - a.weight);

        // distribute positive remainder (add dollars) to buckets that have capacity
        if (remainder > 0) {
          for (let i = 0; i < bucketsForDist.length && remainder > 0; i++) {
            const b = bucketsForDist[i];
            const capacity = Math.max(0, Math.round((b.tgt || 0)) - b.cur);
            if (capacity <= 0) continue;
            const give = Math.min(capacity, remainder);
            b.cur += give;
            remainder -= give;
          }
          // if still remainder > 0 (all buckets at target), leave remainder unallocated (means totalSaved > sum of targets)
        }

        // if remainder < 0 (we rounded up too much), remove dollars from lowest-weight buckets first
        if (remainder < 0) {
          for (let i = bucketsForDist.length - 1; i >= 0 && remainder < 0; i--) {
            const b = bucketsForDist[i];
            const removable = Math.max(0, b.cur - 0); // ensure not negative
            if (removable <= 0) continue;
            const take = Math.min(removable, Math.abs(remainder));
            b.cur -= take;
            remainder += take;
          }
        }

        // write back rounded values (only if we didn't already override via UI override)
        rDown = bucketsForDist.find(b => b.key === "down").cur;
        rClosing = bucketsForDist.find(b => b.key === "closing").cur;
        rMoving = bucketsForDist.find(b => b.key === "moving").cur;
        rExtra = bucketsForDist.find(b => b.key === "extra").cur;

        // --- Decide whether to trust API currents ---
        // Strict rule: trust API currents only when their rounded sum equals roundedTotalSaved (within EPS).
        const sumActuals = Math.round(actualDown) + Math.round(actualClosing) + Math.round(actualMoving) + Math.round(actualExtra);
        const EPS = 1; // $1 tolerance

        let useApiCurrents = false;
        if (sumActuals > 0 && Math.abs(sumActuals - roundedTotalSaved) <= EPS) {
          useApiCurrents = true;
        } else {
          useApiCurrents = false;
          if (sumActuals > 0) {
            console.warn("Rejecting inconsistent API currents: sumActuals=", sumActuals, "totalSaved=", roundedTotalSaved, "currents=", { actualDown, actualClosing, actualMoving, actualExtra });
          }
        }

        // Final display values: prefer API currents only when strictly consistent
        // But if the UI override set display* earlier, prefer those values (UI override is authoritative)
        let displayDownFinal = typeof displayDown === "number" && displayDown > 0 ? displayDown : (useApiCurrents ? Math.round(actualDown) : rDown);
        let displayClosingFinal = typeof displayClosing === "number" && displayClosing > 0 ? displayClosing : (useApiCurrents ? Math.round(actualClosing) : rClosing);
        let displayMovingFinal = typeof displayMoving === "number" && displayMoving > 0 ? displayMoving : (useApiCurrents ? Math.round(actualMoving) : rMoving);
        let displayExtraFinal = typeof displayExtra === "number" && displayExtra > 0 ? displayExtra : (useApiCurrents ? Math.round(actualExtra) : rExtra);

        // If UI override produced zeros (because saved was zero), fall back to computed r* values
        if ((displayDownFinal + displayClosingFinal + displayMovingFinal + displayExtraFinal) === 0 && roundedTotalSaved > 0) {
          displayDownFinal = rDown;
          displayClosingFinal = rClosing;
          displayMovingFinal = rMoving;
          displayExtraFinal = rExtra;
        }

        // Final invariant guard: ensure displayed buckets never sum to more than totalSaved
        let sumDisplay = displayDownFinal + displayClosingFinal + displayMovingFinal + displayExtraFinal;
        if (sumDisplay > roundedTotalSaved) {
          // reduce down payment first (deterministic)
          let excess = sumDisplay - roundedTotalSaved;
          const reduceDown = Math.min(excess, displayDownFinal);
          displayDownFinal -= reduceDown;
          excess -= reduceDown;
          if (excess > 0) {
            const reduceClosing = Math.min(excess, displayClosingFinal);
            displayClosingFinal -= reduceClosing;
            excess -= reduceClosing;
          }
          if (excess > 0) {
            const reduceMoving = Math.min(excess, displayMovingFinal);
            displayMovingFinal -= reduceMoving;
            excess -= reduceMoving;
          }
          if (excess > 0) {
            const reduceExtra = Math.min(excess, displayExtraFinal);
            displayExtraFinal -= reduceExtra;
            excess -= reduceExtra;
          }
          // recompute sumDisplay
          sumDisplay = displayDownFinal + displayClosingFinal + displayMovingFinal + displayExtraFinal;
        }

        // Recompute percentages from final display values
        const pctDown = t_down > 0 ? Math.min(100, (displayDownFinal / t_down) * 100) : 0;
        const pctClosing = t_closing > 0 ? Math.min(100, (displayClosingFinal / t_closing) * 100) : 0;
        const pctMoving = t_moving > 0 ? Math.min(100, (displayMovingFinal / t_moving) * 100) : 0;
        const pctExtra = t_extra > 0 ? Math.min(100, (displayExtraFinal / t_extra) * 100) : 0;

        const fmt = (v) => `$${Number(v || 0).toLocaleString()}`;

        const setBucketUI = (key, pct, curVal, tgtVal) => {
          const map = bucketMap[key];
          if (!map) return;

          // update bar and percent
          const bar = document.querySelector(map.bar);
          const pctEl = document.querySelector(map.pct);
          if (pctEl) pctEl.textContent = `${Math.round(pct * 10) / 10}%`;
          if (bar) {
            bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
            const existing = bar.querySelector(".bucket-bar-label");
            if (existing) existing.remove();
          }

          // update ALL matching current elements (handles duplicate IDs in top card + bucket cards)
          const curEls = Array.from(document.querySelectorAll(map.cur));
          if (curEls.length > 0) curEls.forEach(el => { el.textContent = fmt(curVal); });
          else {
            const curEl = document.querySelector(map.cur);
            if (curEl) curEl.textContent = fmt(curVal);
          }

          // update ALL matching target elements
          const tgtEls = Array.from(document.querySelectorAll(map.tgt));
          if (tgtEls.length > 0) tgtEls.forEach(el => { el.textContent = tgtVal > 0 ? fmt(tgtVal) : "-"; });
          else {
            const tgtEl = document.querySelector(map.tgt);
            if (tgtEl) tgtEl.textContent = tgtVal > 0 ? fmt(tgtVal) : "-";
          }
        };

        setBucketUI("down-payment", pctDown, displayDownFinal, t_down);
        setBucketUI("closing-cost", pctClosing, displayClosingFinal, t_closing);
        setBucketUI("moving-cost", pctMoving, displayMovingFinal, t_moving);
        setBucketUI("extra", pctExtra, displayExtraFinal, t_extra);
      } catch (e) {
        console.error("Bucket UI update error:", e);
      }

      // Health
      if (healthEl && progress.goal_health_score != null) healthEl.textContent = progress.goal_health_score;

      // Timeline
      const timeline = Array.isArray(progress.timeline) ? progress.timeline : [];
      const targetAmount = progress.target_amount || null;
      createOrUpdateTimelineChart(timeline, targetAmount);
    } catch (err) {
      console.error("Error applying full goal response:", err);
    }
  }

  // ---------- Chart ----------

  function createOrUpdateTimelineChart(timeline, targetAmount) {
    const canvas = document.querySelector("#goalTimelineChart");
    if (!canvas) return;
    if (typeof Chart === "undefined") return;

    const dataTimeline = Array.isArray(timeline) ? timeline.slice() : [];
    const labelFormatter = new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" });
    const labels = dataTimeline.map((t) => {
      try { return labelFormatter.format(new Date(t.date)); } catch (e) { return t.date; }
    });

    let yMax = (typeof targetAmount === "number" && targetAmount > 0)
      ? targetAmount
      : Math.max(...dataTimeline.map(d => Number(d.balance || 0)), 1);

    yMax = Math.ceil(yMax);
    const rawData = dataTimeline.map((t) => Number(t.balance || 0));
    const data = rawData.map(v => Math.min(v, yMax));
    const desiredTicks = 6;
    const stepSize = Math.ceil(yMax / (desiredTicks - 1));

    canvas.style.width = "100%";
    canvas.style.height = "100%";

    if (timelineChart && typeof timelineChart.destroy === "function") {
      try { timelineChart.destroy(); } catch (e) {}
      timelineChart = null;
    }

    const ctx = canvas.getContext("2d");
    const config = {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Projected Balance",
          data,
          borderColor: "rgba(75,192,192,0.95)",
          backgroundColor: "rgba(75,192,192,0.12)",
          pointRadius: 3,
          tension: 0.22,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: "#bcd3ee", maxRotation: 0, autoSkip: true },
            grid: { color: "rgba(255,255,255,0.03)" }
          },
          y: {
            beginAtZero: true,
            max: yMax,
            ticks: {
              color: "#bcd3ee",
              stepSize: stepSize,
              callback: function (value) { return `$${Number(value).toLocaleString()}`; }
            },
            grid: { color: "rgba(255,255,255,0.03)" }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const v = context.parsed.y;
                return `Balance: $${Number(v).toLocaleString()}`;
              }
            }
          }
        },
        layout: { padding: { top: 6, bottom: 6, left: 6, right: 6 } }
      }
    };

    timelineChart = new Chart(ctx, config);
  }

  // ---------- Initial load ----------

  async function loadSavedGoalOnPage() {
    try {
      const data = await get("/api/goal/load");
      if (data && data.success && data.found && data.goal) {
        const g = data.goal;

        if (modalHousePrice) modalHousePrice.value = g.house_price ?? "";
        if (modalCurrentBalance) modalCurrentBalance.value = g.current_balance ?? "";
        if (modalMonthlyContribution) modalMonthlyContribution.value = g.monthly_contribution ?? "";
        if (modalTargetDate) modalTargetDate.value = g.target_date ?? "";

        await refreshFullGoalUsingObject(g);
      } else {
        await refreshFullGoal();
      }
    } catch (err) {
      console.error("Failed to load saved goal on page init:", err);
      try { await refreshFullGoal(); } catch (e) {}
    }
  }

  loadSavedGoalOnPage().catch(e => console.error("Initial load failed:", e));

  // Expose manual refresh
  window.__refreshFullGoal = refreshFullGoal;
}
