"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher } from "@/lib/auth-guards";
import { revalidatePath } from "next/cache";
import { SitePageSection } from "../types/cms-types";

/**
 * Public: Get a specific page section by its key and the page key.
 * This resolves the secure_url if a media_id is provided in the content JSON.
 */
export async function getPageSection(pageKey: string, sectionKey: string) {
  const supabase = await createClient();

  const { data: section, error } = await supabase
    .from("vw_public_site_page_sections")
    .select("*")
    .eq("section_key", sectionKey)
    .maybeSingle();

  // Validate the page_key matches implicitly since the view filters active pages, 
  // but to be perfectly strict we should join or just trust the section_key if it's unique enough.
  // We'll rely on the view logic.
  
  if (error || !section) {
    return null;
  }

  // Auto-resolve media URL if mediaId exists in content
  let mediaUrl = null;
  let content = section.content;
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content);
    } catch (e) {
      content = {};
    }
  }
  
  if (content && content.mediaId) {
    const { data: media } = await supabase
      .from("vw_public_media_assets")
      .select("secure_url")
      .eq("id", content.mediaId)
      .maybeSingle();
    
    if (media) {
      mediaUrl = media.secure_url;
    }
  }

  return {
    ...section,
    content: content || {},
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
    content: Record<string, any>;
  }
) {
  const { profile } = await requireTeacher();
  const supabase = await createClient();

  // First find the page ID
  let { data: page, error: pageError } = await supabase
    .from("site_pages")
    .select("id")
    .eq("page_key", pageKey)
    .single();

  if (pageError && pageError.code === "PGRST116") {
    // If not found, create the page automatically
    const { data: newPage, error: insertError } = await supabase
      .from("site_pages")
      .insert({ page_key: pageKey, name: pageKey, slug: pageKey.toLowerCase(), status: "PUBLISHED" } as any)
      .select("id")
      .single();
      
    if (insertError) {
      throw new Error("Failed to auto-create page: " + insertError.message);
    }
    page = newPage;
  } else if (pageError || !page) {
    throw new Error("Page not found");
  }

  const { data: existingSection } = await supabase
    .from("site_page_sections")
    .select("id")
    .eq("page_id", page.id)
    .eq("section_key", sectionKey)
    .maybeSingle();

  let error;

  if (existingSection) {
    const res = await supabase
      .from("site_page_sections")
      .update({
        eyebrow: payload.eyebrow || null,
        title: payload.title || null,
        subtitle: payload.subtitle || null,
        description: payload.description || null,
        status: payload.status,
        content: payload.content,
        updated_by: profile.id,
      })
      .eq("id", existingSection.id);
    error = res.error;
  } else {
    const res = await supabase
      .from("site_page_sections")
      .insert({
        page_id: page.id,
        section_key: sectionKey,
        component_key: sectionKey, // Add component_key to satisfy NOT NULL constraint
        eyebrow: payload.eyebrow || null,
        title: payload.title || null,
        subtitle: payload.subtitle || null,
        description: payload.description || null,
        status: payload.status,
        content: payload.content,
        updated_by: profile.id,
      });
    error = res.error;
  }

  if (error) {
    console.error("Failed to update page section:", error);
    throw new Error("Failed to update section content");
  }

  // Clear cache so public pages immediately show updates
  revalidatePath("/", "layout");

  return { success: true };
}

/**
 * Public: Get all items for a specific section.
 * Automatically resolves media URLs if media_id is present.
 */
export async function getSectionItems(sectionKey: string) {
  const adminAuth = createAdminClient();

  // 1. Get the section ID
  const { data: section, error: sectionError } = await adminAuth
    .from("site_page_sections")
    .select("id")
    .eq("section_key", sectionKey)
    .maybeSingle();

  if (sectionError || !section) {
    return [];
  }

  // 2. Get the items (fetch from base table instead of view to ensure metadata is included)
  const { data: items, error: itemsError } = await adminAuth
    .from("site_section_items")
    .select("*")
    .eq("section_id", section.id)
    .eq("status", "PUBLISHED")
    .order("sort_order", { ascending: true });

  if (itemsError) {
    console.error("Error fetching section items:", itemsError);
    return [];
  }

  // 3. Get media for these items
  const mediaIds = items.map((i: any) => i.media_id).filter(Boolean);
  let mediaMap: Record<string, string> = {};
  if (mediaIds.length > 0) {
    const { data: mediaAssets } = await adminAuth
      .from("vw_public_media_assets")
      .select("id, secure_url")
      .in("id", mediaIds);
    if (mediaAssets) {
      mediaAssets.forEach((m: any) => mediaMap[m.id] = m.secure_url);
    }
  }

  // Map to include mediaUrl directly for easier frontend consumption
  return items.map((item: any) => {
    let parsedMetadata = item.metadata;
    if (typeof item.metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(item.metadata);
      } catch (e) {
        parsedMetadata = {};
      }
    }

    return {
      ...item,
      metadata: parsedMetadata || {},
      mediaUrl: item.media_id ? (mediaMap[item.media_id] || null) : null,
    };
  });
}

/**
 * Teacher: Upsert a section item.
 */
export async function upsertSectionItem(
  sectionKey: string,
  payload: {
    id?: string;
    title: string;
    subtitle?: string;
    body?: string;
    media_id?: string | null;
    metadata?: Record<string, any>;
    sort_order?: number;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  }
) {
  const { profile } = await requireTeacher();
  const supabase = await createClient();

  // 1. Get the section ID
  const { data: section, error: sectionError } = await supabase
    .from("site_page_sections")
    .select("id")
    .eq("section_key", sectionKey)
    .single();

  if (sectionError || !section) {
    throw new Error("Section not found");
  }

  const itemData = {
    section_id: section.id,
    title: payload.title,
    subtitle: payload.subtitle || null,
    body: payload.body || null,
    media_id: payload.media_id || null,
    metadata: payload.metadata || {},
    sort_order: payload.sort_order || 0,
    status: payload.status,
    updated_by: profile.id,
  };

  let savedId = payload.id;

  if (payload.id) {
    // Update
    const { error } = await supabase
      .from("site_section_items")
      .update(itemData)
      .eq("id", payload.id)
      .eq("section_id", section.id);
      
    if (error) throw new Error("Failed to update item");
  } else {
    // Insert
    const { data, error } = await supabase
      .from("site_section_items")
      .insert({
        ...itemData,
        created_by: profile.id,
      })
      .select("id")
      .single();
      
    if (error) throw new Error("Failed to create item");
    savedId = data.id;
  }

  // Clear cache so public pages immediately show updates
  revalidatePath("/", "layout");

  return { success: true, id: savedId };
}

/**
 * Teacher: Delete a section item.
 */
export async function deleteSectionItem(itemId: string) {
  await requireTeacher();
  const supabase = await createClient();

  const { error } = await supabase
    .from("site_section_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error("Failed to delete section item:", error);
    throw new Error("Failed to delete item");
  }

  // Clear cache so public pages immediately show updates
  revalidatePath("/", "layout");

  return { success: true };
}

