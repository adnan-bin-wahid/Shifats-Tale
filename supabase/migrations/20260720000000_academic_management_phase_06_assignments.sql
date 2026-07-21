-- Migration: Academic Management - Phase 06 (Assignments & Homework)
-- Adds subject-linked assignments, student submissions, review workflow,
-- data integrity triggers, least-privilege grants, and RLS policies.

DO $migration$
BEGIN
  CREATE TYPE public.assignment_type AS ENUM (
    'HOMEWORK',
    'CLASSWORK',
    'PRACTICE',
    'PROJECT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  CREATE TYPE public.assignment_status AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'CLOSED',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  CREATE TYPE public.assignment_submission_status AS ENUM (
    'SUBMITTED',
    'LATE',
    'REVIEWED',
    'RETURNED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

CREATE TABLE IF NOT EXISTS public.academic_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL,
  unit_id UUID REFERENCES public.subject_units(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  assignment_type public.assignment_type NOT NULL DEFAULT 'HOMEWORK',
  status public.assignment_status NOT NULL DEFAULT 'DRAFT',
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ NOT NULL,
  total_marks NUMERIC(8, 2) NOT NULL DEFAULT 10,
  allow_late_submission BOOLEAN NOT NULL DEFAULT false,
  resource_url TEXT,
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT academic_assignments_subject_batch_fkey
    FOREIGN KEY (subject_id, batch_id)
    REFERENCES public.batch_subjects(id, batch_id)
    ON DELETE RESTRICT,
  CONSTRAINT academic_assignments_title_length
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 180),
  CONSTRAINT academic_assignments_date_range CHECK (due_at > assigned_at),
  CONSTRAINT academic_assignments_marks_positive CHECK (total_marks > 0),
  CONSTRAINT academic_assignments_resource_url_length
    CHECK (resource_url IS NULL OR char_length(resource_url) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_academic_assignments_batch_status_due
  ON public.academic_assignments(batch_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_academic_assignments_subject_status_due
  ON public.academic_assignments(subject_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_academic_assignments_unit
  ON public.academic_assignments(unit_id)
  WHERE unit_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.academic_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.academic_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  submission_text TEXT,
  submission_url TEXT,
  status public.assignment_submission_status NOT NULL DEFAULT 'SUBMITTED',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  marks_obtained NUMERIC(8, 2),
  feedback TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT academic_assignment_submissions_assignment_student_key
    UNIQUE (assignment_id, student_id),
  CONSTRAINT academic_assignment_submissions_body_required
    CHECK (
      NULLIF(btrim(COALESCE(submission_text, '')), '') IS NOT NULL
      OR NULLIF(btrim(COALESCE(submission_url, '')), '') IS NOT NULL
    ),
  CONSTRAINT academic_assignment_submissions_marks_nonnegative
    CHECK (marks_obtained IS NULL OR marks_obtained >= 0),
  CONSTRAINT academic_assignment_submissions_url_length
    CHECK (submission_url IS NULL OR char_length(submission_url) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_status
  ON public.academic_assignment_submissions(assignment_id, status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_status
  ON public.academic_assignment_submissions(student_id, status, submitted_at DESC);

CREATE OR REPLACE FUNCTION public.validate_academic_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  unit_subject_id UUID;
  highest_awarded_mark NUMERIC(8, 2);
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

  IF NEW.status::text = 'PUBLISHED' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  IF NEW.status::text = 'CLOSED' AND NEW.closed_at IS NULL THEN
    NEW.closed_at := now();
  END IF;
  IF NEW.status::text = 'DRAFT' THEN
    NEW.published_at := NULL;
    NEW.closed_at := NULL;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status::text = 'DRAFT' AND NEW.status::text IN ('PUBLISHED', 'ARCHIVED')) OR
      (OLD.status::text = 'PUBLISHED' AND NEW.status::text IN ('DRAFT', 'CLOSED', 'ARCHIVED')) OR
      (OLD.status::text = 'CLOSED' AND NEW.status::text IN ('PUBLISHED', 'ARCHIVED')) OR
      (OLD.status::text = 'ARCHIVED' AND NEW.status::text = 'DRAFT')
    ) THEN
      RAISE EXCEPTION 'Invalid assignment status transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.total_marks < OLD.total_marks THEN
    SELECT max(s.marks_obtained) INTO highest_awarded_mark
    FROM public.academic_assignment_submissions s
    WHERE s.assignment_id = NEW.id;
    IF highest_awarded_mark IS NOT NULL AND highest_awarded_mark > NEW.total_marks THEN
      RAISE EXCEPTION 'Total marks cannot be lower than an already awarded mark.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_academic_assignment_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  assignment_row public.academic_assignments%ROWTYPE;
  enrollment_row public.enrollments%ROWTYPE;
BEGIN
  SELECT * INTO assignment_row
  FROM public.academic_assignments
  WHERE id = NEW.assignment_id;

  SELECT * INTO enrollment_row
  FROM public.enrollments
  WHERE id = NEW.enrollment_id;

  IF assignment_row.id IS NULL OR enrollment_row.id IS NULL THEN
    RAISE EXCEPTION 'Assignment or enrollment was not found.' USING ERRCODE = '23503';
  END IF;
  IF enrollment_row.student_id <> NEW.student_id
     OR enrollment_row.batch_id <> assignment_row.batch_id THEN
    RAISE EXCEPTION 'Submission enrollment does not match the assignment batch and student.'
      USING ERRCODE = '23514';
  END IF;
  IF enrollment_row.status::text <> 'ACTIVE' THEN
    RAISE EXCEPTION 'An active enrollment is required to submit this assignment.'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.marks_obtained IS NOT NULL AND NEW.marks_obtained > assignment_row.total_marks THEN
    RAISE EXCEPTION 'Marks obtained cannot exceed assignment total marks.'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
    IF NEW.submitted_at > assignment_row.due_at THEN
      IF NOT assignment_row.allow_late_submission THEN
        RAISE EXCEPTION 'The assignment deadline has passed.' USING ERRCODE = '23514';
      END IF;
      NEW.status := 'LATE';
    ELSIF NEW.status::text IN ('SUBMITTED', 'LATE') THEN
      NEW.status := 'SUBMITTED';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_assignment_review_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF auth.role() = 'service_role' OR public.is_active_teacher() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.student_id <> public.current_student_id()
       OR NEW.marks_obtained IS NOT NULL
       OR NEW.feedback IS NOT NULL
       OR NEW.reviewed_by IS NOT NULL
       OR NEW.reviewed_at IS NOT NULL
       OR NEW.status::text NOT IN ('SUBMITTED', 'LATE') THEN
      RAISE EXCEPTION 'Students cannot set assignment review fields.' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF OLD.status::text = 'REVIEWED' THEN
      RAISE EXCEPTION 'A reviewed assignment submission is locked.' USING ERRCODE = '42501';
    END IF;
    IF NEW.assignment_id <> OLD.assignment_id
       OR NEW.student_id <> OLD.student_id
       OR NEW.enrollment_id <> OLD.enrollment_id
       OR NEW.marks_obtained IS DISTINCT FROM OLD.marks_obtained
       OR NEW.feedback IS DISTINCT FROM OLD.feedback
       OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
       OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
      RAISE EXCEPTION 'Students cannot change assignment ownership or review fields.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_academic_assignment_row ON public.academic_assignments;
CREATE TRIGGER validate_academic_assignment_row
  BEFORE INSERT OR UPDATE ON public.academic_assignments
  FOR EACH ROW EXECUTE FUNCTION public.validate_academic_assignment();

DROP TRIGGER IF EXISTS update_academic_assignments_modtime ON public.academic_assignments;
CREATE TRIGGER update_academic_assignments_modtime
  BEFORE UPDATE ON public.academic_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS validate_academic_assignment_submission_row
  ON public.academic_assignment_submissions;
CREATE TRIGGER validate_academic_assignment_submission_row
  BEFORE INSERT OR UPDATE ON public.academic_assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.validate_academic_assignment_submission();

DROP TRIGGER IF EXISTS protect_academic_assignment_review_fields
  ON public.academic_assignment_submissions;
CREATE TRIGGER protect_academic_assignment_review_fields
  BEFORE INSERT OR UPDATE ON public.academic_assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.protect_assignment_review_fields();

DROP TRIGGER IF EXISTS update_assignment_submissions_modtime
  ON public.academic_assignment_submissions;
CREATE TRIGGER update_assignment_submissions_modtime
  BEFORE UPDATE ON public.academic_assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.academic_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_academic_assignments ON public.academic_assignments;
CREATE POLICY select_academic_assignments ON public.academic_assignments
  FOR SELECT TO authenticated
  USING (
    public.is_active_teacher()
    OR (
      status::text IN ('PUBLISHED', 'CLOSED')
      AND assigned_at <= now()
      AND public.has_active_enrollment(batch_id)
    )
  );

DROP POLICY IF EXISTS write_academic_assignments ON public.academic_assignments;
CREATE POLICY write_academic_assignments ON public.academic_assignments
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());

DROP POLICY IF EXISTS select_assignment_submissions
  ON public.academic_assignment_submissions;
CREATE POLICY select_assignment_submissions ON public.academic_assignment_submissions
  FOR SELECT TO authenticated
  USING (
    public.is_active_teacher()
    OR student_id = public.current_student_id()
  );

DROP POLICY IF EXISTS insert_assignment_submissions
  ON public.academic_assignment_submissions;
CREATE POLICY insert_assignment_submissions ON public.academic_assignment_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = public.current_student_id()
    AND EXISTS (
      SELECT 1
      FROM public.academic_assignments aa
      WHERE aa.id = assignment_id
        AND aa.status::text = 'PUBLISHED'
        AND aa.assigned_at <= now()
        AND public.has_active_enrollment(aa.batch_id)
        AND (aa.due_at >= now() OR aa.allow_late_submission)
    )
  );

DROP POLICY IF EXISTS update_assignment_submissions
  ON public.academic_assignment_submissions;
CREATE POLICY update_assignment_submissions ON public.academic_assignment_submissions
  FOR UPDATE TO authenticated
  USING (
    public.is_active_teacher()
    OR student_id = public.current_student_id()
  )
  WITH CHECK (
    public.is_active_teacher()
    OR (
      student_id = public.current_student_id()
      AND EXISTS (
        SELECT 1
        FROM public.academic_assignments aa
        WHERE aa.id = assignment_id
          AND aa.status::text = 'PUBLISHED'
          AND public.has_active_enrollment(aa.batch_id)
          AND (aa.due_at >= now() OR aa.allow_late_submission)
      )
    )
  );

REVOKE ALL ON public.academic_assignments FROM anon;
REVOKE ALL ON public.academic_assignment_submissions FROM anon;
REVOKE ALL ON public.academic_assignments FROM authenticated;
REVOKE ALL ON public.academic_assignment_submissions FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_assignments TO authenticated;
GRANT SELECT ON public.academic_assignment_submissions TO authenticated;
GRANT INSERT (
  assignment_id, student_id, enrollment_id, submission_text, submission_url
) ON public.academic_assignment_submissions TO authenticated;
GRANT UPDATE (
  submission_text, submission_url, updated_at
) ON public.academic_assignment_submissions TO authenticated;

COMMENT ON TABLE public.academic_assignments IS
  'Subject-linked homework, classwork, practice, and project tasks for enrolled students.';
COMMENT ON TABLE public.academic_assignment_submissions IS
  'One secure student submission per assignment with teacher review, feedback, and marks.';
