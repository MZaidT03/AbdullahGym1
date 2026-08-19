-- ==========================================================
-- Abdullah Gym 1 - Supabase Database Schema & Setup Script
-- Copy and paste this script into your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Run
-- ==========================================================

-- Drop restrictive Foreign Key Constraints if they block manual admin additions
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE IF EXISTS public.attendance DROP CONSTRAINT IF EXISTS attendance_user_id_fkey;
ALTER TABLE IF EXISTS public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  gender TEXT DEFAULT 'Male' CHECK (gender IN ('Male', 'Female', 'Other')),
  avatar_url TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'trainer')),
  member_id TEXT UNIQUE,
  plan TEXT DEFAULT 'Pro Membership',
  days_remaining INTEGER DEFAULT 30,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Deactivated', 'Expired', 'Pending', 'Suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration for existing database tables:
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Male';
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS active_addons JSONB DEFAULT '[]'::jsonb;

-- Update status CHECK constraint on profiles to support all active & inactive states
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE IF EXISTS public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('Active', 'Inactive', 'Deactivated', 'Expired', 'Pending', 'Suspended'));

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all for profiles" ON public.profiles;

-- Open RLS Policy for Profiles
CREATE POLICY "Allow all for profiles" 
  ON public.profiles FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 2. Create Attendance Table (Check-Ins Only)
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  check_in_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can insert own check-ins" ON public.attendance;
DROP POLICY IF EXISTS "Users can update own check-ins" ON public.attendance;
DROP POLICY IF EXISTS "Allow all for attendance" ON public.attendance;

CREATE POLICY "Allow all for attendance" 
  ON public.attendance FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 3. Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  total_fee NUMERIC(10, 2),
  status TEXT DEFAULT 'Paid' CHECK (status IN ('Paid', 'Partial', 'Unpaid', 'Pending Approval', 'Pending', 'Failed', 'Rejected')),
  invoice_id TEXT UNIQUE,
  payment_method TEXT DEFAULT 'Credit Card',
  payment_type TEXT DEFAULT 'membership', -- 'membership', 'addon', 'bundle'
  item_name TEXT,
  proof_url TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Migration for existing payments table:
ALTER TABLE IF EXISTS public.payments ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE IF EXISTS public.payments ADD COLUMN IF NOT EXISTS total_fee NUMERIC(10, 2);
ALTER TABLE IF EXISTS public.payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'membership';
ALTER TABLE IF EXISTS public.payments ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE IF EXISTS public.payments ALTER COLUMN total_fee DROP DEFAULT;

-- Cleanup script: Fix existing rows where total_fee defaulted to 5000 instead of actual amount
UPDATE public.payments 
SET total_fee = amount 
WHERE (total_fee = 5000.00 OR total_fee IS NULL) AND (amount != 5000.00 OR invoice_id LIKE 'INV-WALK%');

-- Update status CHECK constraint to allow 'Pending Approval' and 'Rejected'
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (status IN ('Paid', 'Partial', 'Unpaid', 'Pending Approval', 'Pending', 'Rejected', 'Failed'));

DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all for payments" ON public.payments;

CREATE POLICY "Allow all for payments" 
  ON public.payments FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Create Supabase Storage Bucket & RLS for Payment Proof Screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Storage Upload & Read for Payment Proofs" ON storage.objects;
CREATE POLICY "Public Storage Upload & Read for Payment Proofs"
  ON storage.objects FOR ALL
  USING (bucket_id = 'payment-proofs')
  WITH CHECK (bucket_id = 'payment-proofs');

-- 4. Automatic Profile Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  generated_id TEXT;
BEGIN
  -- Generate a clean Member ID e.g., GP-8472-991
  generated_id := 'GP-' || floor(random() * (9000-1000 + 1) + 1000)::text || '-' || floor(random() * (999-100 + 1) + 100)::text;

  INSERT INTO public.profiles (id, email, full_name, gender, avatar_url, role, member_id, plan, days_remaining, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'gender', 'Male'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    generated_id,
    'Pro Membership',
    30,
    'Active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    gender = EXCLUDED.gender;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Sync Existing Auth Users into Profiles
INSERT INTO public.profiles (id, email, full_name, role, member_id, plan, days_remaining, status)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1)),
  'member',
  'GP-' || floor(random() * (9000-1000 + 1) + 1000)::text || '-' || floor(random() * (999-100 + 1) + 100)::text,
  'Pro Membership',
  30,
  'Active'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- ==========================================================
-- 6. Create Gym Membership Plans & Pricing Table
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.gym_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Monthly',
  monthly_price NUMERIC(10, 2) DEFAULT 0,
  daily_price NUMERIC(10, 2) DEFAULT 0,
  period TEXT DEFAULT 'per month',
  features TEXT[] DEFAULT '{}',
  popular BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Gym Plans
ALTER TABLE public.gym_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for gym_plans" ON public.gym_plans;

CREATE POLICY "Allow all for gym_plans" 
  ON public.gym_plans FOR ALL 
  USING (true)
  WITH CHECK (true);

-- Insert Default Initial Plans into gym_plans (Prices in PKR)
INSERT INTO public.gym_plans (id, name, type, monthly_price, daily_price, period, features, popular, active)
VALUES
  ('plan-1', 'Daily Visitor Pass', 'Daily', 0, 500.00, 'per day', ARRAY['Full Gym Equipment Access', 'Cardio Arena Access', 'Single-day Locker Access'], false, true),
  ('plan-2', 'Standard Monthly Pass', 'Monthly', 3500.00, 400.00, 'per month', ARRAY['Full Strength & Weight Training', 'Standard Cardio Access', 'Locker Room & Shower'], false, true),
  ('plan-3', 'Pro Membership', 'Monthly + Daily Option', 5000.00, 500.00, 'per month', ARRAY['All Standard Pass Amenities', 'Personalized Diet & Workout Chart', 'Dedicated Trainer Floor Guidance', '100% Shift Flexibility (Ladies/Gents)'], true, true),
  ('plan-4', 'VIP Champion Pass', 'Monthly VIP', 9000.00, 800.00, 'per month', ARRAY['1-on-1 Coaching with Master Trainers', 'Custom Competition Prep & Hypertrophy', 'Unlimited Guest Access (1/week)', 'VIP Locker & Supplement Discounts'], false, true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================================
-- 7. Create General Gym Settings Table (Key-Value Pairs)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.gym_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Gym Settings
ALTER TABLE public.gym_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for gym_settings" ON public.gym_settings;

CREATE POLICY "Allow all for gym_settings" 
  ON public.gym_settings FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 6. Create Notifications Table (In-App & Push Alerts)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'general', -- 'payment_approved', 'attendance_marked', 'profile_updated', 'fee_deadline', 'expired', 'general'
  read BOOLEAN DEFAULT false,
  action TEXT DEFAULT 'VIEW',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for notifications" ON public.notifications;

CREATE POLICY "Allow all for notifications"
  ON public.notifications FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. Create Member Add-ons Table (Independent Add-On Subscriptions)
CREATE TABLE IF NOT EXISTS public.member_addons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  addon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 1500.00,
  icon TEXT DEFAULT '🏃',
  start_date TIMESTAMPTZ DEFAULT NOW(),
  expiry_date TIMESTAMPTZ NOT NULL,
  days_remaining INTEGER DEFAULT 30,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Cancelled', 'Pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Member Add-ons
ALTER TABLE public.member_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for member_addons" ON public.member_addons;
CREATE POLICY "Allow all for member_addons"
  ON public.member_addons FOR ALL
  USING (true)
  WITH CHECK (true);

-- 9. Create Add-on Payments Table (Dedicated Payments for Add-ons ONLY)
CREATE TABLE IF NOT EXISTS public.addon_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  addon_id TEXT,
  addon_name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'Paid' CHECK (status IN ('Paid', 'Pending Approval', 'Rejected', 'Failed')),
  invoice_id TEXT UNIQUE,
  payment_method TEXT DEFAULT 'JazzCash Transfer',
  proof_url TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Add-on Payments
ALTER TABLE public.addon_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for addon_payments" ON public.addon_payments;
CREATE POLICY "Allow all for addon_payments"
  ON public.addon_payments FOR ALL
  USING (true)
  WITH CHECK (true);


