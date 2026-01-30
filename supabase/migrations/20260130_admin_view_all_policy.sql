-- Allow admins to view all daily_entries
CREATE POLICY "Admins can view all entries" ON daily_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to view all healthy_habits
CREATE POLICY "Admins can view all habits" ON healthy_habits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to view all life_events
CREATE POLICY "Admins can view all events" ON life_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to view all goals
CREATE POLICY "Admins can view all goals" ON user_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow admins to view all goal snapshots
CREATE POLICY "Admins can view all snapshots" ON goal_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
