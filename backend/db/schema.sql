CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  house_goal_id TEXT,
  selected_house_savings_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  limit_amount NUMERIC,
  spent NUMERIC,
  emoji TEXT
);

CREATE TABLE IF NOT EXISTS envelopes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  balance NUMERIC,
  emoji TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category_id UUID REFERENCES categories(id),
  envelope_id UUID REFERENCES envelopes(id),
  ignored BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  house_price NUMERIC,
  current_balance NUMERIC,
  monthly_contribution NUMERIC,
  target_date DATE,
  down_payment_percent NUMERIC,
  closing_cost_percent NUMERIC,
  moving_cost_fixed NUMERIC,
  buckets JSONB
);

ALTER TABLE goals
ADD COLUMN IF NOT EXISTS extra_savings_target NUMERIC DEFAULT 0;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES users(id),
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  balance NUMERIC DEFAULT 0
);

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);

ALTER TABLE envelopes
ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id);

CREATE TABLE IF NOT EXISTS budget_modes (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  mode TEXT NOT NULL DEFAULT 'simple'
);
