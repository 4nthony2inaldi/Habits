-- Add health sync token for Apple Health Shortcuts integration
-- This token allows users to sync step data via iOS Shortcuts

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS health_sync_token TEXT UNIQUE;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_health_sync_token
ON profiles(health_sync_token)
WHERE health_sync_token IS NOT NULL;
