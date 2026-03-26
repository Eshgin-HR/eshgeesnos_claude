-- =============================================
-- EshgeenOS — Full Database Setup
-- Run this in Supabase SQL Editor
-- =============================================

-- HABITS
CREATE TABLE IF NOT EXISTS habits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text DEFAULT '✅',
  active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own habits" ON habits;
CREATE POLICY "Users manage own habits" ON habits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DAILY CHECKINS
CREATE TABLE IF NOT EXISTS daily_checkins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id uuid REFERENCES habits(id) ON DELETE CASCADE,
  date date NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, habit_id, date)
);
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own checkins" ON daily_checkins;
CREATE POLICY "Users manage own checkins" ON daily_checkins FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- NIGHTLY AUDITS
CREATE TABLE IF NOT EXISTS nightly_audits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  energy_level integer CHECK (energy_level BETWEEN 1 AND 10),
  mood integer CHECK (mood BETWEEN 1 AND 10),
  wins text,
  struggles text,
  tomorrow_focus text,
  gratitude text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);
ALTER TABLE nightly_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own audits" ON nightly_audits;
CREATE POLICY "Users manage own audits" ON nightly_audits FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- WEEKLY REVIEWS
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  highlights text,
  challenges text,
  next_week_goals text,
  overall_rating integer CHECK (overall_rating BETWEEN 1 AND 10),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, week_start)
);
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own reviews" ON weekly_reviews;
CREATE POLICY "Users manage own reviews" ON weekly_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BUDGET SETTINGS (monthly salary/budget source)
CREATE TABLE IF NOT EXISTS budget_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  monthly_budget numeric DEFAULT 0,
  currency text DEFAULT 'AZN',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE budget_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own budget settings" ON budget_settings;
CREATE POLICY "Users manage own budget settings" ON budget_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  category text NOT NULL,
  description text,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own expenses" ON expenses;
CREATE POLICY "Users manage own expenses" ON expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- NOTES
CREATE TABLE IF NOT EXISTS notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  tags text[] DEFAULT '{}',
  pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own notes" ON notes;
CREATE POLICY "Users manage own notes" ON notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DAILY TASKS
CREATE TABLE IF NOT EXISTS daily_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('PASHA', 'Personal', 'Startup', 'Other')),
  completed boolean DEFAULT false,
  time_block text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own tasks" ON daily_tasks;
CREATE POLICY "Users manage own tasks" ON daily_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
