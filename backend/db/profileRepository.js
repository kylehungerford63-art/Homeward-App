const pool = require("./database");

async function getProfileByUserId(user_id) {
  const result = await pool.query(
    `SELECT * FROM profiles WHERE user_id = $1 LIMIT 1`,
    [user_id]
  );
  return result.rows[0] || null;
}

async function createProfile(profile) {
  const result = await pool.query(
    `INSERT INTO profiles (user_id, bio, avatar_url)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [profile.user_id, profile.bio, profile.avatar_url]
  );
  return result.rows[0];
}

async function updateProfile(user_id, updates) {
  const result = await pool.query(
    `UPDATE profiles
     SET bio = COALESCE($2, bio),
         avatar_url = COALESCE($3, avatar_url),
         updated_at = NOW()
     WHERE user_id = $1
     RETURNING *`,
    [user_id, updates.bio, updates.avatar_url]
  );
  return result.rows[0] || null;
}

module.exports = {
  getProfileByUserId,
  createProfile,
  updateProfile
};
