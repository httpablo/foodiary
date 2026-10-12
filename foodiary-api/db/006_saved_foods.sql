CREATE TABLE saved_foods (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (LENGTH(TRIM(name)) BETWEEN 1 AND 120),
  quantity TEXT NOT NULL CHECK (LENGTH(TRIM(quantity)) BETWEEN 1 AND 80),
  proteins DOUBLE PRECISION NOT NULL CHECK (proteins BETWEEN 0 AND 10000),
  carbohydrates DOUBLE PRECISION NOT NULL CHECK (carbohydrates BETWEEN 0 AND 10000),
  fats DOUBLE PRECISION NOT NULL CHECK (fats BETWEEN 0 AND 10000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX saved_foods_account_name_quantity_idx
  ON saved_foods (account_id, LOWER(name), LOWER(quantity));

CREATE INDEX saved_foods_account_updated_at_idx
  ON saved_foods (account_id, updated_at DESC);
