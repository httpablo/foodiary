CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accounts_email_not_blank CHECK (LENGTH(TRIM(email)) > 0)
);

CREATE UNIQUE INDEX accounts_email_unique ON accounts (LOWER(email));
CREATE UNIQUE INDEX accounts_external_id_unique ON accounts (external_id) WHERE external_id IS NOT NULL;

CREATE TABLE profiles (
  account_id TEXT PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE')),
  height DOUBLE PRECISION NOT NULL CHECK (height > 0),
  weight DOUBLE PRECISION NOT NULL CHECK (weight > 0),
  activity_level TEXT NOT NULL CHECK (activity_level IN ('SEDENTARY', 'LIGHT', 'MODERATE', 'HEAVY', 'ATHLETE')),
  goal TEXT NOT NULL CHECK (goal IN ('LOSE', 'MAINTAIN', 'GAIN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE goals (
  account_id TEXT PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
  calories DOUBLE PRECISION NOT NULL CHECK (calories >= 0),
  proteins DOUBLE PRECISION NOT NULL CHECK (proteins >= 0),
  carbohydrates DOUBLE PRECISION NOT NULL CHECK (carbohydrates >= 0),
  fats DOUBLE PRECISION NOT NULL CHECK (fats >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE meals (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('UPLOADING', 'QUEUED', 'PROCESSING', 'SUCCESS', 'FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  input_type TEXT NOT NULL CHECK (input_type IN ('AUDIO', 'PICTURE')),
  input_file_key TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  foods JSONB NOT NULL DEFAULT '[]'::JSONB CHECK (JSONB_TYPEOF(foods) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX meals_account_created_at_idx ON meals (account_id, created_at DESC);
