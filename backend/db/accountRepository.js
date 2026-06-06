const pool = require("./database");

async function getAccountById(id) {
  const result = await pool.query(
    `SELECT * FROM accounts WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  getAccountById
};
