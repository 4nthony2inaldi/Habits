-- Add sleep hours and miles walked fields for Apple Health sync
-- These fields complement the existing steps field for comprehensive health tracking

ALTER TABLE daily_entries
ADD COLUMN IF NOT EXISTS sleep_hours DECIMAL,
ADD COLUMN IF NOT EXISTS miles_walked DECIMAL;

-- Add comments for documentation
COMMENT ON COLUMN daily_entries.sleep_hours IS 'Hours of sleep from Apple Health (via iOS Shortcuts sync)';
COMMENT ON COLUMN daily_entries.miles_walked IS 'Walking + running distance in miles from Apple Health (via iOS Shortcuts sync)';
