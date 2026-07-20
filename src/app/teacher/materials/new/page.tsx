import React from "react";
import { redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MaterialForm } from "@/components/materials/material-form";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

interface NewPageProps {
  searchParams: Promise<{
    batchId?: string;
    subjectId?: string;
  }>;
}

export default async function NewMaterialPage({ searchParams }: NewPageProps) {
  const sp = await searchParams;
  const preselectedBatchId = sp.batchId || "";
  const preselectedSubjectId = sp.subjectId || "";

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

  // Load all batches for the dropdown
  const [batchesResult, subjectsResult] = await Promise.all([
    admin.from("batches").select("id, name").order("name", { ascending: true }),
    admin
      .from("batch_subjects")
      .select("id, batch_id, name, code, status")
      .neq("status", "ARCHIVED")
      .order("display_order", { ascending: true }),
  ]);
  if (batchesResult.error) throw batchesResult.error;
  if (subjectsResult.error) throw subjectsResult.error;

  const initialData = preselectedBatchId
    ? {
        batch_id: preselectedBatchId,
        subject_id: preselectedSubjectId,
      }
    : undefined;

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Add New Study Material"
        description="Upload handouts, secure PDF notes, homework assignments, or link reference videos to your student batches."
      />
      <MaterialForm
        batches={batchesResult.data || []}
        subjects={subjectsResult.data || []}
        initialData={initialData}
      />
    </div>
  );
}
