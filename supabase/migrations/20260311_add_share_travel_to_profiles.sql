-- Add share_travel field to profiles for leaderboard participation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_travel BOOLEAN NOT NULL DEFAULT false;
