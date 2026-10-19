CREATE TABLE IF NOT EXISTS weight_goals (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  start_weight DOUBLE PRECISION NOT NULL CHECK (
    isfinite(start_weight::float8)
    AND start_weight > 0
    AND start_weight <= 700
  ),
  target_weight DOUBLE PRECISION NOT NULL CHECK (
    isfinite(target_weight::float8)
    AND target_weight > 0
    AND target_weight <= 700
    AND target_weight <> start_weight
  ),
  start_date DATE NOT NULL,
  pace_kg_per_week DOUBLE PRECISION NOT NULL CHECK (
    isfinite(pace_kg_per_week::float8)
    AND pace_kg_per_week > 0
    AND pace_kg_per_week <= 10
  ),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACHIEVED', 'ABANDONED')),
  achieved_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS weight_goals_one_active_idx
  ON weight_goals (account_id)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS weight_goals_account_created_idx
  ON weight_goals (account_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'goals'
      AND column_name = 'source'
  ) THEN
    ALTER TABLE goals
      ADD COLUMN source TEXT NOT NULL DEFAULT 'CALCULATED'
        CHECK (source IN ('CALCULATED', 'MANUAL')),
      ADD COLUMN calculated_for_weight DOUBLE PRECISION
        CHECK (calculated_for_weight IS NULL OR (isfinite(calculated_for_weight::float8) AND calculated_for_weight > 0));

    UPDATE goals g
    SET calculated_for_weight = p.weight
    FROM profiles p
    WHERE p.account_id = g.account_id;
  END IF;
END $$;
