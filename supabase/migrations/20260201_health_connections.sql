-- Health Connections table for OAuth integrations (Oura, Whoop)
-- Stores OAuth tokens and sync status for each provider

CREATE TABLE IF NOT EXISTS health_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('oura', 'whoop')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  provider_user_id TEXT,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'error', 'pending')),
  last_sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, provider)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_health_connections_user ON health_connections(user_id);

-- Index for finding connections that need token refresh
CREATE INDEX IF NOT EXISTS idx_health_connections_expiry ON health_connections(token_expires_at)
WHERE token_expires_at IS NOT NULL;

-- RLS Policies
ALTER TABLE health_connections ENABLE ROW LEVEL SECURITY;

-- Users can only view their own connections
CREATE POLICY "Users can view own health connections" ON health_connections
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own connections
CREATE POLICY "Users can create own health connections" ON health_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update own health connections" ON health_connections
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete own health connections" ON health_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_health_connections_updated_at
    BEFORE UPDATE ON health_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add additional sleep/health fields to daily_entries
ALTER TABLE daily_entries
ADD COLUMN IF NOT EXISTS sleep_score INTEGER CHECK (sleep_score >= 0 AND sleep_score <= 100),
ADD COLUMN IF NOT EXISTS sleep_start TIME,
ADD COLUMN IF NOT EXISTS sleep_end TIME,
ADD COLUMN IF NOT EXISTS hrv INTEGER,
ADD COLUMN IF NOT EXISTS resting_hr INTEGER,
ADD COLUMN IF NOT EXISTS respiratory_rate DECIMAL,
ADD COLUMN IF NOT EXISTS health_data_source TEXT CHECK (health_data_source IN ('manual', 'oura', 'whoop', 'apple_health'));

-- Add comments for documentation
COMMENT ON TABLE health_connections IS 'OAuth connections for health data providers (Oura, Whoop)';
COMMENT ON COLUMN daily_entries.sleep_score IS 'Sleep quality score 0-100 from connected health device';
COMMENT ON COLUMN daily_entries.sleep_start IS 'Time fell asleep from connected health device';
COMMENT ON COLUMN daily_entries.sleep_end IS 'Time woke up from connected health device';
COMMENT ON COLUMN daily_entries.hrv IS 'Heart rate variability in ms from connected health device';
COMMENT ON COLUMN daily_entries.resting_hr IS 'Resting heart rate in bpm from connected health device';
COMMENT ON COLUMN daily_entries.respiratory_rate IS 'Respiratory rate in breaths per minute from connected health device';
COMMENT ON COLUMN daily_entries.health_data_source IS 'Source of health data (manual entry or connected device)';
