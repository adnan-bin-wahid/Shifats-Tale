import { redirect } from "next/navigation";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { ClassSessionForm } from "@/components/class-routine/class-session-form";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function NewClassSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string; subjectId?: string }>;
}) {
  const [{ destination }, params] = await Promise.all([
    resolveAuthenticatedDestination(),
    searchParams,
  ]);
  if (destination === "UNAUTHENTICATED") redirect("/login");
  if (destination !== "TEACHER_DASHBOARD") redirect("/student");

  const admin = createAdminClient();
  const [batchesResult, subjectsResult, unitsResult] = await Promise.all([
    admin.from("batches").select("id,name,code").not("status", "in", "(ARCHIVED,CANCELLED)").order("name"),
    admin.from("batch_subjects").select("id,batch_id,name,code,status").neq("status", "ARCHIVED").order("display_order"),
    admin.from("subject_units").select("id,subject_id,title,sequence_no").neq("status", "SKIPPED").order("sequence_no"),
  ]);
  if (batchesResult.error || subjectsResult.error || unitsResult.error) {
    throw batchesResult.error || subjectsResult.error || unitsResult.error;
  }
  // Server-rendered default for tomorrow's class form.
  // eslint-disable-next-line react-hooks/purity
  const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  defaultStart.setUTCHours(11, 0, 0, 0);
  const defaultEnd = new Date(defaultStart.getTime() + 90 * 60 * 1000);

  return (
    <div className="space-y-6">
      <DashboardPageHeader title="Schedule Subject-linked Class" description="Set the exact topic, chapter, time, room, and student instructions for this class." />
      <ClassSessionForm
        batches={batchesResult.data || []}
        subjects={subjectsResult.data || []}
        units={unitsResult.data || []}
        preselectedBatchId={params.batchId || ""}
        preselectedSubjectId={params.subjectId || ""}
        defaultStartsAt={defaultStart.toISOString()}
        defaultEndsAt={defaultEnd.toISOString()}
      />
    </div>
  );
}
