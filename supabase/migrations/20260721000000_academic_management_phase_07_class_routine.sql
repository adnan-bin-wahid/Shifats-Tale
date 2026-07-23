-- Migration: Academic Management - Phase 07 (Subject-linked Class Routine)
-- Adds secure, subject/unit-linked class sessions for teacher planning and
-- enrolled-student routine visibility without replacing the public flyer CMS.

DO $migration$
BEGIN
  CREATE TYPE public.academic_class_session_status AS ENUM (
    'SCHEDULED',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  CREATE TYPE public.academic_class_session_type AS ENUM (
    'REGULAR',
    'REVISION',
    'EXTRA_CLASS',
    'EXAM_PREP'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

CREATE TABLE IF NOT EXISTS public.academic_class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL,
  unit_id UUID REFERENCES public.subject_units(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  session_type public.academic_class_session_type NOT NULL DEFAULT 'REGULAR',
  status public.academic_class_session_status NOT NULL DEFAULT 'SCHEDULED',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  class_link TEXT,
  student_note TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT academic_class_sessions_subject_batch_fkey
    FOREIGN KEY (subject_id, batch_id)
    REFERENCES public.batch_subjects(id, batch_id)
    ON DELETE RESTRICT,
  CONSTRAINT academic_class_sessions_title_length
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 180),
  CONSTRAINT academic_class_sessions_time_range CHECK (ends_at > starts_at),
  CONSTRAINT academic_class_sessions_duration_limit
    CHECK (ends_at <= starts_at + INTERVAL '12 hours'),
  CONSTRAINT academic_class_sessions_location_length
    CHECK (location IS NULL OR char_length(location) <= 240),
  CONSTRAINT academic_class_sessions_link_length
    CHECK (class_link IS NULL OR char_length(class_link) <= 2000),
  CONSTRAINT academic_class_sessions_note_length
    CHECK (student_note IS NULL OR char_length(student_note) <= 3000)
);

CREATE INDEX IF NOT EXISTS idx_academic_class_sessions_batch_start
  ON public.academic_class_sessions(batch_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_academic_class_sessions_subject_start
  ON public.academic_class_sessions(subject_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_academic_class_sessions_status_start
  ON public.academic_class_sessions(status, starts_at);

CREATE OR REPLACE FUNCTION public.validate_academic_class_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  unit_subject_id UUID;
  conflicting_session_id UUID;
BEGIN
  IF NEW.unit_id IS NOT NULL THEN
    SELECT su.subject_id INTO unit_subject_id
    FROM public.subject_units su
    WHERE su.id = NEW.unit_id;

    IF unit_subject_id IS NULL OR unit_subject_id <> NEW.subject_id THEN
      RAISE EXCEPTION 'The selected syllabus unit does not belong to this subject.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.status::text <> 'CANCELLED' THEN
    SELECT session_row.id INTO conflicting_session_id
    FROM public.academic_class_sessions session_row
    WHERE session_row.batch_id = NEW.batch_id
      AND session_row.id <> NEW.id
      AND session_row.status::text <> 'CANCELLED'
      AND tstzrange(session_row.starts_at, session_row.ends_at, '[)')
          && tstzrange(NEW.starts_at, NEW.ends_at, '[)')
    LIMIT 1;

    IF conflicting_session_id IS NOT NULL THEN
      RAISE EXCEPTION 'This batch already has a class during the selected time.'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status::text = 'SCHEDULED' AND NEW.status::text IN ('COMPLETED', 'CANCELLED')) OR
      (OLD.status::text IN ('COMPLETED', 'CANCELLED') AND NEW.status::text = 'SCHEDULED')
    ) THEN
      RAISE EXCEPTION 'Invalid class session status transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.status::text = 'COMPLETED' AND NEW.completed_at IS NULL THEN
    NEW.completed_at := now();
  ELSIF NEW.status::text <> 'COMPLETED' THEN
    NEW.completed_at := NULL;
  END IF;

  IF NEW.status::text = 'CANCELLED' AND NEW.cancelled_at IS NULL THEN
    NEW.cancelled_at := now();
  ELSIF NEW.status::text <> 'CANCELLED' THEN
    NEW.cancelled_at := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_academic_class_session_row
  ON public.academic_class_sessions;
CREATE TRIGGER validate_academic_class_session_row
  BEFORE INSERT OR UPDATE ON public.academic_class_sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_academic_class_session();

DROP TRIGGER IF EXISTS update_academic_class_sessions_modtime
  ON public.academic_class_sessions;
CREATE TRIGGER update_academic_class_sessions_modtime
  BEFORE UPDATE ON public.academic_class_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.academic_class_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_academic_class_sessions
  ON public.academic_class_sessions;
CREATE POLICY select_academic_class_sessions ON public.academic_class_sessions
  FOR SELECT TO authenticated
  USING (
    public.is_active_teacher()
    OR public.has_active_enrollment(batch_id)
  );

DROP POLICY IF EXISTS write_academic_class_sessions
  ON public.academic_class_sessions;
CREATE POLICY write_academic_class_sessions ON public.academic_class_sessions
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());

REVOKE ALL ON public.academic_class_sessions FROM anon;
REVOKE ALL ON public.academic_class_sessions FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_class_sessions TO authenticated;

COMMENT ON TABLE public.academic_class_sessions IS
  'Dated class routine entries linked to an exact batch, subject, and optional syllabus unit.';
