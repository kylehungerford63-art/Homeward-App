const pool = require("./database");

// Find user by email
async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

// Create a new user
async function createUser(user) {
  const result = await pool.query(
    `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING *`,
    [user.id, user.name, user.email, user.password_hash]
  );
  return result.rows[0];
}

// Find user by ID
async function findUserById(id) {
  const result = await pool.query(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

module.exports = {
  findUserByEmail,
  createUser,
  findUserById
};

