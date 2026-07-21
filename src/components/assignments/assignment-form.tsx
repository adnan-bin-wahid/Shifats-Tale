"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Loader2, Save, Send } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import {
  createAssignmentAction,
  updateAssignmentAction,
} from "@/app/actions/assignments";
import {
  assignmentStatuses,
  assignmentTypes,
} from "@/lib/validations/assignments";

type BatchOption = { id: string; name: string; code: string };
type SubjectOption = {
  id: string;
  batch_id: string;
  name: string;
  code: string;
  status: string;
};
type UnitOption = {
  id: string;
  subject_id: string;
  title: string;
  sequence_no: number;
};
type AssignmentInitial = {
  id: string;
  batch_id: string;
  subject_id: string;
  unit_id: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  assignment_type: string;
  status: string;
  assigned_at: string;
  due_at: string;
  total_marks: number;
  allow_late_submission: boolean;
  resource_url: string | null;
};

function humanize(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function dhakaInputValue(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Dhaka",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function AssignmentForm({
  batches,
  subjects,
  units,
  initialData,
  preselectedBatchId = "",
  preselectedSubjectId = "",
}: {
  batches: BatchOption[];
  subjects: SubjectOption[];
  units: UnitOption[];
  initialData?: AssignmentInitial;
  preselectedBatchId?: string;
  preselectedSubjectId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const [batchId, setBatchId] = useState(
    initialData?.batch_id || preselectedBatchId
  );
  const [subjectId, setSubjectId] = useState(
    initialData?.subject_id || preselectedSubjectId
  );
  const [status, setStatus] = useState(initialData?.status || "DRAFT");

  const visibleSubjects = useMemo(
    () => subjects.filter((subject) => subject.batch_id === batchId),
    [batchId, subjects]
  );
  const visibleUnits = useMemo(
    () => units.filter((unit) => unit.subject_id === subjectId),
    [subjectId, units]
  );

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = initialData
        ? await updateAssignmentAction(initialData.id, formData)
        : await createAssignmentAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.push(`/teacher/assignments/${result.entityId || initialData?.id}`);
      router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border/60 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#F8FBFF,#EEF4FF)] px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-black text-primary">Assignment setup</h2>
              <p className="mt-1 text-xs font-semibold text-muted">
                Link the task to its exact batch, subject, and optional syllabus unit.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-2">
          <label className="space-y-2 text-xs font-black text-primary">
            Batch <span className="text-rose-500">*</span>
            <select
              name="batchId"
              value={batchId}
              required
              onChange={(event) => {
                setBatchId(event.target.value);
                setSubjectId("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-bold outline-none focus:border-blue-400"
            >
              <option value="">Select batch</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>{batch.name} · {batch.code}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-xs font-black text-primary">
            Subject <span className="text-rose-500">*</span>
            <select
              name="subjectId"
              value={subjectId}
              required
              disabled={!batchId}
              onChange={(event) => setSubjectId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-bold outline-none disabled:bg-slate-50 focus:border-blue-400"
            >
              <option value="">{batchId ? "Select subject" : "Select a batch first"}</option>
              {visibleSubjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name} · {subject.code}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-xs font-black text-primary lg:col-span-2">
            Syllabus unit <span className="font-semibold text-muted">(optional)</span>
            <select
              name="unitId"
              defaultValue={initialData?.unit_id || ""}
              disabled={!subjectId}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-bold outline-none disabled:bg-slate-50 focus:border-blue-400"
            >
              <option value="">General subject assignment</option>
              {visibleUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>#{unit.sequence_no} · {unit.title}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-xs font-black text-primary lg:col-span-2">
            Title <span className="text-rose-500">*</span>
            <input
              name="title"
              required
              maxLength={180}
              defaultValue={initialData?.title || ""}
              placeholder="e.g. Vector decomposition practice set"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-bold outline-none focus:border-blue-400"
            />
          </label>

          <label className="space-y-2 text-xs font-black text-primary lg:col-span-2">
            Short description
            <textarea
              name="description"
              rows={3}
              maxLength={3000}
              defaultValue={initialData?.description || ""}
              placeholder="What students will practise or demonstrate"
              className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-xs font-semibold leading-6 outline-none focus:border-blue-400"
            />
          </label>

          <label className="space-y-2 text-xs font-black text-primary lg:col-span-2">
            Detailed instructions
            <textarea
              name="instructions"
              rows={6}
              maxLength={8000}
              defaultValue={initialData?.instructions || ""}
              placeholder="List questions, expected format, and submission rules"
              className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-xs font-semibold leading-6 outline-none focus:border-blue-400"
            />
          </label>

          <label className="space-y-2 text-xs font-black text-primary">
            Assignment type
            <select name="assignmentType" defaultValue={initialData?.assignment_type || "HOMEWORK"} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-bold outline-none focus:border-blue-400">
              {assignmentTypes.map((type) => <option key={type} value={type}>{humanize(type)}</option>)}
            </select>
          </label>

          <label className="space-y-2 text-xs font-black text-primary">
            Status
            <select name="status" value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-bold outline-none focus:border-blue-400">
              {assignmentStatuses.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
            </select>
          </label>

          <label className="space-y-2 text-xs font-black text-primary">
            Release date & time <span className="text-rose-500">*</span>
            <input name="assignedAt" type="datetime-local" required defaultValue={dhakaInputValue(initialData?.assigned_at || now)} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-xs font-bold outline-none focus:border-blue-400" />
          </label>

          <label className="space-y-2 text-xs font-black text-primary">
            Due date & time <span className="text-rose-500">*</span>
            <input name="dueAt" type="datetime-local" required defaultValue={dhakaInputValue(initialData?.due_at || tomorrow)} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-xs font-bold outline-none focus:border-blue-400" />
          </label>

          <label className="space-y-2 text-xs font-black text-primary">
            Total marks <span className="text-rose-500">*</span>
            <input name="totalMarks" type="number" min="0.01" max="10000" step="0.01" required defaultValue={initialData?.total_marks || 10} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-xs font-bold outline-none focus:border-blue-400" />
          </label>

          <label className="space-y-2 text-xs font-black text-primary">
            Supporting link <span className="font-semibold text-muted">(optional)</span>
            <input name="resourceUrl" type="url" defaultValue={initialData?.resource_url || ""} placeholder="https://..." className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-xs font-semibold outline-none focus:border-blue-400" />
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 lg:col-span-2">
            <input name="allowLateSubmission" type="checkbox" defaultChecked={initialData?.allow_late_submission || false} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600" />
            <span>
              <span className="block text-xs font-black text-amber-900">Allow late submission</span>
              <span className="mt-1 block text-[10px] font-semibold leading-5 text-amber-700">Late work will be clearly labelled for the teacher.</span>
            </span>
          </label>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Link href={initialData ? `/teacher/assignments/${initialData.id}` : "/teacher/assignments"} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Cancel
        </Link>
        <button type="submit" disabled={pending} className="primary-btn inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-black disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : status === "PUBLISHED" ? <Send className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {pending ? "Saving..." : status === "PUBLISHED" ? "Save & publish" : "Save assignment"}
        </button>
      </div>
    </form>
  );
}
