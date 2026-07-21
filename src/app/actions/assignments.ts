"use server";

import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import {
  requireActiveEnrollment,
  requireTeacher,
} from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  assignmentReviewSchema,
  assignmentSchema,
  assignmentStatuses,
  isValidAssignmentStatusTransition,
  studentSubmissionSchema,
  type AssignmentStatus,
} from "@/lib/validations/assignments";

export type AssignmentActionResult =
  | { success: true; message: string; entityId?: string }
  | {
      success: false;
      message: string;
      errors?: Record<string, string[] | undefined>;
    };

function nullable(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function dhakaLocalToIso(value: string) {
  if (/Z$|[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value).toISOString();
  }
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${withSeconds}+06:00`).toISOString();
}

function assignmentDatabaseMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505") {
    return "This student already has a submission for the assignment.";
  }
  if (error.code === "23514" || error.code === "42501") {
    return error.message || "This change conflicts with the assignment workflow.";
  }
  if (error.code === "23503") {
    return "A linked batch, subject, unit, or enrollment could not be found.";
  }
  return error.message || "The assignment record could not be saved.";
}

function revalidateAssignmentPaths(batchId?: string, assignmentId?: string) {
  revalidatePath("/teacher/assignments");
  revalidatePath("/student/assignments");
  revalidatePath("/student");
  if (batchId) {
    revalidatePath(`/teacher/academic/${batchId}`);
    revalidatePath(`/student/batches/${batchId}`);
  }
  if (assignmentId) {
    revalidatePath(`/teacher/assignments/${assignmentId}`);
    revalidatePath(`/student/assignments/${assignmentId}`);
  }
}

async function validateAcademicLinks(
  admin: ReturnType<typeof createAdminClient>,
  batchId: string,
  subjectId: string,
  unitId?: string | null
) {
  const { data: subject, error: subjectError } = await admin
    .from("batch_subjects")
    .select("id, batch_id, name, status")
    .eq("id", subjectId)
    .eq("batch_id", batchId)
    .single();

  if (subjectError || !subject) {
    return { success: false as const, message: "The subject does not belong to the selected batch." };
  }
  if (subject.status === "ARCHIVED") {
    return { success: false as const, message: "Assignments cannot be added to an archived subject." };
  }

  if (unitId) {
    const { data: unit, error: unitError } = await admin
      .from("subject_units")
      .select("id, subject_id")
      .eq("id", unitId)
      .eq("subject_id", subjectId)
      .single();
    if (unitError || !unit) {
      return { success: false as const, message: "The syllabus unit does not belong to the selected subject." };
    }
  }

  return { success: true as const, subject };
}

async function notifyAssignmentPublished(
  admin: ReturnType<typeof createAdminClient>,
  assignment: { id: string; batch_id: string; title: string; due_at: string }
) {
  const { data: enrollments } = await admin
    .from("enrollments")
    .select("student:student_profiles(profile_id)")
    .eq("batch_id", assignment.batch_id)
    .eq("status", "ACTIVE");

  const dueText = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date(assignment.due_at));

  const profileIds = Array.from(
    new Set(
      (enrollments || []).flatMap((row) => {
        const relation = row.student as unknown as
          | { profile_id: string }
          | { profile_id: string }[]
          | null;
        if (!relation) return [];
        return [Array.isArray(relation) ? relation[0]?.profile_id : relation.profile_id].filter(
          Boolean
        ) as string[];
      })
    )
  );

  if (!profileIds.length) return;
  await admin.from("notifications").insert(
    profileIds.map((profileId) => ({
      user_id: profileId,
      type: "ASSIGNMENT_PUBLISHED",
      title: "New assignment published",
      message: `${assignment.title} is due ${dueText}.`,
      related_entity_type: "academic_assignments",
      related_entity_id: assignment.id,
    }))
  );
}

function parseAssignmentForm(formData: FormData) {
  return assignmentSchema.safeParse({
    batchId: formData.get("batchId"),
    subjectId: formData.get("subjectId"),
    unitId: formData.get("unitId"),
    title: formData.get("title"),
    description: formData.get("description"),
    instructions: formData.get("instructions"),
    assignmentType: formData.get("assignmentType") || "HOMEWORK",
    status: formData.get("status") || "DRAFT",
    assignedAt: formData.get("assignedAt"),
    dueAt: formData.get("dueAt"),
    totalMarks: formData.get("totalMarks") || 10,
    allowLateSubmission: formData.has("allowLateSubmission"),
    resourceUrl: formData.get("resourceUrl"),
  });
}

export async function createAssignmentAction(
  formData: FormData
): Promise<AssignmentActionResult> {
  try {
    const { profile } = await requireTeacher();
    const parsed = parseAssignmentForm(formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Please review the highlighted assignment information.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const admin = createAdminClient();
    const links = await validateAcademicLinks(
      admin,
      parsed.data.batchId,
      parsed.data.subjectId,
      nullable(parsed.data.unitId)
    );
    if (!links.success) return links;

    const { data: assignment, error } = await admin
      .from("academic_assignments")
      .insert({
        batch_id: parsed.data.batchId,
        subject_id: parsed.data.subjectId,
        unit_id: nullable(parsed.data.unitId),
        title: parsed.data.title,
        description: nullable(parsed.data.description),
        instructions: nullable(parsed.data.instructions),
        assignment_type: parsed.data.assignmentType,
        status: parsed.data.status,
        assigned_at: dhakaLocalToIso(parsed.data.assignedAt),
        due_at: dhakaLocalToIso(parsed.data.dueAt),
        total_marks: parsed.data.totalMarks,
        allow_late_submission: parsed.data.allowLateSubmission,
        resource_url: nullable(parsed.data.resourceUrl),
        created_by: profile.id,
        updated_by: profile.id,
      })
      .select("id, batch_id, title, status, due_at")
      .single();

    if (error || !assignment) {
      return { success: false, message: assignmentDatabaseMessage(error || {}) };
    }

    if (assignment.status === "PUBLISHED") {
      await notifyAssignmentPublished(admin, assignment);
    }
    await createAuditLog({
      actorProfileId: profile.id,
      action: "ACADEMIC_ASSIGNMENT_CREATED",
      entityType: "academic_assignments",
      entityId: assignment.id,
      newValue: assignment,
    });
    revalidateAssignmentPaths(assignment.batch_id, assignment.id);
    return {
      success: true,
      message: assignment.status === "PUBLISHED"
        ? "Assignment published and students were notified."
        : "Assignment draft created.",
      entityId: assignment.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to create assignment.",
    };
  }
}

export async function updateAssignmentAction(
  assignmentId: string,
  formData: FormData
): Promise<AssignmentActionResult> {
  try {
    const { profile } = await requireTeacher();
    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from("academic_assignments")
      .select("*")
      .eq("id", assignmentId)
      .single();
    if (fetchError || !existing) {
      return { success: false, message: "Assignment not found." };
    }

    const parsed = parseAssignmentForm(formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Please review the highlighted assignment information.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }
    if (
      !isValidAssignmentStatusTransition(
        existing.status,
        parsed.data.status
      )
    ) {
      return {
        success: false,
        message: `Assignment status cannot move from ${existing.status} to ${parsed.data.status}.`,
      };
    }

    const links = await validateAcademicLinks(
      admin,
      parsed.data.batchId,
      parsed.data.subjectId,
      nullable(parsed.data.unitId)
    );
    if (!links.success) return links;

    const { data: updated, error } = await admin
      .from("academic_assignments")
      .update({
        batch_id: parsed.data.batchId,
        subject_id: parsed.data.subjectId,
        unit_id: nullable(parsed.data.unitId),
        title: parsed.data.title,
        description: nullable(parsed.data.description),
        instructions: nullable(parsed.data.instructions),
        assignment_type: parsed.data.assignmentType,
        status: parsed.data.status,
        assigned_at: dhakaLocalToIso(parsed.data.assignedAt),
        due_at: dhakaLocalToIso(parsed.data.dueAt),
        total_marks: parsed.data.totalMarks,
        allow_late_submission: parsed.data.allowLateSubmission,
        resource_url: nullable(parsed.data.resourceUrl),
        updated_by: profile.id,
      })
      .eq("id", assignmentId)
      .select("id, batch_id, title, status, due_at")
      .single();

    if (error || !updated) {
      return { success: false, message: assignmentDatabaseMessage(error || {}) };
    }
    if (existing.status !== "PUBLISHED" && updated.status === "PUBLISHED") {
      await notifyAssignmentPublished(admin, updated);
    }
    await createAuditLog({
      actorProfileId: profile.id,
      action: "ACADEMIC_ASSIGNMENT_UPDATED",
      entityType: "academic_assignments",
      entityId: assignmentId,
      oldValue: existing,
      newValue: updated,
    });
    revalidateAssignmentPaths(existing.batch_id, assignmentId);
    if (updated.batch_id !== existing.batch_id) {
      revalidateAssignmentPaths(updated.batch_id, assignmentId);
    }
    return { success: true, message: "Assignment updated successfully." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to update assignment.",
    };
  }
}

export async function updateAssignmentStatusAction(
  assignmentId: string,
  nextStatus: string
): Promise<AssignmentActionResult> {
  try {
    const { profile } = await requireTeacher();
    if (!assignmentStatuses.includes(nextStatus as AssignmentStatus)) {
      return { success: false, message: "Unknown assignment status." };
    }

    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from("academic_assignments")
      .select("id, batch_id, title, status, due_at")
      .eq("id", assignmentId)
      .single();
    if (fetchError || !existing) {
      return { success: false, message: "Assignment not found." };
    }
    if (!isValidAssignmentStatusTransition(existing.status, nextStatus as AssignmentStatus)) {
      return {
        success: false,
        message: `Assignment status cannot move from ${existing.status} to ${nextStatus}.`,
      };
    }

    const { data: updated, error } = await admin
      .from("academic_assignments")
      .update({ status: nextStatus as AssignmentStatus, updated_by: profile.id })
      .eq("id", assignmentId)
      .select("id, batch_id, title, status, due_at")
      .single();
    if (error || !updated) {
      return { success: false, message: assignmentDatabaseMessage(error || {}) };
    }
    if (existing.status !== "PUBLISHED" && updated.status === "PUBLISHED") {
      await notifyAssignmentPublished(admin, updated);
    }
    await createAuditLog({
      actorProfileId: profile.id,
      action: "ACADEMIC_ASSIGNMENT_STATUS_CHANGED",
      entityType: "academic_assignments",
      entityId: assignmentId,
      oldValue: { status: existing.status },
      newValue: { status: updated.status },
    });
    revalidateAssignmentPaths(updated.batch_id, assignmentId);
    return {
      success: true,
      message: `Assignment is now ${updated.status.toLowerCase()}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to change assignment status.",
    };
  }
}

export async function submitAssignmentAction(
  assignmentId: string,
  formData: FormData
): Promise<AssignmentActionResult> {
  try {
    const parsed = studentSubmissionSchema.safeParse({
      assignmentId,
      submissionText: formData.get("submissionText"),
      submissionUrl: formData.get("submissionUrl"),
    });
    if (!parsed.success) {
      return {
        success: false,
        message: "Please add your answer or a valid submission link.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const admin = createAdminClient();
    const { data: assignment, error: assignmentError } = await admin
      .from("academic_assignments")
      .select("id, batch_id, title, status, assigned_at, due_at, allow_late_submission")
      .eq("id", assignmentId)
      .single();
    if (assignmentError || !assignment) {
      return { success: false, message: "Assignment not found." };
    }

    const { profile, studentProfile, enrollment } = await requireActiveEnrollment(
      assignment.batch_id
    );
    const now = new Date();
    if (assignment.status !== "PUBLISHED" || new Date(assignment.assigned_at) > now) {
      return { success: false, message: "This assignment is not open for submission." };
    }
    const late = now > new Date(assignment.due_at);
    if (late && !assignment.allow_late_submission) {
      return { success: false, message: "The submission deadline has passed." };
    }

    const { data: existing } = await admin
      .from("academic_assignment_submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentProfile.id)
      .maybeSingle();
    if (existing?.status === "REVIEWED") {
      return { success: false, message: "A reviewed submission cannot be changed." };
    }

    const payload = {
      assignment_id: assignmentId,
      student_id: studentProfile.id,
      enrollment_id: enrollment.id,
      submission_text: nullable(parsed.data.submissionText),
      submission_url: nullable(parsed.data.submissionUrl),
      status: late ? ("LATE" as const) : ("SUBMITTED" as const),
      submitted_at: now.toISOString(),
    };
    const mutation = existing
      ? admin
          .from("academic_assignment_submissions")
          .update(payload)
          .eq("id", existing.id)
          .select("id, status, submitted_at")
          .single()
      : admin
          .from("academic_assignment_submissions")
          .insert(payload)
          .select("id, status, submitted_at")
          .single();
    const { data: submission, error } = await mutation;
    if (error || !submission) {
      return { success: false, message: assignmentDatabaseMessage(error || {}) };
    }

    await createAuditLog({
      actorProfileId: profile.id,
      action: existing ? "ASSIGNMENT_SUBMISSION_UPDATED" : "ASSIGNMENT_SUBMITTED",
      entityType: "academic_assignment_submissions",
      entityId: submission.id,
      oldValue: existing || null,
      newValue: submission,
    });
    revalidateAssignmentPaths(assignment.batch_id, assignmentId);
    return {
      success: true,
      message: late ? "Late submission received." : "Assignment submitted successfully.",
      entityId: submission.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to submit assignment.",
    };
  }
}

export async function reviewAssignmentSubmissionAction(
  assignmentId: string,
  formData: FormData
): Promise<AssignmentActionResult> {
  try {
    const { profile } = await requireTeacher();
    const parsed = assignmentReviewSchema.safeParse({
      submissionId: formData.get("submissionId"),
      decision: formData.get("decision"),
      marksObtained: formData.get("marksObtained"),
      feedback: formData.get("feedback"),
    });
    if (!parsed.success) {
      return {
        success: false,
        message: "Please review the grading information.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const admin = createAdminClient();
    const { data: submission, error: submissionError } = await admin
      .from("academic_assignment_submissions")
      .select("*, assignment:academic_assignments(id,batch_id,title,total_marks)")
      .eq("id", parsed.data.submissionId)
      .eq("assignment_id", assignmentId)
      .single();
    if (submissionError || !submission) {
      return { success: false, message: "Submission not found." };
    }
    const relation = submission.assignment as unknown as
      | { id: string; batch_id: string; title: string; total_marks: number }
      | { id: string; batch_id: string; title: string; total_marks: number }[];
    const assignment = Array.isArray(relation) ? relation[0] : relation;
    if (!assignment) return { success: false, message: "Assignment not found." };

    const numericMarks =
      parsed.data.marksObtained === "" || parsed.data.marksObtained == null
        ? null
        : Number(parsed.data.marksObtained);
    if (parsed.data.decision === "REVIEWED" && numericMarks == null) {
      return { success: false, message: "Marks are required when approving a submission." };
    }
    if (numericMarks != null && numericMarks > Number(assignment.total_marks)) {
      return {
        success: false,
        message: `Marks cannot exceed ${assignment.total_marks}.`,
      };
    }

    const { data: updated, error } = await admin
      .from("academic_assignment_submissions")
      .update({
        status: parsed.data.decision,
        marks_obtained: parsed.data.decision === "REVIEWED" ? numericMarks : null,
        feedback: nullable(parsed.data.feedback),
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submission.id)
      .select("id, student_id, status, marks_obtained, feedback, reviewed_at")
      .single();
    if (error || !updated) {
      return { success: false, message: assignmentDatabaseMessage(error || {}) };
    }

    const { data: student } = await admin
      .from("student_profiles")
      .select("profile_id")
      .eq("id", updated.student_id)
      .single();
    if (student?.profile_id) {
      await admin.from("notifications").insert({
        user_id: student.profile_id,
        type: parsed.data.decision === "REVIEWED"
          ? "ASSIGNMENT_REVIEWED"
          : "ASSIGNMENT_RETURNED",
        title: parsed.data.decision === "REVIEWED"
          ? "Assignment reviewed"
          : "Assignment returned for revision",
        message: parsed.data.decision === "REVIEWED"
          ? `${assignment.title}: ${numericMarks}/${assignment.total_marks}`
          : `${assignment.title} needs an update. Open it to read the feedback.`,
        related_entity_type: "academic_assignments",
        related_entity_id: assignmentId,
      });
    }
    await createAuditLog({
      actorProfileId: profile.id,
      action: parsed.data.decision === "REVIEWED"
        ? "ASSIGNMENT_SUBMISSION_REVIEWED"
        : "ASSIGNMENT_SUBMISSION_RETURNED",
      entityType: "academic_assignment_submissions",
      entityId: submission.id,
      oldValue: submission,
      newValue: updated,
    });
    revalidateAssignmentPaths(assignment.batch_id, assignmentId);
    return {
      success: true,
      message: parsed.data.decision === "REVIEWED"
        ? "Marks and feedback published to the student."
        : "Submission returned with feedback.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to review submission.",
    };
  }
}
