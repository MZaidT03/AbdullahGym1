-- ==========================================================
-- Abdullah Gym 1 - Supabase Database Schema & Setup Script
-- Copy and paste this script into your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Run
-- ==========================================================

-- 1. Create Profiles Table (Linked to Supabase Auth Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'trainer')),
  member_id TEXT UNIQUE,
  plan TEXT DEFAULT 'Pro Membership',
  days_remaining INTEGER DEFAULT 30,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Pending', 'Suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Profiles
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON public.profiles FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Create Attendance Table (Member Check-ins)
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  check_in_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  check_out_time TIMESTAMPTZ,
  status TEXT DEFAULT 'Checked In' CHECK (status IN ('Checked In', 'Checked Out')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Attendance
CREATE POLICY "Users can view own attendance" 
  ON public.attendance FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own check-ins" 
  ON public.attendance FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own check-ins" 
  ON public.attendance FOR UPDATE 
  USING (auth.uid() = user_id);

-- 3. Create Payments Table (Subscriptions & Invoices)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending', 'Failed')),
  invoice_id TEXT UNIQUE,
  payment_method TEXT DEFAULT 'Credit Card',
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Payments
CREATE POLICY "Users can view own payments" 
  ON public.payments FOR SELECT 
  USING (auth.uid() = user_id);

-- 4. Automatic Profile Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  generated_id TEXT;
BEGIN
  -- Generate a clean Member ID e.g., GP-8472-991
  generated_id := 'GP-' || floor(random() * (9000-1000 + 1) + 1000)::text || '-' || floor(random() * (999-100 + 1) + 100)::text;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, member_id, plan, days_remaining, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    generated_id,
    'Pro Membership',
    30,
    'Active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
