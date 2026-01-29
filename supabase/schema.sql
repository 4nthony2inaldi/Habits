-- Healthy Habits Tracker Database Schema
-- Run this in Supabase SQL Editor to set up the database

-- Users (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  email TEXT,
  home_city TEXT,
  home_lat DECIMAL,
  home_lng DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,

  -- Leaderboard opt-ins
  share_drinks BOOLEAN DEFAULT FALSE,
  share_steps BOOLEAN DEFAULT FALSE,
  leaderboard_anonymous BOOLEAN DEFAULT FALSE,

  -- Field visibility preferences
  hidden_fields JSONB DEFAULT '[]'::jsonb,

  -- Custom tracking fields (future)
  custom_habits JSONB DEFAULT '[]'::jsonb,
  custom_metrics JSONB DEFAULT '[]'::jsonb,

  -- Notification preferences
  reminder_enabled BOOLEAN DEFAULT TRUE,
  reminder_time TIME DEFAULT '21:00',
  streak_warnings_enabled BOOLEAN DEFAULT TRUE,
  weekly_digest_enabled BOOLEAN DEFAULT TRUE,
  weekly_digest_day SMALLINT DEFAULT 0,
  allow_admin_nudges BOOLEAN DEFAULT TRUE,
  notification_channel TEXT DEFAULT 'email'
);

-- Notification log
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  channel TEXT NOT NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id, sent_at);

-- User goals
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('min', 'max', 'exact', 'streak')),
  target_value DECIMAL NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('daily', 'weekly', 'monthly')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,

  UNIQUE(user_id, metric, timeframe)
);

-- Goal progress snapshots
CREATE TABLE IF NOT EXISTS goal_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES user_goals(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  actual_value DECIMAL NOT NULL,
  target_value DECIMAL NOT NULL,
  met BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON user_goals(user_id, active);
CREATE INDEX IF NOT EXISTS idx_goal_snapshots ON goal_snapshots(goal_id, period_start);

-- Daily entries
CREATE TABLE IF NOT EXISTS daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,

  -- Mood & Work
  mood_score SMALLINT CHECK (mood_score >= 0 AND mood_score <= 10),
  work_location TEXT CHECK (work_location IN ('home', 'office', 'field', 'off')),

  -- Alcohol (aggregate fields for backwards compatibility)
  beers SMALLINT DEFAULT 0,
  seltzers SMALLINT DEFAULT 0,
  wine SMALLINT DEFAULT 0,
  liquor SMALLINT DEFAULT 0,
  shots SMALLINT DEFAULT 0,

  -- Detailed wine breakdown (rolls up to 'wine')
  wine_red SMALLINT DEFAULT 0,
  wine_white SMALLINT DEFAULT 0,
  wine_sparkling SMALLINT DEFAULT 0,

  -- Detailed cocktail/liquor breakdown (rolls up to 'liquor')
  liquor_vodka SMALLINT DEFAULT 0,
  liquor_gin SMALLINT DEFAULT 0,
  liquor_tequila SMALLINT DEFAULT 0,
  liquor_whiskey SMALLINT DEFAULT 0,
  liquor_rum SMALLINT DEFAULT 0,
  liquor_other SMALLINT DEFAULT 0,

  -- Other metrics
  coffee SMALLINT DEFAULT 0,
  steps INTEGER,
  screen_time INTEGER,
  sex SMALLINT DEFAULT 0,

  -- Meal tracking
  lunch_location TEXT CHECK (lunch_location IN ('home', 'out')),
  dinner_location TEXT CHECK (dinner_location IN ('home', 'out')),

  -- Location tracking
  city_wake TEXT,
  miles_wake DECIMAL,
  city_noon TEXT,
  miles_noon DECIMAL,
  city_sleep TEXT,
  miles_sleep DECIMAL,

  -- Qualitative
  best_part TEXT,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, entry_date)
);

-- Healthy habits
CREATE TABLE IF NOT EXISTS healthy_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  habit_type TEXT NOT NULL,

  UNIQUE(entry_id, habit_type)
);

-- Life events
CREATE TABLE IF NOT EXISTS life_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES daily_entries(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,

  UNIQUE(entry_id, event_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON daily_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_entries_date ON daily_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_habits_entry ON healthy_habits(entry_id);
CREATE INDEX IF NOT EXISTS idx_events_entry ON life_events(entry_id);

-- Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthy_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles (for leaderboards) but only update their own
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Daily entries: Users can only access their own entries
CREATE POLICY "Users can view own entries" ON daily_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own entries" ON daily_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries" ON daily_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries" ON daily_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Healthy habits: Follow parent entry permissions
CREATE POLICY "Users can view own habits" ON healthy_habits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM daily_entries WHERE id = entry_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create own habits" ON healthy_habits
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM daily_entries WHERE id = entry_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own habits" ON healthy_habits
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM daily_entries WHERE id = entry_id AND user_id = auth.uid())
  );

-- Life events: Follow parent entry permissions
CREATE POLICY "Users can view own events" ON life_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM daily_entries WHERE id = entry_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create own events" ON life_events
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM daily_entries WHERE id = entry_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own events" ON life_events
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM daily_entries WHERE id = entry_id AND user_id = auth.uid())
  );

-- Goals: Users can only access their own goals
CREATE POLICY "Users can view own goals" ON user_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" ON user_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON user_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON user_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Goal snapshots: Follow parent goal permissions
CREATE POLICY "Users can view own snapshots" ON goal_snapshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_goals WHERE id = goal_id AND user_id = auth.uid())
  );

-- Notification log: Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notification_log
  FOR SELECT USING (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on daily_entries
DROP TRIGGER IF EXISTS update_daily_entries_updated_at ON daily_entries;
CREATE TRIGGER update_daily_entries_updated_at
    BEFORE UPDATE ON daily_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed initial users (run after schema creation)
-- These will need to be created through Supabase Auth first, then their profiles updated

-- Example: Update the first admin user after they sign up
-- UPDATE profiles SET is_admin = true WHERE email = 'anthony@example.com';
