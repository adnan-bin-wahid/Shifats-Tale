import React from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeacherMaterialsList } from "@/components/materials/teacher-materials-list";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{
    batchId: string;
  }>;
  searchParams: Promise<{ subjectId?: string }>;
}

export default async function TeacherBatchMaterialsPage({ params, searchParams }: PageProps) {
  const { batchId } = await params;
  const { subjectId = "" } = await searchParams;
  const { destination } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") {
    redirect("/login");
  }
  if (destination === "STUDENT_DASHBOARD") {
    redirect("/student");
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

  const admin = createAdminClient();

  // Load batch details
  const { data: batch, error: batchError } = await admin
    .from("batches")
    .select("id,name")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    notFound();
  }

  // Load materials for this batch
  const [materialsResult, subjectsResult] = await Promise.all([
    admin
      .from("batch_contents")
      .select("*, batches(name), subject:batch_subjects(id, name, code)")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: false }),
    admin
      .from("batch_subjects")
      .select("id,batch_id,name,code")
      .eq("batch_id", batchId)
      .neq("status", "ARCHIVED")
      .order("display_order", { ascending: true }),
  ]);
  if (materialsResult.error) throw materialsResult.error;
  if (subjectsResult.error) throw subjectsResult.error;
  const validSubjectId =
    subjectId === "GENERAL" || subjectsResult.data?.some((subject) => subject.id === subjectId)
      ? subjectId
      : "";
  const normalizedMaterials = (materialsResult.data || []).map((material) => ({
    ...material,
    subject: material.subject?.[0] || null,
  }));

  return (
    <div className="space-y-6 text-xs font-bold text-slate-800">
      <div className="space-y-4">
        <Link
          href={`/teacher/batches/${batchId}`}
          className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors font-bold text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Batch Management
        </Link>
        <DashboardPageHeader
          title={`${batch.name} - Materials`}
          description="Manage handouts, lecture resources, and documents for this class."
        />
      </div>

      <TeacherMaterialsList
        key={`${batchId}:${validSubjectId}`}
        materials={normalizedMaterials}
        batches={[batch]}
        subjects={subjectsResult.data || []}
        selectedBatchId={batchId}
        selectedSubjectId={validSubjectId}
      />
    </div>
  );
}
