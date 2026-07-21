import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  MessageSquareText,
  Target,
} from "lucide-react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { StudentAssignmentSubmissionForm } from "@/components/assignments/student-assignment-submission-form";
import { requireActiveEnrollment } from "@/lib/auth-guards";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

function one<T>(value: T | T[] | null) {
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

export default async function StudentAssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const [{ assignmentId }, { destination, studentProfile }] = await Promise.all([
    params,
    resolveAuthenticatedDestination(),
  ]);
  if (destination === "UNAUTHENTICATED") redirect("/login");
  if (destination === "PENDING_APPROVAL") redirect("/pending-approval");
  if (destination === "ACCOUNT_DISABLED") redirect("/account-disabled");
  if (destination !== "STUDENT_DASHBOARD" || !studentProfile) redirect("/login?error=invalid_profile");

  const supabase = await createClient();
  const { data: assignment, error: assignmentError } = await supabase
    .from("academic_assignments")
    .select("*,batch:batches(id,name,code),subject:batch_subjects(id,name,code),unit:subject_units(id,title)")
    .eq("id", assignmentId)
    .single();
  if (assignmentError || !assignment) notFound();
  await requireActiveEnrollment(assignment.batch_id);

  const { data: submission, error: submissionError } = await supabase
    .from("academic_assignment_submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentProfile.id)
    .maybeSingle();
  if (submissionError) throw submissionError;

  const batch = one(assignment.batch as unknown as { name: string; code: string } | { name: string; code: string }[] | null);
  const subject = one(assignment.subject as unknown as { name: string; code: string } | { name: string; code: string }[] | null);
  const unit = one(assignment.unit as unknown as { title: string } | { title: string }[] | null);
  // Server-rendered request snapshot used only to classify the current deadline.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const overdue = new Date(assignment.due_at).getTime() < now;
  const reviewed = submission?.status === "REVIEWED";
  const closed = assignment.status !== "PUBLISHED";
  const deadlineLocked = overdue && !assignment.allow_late_submission;
  const disabled = reviewed || closed || deadlineLocked;
  const disabledReason = reviewed
    ? "Your teacher has reviewed this work. The submitted answer is now locked."
    : closed
      ? "This assignment is closed and no longer accepts submissions."
      : deadlineLocked
        ? "The deadline has passed and late submissions are not enabled."
        : undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <Link href="/student/assignments" className="inline-flex items-center gap-2 text-xs font-black text-slate-500 transition hover:text-blue-700"><ArrowLeft className="h-4 w-4" /> My assignments</Link>

      <section className="relative overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_90%_10%,rgba(103,232,249,.15),transparent_27%),linear-gradient(135deg,#071A3D,#102A66_58%,#244B9C)] p-6 text-white shadow-xl shadow-blue-950/10 sm:p-8">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={submission?.status || (overdue ? "OVERDUE" : assignment.status)} /><span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-cyan-100">{assignment.assignment_type.replaceAll("_", " ")}</span></div>
        <h1 className="mt-5 max-w-4xl font-display text-3xl font-black leading-tight sm:text-4xl">{assignment.title}</h1>
        <p className="mt-3 text-xs font-bold text-blue-100">{batch?.name || "Batch"} · {subject?.name || "Subject"}{unit ? ` · ${unit.title}` : ""}</p>
        {assignment.description && <p className="mt-5 max-w-3xl text-sm font-medium leading-6 text-blue-100/80">{assignment.description}</p>}
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/12 bg-white/[0.08] p-4"><CalendarClock className="h-4 w-4 text-cyan-200" /><p className="mt-3 text-[9px] font-black uppercase tracking-wide text-blue-100/60">Deadline</p><p className="mt-1 text-xs font-black">{formatDhaka(assignment.due_at)}</p></div>
          <div className="rounded-2xl border border-white/12 bg-white/[0.08] p-4"><Target className="h-4 w-4 text-cyan-200" /><p className="mt-3 text-[9px] font-black uppercase tracking-wide text-blue-100/60">Total marks</p><p className="mt-1 text-xl font-black">{assignment.total_marks}</p></div>
          <div className="rounded-2xl border border-white/12 bg-white/[0.08] p-4"><CheckCircle2 className="h-4 w-4 text-cyan-200" /><p className="mt-3 text-[9px] font-black uppercase tracking-wide text-blue-100/60">Late policy</p><p className="mt-1 text-xs font-black">{assignment.allow_late_submission ? "Accepted & labelled" : "Not accepted"}</p></div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[.95fr_1.05fr]">
        <section className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-700" /><h2 className="font-display text-lg font-black text-primary">Instructions</h2></div>
          <div className="mt-5 whitespace-pre-wrap text-xs font-semibold leading-6 text-slate-600">{assignment.instructions || "Follow the task description and submit your answer before the deadline."}</div>
          {assignment.resource_url && <a href={assignment.resource_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700"><ExternalLink className="h-4 w-4" /> Open supporting resource</a>}
        </section>

        <section className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-700" /><h2 className="font-display text-lg font-black text-primary">Your submission</h2></div>
          <p className="mt-1 text-xs font-semibold text-muted">You can update submitted work until it is reviewed or the task closes.</p>
          <div className="mt-5">
            <StudentAssignmentSubmissionForm assignmentId={assignment.id} existing={submission ? { submission_text: submission.submission_text, submission_url: submission.submission_url, status: submission.status } : null} disabled={disabled} disabledReason={disabledReason} />
          </div>
        </section>
      </div>

      {submission && (
        <section className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${submission.status === "REVIEWED" ? "border-emerald-100 bg-emerald-50/50" : submission.status === "RETURNED" ? "border-amber-100 bg-amber-50/55" : "border-blue-100 bg-blue-50/45"}`}>
          <div className="flex items-center gap-2"><MessageSquareText className={`h-5 w-5 ${submission.status === "REVIEWED" ? "text-emerald-700" : "text-amber-700"}`} /><h2 className="font-display text-lg font-black text-primary">Teacher feedback</h2></div>
          {submission.feedback ? <p className="mt-4 whitespace-pre-wrap text-xs font-semibold leading-6 text-slate-700">{submission.feedback}</p> : <p className="mt-4 text-xs font-semibold text-muted">Your teacher has not added feedback yet.</p>}
          {submission.status === "REVIEWED" && <div className="mt-5 inline-flex items-baseline gap-2 rounded-2xl bg-white px-5 py-3 shadow-sm"><span className="text-[10px] font-black uppercase tracking-wide text-muted">Score</span><span className="font-display text-2xl font-black text-emerald-700">{submission.marks_obtained}/{assignment.total_marks}</span></div>}
          {submission.status === "RETURNED" && <p className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-[10px] font-black text-amber-800">Update your response using the form above, then resubmit.</p>}
        </section>
      )}
    </div>
  );
}
