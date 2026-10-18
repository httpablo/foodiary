CREATE OR REPLACE FUNCTION isfinite(double precision)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT $1 NOT IN ('Infinity'::float8, '-Infinity'::float8, 'NaN'::float8);
$$;

UPDATE goals
SET calories = CASE WHEN isfinite(calories::float8) AND calories >= 0 THEN LEAST(calories, 50000) ELSE 2000 END,
    proteins = CASE WHEN isfinite(proteins::float8) AND proteins >= 0 THEN LEAST(proteins, 5000) ELSE 120 END,
    carbohydrates = CASE WHEN isfinite(carbohydrates::float8) AND carbohydrates >= 0 THEN LEAST(carbohydrates, 10000) ELSE 200 END,
    fats = CASE WHEN isfinite(fats::float8) AND fats >= 0 THEN LEAST(fats, 5000) ELSE 65 END
WHERE NOT (
  isfinite(calories::float8)
  AND isfinite(proteins::float8)
  AND isfinite(carbohydrates::float8)
  AND isfinite(fats::float8)
);

UPDATE profiles
SET height = CASE WHEN isfinite(height::float8) AND height > 0 THEN LEAST(height, 300) ELSE 170 END,
    weight = CASE WHEN isfinite(weight::float8) AND weight > 0 THEN LEAST(weight, 700) ELSE 70 END
WHERE NOT (
  isfinite(height::float8)
  AND isfinite(weight::float8)
);

ALTER TABLE goals
  DROP CONSTRAINT IF EXISTS goals_finite_values_check,
  ADD CONSTRAINT goals_finite_values_check CHECK (
    isfinite(calories::float8)
    AND isfinite(proteins::float8)
    AND isfinite(carbohydrates::float8)
    AND isfinite(fats::float8)
  );

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_finite_values_check,
  ADD CONSTRAINT profiles_finite_values_check CHECK (
    isfinite(height::float8)
    AND isfinite(weight::float8)
  );
