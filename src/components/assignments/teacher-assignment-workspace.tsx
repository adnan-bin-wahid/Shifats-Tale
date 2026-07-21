"use client";

import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit3,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send,
  UserRound,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  reviewAssignmentSubmissionAction,
  updateAssignmentStatusAction,
} from "@/app/actions/assignments";
import { assignmentStatuses } from "@/lib/validations/assignments";

type Assignment = {
  id: string;
  batch_id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  assignment_type: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  assigned_at: string;
  due_at: string;
  total_marks: number;
  allow_late_submission: boolean;
  resource_url: string | null;
  batchName: string;
  batchCode: string;
  subjectName: string;
  subjectCode: string;
  unitTitle: string | null;
};

type Submission = {
  id: string;
  status: "SUBMITTED" | "LATE" | "REVIEWED" | "RETURNED";
  submitted_at: string;
  submission_text: string | null;
  submission_url: string | null;
  marks_obtained: number | null;
  feedback: string | null;
  studentName: string;
  studentCode: string;
};

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

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function TeacherAssignmentWorkspace({
  assignment,
  submissions,
  activeStudentCount,
}: {
  assignment: Assignment;
  submissions: Submission[];
  activeStudentCount: number;
}) {
  const router = useRouter();
  const [statusPending, startStatusTransition] = useTransition();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewPending, startReviewTransition] = useTransition();
  const reviewedCount = submissions.filter((item) => item.status === "REVIEWED").length;
  const pendingCount = submissions.filter((item) => ["SUBMITTED", "LATE"].includes(item.status)).length;
  const completion = activeStudentCount
    ? Math.round((submissions.length / activeStudentCount) * 100)
    : 0;

  function changeStatus(nextStatus: string) {
    startStatusTransition(async () => {
      const result = await updateAssignmentStatusAction(assignment.id, nextStatus);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      if (result.success) router.refresh();
    });
  }

  function review(form: HTMLFormElement, decision: "REVIEWED" | "RETURNED") {
    const formData = new FormData(form);
    formData.set("decision", decision);
    startReviewTransition(async () => {
      const result = await reviewAssignmentSubmissionAction(assignment.id, formData);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      if (result.success) {
        setReviewingId(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/teacher/assignments" className="inline-flex items-center gap-2 text-xs font-black text-slate-500 transition hover:text-blue-700">
          <ArrowLeft className="h-4 w-4" /> All assignments
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <select value={assignment.status} disabled={statusPending} onChange={(event) => changeStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-600 outline-none focus:border-blue-400">
            {assignmentStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
          </select>
          <Link href={`/teacher/assignments/${assignment.id}/edit`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:text-blue-700">
            <Edit3 className="h-4 w-4" /> Edit
          </Link>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_90%_10%,rgba(103,232,249,.15),transparent_27%),linear-gradient(135deg,#071A3D,#102A66_58%,#244B9C)] p-6 text-white shadow-xl shadow-blue-950/10 sm:p-8">
        <div className="relative grid gap-8 xl:grid-cols-[1.3fr_1fr] xl:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2"><StatusBadge status={assignment.status} /><span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-cyan-100">{assignment.assignment_type.replaceAll("_", " ")}</span></div>
            <h1 className="mt-5 max-w-3xl font-display text-3xl font-black leading-tight">{assignment.title}</h1>
            <p className="mt-3 text-xs font-bold text-blue-100">{assignment.batchName} · {assignment.subjectName}{assignment.unitTitle ? ` · ${assignment.unitTitle}` : ""}</p>
            {assignment.description && <p className="mt-5 max-w-3xl text-sm font-medium leading-6 text-blue-100/80">{assignment.description}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: submissions.length, label: "Received", Icon: Users },
              { value: pendingCount, label: "To review", Icon: Clock3 },
              { value: reviewedCount, label: "Reviewed", Icon: CheckCircle2 },
              { value: `${completion}%`, label: "Completion", Icon: Send },
            ].map(({ value, label, Icon }) => <div key={label} className="rounded-2xl border border-white/12 bg-white/[0.08] p-4"><Icon className="h-4 w-4 text-cyan-200" /><p className="mt-3 font-display text-2xl font-black">{value}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wider text-blue-100/70">{label}</p></div>)}
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-700" /><h2 className="font-display text-lg font-black text-primary">Assignment brief</h2></div>
          <div className="mt-5 whitespace-pre-wrap text-xs font-semibold leading-6 text-slate-600">{assignment.instructions || "No additional instructions were added."}</div>
          {assignment.resource_url && <a href={assignment.resource_url} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700"><ExternalLink className="h-4 w-4" /> Open supporting resource</a>}
        </section>
        <section className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-violet-700" /><h2 className="font-display text-lg font-black text-primary">Timeline & rules</h2></div>
          <dl className="mt-5 space-y-4 text-xs">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3"><dt className="font-bold text-muted">Released</dt><dd className="font-black text-primary">{formatDhaka(assignment.assigned_at)}</dd></div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3"><dt className="font-bold text-muted">Deadline</dt><dd className="font-black text-primary">{formatDhaka(assignment.due_at)}</dd></div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3"><dt className="font-bold text-muted">Total marks</dt><dd className="font-black text-primary">{assignment.total_marks}</dd></div>
            <div className="flex items-center justify-between gap-4"><dt className="font-bold text-muted">Late work</dt><dd className={`font-black ${assignment.allow_late_submission ? "text-amber-600" : "text-slate-500"}`}>{assignment.allow_late_submission ? "Accepted & labelled" : "Not accepted"}</dd></div>
          </dl>
        </section>
      </div>

      <section className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="flex items-center gap-2"><Users className="h-5 w-5 text-emerald-700" /><h2 className="font-display text-lg font-black text-primary">Student submissions</h2></div><p className="mt-1 text-xs font-semibold text-muted">Review responses, award marks, or return work with clear feedback.</p></div>
          <span className="text-[10px] font-black uppercase tracking-wide text-muted">{submissions.length}/{activeStudentCount} received</span>
        </div>

        {submissions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center"><UserRound className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-black text-primary">No submissions yet</p><p className="mt-1 text-[10px] font-semibold text-muted">Student work will appear here as soon as it is submitted.</p></div>
        ) : (
          <div className="mt-6 space-y-3">
            {submissions.map((submission) => (
              <article key={submission.id} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-primary">{submission.studentName}</h3><StatusBadge status={submission.status} /></div><p className="mt-1 text-[10px] font-bold text-muted">{submission.studentCode} · Submitted {formatDhaka(submission.submitted_at)}</p></div>
                  <button onClick={() => setReviewingId(reviewingId === submission.id ? null : submission.id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2 text-[10px] font-black text-blue-700 transition hover:bg-blue-100"><MessageSquareText className="h-3.5 w-3.5" /> {submission.status === "REVIEWED" ? "Update review" : "Review"}</button>
                </div>
                {submission.submission_text && <div className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-100 bg-white p-4 text-xs font-semibold leading-6 text-slate-600">{submission.submission_text}</div>}
                {submission.submission_url && <a href={submission.submission_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-black text-blue-700 hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Open student link</a>}
                {submission.feedback && reviewingId !== submission.id && <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs font-semibold text-emerald-800"><span className="font-black">Feedback:</span> {submission.feedback}{submission.marks_obtained != null && <span className="ml-2 font-black">· {submission.marks_obtained}/{assignment.total_marks}</span>}</div>}

                {reviewingId === submission.id && (
                  <form onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); review(event.currentTarget, "REVIEWED"); }} className="mt-4 grid gap-4 rounded-2xl border border-blue-100 bg-white p-4 sm:grid-cols-[160px_1fr]">
                    <input type="hidden" name="submissionId" value={submission.id} />
                    <label className="space-y-2 text-[10px] font-black uppercase tracking-wide text-slate-500">Marks
                      <input name="marksObtained" type="number" min="0" max={assignment.total_marks} step="0.01" defaultValue={submission.marks_obtained ?? ""} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black normal-case tracking-normal text-primary outline-none focus:border-blue-400" />
                    </label>
                    <label className="space-y-2 text-[10px] font-black uppercase tracking-wide text-slate-500">Feedback
                      <textarea name="feedback" rows={3} defaultValue={submission.feedback || ""} placeholder="What was done well and what to improve" className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold normal-case tracking-normal text-slate-600 outline-none focus:border-blue-400" />
                    </label>
                    <div className="flex flex-wrap gap-2 sm:col-span-2 sm:justify-end">
                      <button type="button" disabled={reviewPending} onClick={(event) => { const form = event.currentTarget.closest("form"); if (form) review(form, "RETURNED"); }} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-700"><RotateCcw className="h-4 w-4" /> Return for revision</button>
                      <button type="submit" disabled={reviewPending} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700">{reviewPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Publish review</button>
                    </div>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
