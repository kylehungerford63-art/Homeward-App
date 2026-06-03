// ===============================================
// HOUSE GOAL ENGINE (Unified Engine File)
// ===============================================

/**
 * Calculate months between two dates
 */
function monthsBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);

  let months =
    (e.getFullYear() - s.getFullYear()) * 12 +
    (e.getMonth() - s.getMonth());

  if (e.getDate() < s.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

/**
 * Generate savings timeline
 */
function generateTimeline({ current_balance, monthly_contribution, months }) {
  const timeline = [];
  let balance = current_balance;

  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();

  for (let i = 0; i <= months; i++) {
    timeline.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-01`,
      balance: Math.round(balance)
    });

    balance += monthly_contribution;
    month++;

    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return timeline;
}

/**
 * Mortgage Calculator
 */
function calculateMortgage({ house_price, down_payment_percent = 0.20, rate = 0.065, term_years = 30 }) {
  const down_payment = house_price * down_payment_percent;
  const loan_amount = house_price - down_payment;

  const monthly_rate = rate / 12;
  const n = term_years * 12;

  const monthly_payment =
    loan_amount *
    (monthly_rate * Math.pow(1 + monthly_rate, n)) /
    (Math.pow(1 + monthly_rate, n) - 1);

  const total_paid = monthly_payment * n;
  const total_interest = total_paid - loan_amount;

  return {
    loan_amount: Math.round(loan_amount),
    monthly_payment: Math.round(monthly_payment),
    total_interest: Math.round(total_interest)
  };
}

/**
 * Goal Health Score (A–F)
 */
function calculateHealthScore({ percent_complete, months_remaining, monthly_contribution, target_amount, current_balance }) {
  const remaining = target_amount - current_balance;
  const required_per_month = remaining / months_remaining;

  if (required_per_month <= monthly_contribution) return "A";
  if (required_per_month <= monthly_contribution * 1.25) return "B";
  if (required_per_month <= monthly_contribution * 1.5) return "C";
  if (required_per_month <= monthly_contribution * 2) return "D";
  return "F";
}

/**
 * MAIN ENGINE
 */
function calculateHouseGoalProgress({
  current_balance,
  target_amount,
  target_date,
  monthly_contribution
}) {
  const today = new Date();
  const months_remaining = monthsBetween(today, target_date);

  const percent_complete = Math.min(
    100,
    (current_balance / target_amount) * 100
  );

  // Estimated completion date
  const remaining = target_amount - current_balance;
  const est_months_needed = Math.ceil(remaining / monthly_contribution);

  const est_date = new Date();
  est_date.setMonth(est_date.getMonth() + est_months_needed);

  // Timeline
  const timeline = generateTimeline({
    current_balance,
    monthly_contribution,
    months: Math.max(months_remaining, est_months_needed)
  });

  // Health score
  const goal_health_score = calculateHealthScore({
    percent_complete,
    months_remaining,
    monthly_contribution,
    target_amount,
    current_balance
  });

  return {
    percent_complete: Math.round(percent_complete),
    current_balance,
    target_amount,
    months_remaining,
    estimated_completion_date: est_date.toISOString().split("T")[0],
    recommended_monthly_savings: Math.round(remaining / months_remaining),
    goal_health_score,
    timeline
  };
}

module.exports = {
  calculateHouseGoalProgress,
  calculateMortgage
};
