"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createAuditLog } from "@/lib/audit";
import { createNotification, createNotificationForProfile } from "@/lib/notifications";
import { batchSchema } from "@/lib/validations/batch";
import { revalidatePath } from "next/cache";

async function assertActiveTeacher() {
  const { destination, profile } = await resolveAuthenticatedDestination();
  if (
    destination !== "TEACHER_DASHBOARD" ||
    !profile ||
    profile.role !== "TEACHER" ||
    profile.account_status !== "ACTIVE"
  ) {
    throw new Error("Unauthorized: Only an active teacher can perform this action.");
  }
  return profile;
}

export async function createBatchAction(rawInput: any) {
  try {
    const teacher = await assertActiveTeacher();

    // Parse and validate input
    const validated = batchSchema.safeParse(rawInput);
    if (!validated.success) {
      return { success: false, errors: validated.error.flatten().fieldErrors };
    }

    const {
      name,
      code,
      subject,
      academicLevel,
      description,
      startDate,
      endDate,
      monthlyFee,
      admissionFee,
      capacity,
      status,
      admissionOpen,
      scheduleDays,
      scheduleTime,
      coverImageUrl,
    } = validated.data;

    const admin = createAdminClient();

    // Check unique batch code
    const { data: existing } = await admin
      .from("batches")
      .select("id")
      .eq("code", code)
      .maybeSingle();

    if (existing) {
      return { success: false, message: "Duplicate batch code is rejected." };
    }

    // Generate safe slug
    const baseSlug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const slug = baseSlug.replace(/^-+|-+$/g, "");

    const schedule = {
      days: scheduleDays || "",
      time: scheduleTime || "",
    };

    // Insert batch
    const { data: newBatch, error } = await admin
      .from("batches")
      .insert({
        name,
        code,
        slug,
        subject,
        academic_level: academicLevel,
        description: description || null,
        start_date: startDate,
        end_date: endDate || null,
        schedule,
        monthly_fee: monthlyFee,
        admission_fee: admissionFee,
        capacity,
        status,
        admission_open: admissionOpen,
        cover_image_url: coverImageUrl || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    // Audit logging
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "BATCH_CREATED",
      entityType: "batches",
      entityId: newBatch.id,
      newValue: newBatch,
    });

    revalidatePath("/teacher/batches");
    return { success: true, batch: newBatch };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function updateBatchAction(batchId: string, rawInput: any) {
  try {
    const teacher = await assertActiveTeacher();

    const validated = batchSchema.safeParse(rawInput);
    if (!validated.success) {
      return { success: false, errors: validated.error.flatten().fieldErrors };
    }

    const admin = createAdminClient();

    // Fetch existing batch
    const { data: oldBatch, error: fetchError } = await admin
      .from("batches")
      .select("*")
      .eq("id", batchId)
      .single();

    if (fetchError || !oldBatch) {
      return { success: false, message: "Batch not found" };
    }

    // Restrict editing for completed/archived batches
    if (oldBatch.status === "COMPLETED" || oldBatch.status === "ARCHIVED") {
      // Allow status transitions, but block editing other fields
      if (
        oldBatch.name !== validated.data.name ||
        oldBatch.subject !== validated.data.subject ||
        oldBatch.academic_level !== validated.data.academicLevel ||
        oldBatch.monthly_fee !== validated.data.monthlyFee ||
        oldBatch.admission_fee !== validated.data.admissionFee ||
        oldBatch.capacity !== validated.data.capacity
      ) {
        return { success: false, message: "Completed or archived batches have restricted editing." };
      }
    }

    const {
      name,
      code,
      subject,
      academicLevel,
      description,
      startDate,
      endDate,
      monthlyFee,
      admissionFee,
      capacity,
      status,
      admissionOpen,
      scheduleDays,
      scheduleTime,
      coverImageUrl,
    } = validated.data;

    if (capacity !== null && capacity !== undefined) {
      const { count: activeEnrollmentCount, error: activeCountError } = await admin
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("batch_id", batchId)
        .eq("status", "ACTIVE");

      if (activeCountError) {
        return { success: false, message: "Failed to verify the active enrollment count." };
      }

      if ((activeEnrollmentCount || 0) > capacity) {
        return {
          success: false,
          message: `Capacity cannot be lower than the current active enrollment count (${activeEnrollmentCount}).`,
        };
      }
    }

    // Check unique batch code if it changed
    if (code !== oldBatch.code) {
      // Check if enrollments exist
      const { count: enrollCount } = await admin
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batchId);

      if (enrollCount && enrollCount > 0) {
        return {
          success: false,
          message: "Batch code cannot be changed after enrollments exist unless there is a strong reason and explicit confirmation.",
        };
      }

      // Check unique code
      const { data: existing } = await admin
        .from("batches")
        .select("id")
        .eq("code", code)
        .neq("id", batchId)
        .maybeSingle();

      if (existing) {
        return { success: false, message: "Duplicate batch code is rejected." };
      }
    }

    // Generate safe slug
    const baseSlug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const slug = baseSlug.replace(/^-+|-+$/g, "");

    const schedule = {
      days: scheduleDays || "",
      time: scheduleTime || "",
    };

    // Update batch
    const { data: updatedBatch, error } = await admin
      .from("batches")
      .update({
        name,
        code,
        slug,
        subject,
        academic_level: academicLevel,
        description: description || null,
        start_date: startDate,
        end_date: endDate || null,
        schedule,
        monthly_fee: monthlyFee,
        admission_fee: admissionFee,
        capacity,
        status,
        admission_open: admissionOpen,
        cover_image_url: coverImageUrl || null,
      })
      .eq("id", batchId)
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    // Audit logging
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "BATCH_EDITED",
      entityType: "batches",
      entityId: batchId,
      oldValue: oldBatch,
      newValue: updatedBatch,
    });

    revalidatePath("/teacher/batches");
    revalidatePath(`/teacher/batches/${batchId}`);
    return { success: true, batch: updatedBatch };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function updateBatchStatusAction(
  batchId: string,
  newStatus?: "DRAFT" | "OPEN" | "RUNNING" | "COMPLETED" | "ARCHIVED" | "CANCELLED",
  admissionOpen?: boolean
) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    const { data: oldBatch, error: fetchError } = await admin
      .from("batches")
      .select("*")
      .eq("id", batchId)
      .single();

    if (fetchError || !oldBatch) {
      return { success: false, message: "Batch not found" };
    }

    const updates: any = {};
    if (newStatus !== undefined) updates.status = newStatus;
    if (admissionOpen !== undefined) updates.admission_open = admissionOpen;

    const { data: updatedBatch, error } = await admin
      .from("batches")
      .update(updates)
      .eq("id", batchId)
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    await createAuditLog({
      actorProfileId: teacher.id,
      action: "BATCH_STATUS_CHANGED",
      entityType: "batches",
      entityId: batchId,
      oldValue: oldBatch,
      newValue: updatedBatch,
    });

    revalidatePath("/teacher/batches");
    revalidatePath(`/teacher/batches/${batchId}`);
    return { success: true, batch: updatedBatch };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function deleteBatchAction(batchId: string) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    // Fail closed if any dependent data exists or a dependency query fails.
    const dependencyChecks = await Promise.all([
      admin.from("enrollments").select("id", { count: "exact", head: true }).eq("batch_id", batchId),
      admin.from("payments").select("id", { count: "exact", head: true }).eq("batch_id", batchId),
      admin.from("exams").select("id", { count: "exact", head: true }).eq("batch_id", batchId),
      admin.from("batch_contents").select("id", { count: "exact", head: true }).eq("batch_id", batchId),
      admin.from("announcements").select("id", { count: "exact", head: true }).eq("batch_id", batchId),
    ]);

    if (dependencyChecks.some((result) => result.error)) {
      return { success: false, message: "Failed to verify whether the batch has dependent records." };
    }

    if (dependencyChecks.some((result) => (result.count || 0) > 0)) {
      return {
        success: false,
        message: "Cannot delete a batch containing enrollments, payments, exams, materials, announcements, or historical records.",
      };
    }

    const { data: oldBatch } = await admin
      .from("batches")
      .select("*")
      .eq("id", batchId)
      .single();

    const { error } = await admin.from("batches").delete().eq("id", batchId);
    if (error) {
      return { success: false, message: error.message };
    }

    if (oldBatch) {
      await createAuditLog({
        actorProfileId: teacher.id,
        action: "BATCH_DELETED",
        entityType: "batches",
        entityId: batchId,
        oldValue: oldBatch,
      });
    }

    revalidatePath("/teacher/batches");
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

async function recordRegistrationApprovalSideEffects(
  studentId: string,
  profileId: string,
  actorProfileId: string
) {
  await createAuditLog({
    actorProfileId,
    action: "REGISTRATION_APPROVED",
    entityType: "student_profiles",
    entityId: studentId,
    oldValue: { registration_status: "PENDING" },
    newValue: { registration_status: "APPROVED" },
  });

  await createNotificationForProfile({
    profileId,
    type: "REGISTRATION_APPROVED",
    title: "Registration Approved",
    message: "Your student registration has been approved. Welcome to Shifat's Tales!",
    relatedEntityType: "student_profiles",
    relatedEntityId: studentId,
  });
}

export async function enrollStudentAction(
  studentId: string,
  batchId: string,
  initialStatus: "PENDING" | "ACTIVE" | "DISABLED" | "COMPLETED" | "REJECTED" | "CANCELLED" = "PENDING"
) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();
    const supabase = await createClient();

    // Preserve the existing duplicate response while the database unique
    // constraint remains the final race-safe authority.
    const { data: existing, error: duplicateCheckError } = await admin
      .from("enrollments")
      .select("*")
      .eq("student_id", studentId)
      .eq("batch_id", batchId)
      .maybeSingle();

    if (duplicateCheckError) {
      return { success: false, message: duplicateCheckError.message };
    }

    if (existing) {
      return {
        success: false,
        code: "DUPLICATE",
        message: `Student is already enrolled in this batch with status: ${existing.status}`,
        enrollment: existing,
      };
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc("create_enrollment_atomic", {
      p_student_id: studentId,
      p_batch_id: batchId,
      p_initial_status: initialStatus,
    });

    if (rpcError) {
      if (rpcError.code === "23505") {
        const { data: racedExisting } = await admin
          .from("enrollments")
          .select("*")
          .eq("student_id", studentId)
          .eq("batch_id", batchId)
          .maybeSingle();
        return {
          success: false,
          code: "DUPLICATE",
          message: `Student is already enrolled in this batch${racedExisting?.status ? ` with status: ${racedExisting.status}` : "."}`,
          enrollment: racedExisting || undefined,
        };
      }
      return { success: false, message: rpcError.message };
    }

    const payload = rpcData as any;
    const enrollmentRow = payload?.enrollment;
    if (!enrollmentRow?.id) {
      return { success: false, message: "Enrollment was created but its committed record could not be resolved." };
    }

    const newEnrollment = {
      ...enrollmentRow,
      batches: { name: enrollmentRow.batch_name },
    };

    await createAuditLog({
      actorProfileId: teacher.id,
      action: "STUDENT_ADDED_TO_BATCH",
      entityType: "enrollments",
      entityId: newEnrollment.id,
      newValue: newEnrollment,
    });

    if (payload.registration_approved && payload.profile_id) {
      await recordRegistrationApprovalSideEffects(studentId, payload.profile_id, teacher.id);
    }

    if (initialStatus === "ACTIVE") {
      await createNotification({
        studentProfileId: studentId,
        type: "ENROLLMENT_ACTIVATED",
        title: "Enrollment Activated",
        message: `Your enrollment in ${newEnrollment.batches?.name || "the batch"} has been activated.`,
        relatedEntityType: "enrollments",
        relatedEntityId: newEnrollment.id,
      });
    } else {
      await createNotification({
        studentProfileId: studentId,
        type: "ENROLLMENT_PENDING",
        title: "Enrollment Pending",
        message: `You have been added to ${newEnrollment.batches?.name || "the batch"} (Pending confirmation).`,
        relatedEntityType: "enrollments",
        relatedEntityId: newEnrollment.id,
      });
    }

    revalidatePath("/teacher/students");
    revalidatePath(`/teacher/students/${studentId}`);
    revalidatePath(`/teacher/batches/${batchId}`);
    revalidatePath("/teacher/enrollments");
    revalidatePath("/student");
    revalidatePath(`/student/batches/${batchId}`);
    return { success: true, enrollment: newEnrollment };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function updateEnrollmentStatusAction({
  enrollmentId,
  newStatus,
  disableReason = null,
  explicitConfirmation = false,
}: {
  enrollmentId: string;
  newStatus: "PENDING" | "ACTIVE" | "DISABLED" | "COMPLETED" | "REJECTED" | "CANCELLED";
  disableReason?: string | null;
  explicitConfirmation?: boolean;
}) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();
    const supabase = await createClient();

    const { data: enrollment, error: fetchError } = await admin
      .from("enrollments")
      .select("*, batches(name)")
      .eq("id", enrollmentId)
      .single();

    if (fetchError || !enrollment) {
      return { success: false, message: "Enrollment not found" };
    }

    const oldStatus = enrollment.status;
    if (oldStatus === newStatus) {
      return { success: true, enrollment };
    }

    if (newStatus === "DISABLED" && (!disableReason || disableReason.trim() === "")) {
      return { success: false, message: "A reason is required to disable an enrollment." };
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc("update_enrollment_status_atomic", {
      p_enrollment_id: enrollmentId,
      p_new_status: newStatus,
      p_disable_reason: disableReason,
      p_explicit_confirmation: explicitConfirmation,
    });

    if (rpcError) {
      return { success: false, message: rpcError.message };
    }

    const payload = rpcData as any;
    const updatedRow = payload?.enrollment;
    if (!updatedRow?.id) {
      return { success: false, message: "Enrollment update committed but its resulting record could not be resolved." };
    }

    const updated = {
      ...updatedRow,
      batches: { name: updatedRow.batch_name || enrollment.batches?.name },
    };

    let logAction = "ENROLLMENT_CHANGED";
    if (newStatus === "ACTIVE") {
      logAction = oldStatus === "DISABLED" ? "ENROLLMENT_REACTIVATED" : "ENROLLMENT_ACTIVATED";
    } else if (newStatus === "DISABLED") {
      logAction = "ENROLLMENT_DISABLED";
    } else if (newStatus === "COMPLETED") {
      logAction = "ENROLLMENT_COMPLETED";
    }

    await createAuditLog({
      actorProfileId: teacher.id,
      action: logAction,
      entityType: "enrollments",
      entityId: enrollmentId,
      oldValue: enrollment,
      newValue: updated,
    });

    let notifType = `ENROLLMENT_${newStatus}`;
    let notifTitle = `Enrollment ${newStatus.charAt(0) + newStatus.slice(1).toLowerCase()}`;
    let notifMsg = `Your enrollment in ${enrollment.batches?.name || "the batch"} is now ${newStatus.toLowerCase()}.`;

    if (newStatus === "ACTIVE") {
      if (oldStatus === "DISABLED") {
        notifType = "ENROLLMENT_REACTIVATED";
        notifTitle = "Enrollment Reactivated";
        notifMsg = `Your enrollment in ${enrollment.batches?.name || "the batch"} has been reactivated.`;
      } else {
        notifType = "ENROLLMENT_ACTIVATED";
        notifTitle = "Enrollment Activated";
        notifMsg = `Your enrollment in ${enrollment.batches?.name || "the batch"} has been activated.`;
      }
    } else if (newStatus === "DISABLED") {
      notifType = "ENROLLMENT_DISABLED";
      notifTitle = "Enrollment Suspended";
      notifMsg = `Your enrollment in ${enrollment.batches?.name || "the batch"} was disabled. Reason: ${disableReason}`;
    }

    await createNotification({
      studentProfileId: enrollment.student_id,
      type: notifType,
      title: notifTitle,
      message: notifMsg,
      relatedEntityType: "enrollments",
      relatedEntityId: enrollmentId,
    });

    if (payload.registration_approved && payload.profile_id) {
      await recordRegistrationApprovalSideEffects(enrollment.student_id, payload.profile_id, teacher.id);
    }

    revalidatePath("/teacher/students");
    revalidatePath(`/teacher/students/${enrollment.student_id}`);
    revalidatePath(`/teacher/batches/${enrollment.batch_id}`);
    revalidatePath("/teacher/enrollments");
    revalidatePath("/student");
    revalidatePath(`/student/batches/${enrollment.batch_id}`);
    return { success: true, enrollment: updated };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function updateStudentRegistrationAction(studentId: string, newStatus: "APPROVED" | "REJECTED") {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    const { data: oldStudent, error: fetchError } = await admin
      .from("student_profiles")
      .select("*, profiles(*)")
      .eq("id", studentId)
      .single();

    if (fetchError || !oldStudent) {
      return { success: false, message: "Student not found" };
    }

    const supabase = await createClient();
    const { data: updatedData, error } = await supabase.rpc("update_student_registration_atomic", {
      p_student_id: studentId,
      p_new_status: newStatus,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    const updated = updatedData as Record<string, unknown>;

    const action = newStatus === "APPROVED" ? "REGISTRATION_APPROVED" : "REGISTRATION_REJECTED";

    await createAuditLog({
      actorProfileId: teacher.id,
      action,
      entityType: "student_profiles",
      entityId: studentId,
      oldValue: oldStudent,
      newValue: updated,
    });

    await createNotificationForProfile({
      profileId: oldStudent.profile_id,
      type: action,
      title: newStatus === "APPROVED" ? "Registration Approved" : "Registration Rejected",
      message: newStatus === "APPROVED"
        ? "Your student account registration has been approved."
        : "Your student account registration was rejected by the center.",
      relatedEntityType: "student_profiles",
      relatedEntityId: studentId,
    });

    revalidatePath("/teacher/students");
    revalidatePath(`/teacher/students/${studentId}`);
    revalidatePath("/student");
    revalidatePath("/student/profile");
    revalidatePath("/pending-approval");
    return { success: true, student: updated };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function updateStudentAccountStatusAction({
  profileId,
  newStatus,
  reason = null,
}: {
  profileId: string;
  newStatus: "ACTIVE" | "DISABLED" | "ARCHIVED";
  reason?: string | null;
}) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    if (newStatus === "DISABLED" && (!reason || reason.trim() === "")) {
      return { success: false, message: "A reason is required to disable a student account." };
    }

    const { data: oldProfile, error: fetchError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .eq("role", "STUDENT")
      .single();

    if (fetchError || !oldProfile) {
      return { success: false, message: "Student profile not found" };
    }

    const { data: studentProfile, error: studentProfileError } = await admin
      .from("student_profiles")
      .select("id")
      .eq("profile_id", profileId)
      .single();

    if (studentProfileError || !studentProfile) {
      return { success: false, message: "Student record not found" };
    }

    const { data: updated, error } = await admin
      .from("profiles")
      .update({ account_status: newStatus })
      .eq("id", profileId)
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    const action = newStatus === "DISABLED" ? "STUDENT_ACCOUNT_DISABLED" : "STUDENT_ACCOUNT_REACTIVATED";

    await createAuditLog({
      actorProfileId: teacher.id,
      action,
      entityType: "profiles",
      entityId: profileId,
      oldValue: oldProfile,
      newValue: updated,
    });

    await createNotificationForProfile({
      profileId: profileId,
      type: action,
      title: newStatus === "DISABLED" ? "Account Disabled" : "Account Activated",
      message: newStatus === "DISABLED"
        ? `Your student portal account has been disabled. Reason: ${reason}`
        : "Your student portal account has been reactivated. Access is restored.",
      relatedEntityType: "profiles",
      relatedEntityId: profileId,
    });

    revalidatePath("/teacher/students");
    revalidatePath(`/teacher/students/${studentProfile.id}`);
    revalidatePath("/student");
    revalidatePath("/student/profile");
    return { success: true, profile: updated };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function updateStudentNoteAction(studentId: string, note: string) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    const { data: oldStudent } = await admin
      .from("student_profiles")
      .select("teacher_note")
      .eq("id", studentId)
      .single();

    const { data: updated, error } = await admin
      .from("student_profiles")
      .update({ teacher_note: note })
      .eq("id", studentId)
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    await createAuditLog({
      actorProfileId: teacher.id,
      action: "STUDENT_NOTE_UPDATED",
      entityType: "student_profiles",
      entityId: studentId,
      oldValue: oldStudent,
      newValue: { teacher_note: note },
    });

    revalidatePath(`/teacher/students/${studentId}`);
    return { success: true, student: updated };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}
