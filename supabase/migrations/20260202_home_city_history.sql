-- Home city history table to track when users lived in different cities
CREATE TABLE IF NOT EXISTS home_city_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  lat DECIMAL NOT NULL,
  lng DECIMAL NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only have one home city per effective date
  UNIQUE(user_id, effective_date)
);

-- Index for efficient date-based lookups
CREATE INDEX IF NOT EXISTS idx_home_city_history_user_date
ON home_city_history(user_id, effective_date DESC);

-- Enable RLS
ALTER TABLE home_city_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own home city history
CREATE POLICY "Users can view own home city history" ON home_city_history
  FOR SELECT USING (auth.uid() = user_id);

-- Users can manage their own home city history
CREATE POLICY "Users can insert own home city history" ON home_city_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own home city history" ON home_city_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own home city history" ON home_city_history
  FOR DELETE USING (auth.uid() = user_id);

-- Admins can view all home city history
CREATE POLICY "Admins can view all home city history" ON home_city_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Admins can manage all home city history (for setting up users)
CREATE POLICY "Admins can insert all home city history" ON home_city_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update all home city history" ON home_city_history
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete all home city history" ON home_city_history
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
