import React from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { FileText, ArrowLeft } from "lucide-react";
import { StudentMaterialList } from "@/components/materials/StudentMaterialList";

interface PageProps {
  params: Promise<{
    batchId: string;
  }>;
  searchParams: Promise<{
    subjectId?: string;
  }>;
}

export default async function StudentBatchMaterialsPage({ params, searchParams }: PageProps) {
  const { batchId } = await params;
  const { subjectId } = await searchParams;

  const { destination, studentProfile } = await resolveAuthenticatedDestination();
  if (destination === "UNAUTHENTICATED") redirect("/login");
  if (destination === "PENDING_APPROVAL") redirect("/pending-approval");
  if (destination === "ACCOUNT_DISABLED") redirect("/account-disabled");
  if (destination !== "STUDENT_DASHBOARD" || !studentProfile) {
    redirect("/login?error=invalid_profile");
  }

  const supabase = await createClient();

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("id,name")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    notFound();
  }

  const { data: enrollment, error: enrollError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", studentProfile.id)
    .eq("batch_id", batchId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (enrollError) throw enrollError;
  if (!enrollment) redirect("/student?error=unauthorized_batch");

  const nowStr = new Date().toISOString();
  const { data: materials, error: materialsError } = await supabase
    .from("batch_contents")
    .select(`
      id,
      batch_id,
      subject_id,
      title,
      description,
      content_type,
      file_size,
      allow_download,
      external_url,
      published_at,
      created_at,
      release_at,
      expires_at,
      subject:batch_subjects(id,name,code)
    `)
    .eq("batch_id", batchId)
    .eq("status", "PUBLISHED")
    .or(`release_at.is.null,release_at.lte.${nowStr}`)
    .or(`expires_at.is.null,expires_at.gt.${nowStr}`)
    .order("created_at", { ascending: false });

  if (materialsError) throw materialsError;

  const activeMaterials = (materials || [])
    .filter((material) => {
      const isReleased = !material.release_at || new Date(material.release_at) <= new Date();
      const isNotExpired = !material.expires_at || new Date(material.expires_at) > new Date();
      return isReleased && isNotExpired;
    })
    .map((material) => ({
      ...material,
      description: material.description || "",
      published_at: material.published_at || material.created_at,
      subject: material.subject?.[0] || null,
    }));

  return (
    <div className="space-y-8 text-xs font-bold text-slate-800">
      {/* Back button and page header */}
      <div className="space-y-4">
        <Link
          href={`/student/batches/${batchId}`}
          className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors font-bold text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Batch Details
        </Link>
        <DashboardPageHeader
          title={`${batch.name} - Study Materials`}
          description="Access handouts, lectures, PDF slides, homework sheets, and class notes."
        />
      </div>

      {activeMaterials.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-border/40 shadow-sm text-center max-w-lg mx-auto">
          <FileText className="h-12 w-12 text-slate-300 mx-auto stroke-1 mb-4" />
          <h3 className="text-sm font-extrabold text-slate-700">No materials available yet</h3>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-semibold">
            When the teacher uploads PDF handouts, notes, or links for this batch, they will be listed here.
          </p>
        </div>
      ) : (
        <StudentMaterialList
          materials={activeMaterials}
          initialSubjectId={subjectId || "ALL"}
        />
      )}
    </div>
  );
}
