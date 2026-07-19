-- Migration: Academic Management Foundation - Phase 01
-- Safe, additive foundation for Batch -> Subjects -> Syllabus Units -> Exams.
-- Existing batches, exams, materials, announcements, enrollments, payments,
-- and results are preserved and backfilled without requiring an immediate UI rollout.

-- =========================================================================
-- 1. ACADEMIC ENUMS
-- =========================================================================

DO $migration$
BEGIN
  CREATE TYPE public.subject_status AS ENUM (
    'DRAFT',
    'UPCOMING',
    'RUNNING',
    'PAUSED',
    'COMPLETED',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  CREATE TYPE public.subject_unit_status AS ENUM (
    'PLANNED',
    'RUNNING',
    'COMPLETED',
    'SKIPPED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

DO $migration$
BEGIN
  CREATE TYPE public.subject_unit_type AS ENUM (
    'CHAPTER',
    'TOPIC',
    'MODULE'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$migration$;

-- CANCELLED is a workflow state. UPCOMING / IN_PROGRESS remain derived display
-- states based on SCHEDULED plus the exam date/time window.
ALTER TYPE public.exam_status ADD VALUE IF NOT EXISTS 'CANCELLED';

-- =========================================================================
-- 2. CORE ACADEMIC TABLES
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.batch_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  status public.subject_status NOT NULL DEFAULT 'DRAFT',
  start_date DATE,
  end_date DATE,
  theme_key TEXT NOT NULL DEFAULT 'NAVY',
  display_order INTEGER NOT NULL DEFAULT 0,
  weight NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
  is_default BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT batch_subjects_batch_code_key UNIQUE (batch_id, code),
  CONSTRAINT batch_subjects_id_batch_key UNIQUE (id, batch_id),
  CONSTRAINT batch_subjects_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  CONSTRAINT batch_subjects_code_format CHECK (
    code = upper(code) AND code ~ '^[A-Z0-9][A-Z0-9_-]{0,29}$'
  ),
  CONSTRAINT batch_subjects_date_range CHECK (
    end_date IS NULL OR start_date IS NULL OR end_date >= start_date
  ),
  CONSTRAINT batch_subjects_display_order_nonnegative CHECK (display_order >= 0),
  CONSTRAINT batch_subjects_weight_positive CHECK (weight > 0),
  CONSTRAINT batch_subjects_theme_key CHECK (
    theme_key IN ('NAVY', 'BLUE', 'VIOLET', 'EMERALD', 'AMBER', 'ROSE')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_batch_subjects_one_default
  ON public.batch_subjects(batch_id)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_batch_subjects_batch_status_order
  ON public.batch_subjects(batch_id, status, display_order);

CREATE INDEX IF NOT EXISTS idx_batch_subjects_status
  ON public.batch_subjects(status);

CREATE TABLE IF NOT EXISTS public.subject_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.batch_subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  unit_type public.subject_unit_type NOT NULL DEFAULT 'CHAPTER',
  status public.subject_unit_status NOT NULL DEFAULT 'PLANNED',
  sequence_no INTEGER NOT NULL,
  weight NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
  planned_start_date DATE,
  planned_end_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT subject_units_subject_sequence_key UNIQUE (subject_id, sequence_no),
  CONSTRAINT subject_units_title_length CHECK (char_length(btrim(title)) BETWEEN 1 AND 180),
  CONSTRAINT subject_units_sequence_positive CHECK (sequence_no > 0),
  CONSTRAINT subject_units_weight_positive CHECK (weight > 0),
  CONSTRAINT subject_units_date_range CHECK (
    planned_end_date IS NULL
    OR planned_start_date IS NULL
    OR planned_end_date >= planned_start_date
  )
);

CREATE INDEX IF NOT EXISTS idx_subject_units_subject_status_sequence
  ON public.subject_units(subject_id, status, sequence_no);

-- =========================================================================
-- 3. SAFE EXISTING-DATA BACKFILL
-- =========================================================================

CREATE OR REPLACE FUNCTION public.legacy_subject_code(subject_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT left(
    COALESCE(
      NULLIF(upper(regexp_replace(COALESCE(subject_name, ''), '[^a-zA-Z0-9]+', '', 'g')), ''),
      'SUBJECT'
    ),
    30
  );
$function$;

CREATE OR REPLACE FUNCTION public.subject_status_from_batch(batch_state public.batch_status)
RETURNS public.subject_status
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT CASE batch_state::text
    WHEN 'DRAFT' THEN 'DRAFT'::public.subject_status
    WHEN 'RUNNING' THEN 'RUNNING'::public.subject_status
    WHEN 'COMPLETED' THEN 'COMPLETED'::public.subject_status
    WHEN 'ARCHIVED' THEN 'ARCHIVED'::public.subject_status
    WHEN 'CANCELLED' THEN 'ARCHIVED'::public.subject_status
    ELSE 'UPCOMING'::public.subject_status
  END;
$function$;

-- Every existing batch receives one default subject generated from the legacy
-- batches.subject field. No existing row is deleted or rewritten.
INSERT INTO public.batch_subjects (
  batch_id,
  name,
  code,
  description,
  status,
  start_date,
  end_date,
  theme_key,
  display_order,
  weight,
  is_default,
  completed_at,
  created_at,
  updated_at
)
SELECT
  b.id,
  b.subject,
  public.legacy_subject_code(b.subject),
  NULL,
  public.subject_status_from_batch(b.status),
  b.start_date,
  b.end_date,
  'NAVY',
  0,
  1.00,
  true,
  CASE WHEN b.status::text = 'COMPLETED' THEN b.updated_at ELSE NULL END,
  b.created_at,
  b.updated_at
FROM public.batches b
WHERE NOT EXISTS (
  SELECT 1
  FROM public.batch_subjects bs
  WHERE bs.batch_id = b.id
);

-- Link exams to subjects. This remains backward compatible because a trigger
-- below assigns the default subject when the current exam form omits subject_id.
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS subject_id UUID;

UPDATE public.exams e
SET subject_id = bs.id
FROM public.batch_subjects bs
WHERE e.subject_id IS NULL
  AND bs.batch_id = e.batch_id
  AND bs.is_default = true;

ALTER TABLE public.exams
  DROP CONSTRAINT IF EXISTS exams_subject_batch_fkey;

ALTER TABLE public.exams
  ADD CONSTRAINT exams_subject_batch_fkey
  FOREIGN KEY (subject_id, batch_id)
  REFERENCES public.batch_subjects(id, batch_id)
  ON DELETE RESTRICT;

ALTER TABLE public.exams
  ALTER COLUMN subject_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exams_subject_status_date
  ON public.exams(subject_id, status, exam_date);

-- Materials and announcements may remain batch-wide later, so subject_id stays
-- nullable. Existing records are linked to the default subject for continuity.
ALTER TABLE public.batch_contents
  ADD COLUMN IF NOT EXISTS subject_id UUID;

UPDATE public.batch_contents c
SET subject_id = bs.id
FROM public.batch_subjects bs
WHERE c.subject_id IS NULL
  AND bs.batch_id = c.batch_id
  AND bs.is_default = true;

ALTER TABLE public.batch_contents
  DROP CONSTRAINT IF EXISTS batch_contents_subject_batch_fkey;

ALTER TABLE public.batch_contents
  ADD CONSTRAINT batch_contents_subject_batch_fkey
  FOREIGN KEY (subject_id, batch_id)
  REFERENCES public.batch_subjects(id, batch_id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_batch_contents_subject_status
  ON public.batch_contents(subject_id, status)
  WHERE subject_id IS NOT NULL;

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS subject_id UUID;

UPDATE public.announcements a
SET subject_id = bs.id
FROM public.batch_subjects bs
WHERE a.subject_id IS NULL
  AND bs.batch_id = a.batch_id
  AND bs.is_default = true;

ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_subject_batch_fkey;

ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_subject_batch_fkey
  FOREIGN KEY (subject_id, batch_id)
  REFERENCES public.batch_subjects(id, batch_id)
  ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_announcements_subject_status
  ON public.announcements(subject_id, status)
  WHERE subject_id IS NOT NULL;

-- =========================================================================
-- 4. BACKWARD-COMPATIBILITY AND INTEGRITY TRIGGERS
-- =========================================================================

CREATE OR REPLACE FUNCTION public.sync_default_subject_from_legacy_batch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.batch_subjects (
      batch_id,
      name,
      code,
      status,
      start_date,
      end_date,
      is_default,
      display_order,
      weight
    )
    VALUES (
      NEW.id,
      NEW.subject,
      public.legacy_subject_code(NEW.subject),
      public.subject_status_from_batch(NEW.status),
      NEW.start_date,
      NEW.end_date,
      true,
      0,
      1.00
    );
  ELSE
    -- During the compatibility period, keep the default subject synchronized
    -- only while it is the batch's sole subject. Once explicit subjects exist,
    -- the new academic system becomes authoritative.
    UPDATE public.batch_subjects bs
    SET
      name = NEW.subject,
      code = public.legacy_subject_code(NEW.subject),
      status = public.subject_status_from_batch(NEW.status),
      start_date = NEW.start_date,
      end_date = NEW.end_date,
      completed_at = CASE
        WHEN NEW.status::text = 'COMPLETED' THEN COALESCE(bs.completed_at, now())
        ELSE NULL
      END,
      updated_at = now()
    WHERE bs.batch_id = NEW.id
      AND bs.is_default = true
      AND NOT EXISTS (
        SELECT 1
        FROM public.batch_subjects other
        WHERE other.batch_id = NEW.id
          AND other.id <> bs.id
      );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_default_subject_from_legacy_batch ON public.batches;
CREATE TRIGGER sync_default_subject_from_legacy_batch
  AFTER INSERT OR UPDATE OF subject, start_date, end_date, status
  ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_default_subject_from_legacy_batch();

CREATE OR REPLACE FUNCTION public.assign_default_subject_to_exam()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.subject_id IS NULL THEN
    SELECT bs.id
    INTO NEW.subject_id
    FROM public.batch_subjects bs
    WHERE bs.batch_id = NEW.batch_id
      AND bs.is_default = true
    ORDER BY bs.created_at ASC
    LIMIT 1;
  END IF;

  IF NEW.subject_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create exam: batch % has no default subject.', NEW.batch_id
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.batch_subjects bs
    WHERE bs.id = NEW.subject_id
      AND bs.batch_id = NEW.batch_id
  ) THEN
    RAISE EXCEPTION 'Exam subject % does not belong to batch %.', NEW.subject_id, NEW.batch_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS assign_default_subject_to_exam ON public.exams;
CREATE TRIGGER assign_default_subject_to_exam
  BEFORE INSERT OR UPDATE OF batch_id, subject_id
  ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_subject_to_exam();

CREATE OR REPLACE FUNCTION public.sync_academic_completion_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.status::text = 'COMPLETED' THEN
    NEW.completed_at = COALESCE(NEW.completed_at, now());
  ELSIF TG_OP = 'UPDATE'
    AND OLD.status::text = 'COMPLETED'
    AND NEW.status::text <> 'COMPLETED'
  THEN
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_subject_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status::text = 'DRAFT' AND NEW.status::text IN ('UPCOMING', 'RUNNING', 'COMPLETED', 'ARCHIVED')) OR
    (OLD.status::text = 'UPCOMING' AND NEW.status::text IN ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'ARCHIVED')) OR
    (OLD.status::text = 'RUNNING' AND NEW.status::text IN ('UPCOMING', 'PAUSED', 'COMPLETED', 'ARCHIVED')) OR
    (OLD.status::text = 'PAUSED' AND NEW.status::text IN ('UPCOMING', 'RUNNING', 'COMPLETED', 'ARCHIVED')) OR
    (OLD.status::text = 'COMPLETED' AND NEW.status::text IN ('DRAFT', 'UPCOMING', 'RUNNING', 'ARCHIVED')) OR
    (OLD.status::text = 'ARCHIVED' AND NEW.status::text IN ('DRAFT', 'UPCOMING', 'RUNNING'))
  ) THEN
    RAISE EXCEPTION 'Invalid subject status transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status::text = 'COMPLETED'
    AND EXISTS (SELECT 1 FROM public.subject_units su WHERE su.subject_id = NEW.id)
    AND EXISTS (
      SELECT 1
      FROM public.subject_units su
      WHERE su.subject_id = NEW.id
        AND su.status::text NOT IN ('COMPLETED', 'SKIPPED')
    )
  THEN
    RAISE EXCEPTION 'Cannot complete subject while syllabus units remain planned or running.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_subject_unit_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status::text = 'PLANNED' AND NEW.status::text IN ('RUNNING', 'COMPLETED', 'SKIPPED')) OR
    (OLD.status::text = 'RUNNING' AND NEW.status::text IN ('PLANNED', 'COMPLETED', 'SKIPPED')) OR
    (OLD.status::text = 'COMPLETED' AND NEW.status::text IN ('RUNNING', 'PLANNED')) OR
    (OLD.status::text = 'SKIPPED' AND NEW.status::text IN ('PLANNED', 'RUNNING'))
  ) THEN
    RAISE EXCEPTION 'Invalid syllabus unit status transition: % -> %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS update_batch_subjects_modtime ON public.batch_subjects;
CREATE TRIGGER update_batch_subjects_modtime
  BEFORE UPDATE ON public.batch_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS validate_batch_subject_status ON public.batch_subjects;
CREATE TRIGGER validate_batch_subject_status
  BEFORE UPDATE OF status ON public.batch_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_subject_status_transition();

DROP TRIGGER IF EXISTS sync_batch_subject_completed_at ON public.batch_subjects;
CREATE TRIGGER sync_batch_subject_completed_at
  BEFORE UPDATE OF status ON public.batch_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_academic_completion_timestamp();

DROP TRIGGER IF EXISTS update_subject_units_modtime ON public.subject_units;
CREATE TRIGGER update_subject_units_modtime
  BEFORE UPDATE ON public.subject_units
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS validate_subject_unit_status ON public.subject_units;
CREATE TRIGGER validate_subject_unit_status
  BEFORE UPDATE OF status ON public.subject_units
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_subject_unit_status_transition();

DROP TRIGGER IF EXISTS sync_subject_unit_completed_at ON public.subject_units;
CREATE TRIGGER sync_subject_unit_completed_at
  BEFORE INSERT OR UPDATE OF status ON public.subject_units
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_academic_completion_timestamp();

-- =========================================================================
-- 5. RLS AND ACCESS CONTROL
-- =========================================================================

ALTER TABLE public.batch_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_batch_subjects ON public.batch_subjects;
CREATE POLICY select_batch_subjects ON public.batch_subjects
  FOR SELECT TO authenticated
  USING (
    public.is_active_teacher()
    OR (
      status::text NOT IN ('DRAFT', 'ARCHIVED')
      AND public.has_active_enrollment(batch_id)
    )
  );

DROP POLICY IF EXISTS write_batch_subjects ON public.batch_subjects;
CREATE POLICY write_batch_subjects ON public.batch_subjects
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());

DROP POLICY IF EXISTS select_subject_units ON public.subject_units;
CREATE POLICY select_subject_units ON public.subject_units
  FOR SELECT TO authenticated
  USING (
    public.is_active_teacher()
    OR EXISTS (
      SELECT 1
      FROM public.batch_subjects bs
      WHERE bs.id = subject_units.subject_id
        AND bs.status::text NOT IN ('DRAFT', 'ARCHIVED')
        AND public.has_active_enrollment(bs.batch_id)
    )
  );

DROP POLICY IF EXISTS write_subject_units ON public.subject_units;
CREATE POLICY write_subject_units ON public.subject_units
  FOR ALL TO authenticated
  USING (public.is_active_teacher())
  WITH CHECK (public.is_active_teacher());

REVOKE ALL ON public.batch_subjects FROM anon;
REVOKE ALL ON public.subject_units FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_units TO authenticated;

-- A result draft must hide marks, not the exam itself. Keeping RESULT_DRAFT
-- visible prevents an already-conducted exam from disappearing while grading.
DROP POLICY IF EXISTS select_exams ON public.exams;
CREATE POLICY select_exams ON public.exams
  FOR SELECT TO authenticated
  USING (
    public.is_active_teacher()
    OR (
      status::text IN ('SCHEDULED', 'COMPLETED', 'RESULT_DRAFT', 'RESULT_PUBLISHED')
      AND public.has_active_enrollment(batch_id)
    )
  );

-- =========================================================================
-- 6. DATA-DRIVEN PROGRESS VIEWS
-- =========================================================================

CREATE OR REPLACE VIEW public.subject_progress_summary
WITH (security_invoker = true)
AS
WITH unit_stats AS (
  SELECT
    su.subject_id,
    count(*) FILTER (WHERE su.status::text <> 'SKIPPED')::INTEGER AS total_units,
    count(*) FILTER (WHERE su.status::text = 'COMPLETED')::INTEGER AS completed_units,
    count(*) FILTER (WHERE su.status::text = 'RUNNING')::INTEGER AS running_units,
    count(*) FILTER (WHERE su.status::text = 'PLANNED')::INTEGER AS planned_units,
    COALESCE(sum(su.weight) FILTER (WHERE su.status::text <> 'SKIPPED'), 0)::NUMERIC AS total_weight,
    COALESCE(sum(su.weight) FILTER (WHERE su.status::text = 'COMPLETED'), 0)::NUMERIC AS completed_weight
  FROM public.subject_units su
  GROUP BY su.subject_id
),
exam_stats AS (
  SELECT
    e.subject_id,
    count(*) FILTER (WHERE e.status::text NOT IN ('DRAFT', 'CANCELLED'))::INTEGER AS planned_exams,
    count(*) FILTER (
      WHERE e.status::text IN ('COMPLETED', 'RESULT_DRAFT', 'RESULT_PUBLISHED', 'ARCHIVED')
    )::INTEGER AS conducted_exams,
    count(*) FILTER (WHERE e.status::text = 'SCHEDULED')::INTEGER AS scheduled_exams,
    count(*) FILTER (
      WHERE e.status::text = 'RESULT_PUBLISHED'
        OR (e.status::text = 'ARCHIVED' AND e.published_at IS NOT NULL)
    )::INTEGER AS published_results
  FROM public.exams e
  GROUP BY e.subject_id
)
SELECT
  bs.id AS subject_id,
  bs.batch_id,
  bs.name,
  bs.code,
  bs.status,
  bs.theme_key,
  bs.display_order,
  COALESCE(us.total_units, 0) AS total_units,
  COALESCE(us.completed_units, 0) AS completed_units,
  COALESCE(us.running_units, 0) AS running_units,
  COALESCE(us.planned_units, 0) AS planned_units,
  COALESCE(
    round((us.completed_weight / NULLIF(us.total_weight, 0)) * 100, 2),
    0
  )::NUMERIC(6, 2) AS syllabus_progress_percentage,
  COALESCE(es.planned_exams, 0) AS planned_exams,
  COALESCE(es.conducted_exams, 0) AS conducted_exams,
  COALESCE(es.scheduled_exams, 0) AS scheduled_exams,
  COALESCE(es.published_results, 0) AS published_results,
  COALESCE(
    round((es.conducted_exams::NUMERIC / NULLIF(es.planned_exams, 0)) * 100, 2),
    0
  )::NUMERIC(6, 2) AS exam_plan_progress_percentage
FROM public.batch_subjects bs
LEFT JOIN unit_stats us ON us.subject_id = bs.id
LEFT JOIN exam_stats es ON es.subject_id = bs.id;

CREATE OR REPLACE VIEW public.batch_academic_progress
WITH (security_invoker = true)
AS
WITH visible_subjects AS (
  SELECT bs.*
  FROM public.batch_subjects bs
  WHERE bs.status::text NOT IN ('DRAFT', 'ARCHIVED')
),
unit_stats AS (
  SELECT
    vs.batch_id,
    count(su.id) FILTER (WHERE su.status::text <> 'SKIPPED')::INTEGER AS total_units,
    count(su.id) FILTER (WHERE su.status::text = 'COMPLETED')::INTEGER AS completed_units,
    COALESCE(sum(su.weight) FILTER (WHERE su.status::text <> 'SKIPPED'), 0)::NUMERIC AS total_weight,
    COALESCE(sum(su.weight) FILTER (WHERE su.status::text = 'COMPLETED'), 0)::NUMERIC AS completed_weight
  FROM visible_subjects vs
  LEFT JOIN public.subject_units su ON su.subject_id = vs.id
  GROUP BY vs.batch_id
),
subject_stats AS (
  SELECT
    vs.batch_id,
    count(*)::INTEGER AS total_subjects,
    count(*) FILTER (WHERE vs.status::text = 'RUNNING')::INTEGER AS running_subjects,
    count(*) FILTER (WHERE vs.status::text = 'COMPLETED')::INTEGER AS completed_subjects
  FROM visible_subjects vs
  GROUP BY vs.batch_id
),
exam_stats AS (
  SELECT
    e.batch_id,
    count(*) FILTER (WHERE e.status::text NOT IN ('DRAFT', 'CANCELLED'))::INTEGER AS planned_exams,
    count(*) FILTER (
      WHERE e.status::text IN ('COMPLETED', 'RESULT_DRAFT', 'RESULT_PUBLISHED', 'ARCHIVED')
    )::INTEGER AS conducted_exams,
    count(*) FILTER (
      WHERE e.status::text = 'RESULT_PUBLISHED'
        OR (e.status::text = 'ARCHIVED' AND e.published_at IS NOT NULL)
    )::INTEGER AS published_results
  FROM public.exams e
  GROUP BY e.batch_id
)
SELECT
  b.id AS batch_id,
  b.name AS batch_name,
  b.code AS batch_code,
  COALESCE(ss.total_subjects, 0) AS total_subjects,
  COALESCE(ss.running_subjects, 0) AS running_subjects,
  COALESCE(ss.completed_subjects, 0) AS completed_subjects,
  COALESCE(us.total_units, 0) AS total_units,
  COALESCE(us.completed_units, 0) AS completed_units,
  COALESCE(
    round((us.completed_weight / NULLIF(us.total_weight, 0)) * 100, 2),
    0
  )::NUMERIC(6, 2) AS academic_progress_percentage,
  COALESCE(es.planned_exams, 0) AS planned_exams,
  COALESCE(es.conducted_exams, 0) AS conducted_exams,
  COALESCE(es.published_results, 0) AS published_results,
  COALESCE(
    round((es.conducted_exams::NUMERIC / NULLIF(es.planned_exams, 0)) * 100, 2),
    0
  )::NUMERIC(6, 2) AS exam_plan_progress_percentage,
  COALESCE(
    round((es.published_results::NUMERIC / NULLIF(es.conducted_exams, 0)) * 100, 2),
    0
  )::NUMERIC(6, 2) AS result_publication_progress_percentage
FROM public.batches b
LEFT JOIN subject_stats ss ON ss.batch_id = b.id
LEFT JOIN unit_stats us ON us.batch_id = b.id
LEFT JOIN exam_stats es ON es.batch_id = b.id;

CREATE OR REPLACE VIEW public.student_subject_performance
WITH (security_invoker = true)
AS
SELECT
  er.student_id,
  e.batch_id,
  e.subject_id,
  count(*)::INTEGER AS published_exam_count,
  count(*) FILTER (WHERE er.attendance_status::text = 'PRESENT')::INTEGER AS attended_exam_count,
  count(*) FILTER (WHERE er.attendance_status::text = 'ABSENT')::INTEGER AS missed_exam_count,
  count(*) FILTER (
    WHERE er.attendance_status::text = 'PRESENT'
      AND er.obtained_marks >= e.pass_marks
  )::INTEGER AS passed_exam_count,
  COALESCE(
    round(
      (
        sum(er.obtained_marks) FILTER (WHERE er.attendance_status::text = 'PRESENT')
        / NULLIF(
          sum(e.total_marks) FILTER (WHERE er.attendance_status::text = 'PRESENT'),
          0
        )
      ) * 100,
      2
    ),
    0
  )::NUMERIC(6, 2) AS average_percentage
FROM public.exam_results er
JOIN public.exams e ON e.id = er.exam_id
WHERE e.status::text = 'RESULT_PUBLISHED'
GROUP BY er.student_id, e.batch_id, e.subject_id;

REVOKE ALL ON public.subject_progress_summary FROM anon;
REVOKE ALL ON public.batch_academic_progress FROM anon;
REVOKE ALL ON public.student_subject_performance FROM anon;
GRANT SELECT ON public.subject_progress_summary TO authenticated;
GRANT SELECT ON public.batch_academic_progress TO authenticated;
GRANT SELECT ON public.student_subject_performance TO authenticated;

COMMENT ON TABLE public.batch_subjects IS
  'Academic subjects owned by a batch. Existing single-subject batches receive one default subject during backfill.';

COMMENT ON TABLE public.subject_units IS
  'Ordered chapters, topics, or modules used to calculate real syllabus progress.';

COMMENT ON COLUMN public.exams.subject_id IS
  'Required subject link. A compatibility trigger supplies the batch default subject for legacy exam creation flows.';

COMMENT ON VIEW public.subject_progress_summary IS
  'Data-driven syllabus and exam-plan progress per batch subject.';

COMMENT ON VIEW public.batch_academic_progress IS
  'Data-driven academic, exam-plan, and result-publication progress per batch.';

COMMENT ON VIEW public.student_subject_performance IS
  'Published-result performance grouped by student and subject; absences are reported separately from score average.';
