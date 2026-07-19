-- Migration: Add application settings and teacher profiles table
-- File: supabase/migrations/20260619000004_add_settings_and_teacher_profile.sql

-- 1. Create App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  coaching_center_name TEXT NOT NULL DEFAULT 'Shifat''s Tales',
  short_name TEXT NOT NULL DEFAULT 'ST',
  student_id_prefix TEXT NOT NULL DEFAULT 'ST',
  public_phone TEXT NOT NULL DEFAULT '+8801234567890',
  public_email TEXT NOT NULL DEFAULT 'contact@shifatstales.com',
  address TEXT NOT NULL DEFAULT 'Dhaka, Bangladesh',
  default_currency TEXT NOT NULL DEFAULT 'BDT',
  default_timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  academic_session TEXT NOT NULL DEFAULT '2026',
  default_grading_scale TEXT NOT NULL DEFAULT 'STANDARD',
  pending_approval_contact_text TEXT NOT NULL DEFAULT 'Please contact administration to activate your account.',
  disabled_account_contact_text TEXT NOT NULL DEFAULT 'Your account is disabled. Please contact administration.',
  student_rank_visible BOOLEAN NOT NULL DEFAULT true,
  completed_batches_visible BOOLEAN NOT NULL DEFAULT true,
  grades_displayed BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_row CHECK (id = TRUE)
);
-- 2. Create Teacher Profiles Table
CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  designation TEXT NOT NULL DEFAULT 'Founder & Head Instructor',
  coaching_center_name TEXT NOT NULL DEFAULT 'Shifat''s Tales',
  public_contact_info TEXT NOT NULL DEFAULT '+8801234567890',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 3. Alter Profiles Table to add avatar asset tracker
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_cloudinary_public_id TEXT;
-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
-- 5. Set up RLS Policies
-- Anyone authenticated can read settings
CREATE POLICY select_app_settings ON public.app_settings
  FOR SELECT TO authenticated
  USING (true);
-- Only active teachers can update settings
CREATE POLICY update_app_settings ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());
-- Anyone authenticated can view teacher profiles
CREATE POLICY select_teacher_profiles ON public.teacher_profiles
  FOR SELECT TO authenticated
  USING (true);
-- Only active teachers can edit their profiles
CREATE POLICY write_teacher_profiles ON public.teacher_profiles
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());
-- 6. Updated At Triggers
CREATE TRIGGER update_app_settings_modtime BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_teacher_profiles_modtime BEFORE UPDATE ON public.teacher_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- 7. Modify Student Code Immutability Trigger Function
CREATE OR REPLACE FUNCTION public.check_student_code_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_code IS DISTINCT FROM OLD.student_code AND NOT public.is_active_teacher() THEN
    RAISE EXCEPTION 'Student code is immutable and cannot be updated.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- 8. Seed Default Settings
INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
-- 9. Seed Teacher Profile if Teacher exists
DO $$
DECLARE
  teacher_record RECORD;
BEGIN
  FOR teacher_record IN SELECT id FROM public.profiles WHERE role = 'TEACHER' LOOP
    INSERT INTO public.teacher_profiles (profile_id)
    VALUES (teacher_record.id)
    ON CONFLICT (profile_id) DO NOTHING;
  END LOOP;
END;
$$;
