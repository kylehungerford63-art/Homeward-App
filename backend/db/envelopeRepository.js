const pool = require("./database");

async function getEnvelopesByUser(user_id) {
  const result = await pool.query(
    `SELECT * FROM envelopes WHERE user_id = $1 ORDER BY name`,
    [user_id]
  );
  return result.rows;
}

async function createEnvelope(user_id, { name, balance, emoji }) {
  const result = await pool.query(
    `INSERT INTO envelopes (id, user_id, name, balance, emoji)
     VALUES (gen_random_uuid(), $1, $2, $3, $4)
     RETURNING *`,
    [user_id, name, balance, emoji || ""]
  );
  return result.rows[0];
}

async function updateEnvelope(user_id, id, updates) {
  const result = await pool.query(
    `UPDATE envelopes
     SET name = COALESCE($3, name),
         balance = COALESCE($4, balance),
         emoji = COALESCE($5, emoji)
     WHERE id = $2 AND user_id = $1
     RETURNING *`,
    [user_id, id, updates.name, updates.balance, updates.emoji]
  );
  return result.rows[0] || null;
}

async function deleteEnvelope(user_id, id) {
  await pool.query(
    `DELETE FROM envelopes WHERE id = $2 AND user_id = $1`,
    [user_id, id]
  );
}

module.exports = {
  getEnvelopesByUser,
  createEnvelope,
  updateEnvelope,
  deleteEnvelope
};
