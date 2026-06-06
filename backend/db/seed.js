require("dotenv").config({ path: "../.env" });
const pool = require("./database");

async function seed() {
  try {
    console.log("Seeding database...");

    // Categories
    await pool.query(`
      INSERT INTO categories (id, name, limit_amount, spent, emoji)
      VALUES
        (gen_random_uuid(), 'Groceries', 400, 0, '🛒'),
        (gen_random_uuid(), 'Rent', 1200, 0, '🏠'),
        (gen_random_uuid(), 'Utilities', 200, 0, '💡'),
        (gen_random_uuid(), 'Entertainment', 150, 0, '🎮')
      ON CONFLICT DO NOTHING;
    `);

    // Envelopes
    await pool.query(`
      INSERT INTO envelopes (id, name, balance, emoji)
      VALUES
        (gen_random_uuid(), 'Emergency Fund', 0, '🚨'),
        (gen_random_uuid(), 'Vacation', 0, '🏖️'),
        (gen_random_uuid(), 'Car Maintenance', 0, '🚗')
      ON CONFLICT DO NOTHING;
    `);

    // User
    await pool.query(`
      INSERT INTO users (id, name, email, password_hash)
      VALUES
        ('user_1', 'Kyle', 'kyle@example.com', 'hashedpassword123')
      ON CONFLICT DO NOTHING;
    `);

    // Goal
    await pool.query(`
      INSERT INTO goals (
        house_price,
        current_balance,
        monthly_contribution,
        target_date,
        down_payment_percent,
        closing_cost_percent,
        moving_cost_fixed,
        buckets
      )
      VALUES (
        450000,
        5000,
        1500,
        '2027-01-01',
        0.05,
        0.03,
        3000,
        '{"down_payment":0,"closing_costs":0,"moving_costs":0,"buffer":0}'
      );
    `);

    console.log("Seeding complete!");
  } catch (err) {
    console.error("Error seeding:", err);
  } finally {
    await pool.end();
  }
}

seed();
