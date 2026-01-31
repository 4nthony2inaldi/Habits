-- Add individual sleep stage columns for granular sleep tracking
-- Apple Health tracks: In Bed, Awake, REM, Core (Light), Deep
-- Stored as minutes (integer) for precision

ALTER TABLE daily_entries
ADD COLUMN IF NOT EXISTS sleep_in_bed_minutes INTEGER,
ADD COLUMN IF NOT EXISTS sleep_awake_minutes INTEGER,
ADD COLUMN IF NOT EXISTS sleep_rem_minutes INTEGER,
ADD COLUMN IF NOT EXISTS sleep_core_minutes INTEGER,
ADD COLUMN IF NOT EXISTS sleep_deep_minutes INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN daily_entries.sleep_in_bed_minutes IS 'Total time in bed in minutes from Apple Health';
COMMENT ON COLUMN daily_entries.sleep_awake_minutes IS 'Time awake during sleep period in minutes from Apple Health';
COMMENT ON COLUMN daily_entries.sleep_rem_minutes IS 'REM sleep duration in minutes from Apple Health';
COMMENT ON COLUMN daily_entries.sleep_core_minutes IS 'Core (light) sleep duration in minutes from Apple Health';
COMMENT ON COLUMN daily_entries.sleep_deep_minutes IS 'Deep sleep duration in minutes from Apple Health';
