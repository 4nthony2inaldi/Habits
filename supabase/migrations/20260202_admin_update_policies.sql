-- Add RLS policies for admins to update entries (for city fixer, etc.)

-- Allow admins to update all daily entries
CREATE POLICY "Admins can update all entries" ON daily_entries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to update all healthy habits
CREATE POLICY "Admins can update all habits" ON healthy_habits
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to delete all healthy habits
CREATE POLICY "Admins can delete all habits" ON healthy_habits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to insert healthy habits for any entry
CREATE POLICY "Admins can insert all habits" ON healthy_habits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to update all life events
CREATE POLICY "Admins can update all events" ON life_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to delete all life events
CREATE POLICY "Admins can delete all events" ON life_events
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to insert life events for any entry
CREATE POLICY "Admins can insert all events" ON life_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
