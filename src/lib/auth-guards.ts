if (process.env.NODE_ENV !== "test" && !process.env.NODE_TEST_CONTEXT) {
  require("server-only");
}
import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import { Database } from "../types/database.types";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Access denied.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Resolves the authenticated user session from cookie.
 * Never trust client headers or parameters.
 */
export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new UnauthorizedError();
  }
  return user;
}

/**
 * Ensures user is authenticated and has an ACTIVE profile in DB.
 */
export async function requireActiveUser() {
  const user = await requireAuthenticatedUser();
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !profile) {
    throw new UnauthorizedError("Profile not found.");
  }

  if (profile.account_status !== "ACTIVE") {
    throw new ForbiddenError("Account is inactive or disabled.");
  }

  return { user, profile };
}

/**
 * Requires an active TEACHER account.
 */
export async function requireTeacher() {
  const { user, profile } = await requireActiveUser();
  if (profile.role !== "TEACHER") {
    throw new ForbiddenError("Teacher administrative role required.");
  }
  return { user, profile };
}

/**
 * Requires an active STUDENT account.
 */
export async function requireStudent() {
  const { user, profile } = await requireActiveUser();
  if (profile.role !== "STUDENT") {
    throw new ForbiddenError("Student role required.");
  }

  const supabase = await createClient();
  const { data: studentProfile, error } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("profile_id", profile.id)
    .single();

  if (error || !studentProfile) {
    throw new ForbiddenError("Student profile details missing.");
  }

  return { user, profile, studentProfile };
}

/**
 * Requires an APPROVED student account.
 */
export async function requireActiveStudent() {
  const { user, profile, studentProfile } = await requireStudent();
  if (studentProfile.registration_status !== "APPROVED") {
    throw new ForbiddenError("Student enrollment registration is pending approval.");
  }
  return { user, profile, studentProfile };
}

/**
 * Requires student to have an ACTIVE enrollment in a given batch.
 */
export async function requireActiveEnrollment(batchId: string) {
  const { user, profile, studentProfile } = await requireActiveStudent();
  const supabase = await createClient();

  const { data: enrollment, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("student_id", studentProfile.id)
    .eq("batch_id", batchId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (error || !enrollment) {
    throw new ForbiddenError("Active enrollment in this batch is required.");
  }

  return { user, profile, studentProfile, enrollment };
}

/**
 * Direct Object Reference Protection for Student Profile detail.
 * Allows teachers or the student themselves.
 */
export async function requireStudentOwnership(studentId: string) {
  const { user, profile } = await requireActiveUser();

  if (profile.role === "TEACHER") {
    return { user, profile };
  }

  const { studentProfile } = await requireStudent();
  if (studentProfile.id !== studentId) {
    throw new ForbiddenError("Unauthorized access to this student profile.");
  }

  return { user, profile, studentProfile };
}

/**
 * Direct Object Reference Protection for Notifications.
 */
export async function requireNotificationOwnership(notificationId: string) {
  const { user, profile } = await requireActiveUser();
  const supabase = await createClient();

  const { data: notification, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", notificationId)
    .single();

  if (error || !notification) {
    throw new ForbiddenError("Notification not found.");
  }

  if (notification.user_id !== profile.id) {
    throw new ForbiddenError("Unauthorized access to this notification.");
  }

  return { user, profile, notification };
}

/**
 * Direct Object Reference Protection for Payments.
 */
export async function requirePaymentOwnership(paymentId: string) {
  const { user, profile } = await requireActiveUser();
  const admin = createAdminClient();

  const { data: payment, error } = await admin
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (error || !payment) {
    throw new ForbiddenError("Payment record not found.");
  }

  if (profile.role !== "TEACHER") {
    const { studentProfile } = await requireStudent();
    if (payment.student_id !== studentProfile.id) {
      throw new ForbiddenError("Unauthorized access to this payment record.");
    }
  }

  return { user, profile, payment };
}

/**
 * Direct Object Reference Protection for Examination Results.
 */
export async function requireResultOwnership(resultId: string) {
  const { user, profile } = await requireActiveUser();
  const admin = createAdminClient();

  const { data: result, error } = await admin
    .from("exam_results")
    .select(`
      *,
      exam:exams (
        status,
        batch_id
      )
    `)
    .eq("id", resultId)
    .single();

  if (error || !result) {
    throw new ForbiddenError("Result not found.");
  }

  if (profile.role !== "TEACHER") {
    const { studentProfile } = await requireActiveStudent();
    
    if (result.student_id !== studentProfile.id) {
      throw new ForbiddenError("Unauthorized access to this result.");
    }

    const exam = (result.exam as any);
    if (!exam || exam.status !== "RESULT_PUBLISHED") {
      throw new ForbiddenError("Result has not been published yet.");
    }

    // Verify active enrollment in batch of exam
    const { data: enrollment } = await admin
      .from("enrollments")
      .select("id")
      .eq("student_id", studentProfile.id)
      .eq("batch_id", exam.batch_id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!enrollment) {
      throw new ForbiddenError("No active enrollment in batch.");
    }
  }

  return { user, profile, result };
}

/**
 * Direct Object Reference Protection for Study Materials access.
 */
export async function requireMaterialAccess(contentId: string) {
  const { user, profile } = await requireActiveUser();
  const admin = createAdminClient();

  const { data: material, error } = await admin
    .from("batch_contents")
    .select("*")
    .eq("id", contentId)
    .single();

  if (error || !material) {
    throw new ForbiddenError("Study material not found.");
  }

  if (profile.role !== "TEACHER") {
    if (material.status !== "PUBLISHED") {
      throw new ForbiddenError("Material is not available.");
    }

    const now = new Date();
    if (material.release_at && new Date(material.release_at) > now) {
      throw new ForbiddenError("Material is not yet released.");
    }
    if (material.expires_at && new Date(material.expires_at) <= now) {
      throw new ForbiddenError("Material has expired.");
    }

    // Must have active enrollment in batch of content
    const { studentProfile } = await requireActiveStudent();
    const { data: enrollment } = await admin
      .from("enrollments")
      .select("id")
      .eq("student_id", studentProfile.id)
      .eq("batch_id", material.batch_id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!enrollment) {
      throw new ForbiddenError("No active enrollment in batch.");
    }
  }

  return { user, profile, material };
}
