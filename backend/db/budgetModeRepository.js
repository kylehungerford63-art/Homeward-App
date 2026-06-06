const pool = require("./database");

async function getMode(user_id) {
  const result = await pool.query(
    `SELECT mode FROM budget_modes WHERE user_id = $1`,
    [user_id]
  );
  return result.rows[0]?.mode || "simple";
}

async function setMode(user_id, mode) {
  const result = await pool.query(
    `INSERT INTO budget_modes (user_id, mode)
     VALUES ($1, $2)
     ON CONFLICT (user_id)
     DO UPDATE SET mode = EXCLUDED.mode
     RETURNING mode`,
    [user_id, mode]
  );
  return result.rows[0].mode;
}

module.exports = {
  getMode,
  setMode
};
