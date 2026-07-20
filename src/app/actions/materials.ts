"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createAuditLog } from "@/lib/audit";
import { createNotificationForProfile } from "@/lib/notifications";
import { materialSchema } from "@/lib/validations/materials";
import {
  uploadPrivateAsset,
  deletePrivateAsset,
  generatePublicId,
  getCloudinaryResourceType,
  sanitizeFilename,
} from "@/lib/cloudinary";
import { deleteR2File } from "@/lib/r2";
import { validateUploadedFile, validateFileMagicBytes } from "@/lib/cloudinary/validation";
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
 * Notifies all active students enrolled in a batch about new/updated content.
 */
async function notifyBatchStudents(
  batchId: string,
  title: string,
  message: string,
  entityType: string,
  entityId: string
) {
  try {
    const admin = createAdminClient();
    // Fetch all active enrollments for this batch
    const { data: enrollments, error } = await admin
      .from("enrollments")
      .select("student_profiles(profile_id)")
      .eq("batch_id", batchId)
      .eq("status", "ACTIVE");

    if (error || !enrollments) {
      console.error("Failed to query enrolled students for notifications:", error);
      return;
    }

    // Send notifications to each enrolled student profile
    for (const enroll of enrollments) {
      const profileId = (enroll.student_profiles as any)?.profile_id;
      if (profileId) {
        await createNotificationForProfile({
          profileId,
          type: entityType,
          title,
          message,
          relatedEntityType: entityType,
          relatedEntityId: entityId,
        });
      }
    }
  } catch (err) {
    console.error("Error sending batch notifications:", err);
  }
}

export async function createMaterialAction(formData: FormData) {
  let uploadedPublicId: string | null = null;
  let uploadedResourceType: "image" | "raw" = "raw";

  try {
    const teacher = await assertActiveTeacher();

    // Extract fields from FormData
    const batchId = formData.get("batchId") as string;
    const subjectId = formData.get("subjectId") as string;
    const title = formData.get("title") as string;
    const contentType = formData.get("contentType") as any;
    const status = formData.get("status") as any;
    const description = formData.get("description") as string;
    const externalUrl = formData.get("externalUrl") as string;
    const allowDownload = formData.get("allowDownload") as string;
    const releaseAt = formData.get("releaseAt") as string;
    const expiresAt = formData.get("expiresAt") as string;

    // Validate using Zod schema
    const validated = materialSchema.safeParse({
      batchId,
      subjectId,
      title,
      contentType,
      status,
      description,
      externalUrl,
      allowDownload,
      releaseAt,
      expiresAt,
    });

    if (!validated.success) {
      return { success: false, errors: validated.error.flatten().fieldErrors };
    }

    const data = validated.data;
    const admin = createAdminClient();
    const scopedSubjectId = await resolveSubjectScope(admin, data.batchId, data.subjectId);
    const isFileBased = ["PDF", "DOC", "DOCX", "IMAGE"].includes(data.contentType);
    const file = formData.get("file") as File | null;
    const r2Key = formData.get("r2Key") as string | null;
    const originalFilename = formData.get("originalFilename") as string | null;
    const r2FileSize = formData.get("fileSize") as string | null;

    let cloudinaryData: any = {};
    let storagePath: string | null = null;

    if (isFileBased) {
      if (r2Key && originalFilename) {
        // Handle R2 direct upload metadata
        storagePath = r2Key;
        cloudinaryData = {
          original_filename: originalFilename,
          file_size: r2FileSize ? parseInt(r2FileSize, 10) : null,
          mime_type: originalFilename.endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
        };
      } else if (file && file.size > 0) {
        // Handle standard Server Action upload (Cloudinary)
        // 1. Validate file headers (extension, mime type, size)
      const valResult = validateUploadedFile(file.name, file.type, file.size, data.contentType);
      if (!valResult.isValid) {
        return { success: false, message: valResult.error || "File validation failed." };
      }

      // 2. Read array buffer and validate magic bytes
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { extension } = sanitizeFilename(file.name);
      if (!validateFileMagicBytes(buffer, extension)) {
        return { success: false, message: "File contents do not match its extension (failed magic byte verification)." };
      }

      // 3. Upload to Cloudinary
      const resourceType = getCloudinaryResourceType(extension);
      const publicId = generatePublicId(data.batchId, file.name);

      uploadedPublicId = publicId;
      uploadedResourceType = resourceType;

      const uploadResult = await uploadPrivateAsset(buffer, publicId, resourceType);

      cloudinaryData = {
        cloudinary_public_id: uploadResult.public_id,
        cloudinary_asset_id: uploadResult.asset_id,
        cloudinary_resource_type: uploadResult.resource_type,
        cloudinary_delivery_type: uploadResult.type,
        cloudinary_format: uploadResult.format || extension,
        cloudinary_version: String(uploadResult.version),
        original_filename: file.name,
        file_size: file.size,
        width: uploadResult.width || null,
        height: uploadResult.height || null,
        page_count: uploadResult.pages || null,
        mime_type: file.type,
      };
    } else {
        return { success: false, message: "A valid file or R2 upload is required for this content type." };
      }
    }

    // 4. Create database record
    const { data: newMaterial, error: dbError } = await admin
      .from("batch_contents")
      .insert({
        batch_id: data.batchId,
        subject_id: scopedSubjectId,
        title: data.title,
        description: data.description || null,
        content_type: data.contentType,
        external_url: isFileBased ? null : (data.externalUrl || null),
        status: data.status,
        allow_download: data.allowDownload,
        release_at: data.releaseAt ? new Date(data.releaseAt).toISOString() : null,
        expires_at: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        published_at: data.status === "PUBLISHED" ? new Date().toISOString() : null,
        published_by: data.status === "PUBLISHED" ? teacher.id : null,
        created_by: teacher.id,
        updated_by: teacher.id,
        storage_path: storagePath,
        ...cloudinaryData,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback newly uploaded Cloudinary asset if database insert fails
      if (uploadedPublicId) {
        await deletePrivateAsset(uploadedPublicId, uploadedResourceType);
      }
      return { success: false, message: `Database insert failed: ${dbError.message}` };
    }

    // 5. Audit log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "MATERIAL_CREATED",
      entityType: "batch_contents",
      entityId: newMaterial.id,
      newValue: newMaterial,
    });

    // 6. Notification only if published immediately and active (release time passed or null)
    const isReleased = !newMaterial.release_at || new Date(newMaterial.release_at) <= new Date();
    const isNotExpired = !newMaterial.expires_at || new Date(newMaterial.expires_at) > new Date();
    if (newMaterial.status === "PUBLISHED" && isReleased && isNotExpired) {
      await notifyBatchStudents(
        newMaterial.batch_id,
        "New Material Available",
        `A new material "${newMaterial.title}" has been published in your batch.`,
        "material",
        newMaterial.id
      );
      // Log notification action
      await createAuditLog({
        actorProfileId: teacher.id,
        action: "MATERIAL_PUBLISHED",
        entityType: "batch_contents",
        entityId: newMaterial.id,
      });
    }

    revalidatePath(`/teacher/batches/${newMaterial.batch_id}/materials`);
    revalidatePath(`/student/batches/${newMaterial.batch_id}/materials`);
    revalidatePath(`/teacher/academic/${newMaterial.batch_id}`);
    revalidatePath(`/student/batches/${newMaterial.batch_id}/academics`);
    return { success: true, material: newMaterial };
  } catch (err: any) {
    // Technical error rollback
    if (uploadedPublicId) {
      try {
        await deletePrivateAsset(uploadedPublicId, uploadedResourceType);
      } catch (cleanupErr) {
        console.error("Failed to clean up Cloudinary asset during failure rollback:", cleanupErr);
      }
    }
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function updateMaterialAction(contentId: string, formData: FormData) {
  let uploadedPublicId: string | null = null;
  let uploadedResourceType: "image" | "raw" = "raw";
  let oldPublicIdToDelete: string | null = null;
  let oldResourceTypeToDelete: "image" | "raw" = "raw";
  let oldR2KeyToDelete: string | null = null;

  try {
    const teacher = await assertActiveTeacher();

    // Extract fields
    const batchId = formData.get("batchId") as string;
    const subjectId = formData.get("subjectId") as string;
    const title = formData.get("title") as string;
    const contentType = formData.get("contentType") as any;
    const status = formData.get("status") as any;
    const description = formData.get("description") as string;
    const externalUrl = formData.get("externalUrl") as string;
    const allowDownload = formData.get("allowDownload") as string;
    const releaseAt = formData.get("releaseAt") as string;
    const expiresAt = formData.get("expiresAt") as string;

    // Validate using Zod schema
    const validated = materialSchema.safeParse({
      batchId,
      subjectId,
      title,
      contentType,
      status,
      description,
      externalUrl,
      allowDownload,
      releaseAt,
      expiresAt,
    });

    if (!validated.success) {
      return { success: false, errors: validated.error.flatten().fieldErrors };
    }

    const data = validated.data;
    const admin = createAdminClient();

    // Load existing record
    const { data: oldMaterial, error: fetchError } = await admin
      .from("batch_contents")
      .select("*")
      .eq("id", contentId)
      .single();

    if (fetchError || !oldMaterial) {
      return { success: false, message: "Batch material not found." };
    }

    if (data.batchId !== oldMaterial.batch_id) {
      return { success: false, message: "A material cannot be moved to another batch." };
    }

    const scopedSubjectId = await resolveSubjectScope(
      admin,
      oldMaterial.batch_id,
      data.subjectId
    );

    const isFileBased = ["PDF", "DOC", "DOCX", "IMAGE"].includes(data.contentType);
    const file = formData.get("file") as File | null;
    const r2Key = formData.get("r2Key") as string | null;
    const originalFilename = formData.get("originalFilename") as string | null;
    const r2FileSize = formData.get("fileSize") as string | null;

    let cloudinaryData: any = {};
    let storagePath: string | null = oldMaterial.storage_path;
    let shouldUpdateFileFields = false;

    // Determine replacement vs keeping old file vs swapping to external URL
    if (isFileBased) {
      if (r2Key && originalFilename) {
        // Uploading a replacement file (R2)
        storagePath = r2Key;
        cloudinaryData = {
          original_filename: originalFilename,
          file_size: r2FileSize ? parseInt(r2FileSize, 10) : null,
          mime_type: originalFilename.endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
          cloudinary_public_id: null,
          cloudinary_asset_id: null,
          cloudinary_resource_type: null,
          cloudinary_delivery_type: null,
          cloudinary_format: null,
          cloudinary_version: null,
          width: null,
          height: null,
          page_count: null,
        };
        shouldUpdateFileFields = true;

        // Queue old file for deletion after successful DB update (if it was Cloudinary)
        if (oldMaterial.cloudinary_public_id) {
          oldPublicIdToDelete = oldMaterial.cloudinary_public_id;
          oldResourceTypeToDelete = (oldMaterial.cloudinary_resource_type as any) || "raw";
        }
      } else if (file && file.size > 0) {
        // Uploading a replacement file (Cloudinary)
        const valResult = validateUploadedFile(file.name, file.type, file.size, data.contentType);
        if (!valResult.isValid) {
          return { success: false, message: valResult.error || "File validation failed." };
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const { extension } = sanitizeFilename(file.name);
        if (!validateFileMagicBytes(buffer, extension)) {
          return { success: false, message: "File contents do not match its extension." };
        }

        const resourceType = getCloudinaryResourceType(extension);
        const publicId = generatePublicId(data.batchId, file.name);

        uploadedPublicId = publicId;
        uploadedResourceType = resourceType;

        const uploadResult = await uploadPrivateAsset(buffer, publicId, resourceType);

        cloudinaryData = {
          cloudinary_public_id: uploadResult.public_id,
          cloudinary_asset_id: uploadResult.asset_id,
          cloudinary_resource_type: uploadResult.resource_type,
          cloudinary_delivery_type: uploadResult.type,
          cloudinary_format: uploadResult.format || extension,
          cloudinary_version: String(uploadResult.version),
          original_filename: file.name,
          file_size: file.size,
          width: uploadResult.width || null,
          height: uploadResult.height || null,
          page_count: uploadResult.pages || null,
          mime_type: file.type,
        };
        shouldUpdateFileFields = true;

        // Queue old file for deletion after successful DB update
        if (oldMaterial.cloudinary_public_id) {
          oldPublicIdToDelete = oldMaterial.cloudinary_public_id;
          oldResourceTypeToDelete = (oldMaterial.cloudinary_resource_type as any) || "raw";
        }
        if (oldMaterial.storage_path) {
          oldR2KeyToDelete = oldMaterial.storage_path;
        }
        storagePath = null; // Clear R2 storage path if replacing with Cloudinary
      } else {
        // Keeping current file reference, unless the previous type was NOT file-based
        const wasFileBasedBefore = ["PDF", "DOC", "DOCX", "IMAGE"].includes(oldMaterial.content_type);
        if (!wasFileBasedBefore) {
          return { success: false, message: "A file is required when converting to a file-based content type." };
        }
      }
    } else {
      // Swapping from file-based to non-file-based -> delete the old assets
      if (oldMaterial.cloudinary_public_id) {
        oldPublicIdToDelete = oldMaterial.cloudinary_public_id;
        oldResourceTypeToDelete = (oldMaterial.cloudinary_resource_type as any) || "raw";
      }
      if (oldMaterial.storage_path) {
        oldR2KeyToDelete = oldMaterial.storage_path;
      }
      // Nullify all Cloudinary fields
      cloudinaryData = {
        cloudinary_public_id: null,
        cloudinary_asset_id: null,
        cloudinary_resource_type: null,
        cloudinary_delivery_type: null,
        cloudinary_format: null,
        cloudinary_version: null,
        original_filename: null,
        file_size: null,
        width: null,
        height: null,
        page_count: null,
        mime_type: null,
      };
      storagePath = null;
      shouldUpdateFileFields = true;
    }

    // Compile update fields
    const updatedFields: any = {
      subject_id: scopedSubjectId,
      title: data.title,
      description: data.description || null,
      content_type: data.contentType,
      status: data.status,
      allow_download: data.allowDownload,
      external_url: isFileBased ? null : (data.externalUrl || null),
      release_at: data.releaseAt ? new Date(data.releaseAt).toISOString() : null,
      expires_at: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      updated_by: teacher.id,
    };

    if (shouldUpdateFileFields) {
      updatedFields.storage_path = storagePath;
      Object.assign(updatedFields, cloudinaryData);
    }

    // Set published metadata if transitioning to PUBLISHED
    if (data.status === "PUBLISHED" && oldMaterial.status !== "PUBLISHED") {
      updatedFields.published_at = new Date().toISOString();
      updatedFields.published_by = teacher.id;
    } else if (data.status === "DRAFT" && oldMaterial.status === "PUBLISHED") {
      // Revoke published credentials
      updatedFields.published_at = null;
      updatedFields.published_by = null;
    }

    const { data: updatedMaterial, error: dbError } = await admin
      .from("batch_contents")
      .update(updatedFields)
      .eq("id", contentId)
      .select()
      .single();

    if (dbError) {
      // Rollback newly uploaded Cloudinary asset if database update fails
      if (uploadedPublicId) {
        await deletePrivateAsset(uploadedPublicId, uploadedResourceType);
      }
      return { success: false, message: `Database update failed: ${dbError.message}` };
    }

    // Delete old asset now that DB update succeeded
    if (oldPublicIdToDelete) {
      try {
        await deletePrivateAsset(oldPublicIdToDelete, oldResourceTypeToDelete);
        await createAuditLog({
          actorProfileId: teacher.id,
          action: "CLOUDINARY_ASSET_DELETED",
          entityType: "batch_contents",
          entityId: contentId,
          oldValue: { public_id: oldPublicIdToDelete },
        });
      } catch (delErr) {
        console.error("Sanitized warning: failed to delete old Cloudinary asset after successful update:", delErr);
      }
    }
    
    if (oldR2KeyToDelete) {
      try {
        await deleteR2File(oldR2KeyToDelete);
      } catch (delErr) {
        console.error("Sanitized warning: failed to delete old R2 asset after successful update:", delErr);
      }
    }

    // Audit log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "MATERIAL_EDITED",
      entityType: "batch_contents",
      entityId: updatedMaterial.id,
      oldValue: oldMaterial,
      newValue: updatedMaterial,
    });

    // Notifications check
    const isReleasedNow = !updatedMaterial.release_at || new Date(updatedMaterial.release_at) <= new Date();
    const isNotExpiredNow = !updatedMaterial.expires_at || new Date(updatedMaterial.expires_at) > new Date();

    const becamePublished = updatedMaterial.status === "PUBLISHED" && oldMaterial.status !== "PUBLISHED";
    const contentUpdatedMeaningfully =
      updatedMaterial.status === "PUBLISHED" &&
      (oldMaterial.title !== updatedMaterial.title || shouldUpdateFileFields);

    if (isReleasedNow && isNotExpiredNow) {
      if (becamePublished) {
        await notifyBatchStudents(
          updatedMaterial.batch_id,
          "New Material Available",
          `A new material "${updatedMaterial.title}" has been published in your batch.`,
          "material",
          updatedMaterial.id
        );
        await createAuditLog({
          actorProfileId: teacher.id,
          action: "MATERIAL_PUBLISHED",
          entityType: "batch_contents",
          entityId: updatedMaterial.id,
        });
      } else if (contentUpdatedMeaningfully) {
        await notifyBatchStudents(
          updatedMaterial.batch_id,
          "Material Updated",
          `The material "${updatedMaterial.title}" has been updated in your batch.`,
          "material",
          updatedMaterial.id
        );
      }
    }

    revalidatePath(`/teacher/batches/${updatedMaterial.batch_id}/materials`);
    revalidatePath(`/student/batches/${updatedMaterial.batch_id}/materials`);
    revalidatePath(`/teacher/academic/${updatedMaterial.batch_id}`);
    revalidatePath(`/student/batches/${updatedMaterial.batch_id}/academics`);
    return { success: true, material: updatedMaterial };
  } catch (err: any) {
    if (uploadedPublicId) {
      try {
        await deletePrivateAsset(uploadedPublicId, uploadedResourceType);
      } catch (cleanupErr) {
        console.error("Failed to clean up Cloudinary asset during failure rollback:", cleanupErr);
      }
    }
    return { success: false, message: err.message || "Internal server error" };
  }
}

export async function deleteMaterialAction(contentId: string) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    // Get the material details to verify Cloudinary assets
    const { data: material, error: fetchError } = await admin
      .from("batch_contents")
      .select("*")
      .eq("id", contentId)
      .single();

    if (fetchError || !material) {
      return { success: false, message: "Batch material not found." };
    }

    // Delete DB record
    const { error: dbError } = await admin
      .from("batch_contents")
      .delete()
      .eq("id", contentId);

    if (dbError) {
      return { success: false, message: `Database deletion failed: ${dbError.message}` };
    }

    // Delete Cloudinary asset if exists
    if (material.cloudinary_public_id) {
      try {
        const resourceType = (material.cloudinary_resource_type as any) || "raw";
        await deletePrivateAsset(material.cloudinary_public_id, resourceType);
        await createAuditLog({
          actorProfileId: teacher.id,
          action: "CLOUDINARY_ASSET_DELETED",
          entityType: "batch_contents",
          entityId: contentId,
          oldValue: { public_id: material.cloudinary_public_id },
        });
      } catch (cloudinaryErr) {
        console.error("Failed to clean up Cloudinary asset on deletion:", cloudinaryErr);
      }
    }

    // Delete R2 asset if exists
    if (material.storage_path) {
      try {
        await deleteR2File(material.storage_path);
      } catch (r2Err) {
        console.error("Failed to clean up R2 asset on deletion:", r2Err);
      }
    }

    // Audit log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "MATERIAL_DELETED",
      entityType: "batch_contents",
      entityId: contentId,
      oldValue: material,
    });

    revalidatePath(`/teacher/batches/${material.batch_id}/materials`);
    revalidatePath(`/student/batches/${material.batch_id}/materials`);
    revalidatePath(`/teacher/academic/${material.batch_id}`);
    revalidatePath(`/student/batches/${material.batch_id}/academics`);
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}
