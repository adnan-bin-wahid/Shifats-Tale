-- Coaching Admin security, workflow, and data-integrity hardening.
-- This migration preserves existing UI and intended workflows while moving
-- critical invariants into PostgreSQL so direct API/RLS paths cannot bypass them.

BEGIN;
-- -------------------------------------------------------------------------
-- 1. Batch lifecycle, capacity, and deletion integrity
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_batch_management_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_count INTEGER;
BEGIN
  IF NEW.end_date IS NOT NULL AND NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'Batch end date cannot be before the start date.' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.capacity IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER
    INTO v_active_count
    FROM public.enrollments
    WHERE batch_id = NEW.id
      AND status = 'ACTIVE';

    IF v_active_count > NEW.capacity THEN
      RAISE EXCEPTION 'Batch capacity cannot be lower than the current active enrollment count (%).', v_active_count
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_batch_management_integrity ON public.batches;
CREATE TRIGGER validate_batch_management_integrity
  BEFORE INSERT OR UPDATE ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_batch_management_integrity();
CREATE OR REPLACE FUNCTION public.prevent_batch_delete_with_dependencies()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.enrollments WHERE batch_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.payments WHERE batch_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.exams WHERE batch_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.batch_contents WHERE batch_id = OLD.id)
     OR EXISTS (SELECT 1 FROM public.announcements WHERE batch_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete a batch containing enrollments, payments, exams, materials, announcements, or historical records.'
      USING ERRCODE = '23503';
  END IF;

  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS prevent_batch_delete_with_dependencies ON public.batches;
CREATE TRIGGER prevent_batch_delete_with_dependencies
  BEFORE DELETE ON public.batches
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_batch_delete_with_dependencies();
-- -------------------------------------------------------------------------
-- 2. Student registration must agree with active enrollment state
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_student_registration_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.registration_status IS DISTINCT FROM OLD.registration_status
     AND NEW.registration_status <> 'APPROVED'
     AND EXISTS (
       SELECT 1
       FROM public.enrollments
       WHERE student_id = NEW.id
         AND status = 'ACTIVE'
     ) THEN
    RAISE EXCEPTION 'A student with an active enrollment must remain approved.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_student_registration_state ON public.student_profiles;
CREATE TRIGGER validate_student_registration_state
  BEFORE UPDATE OF registration_status ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_student_registration_state();
CREATE OR REPLACE FUNCTION public.update_student_registration_atomic(
  p_student_id UUID,
  p_new_status public.registration_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.student_profiles%ROWTYPE;
BEGIN
  IF NOT public.is_active_teacher() THEN
    RAISE EXCEPTION 'Unauthorized: Only an active teacher can update registration status.' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_student
  FROM public.student_profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.student_profiles
  SET registration_status = p_new_status
  WHERE id = p_student_id
  RETURNING * INTO v_student;

  RETURN to_jsonb(v_student);
END;
$$;
-- -------------------------------------------------------------------------
-- 3. Examination lifecycle and deletion integrity
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_exam_insert_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('DRAFT', 'SCHEDULED') THEN
    RAISE EXCEPTION 'New examinations can only be created as draft or scheduled.' USING ERRCODE = '23514';
  END IF;

  NEW.published_at := NULL;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_exam_insert_state ON public.exams;
CREATE TRIGGER validate_exam_insert_state
  BEFORE INSERT ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_exam_insert_state();
CREATE OR REPLACE FUNCTION public.validate_exam_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.batch_id IS DISTINCT FROM OLD.batch_id
     AND EXISTS (SELECT 1 FROM public.exam_results WHERE exam_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot move an examination to another batch after results exist.' USING ERRCODE = '23514';
  END IF;

  IF NEW.total_marks IS DISTINCT FROM OLD.total_marks
     AND EXISTS (
       SELECT 1
       FROM public.exam_results
       WHERE exam_id = OLD.id
         AND obtained_marks IS NOT NULL
         AND obtained_marks > NEW.total_marks
     ) THEN
    RAISE EXCEPTION 'Some entered marks exceed the new total marks.' USING ERRCODE = '23514';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'RESULT_PUBLISHED' AND OLD.status <> 'RESULT_DRAFT' THEN
      RAISE EXCEPTION 'Results can only be published from result draft state.' USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'RESULT_PUBLISHED' AND NEW.status <> 'RESULT_DRAFT' THEN
      RAISE EXCEPTION 'Published results must be withdrawn before another status transition.' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.status = 'RESULT_PUBLISHED' AND OLD.status IS DISTINCT FROM 'RESULT_PUBLISHED' THEN
    IF NOT EXISTS (SELECT 1 FROM public.exam_results WHERE exam_id = OLD.id) THEN
      RAISE EXCEPTION 'Cannot publish empty results.' USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.batch_id = NEW.batch_id
        AND e.status = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1
          FROM public.exam_results r
          WHERE r.exam_id = OLD.id
            AND r.student_id = e.student_id
            AND r.enrollment_id = e.id
        )
    ) THEN
      RAISE EXCEPTION 'All active enrolled students must have a result before publication.' USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.exam_results r
      LEFT JOIN public.enrollments e ON e.id = r.enrollment_id
      WHERE r.exam_id = OLD.id
        AND (
          e.id IS NULL
          OR e.student_id <> r.student_id
          OR e.batch_id <> NEW.batch_id
          OR e.status <> 'ACTIVE'
        )
    ) THEN
      RAISE EXCEPTION 'Result records contain an invalid or inactive enrollment.' USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.exam_results
      WHERE exam_id = OLD.id
        AND attendance_status = 'PRESENT'
        AND obtained_marks IS NULL
    ) THEN
      RAISE EXCEPTION 'Present students must have obtained marks before publication.' USING ERRCODE = '23514';
    END IF;

    UPDATE public.exam_results
    SET rank = NULL,
        grade = public.calculate_exam_grade(obtained_marks, NEW.total_marks)
    WHERE exam_id = OLD.id;

    WITH ranked_present AS (
      SELECT
        id,
        RANK() OVER (ORDER BY obtained_marks DESC) AS computed_rank
      FROM public.exam_results
      WHERE exam_id = OLD.id
        AND attendance_status = 'PRESENT'
        AND obtained_marks IS NOT NULL
    )
    UPDATE public.exam_results r
    SET rank = rp.computed_rank
    FROM ranked_present rp
    WHERE r.id = rp.id;

    NEW.published_at := COALESCE(NEW.published_at, NOW());
  ELSIF OLD.status = 'RESULT_PUBLISHED' AND NEW.status = 'RESULT_DRAFT' THEN
    NEW.published_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.prevent_exam_delete_with_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Only draft examinations can be deleted.' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (SELECT 1 FROM public.exam_results WHERE exam_id = OLD.id) THEN
    RAISE EXCEPTION 'Cannot delete an examination after result records exist.' USING ERRCODE = '23503';
  END IF;

  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS prevent_exam_delete_with_history ON public.exams;
CREATE TRIGGER prevent_exam_delete_with_history
  BEFORE DELETE ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_exam_delete_with_history();
-- -------------------------------------------------------------------------
-- 4. CMS media references cannot be soft-deleted through any API path
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_referenced_media_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.site_settings
      WHERE logo_media_id = OLD.id
         OR favicon_media_id = OLD.id
         OR default_og_media_id = OLD.id
    ) OR EXISTS (
      SELECT 1 FROM public.site_pages WHERE og_media_id = OLD.id
    ) OR EXISTS (
      SELECT 1 FROM public.site_section_items WHERE media_id = OLD.id
    ) OR EXISTS (
      SELECT 1
      FROM public.site_page_sections
      WHERE content->>'mediaId' = OLD.id::TEXT
    ) THEN
      RAISE EXCEPTION 'Cannot delete a media asset that is still referenced by published or editable CMS content.'
        USING ERRCODE = '23503';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS prevent_referenced_media_soft_delete ON public.media_assets;
CREATE TRIGGER prevent_referenced_media_soft_delete
  BEFORE UPDATE OF deleted_at ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_referenced_media_soft_delete();
-- -------------------------------------------------------------------------
-- 5. Atomic, fail-closed rate limiting
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_duration_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hits INTEGER;
BEGIN
  IF p_key IS NULL OR BTRIM(p_key) = '' OR p_limit <= 0 OR p_duration_seconds <= 0 THEN
    RAISE EXCEPTION 'Invalid rate-limit parameters.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.rate_limits AS rl (key, hits, expires_at)
  VALUES (p_key, 1, NOW() + make_interval(secs => p_duration_seconds))
  ON CONFLICT (key)
  DO UPDATE SET
    hits = CASE
      WHEN rl.expires_at <= NOW() THEN 1
      ELSE rl.hits + 1
    END,
    expires_at = CASE
      WHEN rl.expires_at <= NOW() THEN NOW() + make_interval(secs => p_duration_seconds)
      ELSE rl.expires_at
    END
  RETURNING hits INTO v_hits;

  RETURN v_hits <= p_limit;
END;
$$;
-- -------------------------------------------------------------------------
-- 6. The configured student ID prefix now controls future registrations
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_profile_id UUID;
  new_student_code TEXT;
  configured_prefix TEXT;
BEGIN
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

  SELECT NULLIF(REGEXP_REPLACE(UPPER(student_id_prefix), '[^A-Z0-9]', '', 'g'), '')
  INTO configured_prefix
  FROM public.app_settings
  WHERE id = TRUE;

  configured_prefix := COALESCE(configured_prefix, 'ST');
  new_student_code := configured_prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(nextval('public.student_code_seq')::TEXT, 6, '0');

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
$$;
REVOKE ALL ON FUNCTION public.update_student_registration_atomic(UUID, public.registration_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_student_registration_atomic(UUID, public.registration_status) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
COMMIT;
