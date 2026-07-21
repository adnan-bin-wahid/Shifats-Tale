import { notFound, redirect } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { AssignmentForm } from "@/components/assignments/assignment-form";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const [{ assignmentId }, { destination }] = await Promise.all([
    params,
    resolveAuthenticatedDestination(),
  ]);
  if (destination === "UNAUTHENTICATED") redirect("/login");
  if (destination !== "TEACHER_DASHBOARD") redirect("/student");

  const admin = createAdminClient();
  const [assignmentResult, batchesResult, subjectsResult, unitsResult] = await Promise.all([
    admin.from("academic_assignments").select("*").eq("id", assignmentId).single(),
    admin.from("batches").select("id,name,code").order("name"),
    admin.from("batch_subjects").select("id,batch_id,name,code,status").order("display_order"),
    admin.from("subject_units").select("id,subject_id,title,sequence_no").order("sequence_no"),
  ]);
  if (assignmentResult.error || !assignmentResult.data) notFound();
  if (batchesResult.error || subjectsResult.error || unitsResult.error) {
    throw batchesResult.error || subjectsResult.error || unitsResult.error;
  }

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Edit Assignment"
        description="Update the assignment content, deadline, academic link, or publishing state."
      />
      <AssignmentForm
        batches={batchesResult.data || []}
        subjects={subjectsResult.data || []}
        units={unitsResult.data || []}
        initialData={assignmentResult.data}
      />
    </div>
  );
}
