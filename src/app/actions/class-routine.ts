"use server";

import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { requireTeacher } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  classSessionSchema,
  isValidClassSessionStatusTransition,
  type ClassSessionStatus,
} from "@/lib/validations/class-routine";

export type ClassRoutineActionResult =
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

function classRoutineDatabaseMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505") {
    return "This batch already has a class during the selected time.";
  }
  if (error.code === "23514" || error.code === "42501") {
    return error.message || "This change conflicts with the class routine workflow.";
  }
  if (error.code === "23503") {
    return "A linked batch, subject, or syllabus unit could not be found.";
  }
  return error.message || "The class routine entry could not be saved.";
}

function revalidateRoutinePaths(batchId?: string, sessionId?: string) {
  revalidatePath("/teacher/routine");
  revalidatePath("/student/routine");
  revalidatePath("/student");
  if (batchId) {
    revalidatePath(`/teacher/academic/${batchId}`);
    revalidatePath(`/student/batches/${batchId}`);
    revalidatePath(`/student/batches/${batchId}/academics`);
  }
  if (sessionId) revalidatePath(`/teacher/routine/${sessionId}/edit`);
}

async function validateAcademicLinks(
  admin: ReturnType<typeof createAdminClient>,
  batchId: string,
  subjectId: string,
  unitId?: string | null
) {
  const [{ data: batch, error: batchError }, { data: subject, error: subjectError }] =
    await Promise.all([
      admin.from("batches").select("id,name,status").eq("id", batchId).single(),
      admin
        .from("batch_subjects")
        .select("id,batch_id,name,status")
        .eq("id", subjectId)
        .eq("batch_id", batchId)
        .single(),
    ]);

  if (batchError || !batch) {
    return { success: false as const, message: "The selected batch was not found." };
  }
  if (["ARCHIVED", "CANCELLED"].includes(batch.status)) {
    return { success: false as const, message: "Classes cannot be scheduled for an archived or cancelled batch." };
  }
  if (subjectError || !subject) {
    return { success: false as const, message: "The subject does not belong to the selected batch." };
  }
  if (subject.status === "ARCHIVED") {
    return { success: false as const, message: "Classes cannot be scheduled for an archived subject." };
  }

  if (unitId) {
    const { data: unit, error: unitError } = await admin
      .from("subject_units")
      .select("id,subject_id")
      .eq("id", unitId)
      .eq("subject_id", subjectId)
      .single();
    if (unitError || !unit) {
      return { success: false as const, message: "The syllabus unit does not belong to the selected subject." };
    }
  }

  return { success: true as const, batch, subject };
}

async function notifyEnrolledStudents(
  admin: ReturnType<typeof createAdminClient>,
  session: {
    id: string;
    batch_id: string;
    title: string;
    starts_at: string;
    status: string;
  },
  kind: "CREATED" | "UPDATED" | "STATUS"
) {
  const { data: enrollments } = await admin
    .from("enrollments")
    .select("student:student_profiles(profile_id)")
    .eq("batch_id", session.batch_id)
    .eq("status", "ACTIVE");

  const profileIds = Array.from(
    new Set(
      (enrollments || []).flatMap((row) => {
        const relation = row.student as unknown as
          | { profile_id: string }
          | { profile_id: string }[]
          | null;
        if (!relation) return [];
        const profileId = Array.isArray(relation)
          ? relation[0]?.profile_id
          : relation.profile_id;
        return profileId ? [profileId] : [];
      })
    )
  );
  if (!profileIds.length) return;

  const scheduleText = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date(session.starts_at));
  const title = session.status === "CANCELLED"
    ? "Class cancelled"
    : session.status === "COMPLETED"
      ? "Class completed"
      : kind === "CREATED"
        ? "New class scheduled"
        : "Class routine updated";
  const message = session.status === "CANCELLED"
    ? `${session.title} scheduled for ${scheduleText} has been cancelled.`
    : session.status === "COMPLETED"
      ? `${session.title} has been marked completed.`
      : `${session.title} is scheduled for ${scheduleText}.`;

  await admin.from("notifications").insert(
    profileIds.map((profileId) => ({
      user_id: profileId,
      type: `CLASS_SESSION_${session.status}`,
      title,
      message,
      related_entity_type: "academic_class_sessions",
      related_entity_id: session.id,
    }))
  );
}

function parseClassSessionForm(formData: FormData) {
  return classSessionSchema.safeParse({
    batchId: formData.get("batchId"),
    subjectId: formData.get("subjectId"),
    unitId: formData.get("unitId"),
    title: formData.get("title"),
    sessionType: formData.get("sessionType") || "REGULAR",
    status: formData.get("status") || "SCHEDULED",
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    location: formData.get("location"),
    classLink: formData.get("classLink"),
    studentNote: formData.get("studentNote"),
  });
}

export async function createClassSessionAction(
  formData: FormData
): Promise<ClassRoutineActionResult> {
  try {
    const { profile } = await requireTeacher();
    const parsed = parseClassSessionForm(formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Please review the highlighted class information.",
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

    const { data: session, error } = await admin
      .from("academic_class_sessions")
      .insert({
        batch_id: parsed.data.batchId,
        subject_id: parsed.data.subjectId,
        unit_id: nullable(parsed.data.unitId),
        title: parsed.data.title,
        session_type: parsed.data.sessionType,
        status: parsed.data.status,
        starts_at: dhakaLocalToIso(parsed.data.startsAt),
        ends_at: dhakaLocalToIso(parsed.data.endsAt),
        location: nullable(parsed.data.location),
        class_link: nullable(parsed.data.classLink),
        student_note: nullable(parsed.data.studentNote),
        created_by: profile.id,
        updated_by: profile.id,
      })
      .select("id,batch_id,title,starts_at,status")
      .single();

    if (error || !session) {
      return { success: false, message: classRoutineDatabaseMessage(error || {}) };
    }
    await notifyEnrolledStudents(admin, session, "CREATED");
    await createAuditLog({
      actorProfileId: profile.id,
      action: "ACADEMIC_CLASS_SESSION_CREATED",
      entityType: "academic_class_sessions",
      entityId: session.id,
      newValue: session,
    });
    revalidateRoutinePaths(session.batch_id, session.id);
    return { success: true, message: "Class added to the academic routine.", entityId: session.id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to create the class session.",
    };
  }
}

export async function updateClassSessionAction(
  sessionId: string,
  formData: FormData
): Promise<ClassRoutineActionResult> {
  try {
    const { profile } = await requireTeacher();
    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from("academic_class_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();
    if (fetchError || !existing) return { success: false, message: "Class session not found." };

    const parsed = parseClassSessionForm(formData);
    if (!parsed.success) {
      return {
        success: false,
        message: "Please review the highlighted class information.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }
    if (!isValidClassSessionStatusTransition(existing.status, parsed.data.status)) {
      return {
        success: false,
        message: `Class status cannot move from ${existing.status} to ${parsed.data.status}.`,
      };
    }

    const links = await validateAcademicLinks(
      admin,
      parsed.data.batchId,
      parsed.data.subjectId,
      nullable(parsed.data.unitId)
    );
    if (!links.success) return links;

    const { data: session, error } = await admin
      .from("academic_class_sessions")
      .update({
        batch_id: parsed.data.batchId,
        subject_id: parsed.data.subjectId,
        unit_id: nullable(parsed.data.unitId),
        title: parsed.data.title,
        session_type: parsed.data.sessionType,
        status: parsed.data.status,
        starts_at: dhakaLocalToIso(parsed.data.startsAt),
        ends_at: dhakaLocalToIso(parsed.data.endsAt),
        location: nullable(parsed.data.location),
        class_link: nullable(parsed.data.classLink),
        student_note: nullable(parsed.data.studentNote),
        updated_by: profile.id,
      })
      .eq("id", sessionId)
      .select("id,batch_id,title,starts_at,status")
      .single();
    if (error || !session) {
      return { success: false, message: classRoutineDatabaseMessage(error || {}) };
    }

    await notifyEnrolledStudents(admin, session, "UPDATED");
    await createAuditLog({
      actorProfileId: profile.id,
      action: "ACADEMIC_CLASS_SESSION_UPDATED",
      entityType: "academic_class_sessions",
      entityId: session.id,
      oldValue: existing,
      newValue: session,
    });
    revalidateRoutinePaths(session.batch_id, session.id);
    if (existing.batch_id !== session.batch_id) revalidateRoutinePaths(existing.batch_id);
    return { success: true, message: "Class routine updated.", entityId: session.id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to update the class session.",
    };
  }
}

export async function updateClassSessionStatusAction(
  sessionId: string,
  nextStatus: ClassSessionStatus
): Promise<ClassRoutineActionResult> {
  try {
    const { profile } = await requireTeacher();
    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from("academic_class_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();
    if (fetchError || !existing) return { success: false, message: "Class session not found." };
    if (!isValidClassSessionStatusTransition(existing.status, nextStatus)) {
      return { success: false, message: `Class status cannot move from ${existing.status} to ${nextStatus}.` };
    }

    const { data: session, error } = await admin
      .from("academic_class_sessions")
      .update({ status: nextStatus, updated_by: profile.id })
      .eq("id", sessionId)
      .select("id,batch_id,title,starts_at,status")
      .single();
    if (error || !session) {
      return { success: false, message: classRoutineDatabaseMessage(error || {}) };
    }

    await notifyEnrolledStudents(admin, session, "STATUS");
    await createAuditLog({
      actorProfileId: profile.id,
      action: "ACADEMIC_CLASS_SESSION_STATUS_CHANGED",
      entityType: "academic_class_sessions",
      entityId: session.id,
      oldValue: { status: existing.status },
      newValue: { status: session.status },
    });
    revalidateRoutinePaths(session.batch_id, session.id);
    return { success: true, message: `Class marked ${nextStatus.toLowerCase()}.`, entityId: session.id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to update class status.",
    };
  }
}
