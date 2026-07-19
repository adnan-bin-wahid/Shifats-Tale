-- Migration: Add student code override RPC function for Teachers
-- File: supabase/migrations/20260619000005_student_code_rpc.sql

CREATE OR REPLACE FUNCTION public.check_student_code_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_code IS DISTINCT FROM OLD.student_code THEN
    IF current_setting('public.bypass_student_code_immutability', true) = 'true' THEN
      RETURN NEW;
    END IF;
    IF NOT public.is_active_teacher() THEN
      RAISE EXCEPTION 'Student code is immutable and cannot be updated.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE OR REPLACE FUNCTION public.update_student_code_admin(student_profile_id UUID, new_code TEXT)
RETURNS void AS $$
BEGIN
  IF public.is_active_teacher() THEN
    -- Enable bypass
    PERFORM set_config('public.bypass_student_code_immutability', 'true', true);
    
    UPDATE public.student_profiles
    SET student_code = new_code
    WHERE id = student_profile_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Only an active teacher can override student code.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
