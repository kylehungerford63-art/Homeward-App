const pool = require("./database");

async function getTransactionsByUser(user_id) {
  const result = await pool.query(
    `SELECT t.*,
            c.emoji AS category_emoji,
            e.emoji AS envelope_emoji
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN envelopes e ON t.envelope_id = e.id
     WHERE t.user_id = $1
     ORDER BY t.date DESC, t.id DESC`,
    [user_id]
  );
  return result.rows;
}

async function createTransaction(user_id, tx) {
  const result = await pool.query(
    `INSERT INTO transactions (
       id, user_id, date, name, amount, category_id, envelope_id, ignored
     ) VALUES (
       gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7
     )
     RETURNING *`,
    [
      user_id,
      tx.date,
      tx.name,
      tx.amount,
      tx.category_id || null,
      tx.envelope_id || null,
      !!tx.ignored
    ]
  );
  return result.rows[0];
}

async function getTransactionById(user_id, id) {
  const result = await pool.query(
    `SELECT * FROM transactions WHERE id = $2 AND user_id = $1 LIMIT 1`,
    [user_id, id]
  );
  return result.rows[0] || null;
}

async function updateTransaction(user_id, id, updates) {
  const result = await pool.query(
    `UPDATE transactions
     SET date = COALESCE($3, date),
         name = COALESCE($4, name),
         amount = COALESCE($5, amount),
         category_id = COALESCE($6, category_id),
         envelope_id = COALESCE($7, envelope_id),
         ignored = COALESCE($8, ignored)
     WHERE id = $2 AND user_id = $1
     RETURNING *`,
    [
      user_id,
      id,
      updates.date,
      updates.name,
      updates.amount,
      updates.category_id || null,
      updates.envelope_id || null,
      updates.ignored
    ]
  );
  return result.rows[0] || null;
}

async function deleteTransaction(user_id, id) {
  await pool.query(
    `DELETE FROM transactions WHERE id = $2 AND user_id = $1`,
    [user_id, id]
  );
}

module.exports = {
  getTransactionsByUser,
  createTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransaction
};
