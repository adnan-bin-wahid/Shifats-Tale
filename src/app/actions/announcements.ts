"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createAuditLog } from "@/lib/audit";
import { createNotificationForProfile } from "@/lib/notifications";
import { announcementSchema } from "@/lib/validations/materials";
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

async function resolveSubjectScope(
  admin: ReturnType<typeof createAdminClient>,
  batchId: string,
  subjectId: string | null | undefined
) {
  if (!subjectId) return null;

  const { data: subject, error } = await admin
    .from("batch_subjects")
    .select("id")
    .eq("id", subjectId)
    .eq("batch_id", batchId)
    .neq("status", "ARCHIVED")
    .maybeSingle();

  if (error || !subject) {
    throw new Error("The selected subject does not belong to this batch or is archived.");
  }

  return subject.id;
}

/**
 * Notifies all active students enrolled in a batch about new/updated announcements.
 */
async function notifyBatchStudents(
  batchId: string,
  title: string,
  message: string,
  entityId: string
) {
  try {
    const admin = createAdminClient();
    const { data: enrollments, error } = await admin
      .from("enrollments")
      .select("student_profiles(profile_id)")
      .eq("batch_id", batchId)
      .eq("status", "ACTIVE");

    if (error || !enrollments) {
      console.error("Failed to query enrolled students for notifications:", error);
      return;
    }

    for (const enroll of enrollments) {
      const profileId = (enroll.student_profiles as any)?.profile_id;
      if (profileId) {
        await createNotificationForProfile({
          profileId,
          type: "announcement",
          title,
          message,
          relatedEntityType: "announcement",
          relatedEntityId: entityId,
        });
      }
    }
  } catch (err) {
    console.error("Error sending batch notifications:", err);
  }
}

export async function createAnnouncementAction(rawInput: any) {
  try {
    const teacher = await assertActiveTeacher();

    const validated = announcementSchema.safeParse(rawInput);
    if (!validated.success) {
      return { success: false, errors: validated.error.flatten().fieldErrors };
    }

    const data = validated.data;
    const admin = createAdminClient();
    const scopedSubjectId = await resolveSubjectScope(admin, data.batchId, data.subjectId);

    const { data: newAnnouncement, error: dbError } = await admin
      .from("announcements")
      .insert({
        batch_id: data.batchId,
        subject_id: scopedSubjectId,
        title: data.title,
        message: data.message,
        status: data.status,
        release_at: data.releaseAt ? new Date(data.releaseAt).toISOString() : null,
        expires_at: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        published_at: data.status === "PUBLISHED" ? new Date().toISOString() : null,
        published_by: data.status === "PUBLISHED" ? teacher.id : null,
        created_by: teacher.id,
        updated_by: teacher.id,
      })
      .select()
      .single();

    if (dbError) {
      return { success: false, message: `Database insert failed: ${dbError.message}` };
    }

    // Audit log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "ANNOUNCEMENT_CREATED",
      entityType: "announcements",
      entityId: newAnnouncement.id,
      newValue: newAnnouncement,
    });

    // Notify if published immediately and active (release_at passed or null)
    const isReleased = !newAnnouncement.release_at || new Date(newAnnouncement.release_at) <= new Date();
    const isNotExpired = !newAnnouncement.expires_at || new Date(newAnnouncement.expires_at) > new Date();
    if (newAnnouncement.status === "PUBLISHED" && isReleased && isNotExpired) {
      await notifyBatchStudents(
        newAnnouncement.batch_id,
        "New Announcement",
        `A new announcement "${newAnnouncement.title}" has been published in your batch.`,
        newAnnouncement.id
      );
      await createAuditLog({
        actorProfileId: teacher.id,
        action: "ANNOUNCEMENT_PUBLISHED",
        entityType: "announcements",
        entityId: newAnnouncement.id,
      });
    }

    revalidatePath(`/teacher/batches/${newAnnouncement.batch_id}/announcements`);
    revalidatePath(`/student/batches/${newAnnouncement.batch_id}/announcements`);
    revalidatePath(`/teacher/academic/${newAnnouncement.batch_id}`);
    revalidatePath(`/student/batches/${newAnnouncement.batch_id}/academics`);
    return { success: true, announcement: newAnnouncement };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function updateAnnouncementAction(announcementId: string, rawInput: any) {
  try {
    const teacher = await assertActiveTeacher();

    const validated = announcementSchema.safeParse(rawInput);
    if (!validated.success) {
      return { success: false, errors: validated.error.flatten().fieldErrors };
    }

    const data = validated.data;
    const admin = createAdminClient();

    // Fetch existing
    const { data: oldAnnouncement, error: fetchError } = await admin
      .from("announcements")
      .select("*")
      .eq("id", announcementId)
      .single();

    if (fetchError || !oldAnnouncement) {
      return { success: false, message: "Announcement not found." };
    }

    if (data.batchId !== oldAnnouncement.batch_id) {
      return { success: false, message: "An announcement cannot be moved to another batch." };
    }

    const scopedSubjectId = await resolveSubjectScope(
      admin,
      oldAnnouncement.batch_id,
      data.subjectId
    );

    const updatedFields: any = {
      subject_id: scopedSubjectId,
      title: data.title,
      message: data.message,
      status: data.status,
      release_at: data.releaseAt ? new Date(data.releaseAt).toISOString() : null,
      expires_at: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      updated_by: teacher.id,
    };

    if (data.status === "PUBLISHED" && oldAnnouncement.status !== "PUBLISHED") {
      updatedFields.published_at = new Date().toISOString();
      updatedFields.published_by = teacher.id;
    } else if (data.status === "DRAFT" && oldAnnouncement.status === "PUBLISHED") {
      updatedFields.published_at = null;
      updatedFields.published_by = null;
    }

    const { data: updatedAnnouncement, error: dbError } = await admin
      .from("announcements")
      .update(updatedFields)
      .eq("id", announcementId)
      .select()
      .single();

    if (dbError) {
      return { success: false, message: `Database update failed: ${dbError.message}` };
    }

    // Audit log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "ANNOUNCEMENT_EDITED",
      entityType: "announcements",
      entityId: updatedAnnouncement.id,
      oldValue: oldAnnouncement,
      newValue: updatedAnnouncement,
    });

    // Notify if status transitioned or changed meaningfully while published
    const isReleasedNow = !updatedAnnouncement.release_at || new Date(updatedAnnouncement.release_at) <= new Date();
    const isNotExpiredNow = !updatedAnnouncement.expires_at || new Date(updatedAnnouncement.expires_at) > new Date();

    const becamePublished = updatedAnnouncement.status === "PUBLISHED" && oldAnnouncement.status !== "PUBLISHED";
    const messageUpdatedMeaningfully =
      updatedAnnouncement.status === "PUBLISHED" &&
      (oldAnnouncement.title !== updatedAnnouncement.title || oldAnnouncement.message !== updatedAnnouncement.message);

    if (isReleasedNow && isNotExpiredNow) {
      if (becamePublished) {
        await notifyBatchStudents(
          updatedAnnouncement.batch_id,
          "New Announcement",
          `A new announcement "${updatedAnnouncement.title}" has been published in your batch.`,
          updatedAnnouncement.id
        );
        await createAuditLog({
          actorProfileId: teacher.id,
          action: "ANNOUNCEMENT_PUBLISHED",
          entityType: "announcements",
          entityId: updatedAnnouncement.id,
        });
      } else if (messageUpdatedMeaningfully) {
        await notifyBatchStudents(
          updatedAnnouncement.batch_id,
          "Announcement Updated",
          `The announcement "${updatedAnnouncement.title}" has been updated in your batch.`,
          updatedAnnouncement.id
        );
      }
    }

    revalidatePath(`/teacher/batches/${updatedAnnouncement.batch_id}/announcements`);
    revalidatePath(`/student/batches/${updatedAnnouncement.batch_id}/announcements`);
    revalidatePath(`/teacher/academic/${updatedAnnouncement.batch_id}`);
    revalidatePath(`/student/batches/${updatedAnnouncement.batch_id}/academics`);
    return { success: true, announcement: updatedAnnouncement };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function deleteAnnouncementAction(announcementId: string) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    // Fetch existing
    const { data: announcement, error: fetchError } = await admin
      .from("announcements")
      .select("*")
      .eq("id", announcementId)
      .single();

    if (fetchError || !announcement) {
      return { success: false, message: "Announcement not found." };
    }

    // Clean up related notifications if any
    await admin.from("notifications").delete().eq("related_entity_id", announcementId);

    const { error: dbError } = await admin
      .from("announcements")
      .delete()
      .eq("id", announcementId);

    if (dbError) {
      return { success: false, message: `Database deletion failed: ${dbError.message}` };
    }

    // Audit log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "ANNOUNCEMENT_DELETED",
      entityType: "announcements",
      entityId: announcementId,
      oldValue: announcement,
    });

    revalidatePath(`/teacher/batches/${announcement.batch_id}/announcements`);
    revalidatePath(`/student/batches/${announcement.batch_id}/announcements`);
    revalidatePath(`/teacher/academic/${announcement.batch_id}`);
    revalidatePath(`/student/batches/${announcement.batch_id}/academics`);
    revalidatePath(`/teacher/announcements`);
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}
