-- Student management integrity hardening
-- Scope: security, relationship validation, atomic state transitions, and profile synchronization.
-- This migration does not alter any UI contract or intended user-facing workflow.

-- -------------------------------------------------------------------------
-- 1. Lock down privileged setup functions
-- -------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.setup_teacher_account(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.setup_teacher_account(TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.update_student_code_admin(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_student_code_admin(UUID, TEXT) TO authenticated, service_role;
-- -------------------------------------------------------------------------
-- 2. Keep the public profile email synchronized with Supabase Auth
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_profile_email_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email AND NEW.email IS NOT NULL THEN
    UPDATE public.profiles
    SET email = LOWER(NEW.email)
    WHERE auth_user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sync_profile_email_after_auth_change ON auth.users;
CREATE TRIGGER sync_profile_email_after_auth_change
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_profile_email_from_auth();
-- -------------------------------------------------------------------------
-- 3. Shared grading helper
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_exam_grade(
  p_obtained_marks NUMERIC,
  p_total_marks NUMERIC
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_percentage NUMERIC;
BEGIN
  IF p_obtained_marks IS NULL OR p_total_marks IS NULL OR p_total_marks <= 0 THEN
    RETURN NULL;
  END IF;

  v_percentage := (p_obtained_marks / p_total_marks) * 100;

  RETURN CASE
    WHEN v_percentage >= 80 THEN 'A+'
    WHEN v_percentage >= 70 THEN 'A'
    WHEN v_percentage >= 60 THEN 'A-'
    WHEN v_percentage >= 50 THEN 'B'
    WHEN v_percentage >= 40 THEN 'C'
    WHEN v_percentage >= 33 THEN 'D'
    ELSE 'F'
  END;
END;
$$;
-- -------------------------------------------------------------------------
-- 4. Exam-result relationship and marks integrity
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_exam_result_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam_batch_id UUID;
  v_total_marks NUMERIC;
  v_exam_status public.exam_status;
  v_enrollment_student_id UUID;
  v_enrollment_batch_id UUID;
  v_enrollment_status public.enrollment_status;
BEGIN
  SELECT batch_id, total_marks, status
  INTO v_exam_batch_id, v_total_marks, v_exam_status
  FROM public.exams
  WHERE id = NEW.exam_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Examination not found.' USING ERRCODE = '23503';
  END IF;

  IF v_exam_status = 'RESULT_PUBLISHED' THEN
    RAISE EXCEPTION 'Cannot modify results of a published examination.' USING ERRCODE = '55000';
  END IF;

  SELECT student_id, batch_id, status
  INTO v_enrollment_student_id, v_enrollment_batch_id, v_enrollment_status
  FROM public.enrollments
  WHERE id = NEW.enrollment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found.' USING ERRCODE = '23503';
  END IF;

  IF v_enrollment_student_id <> NEW.student_id THEN
    RAISE EXCEPTION 'Result student does not match the supplied enrollment.' USING ERRCODE = '23514';
  END IF;

  IF v_enrollment_batch_id <> v_exam_batch_id THEN
    RAISE EXCEPTION 'Enrollment does not belong to the examination batch.' USING ERRCODE = '23514';
  END IF;

  IF v_enrollment_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Results may only be entered for active enrollments.' USING ERRCODE = '23514';
  END IF;

  IF NEW.attendance_status = 'ABSENT' THEN
    NEW.obtained_marks := NULL;
    NEW.grade := NULL;
    NEW.rank := NULL;
  ELSE
    IF NEW.obtained_marks IS NOT NULL AND NEW.obtained_marks < 0 THEN
      RAISE EXCEPTION 'Obtained marks cannot be negative.' USING ERRCODE = '23514';
    END IF;

    IF NEW.obtained_marks IS NOT NULL AND NEW.obtained_marks > v_total_marks THEN
      RAISE EXCEPTION 'Obtained marks (%) exceed exam total marks (%).', NEW.obtained_marks, v_total_marks
        USING ERRCODE = '23514';
    END IF;

    NEW.grade := public.calculate_exam_grade(NEW.obtained_marks, v_total_marks);

    IF TG_OP = 'INSERT'
       OR NEW.obtained_marks IS DISTINCT FROM OLD.obtained_marks
       OR NEW.attendance_status IS DISTINCT FROM OLD.attendance_status
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.enrollment_id IS DISTINCT FROM OLD.enrollment_id THEN
      NEW.rank := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_obtained_marks ON public.exam_results;
DROP TRIGGER IF EXISTS validate_exam_result_integrity ON public.exam_results;
CREATE TRIGGER validate_exam_result_integrity
  BEFORE INSERT OR UPDATE ON public.exam_results
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_exam_result_integrity();
-- Validate publication and exam edits inside the same database transaction.
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

    -- Clear stale ranks, then apply deterministic competition ranking.
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
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_exam_state_change ON public.exams;
CREATE TRIGGER validate_exam_state_change
  BEFORE UPDATE ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_exam_state_change();
CREATE OR REPLACE FUNCTION public.recalculate_exam_grades_after_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.total_marks IS DISTINCT FROM OLD.total_marks THEN
    UPDATE public.exam_results
    SET grade = public.calculate_exam_grade(obtained_marks, NEW.total_marks)
    WHERE exam_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS recalculate_exam_grades_after_edit ON public.exams;
CREATE TRIGGER recalculate_exam_grades_after_edit
  AFTER UPDATE OF total_marks ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_exam_grades_after_edit();
-- Atomic result-draft save. Every row and the exam status commit together.
CREATE OR REPLACE FUNCTION public.save_exam_results_draft_atomic(
  p_exam_id UUID,
  p_results JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam public.exams%ROWTYPE;
  v_item JSONB;
  v_student_id UUID;
  v_enrollment_id UUID;
  v_attendance public.attendance_status;
  v_marks NUMERIC;
  v_remarks TEXT;
BEGIN
  IF NOT public.is_active_teacher() THEN
    RAISE EXCEPTION 'Unauthorized: Only an active teacher can save results.' USING ERRCODE = '42501';
  END IF;

  IF p_results IS NULL OR jsonb_typeof(p_results) <> 'array' THEN
    RAISE EXCEPTION 'Results payload must be a JSON array.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_exam
  FROM public.exams
  WHERE id = p_exam_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Examination not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_exam.status = 'RESULT_PUBLISHED' THEN
    RAISE EXCEPTION 'Cannot modify results of a published examination.' USING ERRCODE = '55000';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT value->>'student_id' AS student_id, COUNT(*)
      FROM jsonb_array_elements(p_results)
      GROUP BY value->>'student_id'
      HAVING COUNT(*) > 1
    ) duplicates
  ) THEN
    RAISE EXCEPTION 'The results payload contains duplicate students.' USING ERRCODE = '23505';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_results)
  LOOP
    v_student_id := NULLIF(v_item->>'student_id', '')::UUID;
    v_enrollment_id := NULLIF(v_item->>'enrollment_id', '')::UUID;
    v_attendance := (v_item->>'attendance_status')::public.attendance_status;
    v_marks := NULLIF(v_item->>'obtained_marks', '')::NUMERIC;
    v_remarks := NULLIF(BTRIM(COALESCE(v_item->>'remarks', '')), '');

    IF v_student_id IS NULL OR v_enrollment_id IS NULL THEN
      RAISE EXCEPTION 'Student and enrollment identifiers are required.' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.exam_results (
      exam_id,
      student_id,
      enrollment_id,
      attendance_status,
      obtained_marks,
      remarks
    )
    VALUES (
      p_exam_id,
      v_student_id,
      v_enrollment_id,
      v_attendance,
      CASE WHEN v_attendance = 'ABSENT' THEN NULL ELSE v_marks END,
      v_remarks
    )
    ON CONFLICT (exam_id, student_id)
    DO UPDATE SET
      enrollment_id = EXCLUDED.enrollment_id,
      attendance_status = EXCLUDED.attendance_status,
      obtained_marks = EXCLUDED.obtained_marks,
      remarks = EXCLUDED.remarks;
  END LOOP;

  IF v_exam.status IN ('DRAFT', 'SCHEDULED', 'COMPLETED') THEN
    UPDATE public.exams
    SET status = 'RESULT_DRAFT'
    WHERE id = p_exam_id;
  END IF;

  RETURN jsonb_build_object('exam_id', p_exam_id, 'saved_count', jsonb_array_length(p_results));
END;
$$;
-- -------------------------------------------------------------------------
-- 5. Enrollment invariants and atomic registration approval
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_enrollment_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_batch_status public.batch_status;
  v_capacity INTEGER;
  v_active_count INTEGER;
BEGIN
  SELECT p.role
  INTO v_role
  FROM public.student_profiles sp
  JOIN public.profiles p ON p.id = sp.profile_id
  WHERE sp.id = NEW.student_id;

  IF NOT FOUND OR v_role <> 'STUDENT' THEN
    RAISE EXCEPTION 'Enrollment target must be a valid student.' USING ERRCODE = '23514';
  END IF;

  SELECT status, capacity
  INTO v_batch_status, v_capacity
  FROM public.batches
  WHERE id = NEW.batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Batch not found.' USING ERRCODE = '23503';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
      (OLD.status = 'PENDING' AND NEW.status IN ('ACTIVE', 'REJECTED', 'CANCELLED')) OR
      (OLD.status = 'ACTIVE' AND NEW.status IN ('DISABLED', 'COMPLETED', 'CANCELLED')) OR
      (OLD.status = 'DISABLED' AND NEW.status IN ('ACTIVE', 'CANCELLED')) OR
      (OLD.status = 'COMPLETED' AND NEW.status = 'ACTIVE') OR
      (OLD.status = 'REJECTED' AND NEW.status = 'PENDING')
    ) THEN
      RAISE EXCEPTION 'Invalid enrollment transition from % to %.', OLD.status, NEW.status USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.status = 'ACTIVE' THEN
    IF v_batch_status IN ('ARCHIVED', 'CANCELLED') THEN
      RAISE EXCEPTION 'Cannot activate enrollment in an archived or cancelled batch.' USING ERRCODE = '23514';
    END IF;

    IF v_capacity IS NOT NULL THEN
      SELECT COUNT(*)::INTEGER
      INTO v_active_count
      FROM public.enrollments
      WHERE batch_id = NEW.batch_id
        AND status = 'ACTIVE'
        AND (TG_OP = 'INSERT' OR id <> NEW.id);

      IF v_active_count >= v_capacity THEN
        RAISE EXCEPTION 'Batch capacity has been reached.' USING ERRCODE = '23514';
      END IF;
    END IF;

    NEW.approved_at := COALESCE(NEW.approved_at, NOW());
    NEW.disabled_at := NULL;
    NEW.disable_reason := NULL;
    NEW.completed_at := NULL;
  ELSIF NEW.status = 'DISABLED' THEN
    IF NEW.disable_reason IS NULL OR BTRIM(NEW.disable_reason) = '' THEN
      RAISE EXCEPTION 'A reason is required to disable an enrollment.' USING ERRCODE = '23514';
    END IF;
    -- Keep approved_at as lifecycle history, but clear contradictory terminal state.
    NEW.disabled_at := COALESCE(NEW.disabled_at, NOW());
    NEW.completed_at := NULL;
  ELSIF NEW.status = 'COMPLETED' THEN
    -- Keep approved_at as lifecycle history.
    NEW.disabled_at := NULL;
    NEW.disable_reason := NULL;
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
  ELSIF NEW.status = 'PENDING' THEN
    NEW.approved_at := NULL;
    NEW.disabled_at := NULL;
    NEW.disable_reason := NULL;
    NEW.completed_at := NULL;
  ELSE
    -- REJECTED/CANCELLED are terminal; remove timestamps that imply current
    -- active/disabled/completed state while audit_logs preserve prior history.
    NEW.approved_at := NULL;
    NEW.disabled_at := NULL;
    NEW.disable_reason := NULL;
    NEW.completed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_enrollment_integrity ON public.enrollments;
CREATE TRIGGER validate_enrollment_integrity
  BEFORE INSERT OR UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_enrollment_integrity();
CREATE OR REPLACE FUNCTION public.approve_student_on_active_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'ACTIVE' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'ACTIVE') THEN
    UPDATE public.student_profiles
    SET registration_status = 'APPROVED'
    WHERE id = NEW.student_id
      AND registration_status = 'PENDING';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS approve_student_on_active_enrollment ON public.enrollments;
CREATE TRIGGER approve_student_on_active_enrollment
  AFTER INSERT OR UPDATE OF status ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.approve_student_on_active_enrollment();
CREATE OR REPLACE FUNCTION public.create_enrollment_atomic(
  p_student_id UUID,
  p_batch_id UUID,
  p_initial_status public.enrollment_status DEFAULT 'PENDING'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_before_status public.registration_status;
  v_enrollment public.enrollments%ROWTYPE;
  v_batch_name TEXT;
  v_profile_id UUID;
BEGIN
  IF NOT public.is_active_teacher() THEN
    RAISE EXCEPTION 'Unauthorized: Only an active teacher can create enrollments.' USING ERRCODE = '42501';
  END IF;

  SELECT registration_status, profile_id
  INTO v_before_status, v_profile_id
  FROM public.student_profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.enrollments (student_id, batch_id, status)
  VALUES (p_student_id, p_batch_id, p_initial_status)
  RETURNING * INTO v_enrollment;

  SELECT name INTO v_batch_name FROM public.batches WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'enrollment', to_jsonb(v_enrollment) || jsonb_build_object('batch_name', v_batch_name),
    'registration_approved', v_before_status = 'PENDING' AND p_initial_status = 'ACTIVE',
    'profile_id', v_profile_id
  );
END;
$$;
CREATE OR REPLACE FUNCTION public.update_enrollment_status_atomic(
  p_enrollment_id UUID,
  p_new_status public.enrollment_status,
  p_disable_reason TEXT DEFAULT NULL,
  p_explicit_confirmation BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment public.enrollments%ROWTYPE;
  v_updated public.enrollments%ROWTYPE;
  v_before_registration public.registration_status;
  v_profile_id UUID;
  v_batch_name TEXT;
  v_valid BOOLEAN := FALSE;
BEGIN
  IF NOT public.is_active_teacher() THEN
    RAISE EXCEPTION 'Unauthorized: Only an active teacher can update enrollments.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_enrollment
  FROM public.enrollments
  WHERE id = p_enrollment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_enrollment.status = p_new_status THEN
    SELECT registration_status, profile_id
    INTO v_before_registration, v_profile_id
    FROM public.student_profiles
    WHERE id = v_enrollment.student_id;

    SELECT name INTO v_batch_name FROM public.batches WHERE id = v_enrollment.batch_id;

    RETURN jsonb_build_object(
      'enrollment', to_jsonb(v_enrollment) || jsonb_build_object('batch_name', v_batch_name),
      'old_status', v_enrollment.status,
      'registration_approved', FALSE,
      'profile_id', v_profile_id
    );
  END IF;

  v_valid :=
    (v_enrollment.status = 'PENDING' AND p_new_status IN ('ACTIVE', 'REJECTED', 'CANCELLED')) OR
    (v_enrollment.status = 'ACTIVE' AND p_new_status IN ('DISABLED', 'COMPLETED', 'CANCELLED')) OR
    (v_enrollment.status = 'DISABLED' AND p_new_status IN ('ACTIVE', 'CANCELLED')) OR
    (v_enrollment.status = 'COMPLETED' AND p_new_status = 'ACTIVE' AND p_explicit_confirmation) OR
    (v_enrollment.status = 'REJECTED' AND p_new_status = 'PENDING' AND p_explicit_confirmation);

  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid enrollment transition from % to %.', v_enrollment.status, p_new_status USING ERRCODE = '23514';
  END IF;

  IF p_new_status = 'DISABLED' AND (p_disable_reason IS NULL OR BTRIM(p_disable_reason) = '') THEN
    RAISE EXCEPTION 'A reason is required to disable an enrollment.' USING ERRCODE = '23514';
  END IF;

  SELECT registration_status, profile_id
  INTO v_before_registration, v_profile_id
  FROM public.student_profiles
  WHERE id = v_enrollment.student_id
  FOR UPDATE;

  UPDATE public.enrollments
  SET status = p_new_status,
      disable_reason = CASE WHEN p_new_status = 'DISABLED' THEN BTRIM(p_disable_reason) ELSE NULL END
  WHERE id = p_enrollment_id
  RETURNING * INTO v_updated;

  SELECT name INTO v_batch_name FROM public.batches WHERE id = v_updated.batch_id;

  RETURN jsonb_build_object(
    'enrollment', to_jsonb(v_updated) || jsonb_build_object('batch_name', v_batch_name),
    'old_status', v_enrollment.status,
    'registration_approved', v_before_registration = 'PENDING' AND p_new_status = 'ACTIVE',
    'profile_id', v_profile_id
  );
END;
$$;
-- -------------------------------------------------------------------------
-- 6. Payment relationship and state integrity
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_payment_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id UUID;
  v_batch_id UUID;
BEGIN
  SELECT student_id, batch_id
  INTO v_student_id, v_batch_id
  FROM public.enrollments
  WHERE id = NEW.enrollment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found for payment.' USING ERRCODE = '23503';
  END IF;

  IF NEW.student_id <> v_student_id OR NEW.batch_id <> v_batch_id THEN
    RAISE EXCEPTION 'Payment student, enrollment, and batch relationship is inconsistent.' USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'UNPAID' AND NEW.paid_amount <> 0 THEN
    RAISE EXCEPTION 'UNPAID records must have a paid amount of zero.' USING ERRCODE = '23514';
  ELSIF NEW.status = 'PARTIALLY_PAID'
        AND NOT (NEW.paid_amount > 0 AND NEW.paid_amount < NEW.expected_amount) THEN
    RAISE EXCEPTION 'PARTIALLY_PAID requires paid amount greater than zero and below expected amount.' USING ERRCODE = '23514';
  ELSIF NEW.status = 'PAID' AND NEW.paid_amount < NEW.expected_amount THEN
    RAISE EXCEPTION 'PAID requires paid amount to meet or exceed expected amount.' USING ERRCODE = '23514';
  END IF;

  IF NEW.status IN ('WAIVED', 'REFUNDED', 'CANCELLED')
     AND (NEW.teacher_note IS NULL OR BTRIM(NEW.teacher_note) = '') THEN
    RAISE EXCEPTION 'A teacher note is required for exceptional payment statuses.' USING ERRCODE = '23514';
  END IF;

  IF NEW.status IN ('PAID', 'PARTIALLY_PAID') THEN
    NEW.confirmed_at := COALESCE(NEW.confirmed_at, NOW());
  ELSE
    NEW.confirmed_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_payment_integrity ON public.payments;
CREATE TRIGGER validate_payment_integrity
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_payment_integrity();
-- -------------------------------------------------------------------------
-- 7. Atomic profile mutations
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_student_profile_self_atomic(
  p_phone TEXT,
  p_guardian_name TEXT,
  p_guardian_phone TEXT,
  p_address TEXT,
  p_date_of_birth DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_student_id UUID;
BEGIN
  SELECT p.id, sp.id
  INTO v_profile_id, v_student_id
  FROM public.profiles p
  JOIN public.student_profiles sp ON sp.profile_id = p.id
  WHERE p.auth_user_id = auth.uid()
    AND p.role = 'STUDENT'
    AND p.account_status = 'ACTIVE'
    AND sp.registration_status = 'APPROVED'
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.student_id = sp.id
        AND e.status = 'ACTIVE'
    )
  FOR UPDATE OF p, sp;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: Active approved student required.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET phone = p_phone
  WHERE id = v_profile_id;

  UPDATE public.student_profiles
  SET guardian_name = p_guardian_name,
      guardian_phone = p_guardian_phone,
      address = p_address,
      date_of_birth = p_date_of_birth
  WHERE id = v_student_id;

  RETURN jsonb_build_object('profile_id', v_profile_id, 'student_id', v_student_id);
END;
$$;
CREATE OR REPLACE FUNCTION public.update_teacher_profile_self_atomic(
  p_full_name TEXT,
  p_phone TEXT,
  p_designation TEXT,
  p_coaching_center_name TEXT,
  p_public_contact_info TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
    AND role = 'TEACHER'
    AND account_status = 'ACTIVE'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: Active teacher required.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET full_name = p_full_name,
      phone = p_phone
  WHERE id = v_profile_id;

  INSERT INTO public.teacher_profiles (
    profile_id,
    designation,
    coaching_center_name,
    public_contact_info
  )
  VALUES (
    v_profile_id,
    p_designation,
    p_coaching_center_name,
    p_public_contact_info
  )
  ON CONFLICT (profile_id)
  DO UPDATE SET
    designation = EXCLUDED.designation,
    coaching_center_name = EXCLUDED.coaching_center_name,
    public_contact_info = EXCLUDED.public_contact_info;

  RETURN jsonb_build_object('profile_id', v_profile_id);
END;
$$;
CREATE OR REPLACE FUNCTION public.update_student_profile_by_teacher_atomic(
  p_student_id UUID,
  p_student_code TEXT,
  p_full_name TEXT,
  p_phone TEXT,
  p_account_status public.account_status,
  p_academic_level TEXT,
  p_institution TEXT,
  p_guardian_name TEXT,
  p_guardian_phone TEXT,
  p_address TEXT,
  p_date_of_birth DATE,
  p_registration_status public.registration_status,
  p_teacher_note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.student_profiles%ROWTYPE;
  v_profile_role public.user_role;
BEGIN
  IF NOT public.is_active_teacher() THEN
    RAISE EXCEPTION 'Unauthorized: Active teacher required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_student
  FROM public.student_profiles
  WHERE id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student record not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT role INTO v_profile_role
  FROM public.profiles
  WHERE id = v_student.profile_id
  FOR UPDATE;

  IF v_profile_role <> 'STUDENT' THEN
    RAISE EXCEPTION 'Target profile is not a student.' USING ERRCODE = '23514';
  END IF;

  IF p_student_code IS DISTINCT FROM v_student.student_code THEN
    PERFORM set_config('public.bypass_student_code_immutability', 'true', true);
  END IF;

  UPDATE public.profiles
  SET full_name = p_full_name,
      phone = p_phone,
      account_status = p_account_status
  WHERE id = v_student.profile_id;

  UPDATE public.student_profiles
  SET student_code = p_student_code,
      academic_level = p_academic_level,
      institution = p_institution,
      guardian_name = p_guardian_name,
      guardian_phone = p_guardian_phone,
      address = p_address,
      date_of_birth = p_date_of_birth,
      registration_status = p_registration_status,
      teacher_note = p_teacher_note
  WHERE id = p_student_id;

  RETURN jsonb_build_object('student_id', p_student_id, 'profile_id', v_student.profile_id);
END;
$$;
-- -------------------------------------------------------------------------
-- 8. RPC execution privileges
-- -------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.save_exam_results_draft_atomic(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_enrollment_atomic(UUID, UUID, public.enrollment_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_enrollment_status_atomic(UUID, public.enrollment_status, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_student_profile_self_atomic(TEXT, TEXT, TEXT, TEXT, DATE) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_teacher_profile_self_atomic(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_student_profile_by_teacher_atomic(UUID, TEXT, TEXT, TEXT, public.account_status, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, public.registration_status, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_exam_results_draft_atomic(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_enrollment_atomic(UUID, UUID, public.enrollment_status) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_enrollment_status_atomic(UUID, public.enrollment_status, TEXT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_student_profile_self_atomic(TEXT, TEXT, TEXT, TEXT, DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_teacher_profile_self_atomic(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_student_profile_by_teacher_atomic(UUID, TEXT, TEXT, TEXT, public.account_status, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, public.registration_status, TEXT) TO authenticated, service_role;
