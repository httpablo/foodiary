ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS initial_weight DOUBLE PRECISION;

UPDATE profiles
SET initial_weight = weight
WHERE initial_weight IS NULL;

CREATE TABLE IF NOT EXISTS weight_logs (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  weight DOUBLE PRECISION NOT NULL CHECK (
    isfinite(weight::float8)
    AND weight > 0
    AND weight <= 700
  ),
  date DATE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, date)
);

CREATE INDEX IF NOT EXISTS weight_logs_account_date_idx
  ON weight_logs (account_id, date DESC);

INSERT INTO weight_logs (id, account_id, weight, date, updated_at)
SELECT
  'init-' || account_id,
  account_id,
  weight,
  COALESCE((created_at AT TIME ZONE 'UTC')::date, CURRENT_DATE),
  created_at
FROM profiles
ON CONFLICT (account_id, date) DO NOTHING;
