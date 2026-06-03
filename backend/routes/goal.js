// backend/routes/goal.js
// Replacement /api/goal router. Uses express.json() parsed bodies. In-memory store for simplicity.

const express = require("express");
const router = express.Router();

// In-memory saved goal
let savedGoal = {
  house_price: 0,
  current_balance: 0,
  monthly_contribution: 0,
  target_date: null,
  buckets: { params: {} }
};

// Helpers
function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Build buckets/progress logic
function buildBucketsAndProgress(payload) {
  const housePrice = toNumber(payload.house_price, 0);
  const currentBalance = Math.round(toNumber(payload.current_balance, 0));
  const monthlyContribution = toNumber(payload.monthly_contribution, 0);

  const params = (payload.buckets && payload.buckets.params) || {};

  const downPct = (payload.down_payment_percent != null)
    ? Number(payload.down_payment_percent)
    : (params.down_payment_percent != null ? Number(params.down_payment_percent) : 0.2);

  const closingPct = (payload.closing_cost_percent != null)
    ? Number(payload.closing_cost_percent)
    : (params.closing_cost_percent != null ? Number(params.closing_cost_percent) : 0.03);

  const movingFixed = (payload.moving_cost_fixed != null)
    ? Number(payload.moving_cost_fixed)
    : (params.moving_cost_fixed != null ? Number(params.moving_cost_fixed) : 10000);

  const extraTarget = (payload.extra_savings_target != null)
    ? Number(payload.extra_savings_target)
    : (params.extra_target != null ? Number(params.extra_target) : 15000);

  const downTarget = Math.round(housePrice * downPct);
  const closingTarget = Math.round(housePrice * closingPct);
  const movingTarget = Math.round(movingFixed);
  const extraT = Math.round(extraTarget);

  const totalGoal = downTarget + closingTarget + movingTarget + extraT;

  // API-provided currents (optional)
  const apiCurrents = (payload.buckets && payload.buckets.current) || {};
  const apiDown = toNumber(apiCurrents.down_payment_current, 0);
  const apiClosing = toNumber(apiCurrents.closing_cost_current, 0);
  const apiMoving = toNumber(apiCurrents.moving_cost_current, 0);
  const apiExtra = toNumber(apiCurrents.extra_current, 0);
  const sumApiCurrents = Math.round(apiDown + apiClosing + apiMoving + apiExtra);

  let downCurrent = 0, closingCurrent = 0, movingCurrent = 0, extraCurrent = 0;

  // Trust API currents only when they sum to currentBalance (within $1)
  if (sumApiCurrents > 0 && Math.abs(sumApiCurrents - currentBalance) <= 1) {
    downCurrent = Math.round(apiDown);
    closingCurrent = Math.round(apiClosing);
    movingCurrent = Math.round(apiMoving);
    extraCurrent = Math.round(apiExtra);
  } else {
    // Proportional split by targets (never exceed targets)
    const tDown = Math.max(0, downTarget);
    const tClosing = Math.max(0, closingTarget);
    const tMoving = Math.max(0, movingTarget);
    const tExtra = Math.max(0, extraT);

    const sumTargets = Math.max(1, tDown + tClosing + tMoving + tExtra);

    let pDown = Math.round(currentBalance * (tDown / sumTargets));
    let pClosing = Math.round(currentBalance * (tClosing / sumTargets));
    let pMoving = Math.round(currentBalance * (tMoving / sumTargets));
    let pExtra = Math.round(currentBalance * (tExtra / sumTargets));

    // Fix rounding remainder deterministically
    let s = pDown + pClosing + pMoving + pExtra;
    let rem = currentBalance - s;
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

    // Clamp to targets
    pDown = Math.min(pDown, tDown);
    pClosing = Math.min(pClosing, tClosing);
    pMoving = Math.min(pMoving, tMoving);
    pExtra = Math.min(pExtra, tExtra);

    // If clamping caused shortfall, distribute remaining dollars to buckets with capacity
    let sumAfterClamp = pDown + pClosing + pMoving + pExtra;
    let short = currentBalance - sumAfterClamp;
    if (short > 0) {
      const caps = [
        { key: "pDown", cap: Math.max(0, tDown - pDown) },
        { key: "pClosing", cap: Math.max(0, tClosing - pClosing) },
        { key: "pMoving", cap: Math.max(0, tMoving - pMoving) },
        { key: "pExtra", cap: Math.max(0, tExtra - pExtra) }
      ];
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

    // Final safety: ensure sum <= currentBalance
    let finalSum = pDown + pClosing + pMoving + pExtra;
    if (finalSum > currentBalance) {
      let excess = finalSum - currentBalance;
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

    downCurrent = Math.round(pDown);
    closingCurrent = Math.round(pClosing);
    movingCurrent = Math.round(pMoving);
    extraCurrent = Math.round(pExtra);
  }

  const pctDown = downTarget ? Math.round((downCurrent / downTarget) * 100) : 0;
  const pctClosing = closingTarget ? Math.round((closingCurrent / closingTarget) * 100) : 0;
  const pctMoving = movingTarget ? Math.round((movingCurrent / movingTarget) * 100) : 0;
  const pctExtra = extraT ? Math.round((extraCurrent / extraT) * 100) : 0;

  const buckets = {
    total_goal: totalGoal,
    current_balance: currentBalance,
    targets: {
      down_payment_target: downTarget,
      closing_cost_target: closingTarget,
      moving_cost_target: movingTarget,
      extra_target: extraT
    },
    current: {
      down_payment_current: downCurrent,
      closing_cost_current: closingCurrent,
      moving_cost_current: movingCurrent,
      extra_current: extraCurrent
    },
    percent: {
      down_payment_percent: pctDown,
      closing_cost_percent: pctClosing,
      moving_cost_percent: pctMoving,
      extra_percent: pctExtra
    },
    params: params
  };

  // --- Build timeline (monthly points) and health score ---
  // Determine target date and months span
  let timeline = [];
  try {
    const now = new Date();
    let endDate = null;
    if (payload.target_date) {
      const td = new Date(payload.target_date);
      if (!isNaN(td.getTime())) endDate = td;
    }
    // fallback to 12 months from now if no valid target_date
    if (!endDate) {
      endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 12);
    }

    // compute months difference (at least 1)
    const months = Math.max(1, (endDate.getFullYear() - now.getFullYear()) * 12 + (endDate.getMonth() - now.getMonth()));

    // generate monthly points (include start and end)
    for (let i = 0; i <= months; i++) {
      const pointDate = new Date(now);
      pointDate.setMonth(pointDate.getMonth() + i);
      // linear interpolation from currentBalance to totalGoal
      const t = months === 0 ? 1 : (i / months);
      const bal = Math.round(currentBalance + (totalGoal - currentBalance) * t);
      timeline.push({
        date: pointDate.toISOString().slice(0, 10), // YYYY-MM-DD
        balance: bal
      });
    }
  } catch (e) {
    timeline = [];
  }

  // Build progress object (percent_complete available for health calculation)
  const percentComplete = totalGoal ? Math.round((currentBalance / totalGoal) * 100) : 0;
  const progress = {
    current_balance: currentBalance,
    target_amount: totalGoal,
    percent_complete: percentComplete,
    timeline: timeline
  };

  // Simple health score heuristic (0-100)
  // Base on percent_complete; add small bonus if monthly contribution is >= (remaining / monthsRemaining)
  let healthScore = percentComplete;
  try {
    const remaining = Math.max(0, totalGoal - currentBalance);

    // compute monthsRemaining robustly
    let monthsRemaining = 12; // default
    if (payload.target_date) {
      const now = new Date();
      const td = new Date(payload.target_date);
      if (!isNaN(td.getTime())) {
        monthsRemaining = Math.max(1, (td.getFullYear() - now.getFullYear()) * 12 + (td.getMonth() - now.getMonth()));
      }
    }

    const neededPerMonth = remaining / Math.max(1, monthsRemaining);
    if (monthlyContribution >= neededPerMonth && neededPerMonth > 0) {
      healthScore = Math.min(100, Math.round(healthScore + 10)); // small boost if contributions are sufficient
    }
  } catch (e) {
    // ignore and keep base healthScore
  }

  // mortgage placeholder (keeps frontend happy)
  const mortgage = {
    monthly_payment: 0,
    principal: 0,
    rate: 0,
    term_years: 0
  };

  // Return buckets, progress, mortgage, and health_score
  return {
    buckets,
    progress,
    mortgage,
    health_score: Math.max(0, Math.min(100, Math.round(healthScore)))
  };
}

// Routes

// GET /api/goal/load
router.get("/load", (req, res) => {
  const found = savedGoal && savedGoal.house_price > 0;
  res.json({ success: true, found: found, goal: savedGoal });
});

// POST /api/goal/save
router.post("/save", (req, res) => {
  try {
    const payload = req.body || {};
    // Basic validation and persist in-memory
    savedGoal.house_price = toNumber(payload.house_price, savedGoal.house_price || 0);
    savedGoal.current_balance = toNumber(payload.current_balance, savedGoal.current_balance || 0);
    savedGoal.monthly_contribution = toNumber(payload.monthly_contribution, savedGoal.monthly_contribution || 0);
    savedGoal.target_date = payload.target_date || savedGoal.target_date || null;
    if (payload.buckets && payload.buckets.params) {
      savedGoal.buckets = savedGoal.buckets || {};
      savedGoal.buckets.params = Object.assign({}, savedGoal.buckets.params || {}, payload.buckets.params);
    }
    if (payload.down_payment_percent != null) savedGoal.down_payment_percent = Number(payload.down_payment_percent);
    if (payload.closing_cost_percent != null) savedGoal.closing_cost_percent = Number(payload.closing_cost_percent);
    if (payload.moving_cost_fixed != null) savedGoal.moving_cost_fixed = Number(payload.moving_cost_fixed);
    if (payload.extra_savings_target != null) savedGoal.extra_savings_target = Number(payload.extra_savings_target);

    res.json({ success: true, saved: true, goal: savedGoal });
  } catch (err) {
    console.error("Error in /api/goal/save:", err && err.stack ? err.stack : err);
    res.status(500).json({ error: "Server error saving goal" });
  }
});

// POST /api/goal/full
router.post("/full", (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }
    const hp = payload.house_price;
    const cb = payload.current_balance;
    const mc = payload.monthly_contribution;
    const td = payload.target_date;
    if (hp == null || cb == null || mc == null || !td) {
      return res.status(400).json({ error: "Missing required fields: house_price, current_balance, monthly_contribution, target_date" });
    }
    const result = buildBucketsAndProgress(payload);
    res.json(Object.assign({ success: true }, result));
  } catch (err) {
    console.error("Server error in /api/goal/full", err && err.stack ? err.stack : err);
    res.status(500).json({ error: err.message || "Server error in /api/goal/full" });
  }
});

module.exports = router;
