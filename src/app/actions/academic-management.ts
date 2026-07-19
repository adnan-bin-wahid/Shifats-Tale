"use server";

import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { requireTeacher } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  batchSubjectSchema,
  isValidSubjectStatusTransition,
  isValidSubjectUnitStatusTransition,
  subjectStatuses,
  subjectUnitSchema,
  subjectUnitStatuses,
  type SubjectStatus,
  type SubjectUnitStatus,
} from "@/lib/validations/academic";

export type AcademicActionResult =
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

function databaseMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505") {
    if (error.message?.includes("subject_units_subject_sequence_key")) {
      return "Another syllabus unit already uses this sequence number.";
    }
    return "A subject with this code already exists in the selected batch.";
  }
  if (error.code === "23503") {
    return "This item is linked to other academic records and cannot be removed.";
  }
  if (error.code === "23514") {
    return error.message || "This change conflicts with an academic workflow rule.";
  }
  return error.message || "The academic record could not be saved.";
}

function revalidateAcademicWorkspace(batchId: string) {
  revalidatePath("/teacher/academic");
  revalidatePath(`/teacher/academic/${batchId}`);
  revalidatePath(`/teacher/batches/${batchId}`);
  revalidatePath(`/teacher/batches/${batchId}/exams`);
  revalidatePath(`/student/batches/${batchId}`);
  revalidatePath(`/student/batches/${batchId}/exams`);
  revalidatePath("/student");
}

export async function createBatchSubjectAction(
  formData: FormData
): Promise<AcademicActionResult> {
  try {
    const { profile } = await requireTeacher();
    const parsed = batchSubjectSchema.safeParse({
      batchId: formData.get("batchId"),
      name: formData.get("name"),
      code: formData.get("code"),
      description: formData.get("description"),
      status: formData.get("status") || "DRAFT",
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      themeKey: formData.get("themeKey") || "NAVY",
      displayOrder: formData.get("displayOrder") || 0,
      weight: formData.get("weight") || 1,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: "Please review the highlighted subject information.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const admin = createAdminClient();
    const { data: batch, error: batchError } = await admin
      .from("batches")
      .select("id, status")
      .eq("id", parsed.data.batchId)
      .single();

    if (batchError || !batch) {
      return { success: false, message: "The selected batch was not found." };
    }
    if (["ARCHIVED", "CANCELLED"].includes(batch.status)) {
      return {
        success: false,
        message: "New subjects cannot be added to an archived or cancelled batch.",
      };
    }

    const { data: subject, error } = await admin
      .from("batch_subjects")
      .insert({
        batch_id: parsed.data.batchId,
        name: parsed.data.name,
        code: parsed.data.code,
        description: nullable(parsed.data.description),
        status: parsed.data.status,
        start_date: nullable(parsed.data.startDate),
        end_date: nullable(parsed.data.endDate),
        theme_key: parsed.data.themeKey,
        display_order: parsed.data.displayOrder,
        weight: parsed.data.weight,
        is_default: false,
        created_by: profile.id,
        updated_by: profile.id,
      })
      .select("id, batch_id, name, code, status")
      .single();

    if (error || !subject) {
      return { success: false, message: databaseMessage(error || {}) };
    }

    await createAuditLog({
      actorProfileId: profile.id,
      action: "ACADEMIC_SUBJECT_CREATED",
      entityType: "batch_subjects",
      entityId: subject.id,
      newValue: subject,
    });

    revalidateAcademicWorkspace(subject.batch_id);
    return {
      success: true,
      message: `${subject.name} was added to the academic plan.`,
      entityId: subject.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to create subject.",
    };
  }
}

export async function updateBatchSubjectAction(
  subjectId: string,
  formData: FormData
): Promise<AcademicActionResult> {
  try {
    const { profile } = await requireTeacher();
    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from("batch_subjects")
      .select("*")
      .eq("id", subjectId)
      .single();

    if (fetchError || !existing) {
      return { success: false, message: "Subject not found." };
    }

    const parsed = batchSubjectSchema.safeParse({
      batchId: existing.batch_id,
      name: formData.get("name"),
      code: formData.get("code"),
      description: formData.get("description"),
      status: formData.get("status") || existing.status,
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      themeKey: formData.get("themeKey") || existing.theme_key,
      displayOrder: formData.get("displayOrder") ?? existing.display_order,
      weight: formData.get("weight") ?? existing.weight,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: "Please review the highlighted subject information.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    if (
      !isValidSubjectStatusTransition(
        existing.status as SubjectStatus,
        parsed.data.status
      )
    ) {
      return {
        success: false,
        message: `Subject status cannot move from ${existing.status} to ${parsed.data.status}.`,
      };
    }

    const { data: updated, error } = await admin
      .from("batch_subjects")
      .update({
        name: parsed.data.name,
        code: parsed.data.code,
        description: nullable(parsed.data.description),
        status: parsed.data.status,
        start_date: nullable(parsed.data.startDate),
        end_date: nullable(parsed.data.endDate),
        theme_key: parsed.data.themeKey,
        display_order: parsed.data.displayOrder,
        weight: parsed.data.weight,
        updated_by: profile.id,
      })
      .eq("id", subjectId)
      .select("id, batch_id, name, code, status")
      .single();

    if (error || !updated) {
      return { success: false, message: databaseMessage(error || {}) };
    }

    await createAuditLog({
      actorProfileId: profile.id,
      action: "ACADEMIC_SUBJECT_UPDATED",
      entityType: "batch_subjects",
      entityId: subjectId,
      oldValue: existing,
      newValue: updated,
    });

    revalidateAcademicWorkspace(existing.batch_id);
    return { success: true, message: "Subject details were updated." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to update subject.",
    };
  }
}

export async function updateBatchSubjectStatusAction(
  subjectId: string,
  nextStatus: string
): Promise<AcademicActionResult> {
  try {
    const { profile } = await requireTeacher();
    if (!subjectStatuses.includes(nextStatus as SubjectStatus)) {
      return { success: false, message: "Unknown subject status." };
    }

    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from("batch_subjects")
      .select("id, batch_id, name, status")
      .eq("id", subjectId)
      .single();

    if (fetchError || !existing) {
      return { success: false, message: "Subject not found." };
    }

    if (
      !isValidSubjectStatusTransition(
        existing.status as SubjectStatus,
        nextStatus as SubjectStatus
      )
    ) {
      return {
        success: false,
        message: `Subject status cannot move from ${existing.status} to ${nextStatus}.`,
      };
    }

    const { data: updated, error } = await admin
      .from("batch_subjects")
      .update({ status: nextStatus as SubjectStatus, updated_by: profile.id })
      .eq("id", subjectId)
      .select("id, status")
      .single();

    if (error || !updated) {
      return { success: false, message: databaseMessage(error || {}) };
    }

    await createAuditLog({
      actorProfileId: profile.id,
      action: "ACADEMIC_SUBJECT_STATUS_CHANGED",
      entityType: "batch_subjects",
      entityId: subjectId,
      oldValue: { status: existing.status },
      newValue: { status: updated.status },
    });

    revalidateAcademicWorkspace(existing.batch_id);
    return {
      success: true,
      message: `${existing.name} is now ${updated.status.toLowerCase()}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to update status.",
    };
  }
}

export async function deleteEmptyBatchSubjectAction(
  subjectId: string
): Promise<AcademicActionResult> {
  try {
    const { profile } = await requireTeacher();
    const admin = createAdminClient();
    const { data: subject, error: fetchError } = await admin
      .from("batch_subjects")
      .select("id, batch_id, name, is_default")
      .eq("id", subjectId)
      .single();

    if (fetchError || !subject) {
      return { success: false, message: "Subject not found." };
    }
    if (subject.is_default) {
      return {
        success: false,
        message: "The default subject preserves legacy batch data and cannot be deleted.",
      };
    }

    const [units, exams, materials, announcements] = await Promise.all([
      admin.from("subject_units").select("id", { count: "exact", head: true }).eq("subject_id", subjectId),
      admin.from("exams").select("id", { count: "exact", head: true }).eq("subject_id", subjectId),
      admin.from("batch_contents").select("id", { count: "exact", head: true }).eq("subject_id", subjectId),
      admin.from("announcements").select("id", { count: "exact", head: true }).eq("subject_id", subjectId),
    ]);

    const linkedCount =
      (units.count || 0) +
      (exams.count || 0) +
      (materials.count || 0) +
      (announcements.count || 0);
    if (linkedCount > 0) {
      return {
        success: false,
        message: "Only an empty subject can be deleted. Archive this subject to preserve its academic history.",
      };
    }

    const { error } = await admin.from("batch_subjects").delete().eq("id", subjectId);
    if (error) {
      return { success: false, message: databaseMessage(error) };
    }

    await createAuditLog({
      actorProfileId: profile.id,
      action: "ACADEMIC_SUBJECT_DELETED",
      entityType: "batch_subjects",
      entityId: subjectId,
      oldValue: subject,
    });

    revalidateAcademicWorkspace(subject.batch_id);
    return { success: true, message: `${subject.name} was removed.` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to delete subject.",
    };
  }
}

export async function createSubjectUnitAction(
  formData: FormData
): Promise<AcademicActionResult> {
  try {
    const { profile } = await requireTeacher();
    const parsed = subjectUnitSchema.safeParse({
      subjectId: formData.get("subjectId"),
      title: formData.get("title"),
      description: formData.get("description"),
      unitType: formData.get("unitType") || "CHAPTER",
      status: formData.get("status") || "PLANNED",
      sequenceNo: formData.get("sequenceNo"),
      weight: formData.get("weight") || 1,
      plannedStartDate: formData.get("plannedStartDate"),
      plannedEndDate: formData.get("plannedEndDate"),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: "Please review the syllabus unit information.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const admin = createAdminClient();
    const { data: subject, error: subjectError } = await admin
      .from("batch_subjects")
      .select("id, batch_id, status")
      .eq("id", parsed.data.subjectId)
      .single();

    if (subjectError || !subject) {
      return { success: false, message: "Subject not found." };
    }
    if (subject.status === "ARCHIVED") {
      return { success: false, message: "Archived subjects cannot receive new syllabus units." };
    }

    const { data: unit, error } = await admin
      .from("subject_units")
      .insert({
        subject_id: parsed.data.subjectId,
        title: parsed.data.title,
        description: nullable(parsed.data.description),
        unit_type: parsed.data.unitType,
        status: parsed.data.status,
        sequence_no: parsed.data.sequenceNo,
        weight: parsed.data.weight,
        planned_start_date: nullable(parsed.data.plannedStartDate),
        planned_end_date: nullable(parsed.data.plannedEndDate),
        created_by: profile.id,
        updated_by: profile.id,
      })
      .select("id, subject_id, title, status")
      .single();

    if (error || !unit) {
      return { success: false, message: databaseMessage(error || {}) };
    }

    await createAuditLog({
      actorProfileId: profile.id,
      action: "SYLLABUS_UNIT_CREATED",
      entityType: "subject_units",
      entityId: unit.id,
      newValue: unit,
    });

    revalidateAcademicWorkspace(subject.batch_id);
    return {
      success: true,
      message: `${unit.title} was added to the syllabus.`,
      entityId: unit.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to create syllabus unit.",
    };
  }
}

export async function updateSubjectUnitAction(
  unitId: string,
  formData: FormData
): Promise<AcademicActionResult> {
  try {
    const { profile } = await requireTeacher();
    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from("subject_units")
      .select("*, subject:batch_subjects(batch_id)")
      .eq("id", unitId)
      .single();

    if (fetchError || !existing) {
      return { success: false, message: "Syllabus unit not found." };
    }

    const parsed = subjectUnitSchema.safeParse({
      subjectId: existing.subject_id,
      title: formData.get("title"),
      description: formData.get("description"),
      unitType: formData.get("unitType") || existing.unit_type,
      status: formData.get("status") || existing.status,
      sequenceNo: formData.get("sequenceNo") ?? existing.sequence_no,
      weight: formData.get("weight") ?? existing.weight,
      plannedStartDate: formData.get("plannedStartDate"),
      plannedEndDate: formData.get("plannedEndDate"),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: "Please review the syllabus unit information.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    if (
      !isValidSubjectUnitStatusTransition(
        existing.status as SubjectUnitStatus,
        parsed.data.status
      )
    ) {
      return {
        success: false,
        message: `Unit status cannot move from ${existing.status} to ${parsed.data.status}.`,
      };
    }

    const { data: updated, error } = await admin
      .from("subject_units")
      .update({
        title: parsed.data.title,
        description: nullable(parsed.data.description),
        unit_type: parsed.data.unitType,
        status: parsed.data.status,
        sequence_no: parsed.data.sequenceNo,
        weight: parsed.data.weight,
        planned_start_date: nullable(parsed.data.plannedStartDate),
        planned_end_date: nullable(parsed.data.plannedEndDate),
        updated_by: profile.id,
      })
      .eq("id", unitId)
      .select("id, title, status")
      .single();

    if (error || !updated) {
      return { success: false, message: databaseMessage(error || {}) };
    }

    await createAuditLog({
      actorProfileId: profile.id,
      action: "SYLLABUS_UNIT_UPDATED",
      entityType: "subject_units",
      entityId: unitId,
      oldValue: existing,
      newValue: updated,
    });

    const relation = existing.subject as { batch_id?: string } | null;
    if (relation?.batch_id) revalidateAcademicWorkspace(relation.batch_id);
    return { success: true, message: "Syllabus unit was updated." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to update syllabus unit.",
    };
  }
}

export async function updateSubjectUnitStatusAction(
  unitId: string,
  nextStatus: string
): Promise<AcademicActionResult> {
  try {
    const { profile } = await requireTeacher();
    if (!subjectUnitStatuses.includes(nextStatus as SubjectUnitStatus)) {
      return { success: false, message: "Unknown syllabus status." };
    }

    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from("subject_units")
      .select("id, subject_id, title, status, subject:batch_subjects(batch_id)")
      .eq("id", unitId)
      .single();

    if (fetchError || !existing) {
      return { success: false, message: "Syllabus unit not found." };
    }
    if (
      !isValidSubjectUnitStatusTransition(
        existing.status as SubjectUnitStatus,
        nextStatus as SubjectUnitStatus
      )
    ) {
      return {
        success: false,
        message: `Unit status cannot move from ${existing.status} to ${nextStatus}.`,
      };
    }

    const { data: updated, error } = await admin
      .from("subject_units")
      .update({ status: nextStatus as SubjectUnitStatus, updated_by: profile.id })
      .eq("id", unitId)
      .select("id, status")
      .single();

    if (error || !updated) {
      return { success: false, message: databaseMessage(error || {}) };
    }

    await createAuditLog({
      actorProfileId: profile.id,
      action: "SYLLABUS_UNIT_STATUS_CHANGED",
      entityType: "subject_units",
      entityId: unitId,
      oldValue: { status: existing.status },
      newValue: { status: updated.status },
    });

    const relation = existing.subject as { batch_id?: string } | null;
    if (relation?.batch_id) revalidateAcademicWorkspace(relation.batch_id);
    return {
      success: true,
      message: `${existing.title} is now ${updated.status.toLowerCase()}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to update status.",
    };
  }
}

export async function deleteSubjectUnitAction(
  unitId: string
): Promise<AcademicActionResult> {
  try {
    const { profile } = await requireTeacher();
    const admin = createAdminClient();
    const { data: unit, error: fetchError } = await admin
      .from("subject_units")
      .select("id, title, subject:batch_subjects(batch_id)")
      .eq("id", unitId)
      .single();

    if (fetchError || !unit) {
      return { success: false, message: "Syllabus unit not found." };
    }

    const { error } = await admin.from("subject_units").delete().eq("id", unitId);
    if (error) {
      return { success: false, message: databaseMessage(error) };
    }

    await createAuditLog({
      actorProfileId: profile.id,
      action: "SYLLABUS_UNIT_DELETED",
      entityType: "subject_units",
      entityId: unitId,
      oldValue: unit,
    });

    const relation = unit.subject as { batch_id?: string } | null;
    if (relation?.batch_id) revalidateAcademicWorkspace(relation.batch_id);
    return { success: true, message: `${unit.title} was removed from the syllabus.` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to delete syllabus unit.",
    };
  }
}
