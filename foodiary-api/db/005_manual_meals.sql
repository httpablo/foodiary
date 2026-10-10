ALTER TABLE meals DROP CONSTRAINT IF EXISTS meals_input_type_check;
ALTER TABLE meals ALTER COLUMN input_file_key DROP NOT NULL;
ALTER TABLE meals ADD CONSTRAINT meals_input_type_file_check CHECK (
  (input_type IN ('AUDIO', 'PICTURE') AND input_file_key IS NOT NULL)
  OR (input_type = 'MANUAL' AND input_file_key IS NULL)
);
