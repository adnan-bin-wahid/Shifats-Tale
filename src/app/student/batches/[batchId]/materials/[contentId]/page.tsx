import React from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSignedAccessUrl } from "@/lib/cloudinary";
import { ArrowLeft, Download, FileText, FileImage } from "lucide-react";

interface PageProps {
  params: Promise<{
    batchId: string;
    contentId: string;
  }>;
}

export default async function StudentMaterialDetailsPage({ params }: PageProps) {
  const { batchId, contentId } = await params;

  // 1. Authoritative Auth Check
  const { destination, profile, studentProfile } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") {
    redirect("/login");
  }
  if (destination === "PENDING_APPROVAL") {
    redirect("/pending-approval");
  }
  if (destination === "ACCOUNT_DISABLED") {
    redirect("/account-disabled");
  }
  if (destination === "INVALID_PROFILE") {
    redirect("/login?error=invalid_profile");
  }

  const supabase = await createClient();

  // 2. Fetch Batch details
  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    notFound();
  }

  // 3. Authorization Check: Active student enrollment
  if (!studentProfile) {
    redirect("/login?error=invalid_profile");
  }

  const { data: enrollment, error: enrollError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", studentProfile.id)
    .eq("batch_id", batchId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (enrollError || !enrollment) {
    redirect("/student?error=unauthorized_batch");
  }

  // 4. Fetch material details
  const admin = createAdminClient();
  const { data: material, error: materialError } = await admin
    .from("batch_contents")
    .select("*")
    .eq("id", contentId)
    .eq("batch_id", batchId)
    .single();

  if (materialError || !material) {
    notFound();
  }

  // Enforce Student gating rules
  if (material.status !== "PUBLISHED") {
    redirect(`/student/batches/${batchId}/materials?error=unavailable`);
  }

  const now = new Date();
  if (material.release_at && new Date(material.release_at) > now) {
    redirect(`/student/batches/${batchId}/materials?error=scheduled`);
  }
  if (material.expires_at && new Date(material.expires_at) <= now) {
    redirect(`/student/batches/${batchId}/materials?error=expired`);
  }

  // Only PDF and IMAGE are previewable
  const isPdf = material.cloudinary_format === "pdf" || material.content_type === "PDF";
  const isImage = ["jpg", "jpeg", "png", "webp"].includes(material.cloudinary_format || "") || material.content_type === "IMAGE";

  if (!isPdf && !isImage) {
    redirect(`/student/batches/${batchId}/materials`);
  }

  // 5. Generate signed Cloudinary URL on the server (valid for 2 minutes)
  const resourceType = (material.cloudinary_resource_type as "image" | "raw") || "raw";
  const signedPreviewUrl = generateSignedAccessUrl(
    material.cloudinary_public_id!,
    resourceType,
    material.cloudinary_format,
    false, // allowDownload = false for preview mode
    120
  );

  return (
    <div className="space-y-6 text-xs font-bold text-slate-800">
      {/* Navigation and header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href={`/student/batches/${batchId}/materials`}
            className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors font-bold text-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Materials List
          </Link>
          <h1 className="text-xl font-extrabold text-slate-900 mt-2">{material.title}</h1>
          {material.description && (
            <p className="text-[11px] text-slate-500 font-semibold max-w-2xl">{material.description}</p>
          )}
        </div>

        {material.allow_download && (
          <div>
            <a
              href={`/api/materials/${material.id}/access?mode=download`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white hover:bg-primary-dark rounded-xl transition-all font-bold text-xs shadow-sm"
            >
              <Download className="h-4 w-4" />
              Download Document
            </a>
          </div>
        )}
      </div>

      {/* Preview box */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col items-center justify-center p-6 min-h-[600px]">
        {isPdf ? (
          <div className="w-full h-[650px] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50 text-[10px] text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5 font-bold">
                <FileText className="h-4 w-4 text-primary" />
                Document Viewer (Secure PDF)
              </span>
              <span>Short-lived access link refreshed</span>
            </div>
            <iframe
              src={signedPreviewUrl}
              className="w-full flex-grow border-none"
              title={material.title}
            />
          </div>
        ) : isImage ? (
          <div className="w-full flex flex-col items-center">
            <div className="w-full flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50 text-[10px] text-slate-500 font-semibold mb-4">
              <span className="flex items-center gap-1.5 font-bold">
                <FileImage className="h-4 w-4 text-primary" />
                Image Preview
              </span>
            </div>
            <div className="max-w-4xl max-h-[600px] overflow-auto border border-slate-100 rounded-xl bg-slate-50 p-2 flex items-center justify-center">
              <img
                src={signedPreviewUrl}
                alt={material.title}
                className="max-w-full h-auto object-contain rounded"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
