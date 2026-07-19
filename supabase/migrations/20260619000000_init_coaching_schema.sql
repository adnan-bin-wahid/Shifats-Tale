-- Migration: Initial Coaching Center Schema Setup
-- File: supabase/migrations/20260619000000_init_coaching_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- =========================================================================
-- 1. ENUM TYPES
-- =========================================================================

CREATE TYPE public.user_role AS ENUM ('STUDENT', 'TEACHER');
CREATE TYPE public.account_status AS ENUM ('ACTIVE', 'DISABLED', 'ARCHIVED');
CREATE TYPE public.registration_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE public.batch_status AS ENUM ('DRAFT', 'OPEN', 'RUNNING', 'COMPLETED', 'ARCHIVED', 'CANCELLED');
CREATE TYPE public.enrollment_status AS ENUM ('PENDING', 'ACTIVE', 'DISABLED', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE public.payment_status AS ENUM ('UNPAID', 'PAID', 'PARTIALLY_PAID', 'WAIVED', 'REFUNDED', 'CANCELLED');
CREATE TYPE public.content_type AS ENUM ('PDF', 'DOC', 'DOCX', 'IMAGE', 'LINK', 'YOUTUBE', 'NOTE', 'ANNOUNCEMENT');
CREATE TYPE public.content_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE public.exam_type AS ENUM ('CLASS_TEST', 'WEEKLY_EXAM', 'MONTHLY_EXAM', 'MODEL_TEST', 'ASSIGNMENT', 'FINAL_EXAM');
CREATE TYPE public.exam_status AS ENUM ('DRAFT', 'SCHEDULED', 'COMPLETED', 'RESULT_DRAFT', 'RESULT_PUBLISHED', 'ARCHIVED');
CREATE TYPE public.attendance_status AS ENUM ('PRESENT', 'ABSENT');
-- =========================================================================
-- 2. UPDATED_AT TRIGGER DEFINITION
-- =========================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- =========================================================================
-- 3. TABLES CREATION
-- =========================================================================

-- Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'STUDENT',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  account_status public.account_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Constraint: Email normalization check and lowercase
ALTER TABLE public.profiles ADD CONSTRAINT check_lowercase_email CHECK (email = LOWER(email));
-- Constraint: Limit to maximum 1 Teacher account
CREATE UNIQUE INDEX unique_active_teacher ON public.profiles (role) WHERE (role = 'TEACHER');
-- Student Profiles Table
CREATE TABLE public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_code TEXT UNIQUE NOT NULL,
  academic_level TEXT NOT NULL,
  institution TEXT NOT NULL,
  guardian_name TEXT NOT NULL,
  guardian_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  date_of_birth DATE,
  registration_status public.registration_status NOT NULL DEFAULT 'PENDING',
  teacher_note TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Batches Table
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  academic_level TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  schedule JSONB,
  monthly_fee NUMERIC(10, 2) NOT NULL CHECK (monthly_fee >= 0),
  admission_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (admission_fee >= 0),
  capacity INTEGER CHECK (capacity > 0),
  status public.batch_status NOT NULL DEFAULT 'DRAFT',
  admission_open BOOLEAN NOT NULL DEFAULT false,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Enrollments Table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  status public.enrollment_status NOT NULL DEFAULT 'PENDING',
  approved_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  disable_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_batch UNIQUE (student_id, batch_id)
);
-- Payments Table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  billing_month INTEGER NOT NULL CHECK (billing_month BETWEEN 1 AND 12),
  billing_year INTEGER NOT NULL CHECK (billing_year >= 2020),
  expected_amount NUMERIC(10, 2) NOT NULL CHECK (expected_amount >= 0),
  paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
  status public.payment_status NOT NULL DEFAULT 'UNPAID',
  payment_method TEXT,
  payment_date DATE,
  reference_number TEXT,
  confirmed_at TIMESTAMPTZ,
  teacher_note TEXT,
  student_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_enrollment_month_year UNIQUE (enrollment_id, billing_month, billing_year)
);
-- Batch Contents Table
CREATE TABLE public.batch_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type public.content_type NOT NULL,
  storage_path TEXT,
  external_url TEXT,
  mime_type TEXT,
  file_size INTEGER,
  status public.content_status NOT NULL DEFAULT 'DRAFT',
  release_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  allow_download BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Exams Table
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  exam_type public.exam_type NOT NULL,
  exam_date DATE NOT NULL,
  total_marks NUMERIC(6, 2) NOT NULL CHECK (total_marks > 0),
  pass_marks NUMERIC(6, 2) NOT NULL CHECK (pass_marks >= 0 AND pass_marks <= total_marks),
  status public.exam_status NOT NULL DEFAULT 'DRAFT',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Exam Results Table
CREATE TABLE public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  obtained_marks NUMERIC(6, 2),
  attendance_status public.attendance_status NOT NULL DEFAULT 'PRESENT',
  grade TEXT,
  remarks TEXT,
  rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_exam_student UNIQUE (exam_id, student_id)
);
-- Announcements Table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status public.content_status NOT NULL DEFAULT 'DRAFT',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Notifications Table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Audit Logs Table (Append-only)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Prevent update/delete on audit_logs
CREATE OR REPLACE FUNCTION public.block_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are append-only and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_log_modification();
-- =========================================================================
-- 4. REGISTER MUTABLE UPDATED_AT TRIGGERS
-- =========================================================================

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_student_profiles_modtime BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_batches_modtime BEFORE UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_enrollments_modtime BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_payments_modtime BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_batch_contents_modtime BEFORE UPDATE ON public.batch_contents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_exams_modtime BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_exam_results_modtime BEFORE UPDATE ON public.exam_results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER update_announcements_modtime BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- =========================================================================
-- 5. SECURE STUDENT ID SEQUENCE & PUBLIC REGISTER TRIGGER
-- =========================================================================

CREATE SEQUENCE public.student_code_seq START WITH 1 INCREMENT BY 1;
-- Auth Registration Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id UUID;
  new_student_code TEXT;
BEGIN
  -- Force STUDENT role for standard signup
  INSERT INTO public.profiles (
    auth_user_id,
    role,
    full_name,
    email,
    phone,
    account_status
  )
  VALUES (
    NEW.id,
    'STUDENT',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    LOWER(NEW.email),
    NEW.raw_user_meta_data->>'phone',
    'ACTIVE'
  )
  RETURNING id INTO new_profile_id;

  -- Format student code: ST-YYYY-000001
  new_student_code := 'ST-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('public.student_code_seq')::TEXT, 6, '0');

  -- Create student profile details
  INSERT INTO public.student_profiles (
    profile_id,
    student_code,
    academic_level,
    institution,
    guardian_name,
    guardian_phone,
    address,
    registration_status
  )
  VALUES (
    new_profile_id,
    new_student_code,
    COALESCE(NEW.raw_user_meta_data->>'academic_level', 'HSC'),
    COALESCE(NEW.raw_user_meta_data->>'institution', 'Not Specified'),
    COALESCE(NEW.raw_user_meta_data->>'guardian_name', 'Not Specified'),
    COALESCE(NEW.raw_user_meta_data->>'guardian_phone', 'Not Specified'),
    COALESCE(NEW.raw_user_meta_data->>'address', 'Not Specified'),
    'PENDING'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Register trigger on auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Constraint: Prevent updates to student_code field (immutable student code)
CREATE OR REPLACE FUNCTION public.check_student_code_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_code IS DISTINCT FROM OLD.student_code THEN
    RAISE EXCEPTION 'Student code is immutable and cannot be updated.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER student_code_immutable
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_student_code_immutability();
-- Constraint: Validate obtained marks against exam total_marks
CREATE OR REPLACE FUNCTION public.check_obtained_marks()
RETURNS TRIGGER AS $$
DECLARE
  max_marks numeric;
BEGIN
  IF NEW.obtained_marks IS NOT NULL THEN
    SELECT total_marks INTO max_marks FROM public.exams WHERE id = NEW.exam_id;
    IF NEW.obtained_marks > max_marks THEN
      RAISE EXCEPTION 'Obtained marks (%) cannot exceed exam total marks (%)', NEW.obtained_marks, max_marks;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER validate_obtained_marks
  BEFORE INSERT OR UPDATE ON public.exam_results
  FOR EACH ROW EXECUTE FUNCTION public.check_obtained_marks();
-- =========================================================================
-- 6. SECURITY DEFINER HELPER FUNCTIONS
-- =========================================================================

-- Current Profile ID
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
-- Current User Role string
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
-- Check if active Teacher
CREATE OR REPLACE FUNCTION public.is_active_teacher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role = 'TEACHER' AND account_status = 'ACTIVE'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
-- Get current student profile ID
CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS UUID AS $$
  SELECT id FROM public.student_profiles WHERE profile_id = public.current_profile_id();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
-- Verify active enrollment in batch
CREATE OR REPLACE FUNCTION public.has_active_enrollment(batch_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE student_id = public.current_student_id() AND batch_id = batch_uuid AND status = 'ACTIVE'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
-- Verify if student has ANY active enrollment
CREATE OR REPLACE FUNCTION public.student_has_any_active_enrollment()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE student_id = public.current_student_id() AND status = 'ACTIVE'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
-- =========================================================================
-- 7. COLUMN LEVEL PRIVILEGES AND GETTERS FOR SENSITIVE NOTES
-- =========================================================================

-- Revoke select on the teacher_note column from public/authenticated/anon
REVOKE SELECT (teacher_note) ON public.student_profiles FROM public, authenticated, anon;
REVOKE SELECT (teacher_note) ON public.payments FROM public, authenticated, anon;
-- Secure Teacher Note getter for student profiles (Teacher-only access)
CREATE OR REPLACE FUNCTION public.get_student_teacher_note(student_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  IF public.is_active_teacher() THEN
    RETURN (SELECT teacher_note FROM public.student_profiles WHERE id = student_uuid);
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Secure Teacher Note getter for payments (Teacher-only access)
CREATE OR REPLACE FUNCTION public.get_payment_teacher_note(payment_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  IF public.is_active_teacher() THEN
    RETURN (SELECT teacher_note FROM public.payments WHERE id = payment_uuid);
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- =========================================================================
-- 8. INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- =========================================================================

CREATE INDEX idx_profiles_auth_user ON public.profiles(auth_user_id);
CREATE INDEX idx_student_profiles_code ON public.student_profiles(student_code);
CREATE INDEX idx_student_profiles_reg_status ON public.student_profiles(registration_status);
CREATE INDEX idx_batches_status ON public.batches(status);
CREATE INDEX idx_enrollments_student_status ON public.enrollments(student_id, status);
CREATE INDEX idx_enrollments_batch_status ON public.enrollments(batch_id, status);
CREATE INDEX idx_payments_batch_year_month ON public.payments(batch_id, billing_year, billing_month);
CREATE INDEX idx_payments_student ON public.payments(student_id);
CREATE INDEX idx_exams_batch_status ON public.exams(batch_id, status);
CREATE INDEX idx_exam_results_student ON public.exam_results(student_id);
CREATE INDEX idx_batch_contents_batch_status ON public.batch_contents(batch_id, status);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read_at);
-- =========================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- 9.1 Profiles Policies
CREATE POLICY select_profiles ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id OR public.is_active_teacher());
CREATE POLICY write_profiles ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());
-- 9.2 Student Profiles Policies
CREATE POLICY select_student_profiles ON public.student_profiles
  FOR SELECT TO authenticated
  USING (profile_id = public.current_profile_id() OR public.is_active_teacher());
CREATE POLICY write_student_profiles ON public.student_profiles
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());
-- 9.3 Batches Policies
CREATE POLICY select_batches ON public.batches
  FOR SELECT TO authenticated
  USING (public.is_active_teacher() OR public.has_active_enrollment(id));
CREATE POLICY write_batches ON public.batches
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());
-- 9.4 Enrollments Policies
CREATE POLICY select_enrollments ON public.enrollments
  FOR SELECT TO authenticated
  USING (student_id = public.current_student_id() OR public.is_active_teacher());
CREATE POLICY write_enrollments ON public.enrollments
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());
-- 9.5 Payments Policies
CREATE POLICY select_payments ON public.payments
  FOR SELECT TO authenticated
  USING (student_id = public.current_student_id() OR public.is_active_teacher());
CREATE POLICY write_payments ON public.payments
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());
-- 9.6 Batch Contents Policies
CREATE POLICY select_batch_contents ON public.batch_contents
  FOR SELECT TO authenticated
  USING (
    public.is_active_teacher() OR 
    (status = 'PUBLISHED' AND public.has_active_enrollment(batch_id) AND (release_at IS NULL OR release_at <= now()) AND (expires_at IS NULL OR expires_at >= now()))
  );
CREATE POLICY write_batch_contents ON public.batch_contents
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());
-- 9.7 Exams Policies
CREATE POLICY select_exams ON public.exams
  FOR SELECT TO authenticated
  USING (
    public.is_active_teacher() OR 
    (status IN ('SCHEDULED', 'COMPLETED', 'RESULT_PUBLISHED') AND public.has_active_enrollment(batch_id))
  );
CREATE POLICY write_exams ON public.exams
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());
-- 9.8 Exam Results Policies
CREATE POLICY select_exam_results ON public.exam_results
  FOR SELECT TO authenticated
  USING (
    public.is_active_teacher() OR 
    (student_id = public.current_student_id() AND EXISTS (SELECT 1 FROM public.exams WHERE id = exam_id AND status = 'RESULT_PUBLISHED'))
  );
CREATE POLICY write_exam_results ON public.exam_results
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());
-- 9.9 Announcements Policies
CREATE POLICY select_announcements ON public.announcements
  FOR SELECT TO authenticated
  USING (
    public.is_active_teacher() OR 
    (status = 'PUBLISHED' AND public.has_active_enrollment(batch_id))
  );
CREATE POLICY write_announcements ON public.announcements
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());
-- 9.10 Notifications Policies
CREATE POLICY select_notifications ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = public.current_profile_id() OR public.is_active_teacher());
CREATE POLICY write_notifications ON public.notifications
  FOR ALL TO authenticated
  USING (user_id = public.current_profile_id() OR public.is_active_teacher())
  WITH CHECK (user_id = public.current_profile_id() OR public.is_active_teacher());
-- 9.11 Audit Logs Policies
CREATE POLICY select_audit_logs ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_active_teacher());
CREATE POLICY write_audit_logs ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_teacher());
-- =========================================================================
-- 10. SETUP TEACHER ACTION FUNCTION (Teacher promotion SQL procedure)
-- =========================================================================

CREATE OR REPLACE FUNCTION public.setup_teacher_account(email_to_promote TEXT)
RETURNS void AS $$
DECLARE
  target_profile_id UUID;
BEGIN
  -- Find profile id
  SELECT id INTO target_profile_id FROM public.profiles WHERE LOWER(email) = LOWER(email_to_promote);
  
  IF target_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile with email % not found. User must register first before setup.', email_to_promote;
  END IF;

  -- Delete associated student profile if exists (Teacher account does not need a student profile)
  DELETE FROM public.student_profiles WHERE profile_id = target_profile_id;

  -- Update profiles role to TEACHER
  UPDATE public.profiles
  SET role = 'TEACHER', account_status = 'ACTIVE'
  WHERE id = target_profile_id;
  
  RAISE NOTICE 'User % promoted successfully to TEACHER role.', email_to_promote;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
