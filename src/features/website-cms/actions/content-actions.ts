"use server";

import { createClient } from "@/lib/supabase/server";
import { requireTeacher } from "@/lib/auth-guards";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function publicPathForSlug(slug: string | null | undefined) {
  const normalized = (slug || "").trim().replace(/^\/+|\/+$/g, "");
  return normalized ? `/${normalized}` : "/";
}

/**
 * Public: Get a specific page section by its key and the page key.
 * This resolves the secure_url if a media_id is provided in the content JSON.
 */
export async function getPageSection(pageKey: string, sectionKey: string) {
  const supabase = await createClient();

  const { data: page, error: pageError } = await supabase
    .from("vw_public_site_pages")
    .select("id")
    .eq("page_key", pageKey)
    .maybeSingle();

  if (pageError || !page) {
    return null;
  }

  const { data: section, error } = await supabase
    .from("vw_public_site_page_sections")
    .select("*")
    .eq("page_id", page.id)
    .eq("section_key", sectionKey)
    .maybeSingle();

  if (error || !section) {
    return null;
  }

  let mediaUrl = null;
  const content = section.content as Record<string, unknown> | null;
  const mediaId = typeof content?.mediaId === "string" ? content.mediaId : null;

  if (mediaId && UUID_PATTERN.test(mediaId)) {
    const { data: media } = await supabase
      .from("vw_public_media_assets")
      .select("secure_url")
      .eq("id", mediaId)
      .maybeSingle();

    if (media) {
      mediaUrl = media.secure_url;
    }
  }

  return {
    ...section,
    mediaUrl,
  };
}

/**
 * Teacher: Update a specific page section's content.
 */
export async function updatePageSection(
  pageKey: string,
  sectionKey: string,
  payload: {
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    content: Record<string, unknown>;
  }
) {
  const { profile } = await requireTeacher();
  const supabase = await createClient();

  if (!(["DRAFT", "PUBLISHED", "ARCHIVED"] as const).includes(payload.status)) {
    throw new Error("Invalid page section status");
  }

  if (!pageKey.trim() || !sectionKey.trim() || pageKey.length > 100 || sectionKey.length > 100) {
    throw new Error("Invalid page or section key");
  }

  const { data: page, error: pageError } = await supabase
    .from("site_pages")
    .select("id, page_key, slug")
    .eq("page_key", pageKey)
    .single();

  if (pageError || !page) {
    throw new Error("Page not found");
  }

  const { data: oldSection, error: sectionError } = await supabase
    .from("site_page_sections")
    .select("*")
    .eq("page_id", page.id)
    .eq("section_key", sectionKey)
    .single();

  if (sectionError || !oldSection) {
    throw new Error("Page section not found");
  }

  const mediaId = typeof payload.content?.mediaId === "string"
    ? payload.content.mediaId
    : null;

  if (mediaId) {
    if (!UUID_PATTERN.test(mediaId)) {
      throw new Error("Invalid media asset reference");
    }

    const { data: media, error: mediaError } = await supabase
      .from("media_assets")
      .select("id")
      .eq("id", mediaId)
      .is("deleted_at", null)
      .single();

    if (mediaError || !media) {
      throw new Error("Selected media asset is unavailable");
    }
  }

  const publishedAt = payload.status === "PUBLISHED"
    ? oldSection.published_at || new Date().toISOString()
    : null;

  const { data: updatedSection, error } = await supabase
    .from("site_page_sections")
    .update({
      eyebrow: payload.eyebrow || null,
      title: payload.title || null,
      subtitle: payload.subtitle || null,
      description: payload.description || null,
      status: payload.status,
      content: payload.content,
      published_at: publishedAt,
      updated_by: profile.id,
    })
    .eq("id", oldSection.id)
    .select("*")
    .single();

  if (error || !updatedSection) {
    console.error("Failed to update page section:", error);
    throw new Error("Failed to update section content");
  }

  await createAuditLog({
    actorProfileId: profile.id,
    action: "CMS_PAGE_SECTION_UPDATED",
    entityType: "site_page_sections",
    entityId: updatedSection.id,
    oldValue: oldSection,
    newValue: updatedSection,
  });

  revalidatePath("/teacher/website");
  revalidatePath("/teacher/website/courses/hero");
  revalidatePath(publicPathForSlug(page.slug));

  return { success: true, section: updatedSection };
}
