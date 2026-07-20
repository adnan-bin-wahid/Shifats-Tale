import { z } from "zod";

export const materialSchema = z.object({
  batchId: z.string().uuid("Invalid Batch selection"),
  subjectId: z.union([z.string().uuid("Invalid subject selection"), z.literal("")]).optional().nullable(),
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  contentType: z.enum(["PDF", "DOC", "DOCX", "IMAGE", "LINK", "YOUTUBE", "NOTE", "ANNOUNCEMENT"]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  description: z.string().optional().nullable().or(z.literal("")),
  externalUrl: z.string().optional().nullable().or(z.literal("")),
  allowDownload: z.preprocess((val) => val === true || val === "true", z.boolean()).default(true),
  releaseAt: z.string().optional().nullable().or(z.literal("")),
  expiresAt: z.string().optional().nullable().or(z.literal("")),
}).refine(
  (data) => {
    if (data.releaseAt && data.expiresAt) {
      return new Date(data.expiresAt) > new Date(data.releaseAt);
    }
    return true;
  },
  {
    message: "Expiry date must be after release date",
    path: ["expiresAt"],
  }
).refine(
  (data) => {
    // LINK and YOUTUBE require externalUrl
    if (["LINK", "YOUTUBE"].includes(data.contentType)) {
      if (!data.externalUrl) return false;
      try {
        const parsed = new URL(data.externalUrl);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    }
    return true;
  },
  {
    message: "A valid external URL (http/https) is required for LINK and YOUTUBE",
    path: ["externalUrl"],
  }
).refine(
  (data) => {
    // NOTE and ANNOUNCEMENT require meaningful description
    if (["NOTE", "ANNOUNCEMENT"].includes(data.contentType)) {
      return !!data.description && data.description.trim().length > 0;
    }
    return true;
  },
  {
    message: "Description/body text is required for NOTE and ANNOUNCEMENT",
    path: ["description"],
  }
);

export type MaterialFormInput = z.infer<typeof materialSchema>;

export const announcementSchema = z.object({
  batchId: z.string().uuid("Invalid Batch selection"),
  subjectId: z.union([z.string().uuid("Invalid subject selection"), z.literal("")]).optional().nullable(),
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  message: z.string().min(1, "Message is required"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  releaseAt: z.string().optional().nullable().or(z.literal("")),
  expiresAt: z.string().optional().nullable().or(z.literal("")),
}).refine(
  (data) => {
    if (data.releaseAt && data.expiresAt) {
      return new Date(data.expiresAt) > new Date(data.releaseAt);
    }
    return true;
  },
  {
    message: "Expiry date must be after release date",
    path: ["expiresAt"],
  }
);

export type AnnouncementFormInput = z.infer<typeof announcementSchema>;
