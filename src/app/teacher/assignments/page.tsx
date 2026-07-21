import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { AssignmentFilters } from "@/components/assignments/assignment-filters";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Relation = { id: string; name: string; code?: string };

function relation<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] || null : value;
}

function formatDhaka(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

export default async function TeacherAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    batchId?: string;
    subjectId?: string;
    status?: string;
    q?: string;
  }>;
}) {
  const [{ destination }, filters] = await Promise.all([
    resolveAuthenticatedDestination(),
    searchParams,
  ]);
  if (destination === "UNAUTHENTICATED") redirect("/login");
  if (destination !== "TEACHER_DASHBOARD") redirect("/student");

  const admin = createAdminClient();
  let query = admin
    .from("academic_assignments")
    .select("*,batch:batches(id,name,code),subject:batch_subjects(id,name,code),unit:subject_units(id,title)")
    .order("due_at", { ascending: true });
  if (filters.batchId) query = query.eq("batch_id", filters.batchId);
  if (filters.subjectId) query = query.eq("subject_id", filters.subjectId);
  if (filters.status) query = query.eq("status", filters.status as "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED");
  if (filters.q?.trim()) query = query.ilike("title", `%${filters.q.trim()}%`);

  const [assignmentsResult, submissionsResult, batchesResult, subjectsResult] =
    await Promise.all([
      query,
      admin.from("academic_assignment_submissions").select("assignment_id,status"),
      admin.from("batches").select("id,name").order("name"),
      admin.from("batch_subjects").select("id,batch_id,name").order("display_order"),
    ]);
  const error = assignmentsResult.error || submissionsResult.error || batchesResult.error || subjectsResult.error;
  if (error) throw error;

  const assignments = assignmentsResult.data || [];
  const submissions = submissionsResult.data || [];
  // Server-rendered request snapshot used only to classify current deadlines.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const published = assignments.filter((item) => item.status === "PUBLISHED").length;
  const overdue = assignments.filter(
    (item) => item.status === "PUBLISHED" && new Date(item.due_at).getTime() < now
  ).length;
  const pendingReview = submissions.filter((item) => ["SUBMITTED", "LATE"].includes(item.status)).length;
  const reviewed = submissions.filter((item) => item.status === "REVIEWED").length;

  return (
    <div className="space-y-7">
      <DashboardPageHeader
        title="Assignments & Homework"
        description="Create subject-linked work, monitor every submission, and publish actionable feedback."
        actions={
          <Link href="/teacher/assignments/new" className="primary-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black">
            <Plus className="h-4 w-4" /> Create assignment
          </Link>
        }
      />

      <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#071A3D,#102A66_58%,#264EA3)] p-6 text-white shadow-xl shadow-blue-950/10 sm:p-7">
        <div className="relative grid gap-6 xl:grid-cols-[1.2fr_1fr] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
              <ClipboardList className="h-3.5 w-3.5" /> Continuous learning workflow
            </div>
            <h2 className="mt-4 max-w-xl font-display text-2xl font-black sm:text-3xl">One clear desk for homework, submissions, and feedback.</h2>
            <p className="mt-2 max-w-xl text-xs font-semibold leading-6 text-blue-100/80">Students always know what is due next. You always know what still needs attention.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: published, label: "Published", Icon: Send },
              { value: overdue, label: "Past due", Icon: Clock3 },
              { value: pendingReview, label: "To review", Icon: Users },
              { value: reviewed, label: "Reviewed", Icon: CheckCircle2 },
            ].map(({ value, label, Icon }) => (
              <div key={label} className="rounded-2xl border border-white/12 bg-white/[0.08] p-4">
                <Icon className="h-4 w-4 text-cyan-200" />
                <p className="mt-3 font-display text-2xl font-black">{value}</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-blue-100/70">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AssignmentFilters
        batches={batchesResult.data || []}
        subjects={subjectsResult.data || []}
        initialBatchId={filters.batchId || ""}
        initialSubjectId={filters.subjectId || ""}
        initialStatus={filters.status || ""}
        initialQuery={filters.q || ""}
      />

      {assignments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <BookOpenCheck className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-4 font-display text-lg font-black text-primary">No assignments match these filters</h3>
          <p className="mx-auto mt-2 max-w-md text-xs font-semibold text-muted">Reset the filters or create the first assignment for a subject.</p>
          <Link href="/teacher/assignments/new" className="primary-btn mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black"><Plus className="h-4 w-4" /> Create assignment</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map((assignment) => {
            const batch = relation(assignment.batch as unknown as Relation | Relation[] | null);
            const subject = relation(assignment.subject as unknown as Relation | Relation[] | null);
            const unit = relation(assignment.unit as unknown as { id: string; title: string } | { id: string; title: string }[] | null);
            const relatedSubmissions = submissions.filter((item) => item.assignment_id === assignment.id);
            const awaiting = relatedSubmissions.filter((item) => ["SUBMITTED", "LATE"].includes(item.status)).length;
            return (
              <Link key={assignment.id} href={`/teacher/assignments/${assignment.id}`} className="group rounded-3xl border border-border/60 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/8">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={assignment.status} />
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-violet-600">{assignment.assignment_type.replaceAll("_", " ")}</span>
                  </div>
                  <span className="rounded-xl bg-slate-50 p-2 text-slate-400 transition group-hover:bg-blue-50 group-hover:text-blue-700"><ArrowRight className="h-4 w-4" /></span>
                </div>
                <h3 className="mt-4 line-clamp-2 font-display text-lg font-black text-primary group-hover:text-blue-800">{assignment.title}</h3>
                <p className="mt-2 text-[10px] font-bold text-blue-600">{batch?.name || "Batch"} · {subject?.name || "Subject"}</p>
                {unit && <p className="mt-1 truncate text-[10px] font-semibold text-muted">Unit: {unit.title}</p>}
                <div className="mt-5 rounded-2xl bg-slate-50 p-3.5">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-bold">
                    <span className="text-slate-500">Due</span>
                    <span className="text-primary">{formatDhaka(assignment.due_at)}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200/70 pt-3 text-center">
                    <div><p className="font-display text-lg font-black text-primary">{relatedSubmissions.length}</p><p className="text-[8px] font-black uppercase tracking-wide text-muted">Received</p></div>
                    <div><p className="font-display text-lg font-black text-amber-600">{awaiting}</p><p className="text-[8px] font-black uppercase tracking-wide text-muted">To review</p></div>
                    <div><p className="font-display text-lg font-black text-emerald-700">{assignment.total_marks}</p><p className="text-[8px] font-black uppercase tracking-wide text-muted">Marks</p></div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
