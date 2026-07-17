"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createAuditLog } from "@/lib/audit";
import { createNotification, createNotificationForProfile } from "@/lib/notifications";
import { batchSchema } from "@/lib/validations/batch";
import { deletePrivateAsset } from "@/lib/cloudinary";
import { deleteR2File } from "@/lib/r2";
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

    const { data: oldBatch } = await admin
      .from("batches")
      .select("*")
      .eq("id", batchId)
      .single();

    if (!oldBatch) {
      return { success: false, message: "Batch not found." };
    }

    // Comprehensive Cascade Deletion of Child Records (Student Accounts are preserved)
    // 1. Get all enrollments for this batch to clean up tied payments, attendance, exam_results, and notifications
    const { data: batchEnrollments } = await admin
      .from("enrollments")
      .select("id")
      .eq("batch_id", batchId);

    if (batchEnrollments && batchEnrollments.length > 0) {
      const enrollmentIds = batchEnrollments.map((e) => e.id);
      await admin.from("payments").delete().in("enrollment_id", enrollmentIds);
      await admin.from("exam_results").delete().in("enrollment_id", enrollmentIds);
      try { await admin.from("attendance").delete().in("enrollment_id", enrollmentIds); } catch (e) {}
      await admin.from("notifications").delete().in("related_entity_id", enrollmentIds);
      await admin.from("enrollments").delete().in("id", enrollmentIds);
    }

    // 2. Get all exams for this batch to clean up exam_results, attendance, and notifications
    const { data: batchExams } = await admin
      .from("exams")
      .select("id")
      .eq("batch_id", batchId);

    if (batchExams && batchExams.length > 0) {
      const examIds = batchExams.map((e) => e.id);
      await admin.from("exam_results").delete().in("exam_id", examIds);
      try { await admin.from("attendance").delete().in("exam_id", examIds); } catch (e) {}
      await admin.from("notifications").delete().in("related_entity_id", examIds);
      for (const examId of examIds) {
        // Step down through status transitions so DB trigger allows deletion
        await admin.from("exams").update({ status: "RESULT_DRAFT" }).eq("id", examId);
        await admin.from("exams").update({ status: "COMPLETED" }).eq("id", examId);
        await admin.from("exams").update({ status: "SCHEDULED" }).eq("id", examId);
        await admin.from("exams").update({ status: "DRAFT" }).eq("id", examId);
        await admin.from("exams").delete().eq("id", examId);
      }
    }

    // 3. Clean up study materials (batch_contents) & their R2/Cloudinary storage assets
    const { data: batchContents } = await admin
      .from("batch_contents")
      .select("*")
      .eq("batch_id", batchId);

    if (batchContents && batchContents.length > 0) {
      for (const material of batchContents) {
        if (material.cloudinary_public_id) {
          try {
            const resourceType = (material.cloudinary_resource_type as any) || "raw";
            await deletePrivateAsset(material.cloudinary_public_id, resourceType);
          } catch (err) {
            console.error("Cloudinary cleanup error:", err);
          }
        }
        if (material.storage_path) {
          try {
            await deleteR2File(material.storage_path);
          } catch (err) {
            console.error("R2 cleanup error:", err);
          }
        }
      }
      const contentIds = batchContents.map((m) => m.id);
      await admin.from("notifications").delete().in("related_entity_id", contentIds);
      await admin.from("batch_contents").delete().eq("batch_id", batchId);
    }

    // 4. Clean up attendance, announcements, contents, payments, and enrollments specifically tied by batch_id
    try { await admin.from("attendance").delete().eq("batch_id", batchId); } catch (e) {}
    await admin.from("announcements").delete().eq("batch_id", batchId);
    await admin.from("batch_contents").delete().eq("batch_id", batchId);
    await admin.from("payments").delete().eq("batch_id", batchId);
    await admin.from("enrollments").delete().eq("batch_id", batchId);
    await admin.from("notifications").delete().eq("related_entity_id", batchId);

    // 5. Delete the batch record itself
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
    revalidatePath("/teacher/exams");
    revalidatePath("/teacher/materials");
    revalidatePath("/teacher/enrollments");
    revalidatePath("/teacher/payments");
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

async function handleRegistrationApprovalOnFirstActive(
  studentId: string,
  enrollmentId: string,
  actorProfileId: string
) {
  const admin = createAdminClient();

  const { data: student, error: fetchError } = await admin
    .from("student_profiles")
    .select("registration_status, profile_id")
    .eq("id", studentId)
    .single();

  if (fetchError || !student) {
    console.error("Failed to retrieve student profile inside handleRegistrationApprovalOnFirstActive");
    return;
  }

  if (student.registration_status === "PENDING") {
    const { count } = await admin
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("status", "ACTIVE");

    if (count && count > 0) {
      const { data: updatedStudent, error: updateError } = await admin
        .from("student_profiles")
        .update({ registration_status: "APPROVED" })
        .eq("id", studentId)
        .select()
        .single();

      if (updateError) {
        console.error("Failed to update student registration_status to APPROVED:", updateError);
        return;
      }

      await createAuditLog({
        actorProfileId,
        action: "REGISTRATION_APPROVED",
        entityType: "student_profiles",
        entityId: studentId,
        oldValue: { registration_status: "PENDING" },
        newValue: { registration_status: "APPROVED" },
      });

      await createNotificationForProfile({
        profileId: student.profile_id,
        type: "REGISTRATION_APPROVED",
        title: "Registration Approved",
        message: "Your student registration has been approved. Welcome to Shifat's Tales!",
        relatedEntityType: "student_profiles",
        relatedEntityId: studentId,
      });
    }
  }
}

export async function enrollStudentAction(
  studentId: string,
  batchId: string,
  initialStatus: "PENDING" | "ACTIVE" | "DISABLED" | "COMPLETED" | "REJECTED" | "CANCELLED" = "PENDING"
) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    // Check duplicate
    const { data: existing } = await admin
      .from("enrollments")
      .select("*")
      .eq("student_id", studentId)
      .eq("batch_id", batchId)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        code: "DUPLICATE",
        message: `Student is already enrolled in this batch with status: ${existing.status}`,
        enrollment: existing,
      };
    }

    const updates: any = {
      student_id: studentId,
      batch_id: batchId,
      status: initialStatus,
    };

    if (initialStatus === "ACTIVE") {
      updates.approved_at = new Date().toISOString();
    }

    const { data: newEnrollment, error } = await admin
      .from("enrollments")
      .insert(updates)
      .select("*, batches(name)")
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    await createAuditLog({
      actorProfileId: teacher.id,
      action: "STUDENT_ADDED_TO_BATCH",
      entityType: "enrollments",
      entityId: newEnrollment.id,
      newValue: newEnrollment,
    });

    if (initialStatus === "ACTIVE") {
      await handleRegistrationApprovalOnFirstActive(studentId, newEnrollment.id, teacher.id);
      
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
    revalidatePath(`/teacher/enrollments`);
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

    // Fetch current enrollment
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

    let isValid = false;
    if (oldStatus === "PENDING") {
      isValid = newStatus === "ACTIVE" || newStatus === "REJECTED" || newStatus === "CANCELLED";
    } else if (oldStatus === "ACTIVE") {
      isValid = newStatus === "DISABLED" || newStatus === "COMPLETED" || newStatus === "CANCELLED";
    } else if (oldStatus === "DISABLED") {
      isValid = newStatus === "ACTIVE" || newStatus === "CANCELLED";
    } else if (oldStatus === "COMPLETED") {
      isValid = newStatus === "ACTIVE" && explicitConfirmation;
    } else if (oldStatus === "REJECTED") {
      isValid = newStatus === "PENDING" && explicitConfirmation;
    }

    if (!isValid) {
      return {
        success: false,
        message: `Invalid enrollment transition from ${oldStatus} to ${newStatus} (explicit confirmation: ${explicitConfirmation})`,
      };
    }

    const updates: any = { status: newStatus };
    if (newStatus === "ACTIVE") {
      updates.approved_at = new Date().toISOString();
      updates.disabled_at = null;
      updates.disable_reason = null;
    } else if (newStatus === "DISABLED") {
      if (!disableReason || disableReason.trim() === "") {
        return { success: false, message: "A reason is required to disable an enrollment." };
      }
      updates.disabled_at = new Date().toISOString();
      updates.disable_reason = disableReason;
    } else if (newStatus === "COMPLETED") {
      updates.completed_at = new Date().toISOString();
    }

    const { data: updated, error } = await admin
      .from("enrollments")
      .update(updates)
      .eq("id", enrollmentId)
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

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

    if (newStatus === "ACTIVE") {
      await handleRegistrationApprovalOnFirstActive(enrollment.student_id, enrollmentId, teacher.id);
    }

    revalidatePath("/teacher/students");
    revalidatePath(`/teacher/students/${enrollment.student_id}`);
    revalidatePath(`/teacher/batches/${enrollment.batch_id}`);
    revalidatePath(`/teacher/enrollments`);
    return { success: true, enrollment: updated };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

/**
 * Delete an enrollment record permanently with clean cascade.
 */
export async function deleteEnrollmentAction(enrollmentId: string) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    const { data: enrollment, error: fetchError } = await admin
      .from("enrollments")
      .select("*")
      .eq("id", enrollmentId)
      .single();

    if (fetchError || !enrollment) {
      return { success: false, message: "Enrollment record not found." };
    }

    // 1. Clean up payments tied specifically to this enrollment
    await admin.from("payments").delete().eq("enrollment_id", enrollmentId);

    // 2. Clean up exam_results tied specifically to this enrollment
    await admin.from("exam_results").delete().eq("enrollment_id", enrollmentId);

    // 3. Clean up notifications tied specifically to this enrollment
    await admin.from("notifications").delete().eq("related_entity_id", enrollmentId);

    // 4. Clean up attendance records tied specifically to this enrollment if any
    try { await admin.from("attendance").delete().eq("enrollment_id", enrollmentId); } catch (e) {}

    // 5. Delete the enrollment record itself
    const { error: dbError } = await admin
      .from("enrollments")
      .delete()
      .eq("id", enrollmentId);

    if (dbError) {
      return { success: false, message: `Database deletion failed: ${dbError.message}` };
    }

    await createAuditLog({
      actorProfileId: teacher.id,
      action: "ENROLLMENT_DELETED",
      entityType: "enrollments",
      entityId: enrollmentId,
      oldValue: enrollment,
    });

    revalidatePath("/teacher/students");
    if (enrollment.student_id) {
      revalidatePath(`/teacher/students/${enrollment.student_id}`);
    }
    if (enrollment.batch_id) {
      revalidatePath(`/teacher/batches/${enrollment.batch_id}`);
    }
    revalidatePath("/teacher/enrollments");
    return { success: true };
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

    const { data: updated, error } = await admin
      .from("student_profiles")
      .update({ registration_status: newStatus })
      .eq("id", studentId)
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

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
      .single();

    if (fetchError || !oldProfile) {
      return { success: false, message: "User profile not found" };
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
    revalidatePath(`/teacher/students/${profileId}`);
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
