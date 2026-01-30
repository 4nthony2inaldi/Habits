-- Saved reports table for custom ad-hoc charts
CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Report configuration (stored as JSONB)
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Dashboard placement (if used on dashboard)
  show_on_dashboard BOOLEAN DEFAULT FALSE,
  dashboard_order INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user's reports
CREATE INDEX IF NOT EXISTS idx_saved_reports_user ON saved_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_dashboard ON saved_reports(user_id, show_on_dashboard) WHERE show_on_dashboard = true;

-- RLS policies
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON saved_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reports" ON saved_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports" ON saved_reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports" ON saved_reports
  FOR DELETE USING (auth.uid() = user_id);

-- Allow admins to view all reports
CREATE POLICY "Admins can view all reports" ON saved_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_saved_reports_updated_at
    BEFORE UPDATE ON saved_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
