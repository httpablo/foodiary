-- Unlocks are stored so they never disappear when goals or meals change later.
CREATE TABLE IF NOT EXISTS achievements (
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  code TEXT NOT NULL CHECK (LENGTH(TRIM(code)) > 0),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  PRIMARY KEY (account_id, code)
);
