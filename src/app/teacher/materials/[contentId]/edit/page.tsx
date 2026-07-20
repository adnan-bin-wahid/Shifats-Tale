import React from "react";
import { redirect, notFound } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MaterialForm } from "@/components/materials/material-form";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

interface PageProps {
  params: Promise<{
    contentId: string;
  }>;
}

export default async function EditMaterialPage({ params }: PageProps) {
  const { contentId } = await params;
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

  // Load the target material
  const { data: material, error } = await admin
    .from("batch_contents")
    .select("id, batch_id, subject_id, title, description, content_type, status, external_url, allow_download, release_at, expires_at, original_filename")
    .eq("id", contentId)
    .single();

  if (error || !material) {
    notFound();
  }

  // Load all batches for selection
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

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Edit Study Material"
        description={`Update metadata, status, release schedules, or replace the uploaded file for ${material.title}.`}
      />
      <MaterialForm
        batches={batchesResult.data || []}
        subjects={subjectsResult.data || []}
        initialData={material}
      />
    </div>
  );
}
