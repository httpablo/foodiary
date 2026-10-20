-- `logged_at` records when the meal was registered, independently of the day it
-- belongs to (`created_at`). Streaks only count days filled in up to the next day.
ALTER TABLE meals ADD COLUMN IF NOT EXISTS logged_at TIMESTAMPTZ;

UPDATE meals
SET logged_at = created_at
WHERE logged_at IS NULL;

ALTER TABLE meals
  ALTER COLUMN logged_at SET DEFAULT NOW(),
  ALTER COLUMN logged_at SET NOT NULL;
