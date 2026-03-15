-- ============================================
-- BLOOM — Supabase Database Schema
-- ============================================
-- HOW TO USE THIS:
-- 1. Go to your Supabase project
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Paste this entire file
-- 4. Click "Run"
-- That's it — your database is set up.
-- ============================================


-- USERS (extends Supabase's built-in auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_mode TEXT DEFAULT 'pet' CHECK (avatar_mode IN ('pet', 'mini-me', 'simple')),
  avatar_name TEXT DEFAULT 'Fern',
  avatar_emoji TEXT DEFAULT '🦔',
  avatar_level INTEGER DEFAULT 1,
  coins INTEGER DEFAULT 0,
  green_energy INTEGER DEFAULT 0,
  health_points INTEGER DEFAULT 50,
  mood_points INTEGER DEFAULT 50,
  birth_year INTEGER,
  biological_sex TEXT CHECK (biological_sex IN ('male', 'female', 'intersex', 'prefer_not_to_say')),
  tracks_cycle BOOLEAN DEFAULT false,
  location_country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store ethnicity as array for multiple selections
ALTER TABLE public.profiles ADD COLUMN ethnicity TEXT[] DEFAULT '{}';

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- HABITS
CREATE TABLE public.habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '✅',
  type TEXT NOT NULL CHECK (type IN ('build', 'quit', 'sustainable')),
  category TEXT NOT NULL,
  coin_reward INTEGER DEFAULT 20,
  green_energy_reward INTEGER DEFAULT 0,
  health_impact INTEGER DEFAULT 3,
  scheduled_time TEXT,
  scheduled_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- HABIT LOGS
CREATE TABLE public.habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL,
  note TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast "did I log this today?" queries
CREATE INDEX idx_habit_logs_user_date ON public.habit_logs(user_id, logged_at);


-- MENSTRUAL CYCLE LOGS
CREATE TABLE public.cycle_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE,
  cycle_length INTEGER,
  symptoms TEXT[] DEFAULT '{}',
  flow_intensity TEXT CHECK (flow_intensity IN ('light', 'medium', 'heavy')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- HEALTH REMINDERS
CREATE TABLE public.health_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  repeat_interval_days INTEGER,
  is_dismissed BOOLEAN DEFAULT false,
  source_study TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- NUTRITION LOGS
CREATE TABLE public.nutrition_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description TEXT NOT NULL,
  is_whole_food BOOLEAN DEFAULT false,
  is_plant_based BOOLEAN DEFAULT false,
  calories INTEGER,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);


-- SLEEP LOGS
CREATE TABLE public.sleep_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  bedtime TIMESTAMPTZ NOT NULL,
  wake_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 10),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'fitbit', 'apple_health')),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);


-- FOCUS SESSIONS
CREATE TABLE public.focus_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  type TEXT CHECK (type IN ('focus', 'break', 'mindfulness')),
  completed BOOLEAN DEFAULT false,
  coins_earned INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);


-- GREEN ENERGY LOGS
CREATE TABLE public.green_energy_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  habit_id UUID REFERENCES public.habits(id),
  logged_at TIMESTAMPTZ DEFAULT NOW()
);


-- GREEN ENERGY DONATIONS
CREATE TABLE public.green_donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_ge INTEGER NOT NULL,
  organization TEXT NOT NULL,
  donated_at TIMESTAMPTZ DEFAULT NOW()
);


-- COMMUNITY POSTS
CREATE TABLE public.community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  post_type TEXT DEFAULT 'check_in',
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- View that includes user info with posts (so you don't need separate queries)
CREATE VIEW public.community_feed AS
  SELECT
    cp.*,
    p.display_name AS user_name,
    p.avatar_emoji AS user_avatar
  FROM public.community_posts cp
  JOIN public.profiles p ON p.id = cp.user_id
  ORDER BY cp.created_at DESC;


-- AVATAR SHOP ITEMS
CREATE TABLE public.shop_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  description TEXT,
  cost_coins INTEGER,
  cost_ge INTEGER,
  category TEXT CHECK (category IN ('accessory', 'background', 'effect', 'evolution')),
  requires_level INTEGER DEFAULT 1,
  requires_streak INTEGER
);

-- Pre-populate with starter shop items
INSERT INTO public.shop_items (name, emoji, description, cost_coins, category) VALUES
  ('Tiny Crown', '👑', 'Royalty deserves its crown', 200, 'accessory'),
  ('Cozy Scarf', '🧣', 'For the well-rested wellness warrior', 150, 'accessory'),
  ('Flower Garden', '🌸', 'A garden as healthy as your habits', 300, 'background'),
  ('Starry Night', '✨', 'You\'re a star, literally', 500, 'background'),
  ('Sun Hat', '☀️', 'Sun protection is self care', 250, 'accessory'),
  ('Reading Nook', '📚', 'For the curious mind', 350, 'background');

INSERT INTO public.shop_items (name, emoji, description, cost_ge, category) VALUES
  ('Green Wings', '🍃', 'Unlocked by sustainable living', 100, 'effect'),
  ('Earth Halo', '🌍', 'Wear your planetary care proudly', 200, 'effect');


-- ============================================
-- RPC FUNCTIONS (increment without race conditions)
-- ============================================

-- Safely add coins to a user
CREATE OR REPLACE FUNCTION increment_coins(user_id_input UUID, amount_input INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET coins = coins + amount_input
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely add green energy to a user
CREATE OR REPLACE FUNCTION increment_green_energy(user_id_input UUID, amount_input INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET green_energy = green_energy + amount_input
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update health points (with 0–100 clamp)
CREATE OR REPLACE FUNCTION update_health(user_id_input UUID, delta_input INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET health_points = GREATEST(0, LEAST(100, health_points + delta_input))
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- ROW LEVEL SECURITY (keeps data private)
-- ============================================
-- This ensures users can only see their own data

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.green_energy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.green_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own rows
CREATE POLICY "own data only" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "own data only" ON public.habits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data only" ON public.habit_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data only" ON public.cycle_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data only" ON public.health_reminders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data only" ON public.nutrition_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data only" ON public.sleep_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data only" ON public.focus_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data only" ON public.green_energy_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own data only" ON public.green_donations FOR ALL USING (auth.uid() = user_id);

-- Community posts are readable by all authenticated users
CREATE POLICY "read community" ON public.community_posts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "own posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
