const pool = require("./database");

// Get goal by ID
async function getGoalById(id) {
  const result = await pool.query(
    `SELECT * FROM goals WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

// Create a new goal
async function createGoal(goal) {
  const result = await pool.query(
    `INSERT INTO goals (
      house_price,
      current_balance,
      monthly_contribution,
      target_date,
      down_payment_percent,
      closing_cost_percent,
      moving_cost_fixed,
      extra_savings_target,
      buckets
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *`,
    [
      goal.house_price,
      goal.current_balance,
      goal.monthly_contribution,
      goal.target_date,
      goal.down_payment_percent,
      goal.closing_cost_percent,
      goal.moving_cost_fixed,
      goal.extra_savings_target,
      goal.buckets
    ]
  );
  return result.rows[0];
}

// Update an existing goal
async function updateGoal(id, updates) {
  const result = await pool.query(
    `UPDATE goals SET
      house_price = COALESCE($2, house_price),
      current_balance = COALESCE($3, current_balance),
      monthly_contribution = COALESCE($4, monthly_contribution),
      target_date = COALESCE($5, target_date),
      down_payment_percent = COALESCE($6, down_payment_percent),
      closing_cost_percent = COALESCE($7, closing_cost_percent),
      moving_cost_fixed = COALESCE($8, moving_cost_fixed),
      extra_savings_target = COALESCE($9, extra_savings_target),
      buckets = COALESCE($10, buckets),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *`,
    [
      id,
      updates.house_price,
      updates.current_balance,
      updates.monthly_contribution,
      updates.target_date,
      updates.down_payment_percent,
      updates.closing_cost_percent,
      updates.moving_cost_fixed,
      updates.extra_savings_target,
      updates.buckets
    ]
  );
  return result.rows[0] || null;
}

module.exports = {
  getGoalById,
  createGoal,
  updateGoal
};
