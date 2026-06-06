const pool = require("./database");

async function getCategoriesByUser(user_id) {
  const result = await pool.query(
    `SELECT * FROM categories WHERE user_id = $1 ORDER BY name`,
    [user_id]
  );
  return result.rows;
}

async function createCategory(user_id, { name, limit_amount, emoji }) {
  const result = await pool.query(
    `INSERT INTO categories (id, user_id, name, limit_amount, spent, emoji)
     VALUES (gen_random_uuid(), $1, $2, $3, 0, $4)
     RETURNING *`,
    [user_id, name, limit_amount, emoji || ""]
  );
  return result.rows[0];
}

async function updateCategory(user_id, id, updates) {
  const result = await pool.query(
    `UPDATE categories
     SET name = COALESCE($3, name),
         limit_amount = COALESCE($4, limit_amount),
         emoji = COALESCE($5, emoji)
     WHERE id = $2 AND user_id = $1
     RETURNING *`,
    [user_id, id, updates.name, updates.limit_amount, updates.emoji]
  );
  return result.rows[0] || null;
}

async function deleteCategory(user_id, id) {
  await pool.query(
    `DELETE FROM categories WHERE id = $2 AND user_id = $1`,
    [user_id, id]
  );
}

module.exports = {
  getCategoriesByUser,
  createCategory,
  updateCategory,
  deleteCategory
};
