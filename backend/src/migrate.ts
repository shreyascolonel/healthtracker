import bcrypt from 'bcryptjs';
import pool, { waitForDatabase } from './db';

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS periods (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  flow_level TEXT CHECK (flow_level IN ('light', 'medium', 'heavy')),
  symptoms JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight_kg DECIMAL(5,2) NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS food_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description TEXT NOT NULL,
  calories INTEGER,
  logged_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS water_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS fitness_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  liked BOOLEAN DEFAULT false,
  intensity TEXT CHECK (intensity IN ('low', 'moderate', 'high')),
  notes TEXT,
  logged_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('water', 'food', 'custom')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  time_of_day TEXT NOT NULL,
  days_of_week JSONB DEFAULT '[0,1,2,3,4,5,6]',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_periods_user ON periods(user_id);
CREATE INDEX IF NOT EXISTS idx_weight_user ON weight_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_food_user ON food_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_water_user ON water_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fitness_user ON fitness_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_periods_updated ON periods(updated_at);
CREATE INDEX IF NOT EXISTS idx_weight_updated ON weight_logs(updated_at);
CREATE INDEX IF NOT EXISTS idx_food_updated ON food_logs(updated_at);
CREATE INDEX IF NOT EXISTS idx_water_updated ON water_logs(updated_at);
CREATE INDEX IF NOT EXISTS idx_fitness_updated ON fitness_logs(updated_at);
CREATE INDEX IF NOT EXISTS idx_reminders_updated ON reminders(updated_at);
`;

async function migrate() {
  console.log('Running database migrations...');
  await pool.query(SCHEMA);
  console.log('Migrations complete.');
}

async function seedDefaultUser() {
  const email = process.env.DEFAULT_USER_EMAIL || 'wife@home.local';
  const password = process.env.DEFAULT_USER_PASSWORD || 'changeme';
  const name = process.env.DEFAULT_USER_NAME || 'Partner';

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)',
      [email, hash, name]
    );
    console.log(`Default user created: ${email}`);
  } else {
    console.log('Default user already exists.');
  }
}

async function main() {
  try {
    await waitForDatabase();
    await migrate();
    await seedDefaultUser();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
