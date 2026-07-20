import React from "react";
import { redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeacherMaterialsList } from "@/components/materials/teacher-materials-list";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";

export default async function TeacherMaterialsPage() {
  // Authoritative server-side status resolution
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

  const [materialsResult, batchesResult, subjectsResult] = await Promise.all([
    admin
      .from("batch_contents")
      .select("*, batches(name), subject:batch_subjects(id, name, code)")
      .order("created_at", { ascending: false }),
    admin
      .from("batches")
      .select("id, name")
      .order("name", { ascending: true }),
    admin
      .from("batch_subjects")
      .select("id,batch_id,name,code")
      .neq("status", "ARCHIVED")
      .order("display_order", { ascending: true }),
  ]);

  if (materialsResult.error) {
    throw new Error(`Unable to load study materials: ${materialsResult.error.message}`);
  }
  if (batchesResult.error || subjectsResult.error) {
    throw new Error("Unable to load material filters right now.");
  }
  const normalizedMaterials = (materialsResult.data || []).map((material) => ({
    ...material,
    subject: material.subject?.[0] || null,
  }));

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Class Study Materials"
        description="Upload handouts, secure PDF notes, homework assignments, or link reference videos to your student batches."
      />
      <TeacherMaterialsList
        key="all-materials"
        materials={normalizedMaterials}
        batches={batchesResult.data || []}
        subjects={subjectsResult.data || []}
      />
    </div>
  );
}
