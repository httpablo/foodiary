ALTER TABLE meals
  ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS meals_queue_idx
  ON meals (available_at, created_at)
  WHERE status = 'QUEUED';
