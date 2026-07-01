"use server";

import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth-guards";
import { cloudinary } from "@/lib/cloudinary";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// Define the allowed folder keys to prevent arbitrary folder uploads
const ALLOWED_FOLDERS: Record<string, string> = {
  BRANDING: "shifats-tales/branding",
  HERO: "shifats-tales/hero",
  COURSES: "shifats-tales/courses",
  RESULTS: "shifats-tales/results",
  MONTHLY_STARS: "shifats-tales/monthly-stars",
  TESTIMONIALS: "shifats-tales/testimonials",
  GALLERY: "shifats-tales/gallery",
  ABOUT: "shifats-tales/about",
  PROJECTS: "shifats-tales/projects",
  PUBLICATIONS: "shifats-tales/publications",
};

const ALLOWED_IMAGE_FORMATS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Generate a Cloudinary upload signature securely on the server.
 */
export async function generateCloudinarySignature(folderKey: string) {
  await requireTeacher();

  const folder = ALLOWED_FOLDERS[folderKey];
  if (!folder) {
    throw new Error("Invalid folder key");
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const paramsToSign = {
    folder,
    timestamp,
  };

  const config = cloudinary.config();
  const apiSecret = config.api_secret;
  const apiKey = config.api_key;
  const cloudName = config.cloud_name;

  if (!apiSecret || !apiKey || !cloudName) {
    throw new Error("Cloudinary configuration is incomplete.");
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    timestamp,
    signature,
    apiKey,
    cloudName,
    folder,
  };
}

/**
 * Helper to forcefully delete a Cloudinary asset by public_id
 */
async function cleanupCloudinaryAsset(publicId: string, resourceType: string, type: string) {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: type,
      invalidate: true,
    });
    console.log(`Asset ${publicId} destroyed successfully.`);
    return true;
  } catch (error) {
    console.error(`Failed to destroy asset ${publicId}:`, error);
    return false;
  }
}

/**
 * Finalize the upload by fetching metadata directly from Cloudinary via Admin API
 * and saving the verified metadata into the database.
 */
export async function finalizeMediaUpload(payload: {
  publicId: string;
  version: number;
  signature: string;
  folder: string;
}) {
  const { profile } = await requireTeacher();
  const supabase = await createClient();
  const config = cloudinary.config();
  
  // 1. Validate response authenticity using Cloudinary's signature
  const expectedSignature = cloudinary.utils.api_sign_request(
    {
      public_id: payload.publicId,
      version: payload.version
    },
    config.api_secret as string
  );
  
  if (expectedSignature !== payload.signature) {
    throw new Error("Validation failed: Invalid Cloudinary signature.");
  }

  // 2. Fetch Source of Truth from Cloudinary Admin API
  let verifiedAsset;
  try {
    verifiedAsset = await cloudinary.api.resource(payload.publicId, {
      resource_type: "image",
    });
  } catch (error) {
    console.error("Failed to verify asset with Cloudinary API:", error);
    throw new Error("Could not verify asset source.");
  }

  // 3. Server-side validation of bounds and types WITH Cleanup
  const isAllowedFolder = Object.values(ALLOWED_FOLDERS).includes(payload.folder);
  let validationError: string | null = null;

  if (!isAllowedFolder || !verifiedAsset.public_id.startsWith(`${payload.folder}/`)) {
    validationError = "Validation failed: Mismatched or unauthorized folder.";
  } else if (!ALLOWED_IMAGE_FORMATS.has(verifiedAsset.format.toLowerCase())) {
    validationError = `Unsupported image format: ${verifiedAsset.format}`;
  } else if (verifiedAsset.bytes > MAX_IMAGE_BYTES) {
    validationError = "Image exceeds the 10 MB limit.";
  } else if (verifiedAsset.resource_type !== "image") {
    validationError = "Only image uploads are allowed.";
  }

  // If validation fails, destroy the uploaded asset immediately
  if (validationError) {
    await cleanupCloudinaryAsset(verifiedAsset.public_id, verifiedAsset.resource_type, verifiedAsset.type);
    throw new Error(validationError);
  }

  // 4. Save to database using the absolute truth from Cloudinary
  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      provider: "CLOUDINARY",
      public_id: verifiedAsset.public_id,
      asset_id: verifiedAsset.asset_id || null,
      asset_type: "IMAGE",
      resource_type: verifiedAsset.resource_type,
      secure_url: verifiedAsset.secure_url,
      version: verifiedAsset.version,
      format: verifiedAsset.format,
      folder: payload.folder,
      original_filename: verifiedAsset.original_filename,
      width: verifiedAsset.width,
      height: verifiedAsset.height,
      bytes: verifiedAsset.bytes,
      is_public: true,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) {
    // 5. Safe duplicate handling also revives a previously soft-deleted row.
    if (error.code === "23505") {
      const { data: publicIdMatch, error: publicIdError } = await supabase
        .from("media_assets")
        .select("id, deleted_at")
        .eq("provider", "CLOUDINARY")
        .eq("public_id", verifiedAsset.public_id)
        .maybeSingle();

      if (publicIdError) {
        throw new Error("Failed to resolve duplicate media metadata.");
      }

      let existing = publicIdMatch;
      if (!existing && verifiedAsset.asset_id) {
        const { data: assetIdMatch, error: assetIdError } = await supabase
          .from("media_assets")
          .select("id, deleted_at")
          .eq("asset_id", verifiedAsset.asset_id)
          .maybeSingle();

        if (assetIdError) {
          throw new Error("Failed to resolve duplicate media metadata.");
        }
        existing = assetIdMatch;
      }

      if (!existing) {
        throw new Error("Failed to resolve unique duplicate record. Manual investigation required.");
      }

      const { data: restored, error: restoreError } = await supabase
        .from("media_assets")
        .update({
          public_id: verifiedAsset.public_id,
          asset_id: verifiedAsset.asset_id || null,
          asset_type: "IMAGE",
          resource_type: verifiedAsset.resource_type,
          delivery_type: verifiedAsset.type,
          secure_url: verifiedAsset.secure_url,
          version: verifiedAsset.version,
          format: verifiedAsset.format,
          folder: payload.folder,
          original_filename: verifiedAsset.original_filename,
          width: verifiedAsset.width,
          height: verifiedAsset.height,
          bytes: verifiedAsset.bytes,
          is_public: true,
          deleted_at: null,
        })
        .eq("id", existing.id)
        .select("id")
        .single();

      if (restoreError || !restored) {
        throw new Error("Failed to restore existing media metadata.");
      }

      await createAuditLog({
        actorProfileId: profile.id,
        action: existing.deleted_at ? "CMS_MEDIA_RESTORED" : "CMS_MEDIA_REUSED",
        entityType: "media_assets",
        entityId: restored.id,
        oldValue: { deleted_at: existing.deleted_at },
        newValue: { public_id: verifiedAsset.public_id, secure_url: verifiedAsset.secure_url },
      });

      revalidatePath("/teacher/website");
      return { success: true, mediaId: restored.id, secureUrl: verifiedAsset.secure_url };
    }

    // Standard database failure (not a duplicate) - clean up the orphan.
    console.error("Failed to save media asset to database:", error);
    await cleanupCloudinaryAsset(verifiedAsset.public_id, verifiedAsset.resource_type, verifiedAsset.type);
    throw new Error("Failed to save media metadata to database");
  }

  await createAuditLog({
    actorProfileId: profile.id,
    action: "CMS_MEDIA_UPLOADED",
    entityType: "media_assets",
    entityId: data.id,
    newValue: { public_id: verifiedAsset.public_id, secure_url: verifiedAsset.secure_url },
  });

  revalidatePath("/teacher/website");
  return { success: true, mediaId: data.id, secureUrl: verifiedAsset.secure_url };
}

/**
 * Helper to check if a media asset is referenced in the CMS.
 */
export async function findMediaReferences(mediaId: string): Promise<string[]> {
  await requireTeacher();
  const supabase = await createClient();
  const references: string[] = [];

  // Check Settings
  const { data: settings, error: settingsError } = await supabase.from("site_settings").select("id").or(`logo_media_id.eq.${mediaId},favicon_media_id.eq.${mediaId},default_og_media_id.eq.${mediaId}`).limit(1);
  if (settingsError) throw new Error("Could not verify settings references. Deletion was cancelled.");
  if (settings && settings.length > 0) references.push("Site Settings");

  // Check Pages
  const { data: pages, error: pagesError } = await supabase.from("site_pages").select("slug").eq("og_media_id", mediaId).limit(1);
  if (pagesError) throw new Error("Could not verify pages references. Deletion was cancelled.");
  if (pages && pages.length > 0) references.push(`Page: ${pages[0].slug}`);

  // Check Section Items
  const { data: items, error: itemsError } = await supabase.from("site_section_items").select("title").eq("media_id", mediaId).limit(1);
  if (itemsError) throw new Error("Could not verify section items references. Deletion was cancelled.");
  if (items && items.length > 0) references.push(`Section Item: ${items[0].title}`);

  // Check media IDs stored inside page-section JSON content (for example hero images).
  const { data: sections, error: sectionsError } = await supabase
    .from("site_page_sections")
    .select("section_key")
    .contains("content", { mediaId })
    .limit(1);
  if (sectionsError) throw new Error("Could not verify page section references. Deletion was cancelled.");
  if (sections && sections.length > 0) references.push(`Page Section: ${sections[0].section_key}`);

  return references;
}

/**
 * Safely delete a media asset. Fails closed if the asset is referenced or queries fail.
 * Implements a rollback if Cloudinary deletion fails.
 */
export async function deleteMediaAsset(mediaId: string) {
  const { profile } = await requireTeacher();
  const supabase = await createClient();

  const references = await findMediaReferences(mediaId);
  if (references.length > 0) {
    throw new Error(`Cannot delete asset. It is referenced in: ${references.join(", ")}`);
  }

  const { data: asset, error: fetchError } = await supabase
    .from("media_assets")
    .select("id, public_id, asset_id, resource_type, delivery_type, secure_url, deleted_at")
    .eq("id", mediaId)
    .single();

  if (fetchError || !asset) {
    throw new Error("Asset not found");
  }

  // Soft delete in DB first
  const { data: softDeleted, error: deleteError } = await supabase
    .from("media_assets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", mediaId)
    .is("deleted_at", null)
    .select("id")
    .single();

  if (deleteError || !softDeleted) {
    throw new Error("Failed to soft delete asset from database. Cloudinary deletion cancelled.");
  }

  // Destroy on Cloudinary with exact resource matching and CDN invalidation
  const destroyed = await cleanupCloudinaryAsset(asset.public_id, asset.resource_type, asset.delivery_type);
  
  if (!destroyed) {
    // Rollback the soft delete
    console.error("Cloudinary destroy failed. Rolling back database soft delete.");
    await supabase
      .from("media_assets")
      .update({ deleted_at: null })
      .eq("id", mediaId);
    
    throw new Error("Failed to destroy asset on Cloudinary. Deletion rolled back.");
  }

  await createAuditLog({
    actorProfileId: profile.id,
    action: "CMS_MEDIA_DELETED",
    entityType: "media_assets",
    entityId: mediaId,
    oldValue: asset,
    newValue: { deleted_at: new Date().toISOString() },
  });

  revalidatePath("/teacher/website");
  return { success: true };
}

