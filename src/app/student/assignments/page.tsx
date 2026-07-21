import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Sparkles,
  Target,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

function one<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] || null : value;
}

function formatDhaka(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

export default async function StudentAssignmentsPage() {
  const { destination, studentProfile } = await resolveAuthenticatedDestination();
  if (destination === "UNAUTHENTICATED") redirect("/login");
  if (destination === "PENDING_APPROVAL") redirect("/pending-approval");
  if (destination === "ACCOUNT_DISABLED") redirect("/account-disabled");
  if (destination !== "STUDENT_DASHBOARD" || !studentProfile) redirect("/login?error=invalid_profile");

  const supabase = await createClient();
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("batch_id")
    .eq("student_id", studentProfile.id)
    .eq("status", "ACTIVE");
  if (enrollmentError) throw enrollmentError;
  const batchIds = (enrollments || []).map((row) => row.batch_id);

  const [assignmentsResult, submissionsResult] = batchIds.length
    ? await Promise.all([
        supabase
          .from("academic_assignments")
          .select("*,batch:batches(id,name,code),subject:batch_subjects(id,name,code),unit:subject_units(id,title)")
          .in("batch_id", batchIds)
          .in("status", ["PUBLISHED", "CLOSED"])
          .order("due_at", { ascending: true }),
        supabase
          .from("academic_assignment_submissions")
          .select("assignment_id,status,marks_obtained,submitted_at")
          .eq("student_id", studentProfile.id),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (assignmentsResult.error || submissionsResult.error) {
    throw assignmentsResult.error || submissionsResult.error;
  }

  const submissions = submissionsResult.data || [];
  const submissionByAssignment = new Map(submissions.map((item) => [item.assignment_id, item]));
  const assignments = assignmentsResult.data || [];
  // Server-rendered request snapshot used only to classify current deadlines.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const open = assignments.filter((item) => item.status === "PUBLISHED" && !submissionByAssignment.has(item.id));
  const urgent = open.filter((item) => {
    const remaining = new Date(item.due_at).getTime() - now;
    return remaining >= 0 && remaining <= 48 * 60 * 60 * 1000;
  });
  const submitted = assignments.filter((item) => submissionByAssignment.has(item.id));
  const reviewed = submitted.filter((item) => submissionByAssignment.get(item.id)?.status === "REVIEWED");

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 pb-12">
      <DashboardPageHeader
        title="My Assignments"
        description="Stay ahead of every deadline, submit your work, and learn from teacher feedback."
      />

      <section className="relative overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_85%_12%,rgba(103,232,249,.18),transparent_28%),linear-gradient(135deg,#061633,#102A66_58%,#214A9A)] p-6 text-white shadow-2xl shadow-blue-950/15 sm:p-8">
        <div className="relative grid gap-8 xl:grid-cols-[1.2fr_1fr] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100"><Sparkles className="h-3.5 w-3.5" /> Personal study desk</div>
            <h1 className="mt-5 max-w-2xl font-display text-3xl font-black leading-tight sm:text-4xl">Know what is due, submit with confidence, improve with feedback.</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-blue-100/80">Every task is linked to the exact subject and topic you are learning.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: open.length, label: "To submit", Icon: ClipboardList },
              { value: urgent.length, label: "Due in 48h", Icon: Clock3 },
              { value: submitted.length, label: "Submitted", Icon: CheckCircle2 },
              { value: reviewed.length, label: "Reviewed", Icon: Target },
            ].map(({ value, label, Icon }) => <div key={label} className="rounded-2xl border border-white/12 bg-white/[0.08] p-4"><Icon className="h-4 w-4 text-cyan-200" /><p className="mt-3 font-display text-2xl font-black">{value}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wider text-blue-100/70">{label}</p></div>)}
          </div>
        </div>
      </section>

      {assignments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><BookOpenCheck className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 font-display text-lg font-black text-primary">No assignments yet</h2><p className="mx-auto mt-2 max-w-md text-xs font-semibold text-muted">Published homework from your active batches will appear here.</p></div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4"><div><h2 className="font-display text-xl font-black text-primary">Assignment timeline</h2><p className="mt-1 text-xs font-semibold text-muted">Upcoming deadlines appear first.</p></div><span className="text-[10px] font-black uppercase tracking-wide text-muted">{assignments.length} tasks</span></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assignments.map((assignment) => {
              const batch = one(assignment.batch as unknown as { name: string; code: string } | { name: string; code: string }[] | null);
              const subject = one(assignment.subject as unknown as { name: string; code: string } | { name: string; code: string }[] | null);
              const unit = one(assignment.unit as unknown as { title: string } | { title: string }[] | null);
              const submission = submissionByAssignment.get(assignment.id);
              const overdue = new Date(assignment.due_at).getTime() < now;
              return (
                <Link key={assignment.id} href={`/student/assignments/${assignment.id}`} className="group rounded-3xl border border-border/60 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/8">
                  <div className="flex items-start justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={submission?.status || (overdue ? "OVERDUE" : assignment.status)} /><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-blue-600">{assignment.assignment_type.replaceAll("_", " ")}</span></div><span className="rounded-xl bg-slate-50 p-2 text-slate-400 transition group-hover:bg-blue-50 group-hover:text-blue-700"><ArrowRight className="h-4 w-4" /></span></div>
                  <h3 className="mt-4 line-clamp-2 font-display text-lg font-black text-primary group-hover:text-blue-800">{assignment.title}</h3>
                  <p className="mt-2 text-[10px] font-bold text-blue-600">{batch?.name || "Batch"} · {subject?.name || "Subject"}</p>
                  {unit && <p className="mt-1 truncate text-[10px] font-semibold text-muted">Topic: {unit.title}</p>}
                  <div className={`mt-5 rounded-2xl border p-4 ${overdue && !submission ? "border-rose-100 bg-rose-50/60" : "border-slate-100 bg-slate-50"}`}>
                    <div className="flex items-center gap-2"><CalendarClock className={`h-4 w-4 ${overdue && !submission ? "text-rose-600" : "text-violet-600"}`} /><span className="text-[10px] font-black uppercase tracking-wide text-muted">Due {formatDhaka(assignment.due_at)}</span></div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-3 text-[10px] font-bold"><span className="text-muted">Total marks</span><span className="font-black text-primary">{assignment.total_marks}</span></div>
                    {submission?.status === "REVIEWED" && <div className="mt-2 flex items-center justify-between text-[10px] font-bold"><span className="text-emerald-700">Your score</span><span className="font-black text-emerald-700">{submission.marks_obtained}/{assignment.total_marks}</span></div>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
