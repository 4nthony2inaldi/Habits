-- Add weather tracking columns to daily_entries
-- Weather is tracked at the noon location (or home city if noon is blank)

ALTER TABLE daily_entries
ADD COLUMN IF NOT EXISTS weather_temperature_high DECIMAL,
ADD COLUMN IF NOT EXISTS weather_temperature_low DECIMAL,
ADD COLUMN IF NOT EXISTS weather_conditions TEXT,
ADD COLUMN IF NOT EXISTS weather_humidity INTEGER,
ADD COLUMN IF NOT EXISTS weather_precipitation DECIMAL,
ADD COLUMN IF NOT EXISTS weather_location TEXT;

-- Add temperature unit preference to profiles (defaults to fahrenheit)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS temperature_unit TEXT DEFAULT 'fahrenheit' CHECK (temperature_unit IN ('fahrenheit', 'celsius'));

-- Add coordinate columns for historical city tracking
-- These store the geocoded lat/lng for each city field to enable weather lookups and distance calculations
ALTER TABLE daily_entries
ADD COLUMN IF NOT EXISTS city_wake_lat DECIMAL,
ADD COLUMN IF NOT EXISTS city_wake_lng DECIMAL,
ADD COLUMN IF NOT EXISTS city_noon_lat DECIMAL,
ADD COLUMN IF NOT EXISTS city_noon_lng DECIMAL,
ADD COLUMN IF NOT EXISTS city_sleep_lat DECIMAL,
ADD COLUMN IF NOT EXISTS city_sleep_lng DECIMAL;

-- Comments for documentation
COMMENT ON COLUMN daily_entries.weather_temperature_high IS 'High temperature for the day in Fahrenheit';
COMMENT ON COLUMN daily_entries.weather_temperature_low IS 'Low temperature for the day in Fahrenheit';
COMMENT ON COLUMN daily_entries.weather_conditions IS 'Weather conditions description (e.g., Sunny, Cloudy, Rain)';
COMMENT ON COLUMN daily_entries.weather_humidity IS 'Average humidity percentage for the day';
COMMENT ON COLUMN daily_entries.weather_precipitation IS 'Total precipitation in inches';
COMMENT ON COLUMN daily_entries.weather_location IS 'Location used for weather lookup (noon city or home city)';
COMMENT ON COLUMN profiles.temperature_unit IS 'User preference for temperature display: fahrenheit or celsius';
