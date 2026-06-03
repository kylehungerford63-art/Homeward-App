// backend/engine/bucketEngine.js
// Proportional bucket allocation engine with explicit module-load and call logging.
// Overwrites: full replacement.

function calculateBuckets({
  house_price = 450000,
  current_balance = 0,
  down_payment_percent = 0.20,
  closing_cost_percent = 0.03,
  moving_cost_fixed = 10000,
  extra_savings_target = 15000
}) {

  // Normalize inputs
  const hp = Number(house_price || 0);
  const saved = Math.max(0, Math.round(Number(current_balance || 0)));
  const downPct = Number(down_payment_percent == null ? 0.2 : down_payment_percent);
  const closingPct = Number(closing_cost_percent == null ? 0.03 : closing_cost_percent);
  const movingFixed = Number(moving_cost_fixed == null ? 10000 : moving_cost_fixed);
  const extraTarget = Number(extra_savings_target == null ? 15000 : extra_savings_target);

  // Targets (dollars)
  const down_payment_target = Math.round(hp * downPct);
  const closing_cost_target = Math.round(hp * closingPct);
  const moving_cost_target = Math.round(movingFixed);
  const extra_target = Math.round(extraTarget);

  const total_goal = down_payment_target + closing_cost_target + moving_cost_target + extra_target;

  // If nothing saved, return zeroed structure
  if (saved <= 0) {
    const zeroResult = {
      total_goal,
      current_balance: saved,
      targets: {
        down_payment_target,
        closing_cost_target,
        moving_cost_target,
        extra_target
      },
      current: {
        down_payment_current: 0,
        closing_cost_current: 0,
        moving_cost_current: 0,
        extra_current: 0
      },
      percent: {
        down_payment_percent: 0,
        closing_cost_percent: 0,
        moving_cost_percent: 0,
        extra_percent: 0
      }
    };
  }

  // Build target list and proportional shares
  const buckets = [
    { key: "down", tgt: down_payment_target },
    { key: "closing", tgt: closing_cost_target },
    { key: "moving", tgt: moving_cost_target },
    { key: "extra", tgt: extra_target }
  ];

  const sumTargets = buckets.reduce((s, b) => s + Math.max(0, b.tgt || 0), 0) || 1;

  // Raw proportional allocation (float)
  buckets.forEach(b => {
    b.raw = (saved * ((b.tgt || 0) / sumTargets));
    b.clamped = Math.min(Math.max(0, b.tgt || 0), b.raw);
    b.rounded = Math.round(b.clamped);
  });

  // Distribute rounding remainder to buckets with capacity (largest target first)
  let sumRounded = buckets.reduce((s, b) => s + b.rounded, 0);
  let remainder = saved - sumRounded;

  buckets.sort((a, b) => (b.tgt - a.tgt)); // largest target first
  for (let i = 0; i < buckets.length && remainder > 0; i++) {
    const cap = Math.max(0, Math.round(buckets[i].tgt) - buckets[i].rounded);
    const give = Math.min(cap, remainder);
    buckets[i].rounded += give;
    remainder -= give;
  }

  // If still remainder (saved > sum of targets), add overflow to down payment
  if (remainder > 0) {
    buckets[0].rounded += remainder;
    remainder = 0;
  }

  // Map back to named values
  const down_payment_current = buckets.find(b => b.key === "down").rounded;
  const closing_cost_current = buckets.find(b => b.key === "closing").rounded;
  const moving_cost_current = buckets.find(b => b.key === "moving").rounded;
  const extra_current = buckets.find(b => b.key === "extra").rounded;

  function pct(current, target) {
    if (!target || target === 0) return 0;
    return (current / target) * 100;
  }

  const result = {
    total_goal,
    current_balance: saved,
    targets: {
      down_payment_target,
      closing_cost_target,
      moving_cost_target,
      extra_target
    },
    current: {
      down_payment_current,
      closing_cost_current,
      moving_cost_current,
      extra_current
    },
    percent: {
      down_payment_percent: pct(down_payment_current, down_payment_target),
      closing_cost_percent: pct(closing_cost_current, closing_cost_target),
      moving_cost_percent: pct(moving_cost_current, moving_cost_target),
      extra_percent: pct(extra_current, extra_target)
    }
  };
}

module.exports = { calculateBuckets };
