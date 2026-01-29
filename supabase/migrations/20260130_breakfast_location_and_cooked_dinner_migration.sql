-- Migration: Add breakfast_location and migrate cooked_dinner data
-- Run this migration to add breakfast tracking and convert cooked_dinner habits to dinner_location

-- Add breakfast_location column
ALTER TABLE daily_entries ADD COLUMN IF NOT EXISTS breakfast_location TEXT CHECK (breakfast_location IN ('home', 'out'));

-- Migrate cooked_dinner habit data to dinner_location = 'home'
-- For entries where cooked_dinner habit exists and dinner_location is null, set dinner_location to 'home'
UPDATE daily_entries
SET dinner_location = 'home'
WHERE id IN (
  SELECT DISTINCT de.id
  FROM daily_entries de
  INNER JOIN healthy_habits hh ON de.id = hh.entry_id
  WHERE hh.habit_type = 'cooked_dinner'
  AND de.dinner_location IS NULL
);

-- Optionally remove cooked_dinner habits after migration (commented out - run manually if desired)
-- DELETE FROM healthy_habits WHERE habit_type = 'cooked_dinner';
