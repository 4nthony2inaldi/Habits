-- Allow users to view daily_entries from users who have opted into leaderboards
-- This enables the leaderboard feature to aggregate drinks/steps from multiple users

CREATE POLICY "Users can view leaderboard entries" ON daily_entries
  FOR SELECT USING (
    -- Allow if the entry belongs to a user who has opted into sharing drinks or steps
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = daily_entries.user_id
      AND (profiles.share_drinks = true OR profiles.share_steps = true)
    )
  );
