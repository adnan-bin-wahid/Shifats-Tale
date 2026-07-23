"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import {
  createClassSessionAction,
  updateClassSessionAction,
} from "@/app/actions/class-routine";
import {
  classSessionStatuses,
  classSessionTypes,
} from "@/lib/validations/class-routine";

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
type SessionInitial = {
  id: string;
  batch_id: string;
  subject_id: string;
  unit_id: string | null;
  title: string;
  session_type: string;
  status: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  class_link: string | null;
  student_note: string | null;
};

function humanize(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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

export function ClassSessionForm({
  batches,
  subjects,
  units,
  initialData,
  preselectedBatchId = "",
  preselectedSubjectId = "",
  defaultStartsAt,
  defaultEndsAt,
}: {
  batches: BatchOption[];
  subjects: SubjectOption[];
  units: UnitOption[];
  initialData?: SessionInitial;
  preselectedBatchId?: string;
  preselectedSubjectId?: string;
  defaultStartsAt?: string;
  defaultEndsAt?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [batchId, setBatchId] = useState(initialData?.batch_id || preselectedBatchId);
  const [subjectId, setSubjectId] = useState(initialData?.subject_id || preselectedSubjectId);
  const [unitId, setUnitId] = useState(initialData?.unit_id || "");
  const [validationMessages, setValidationMessages] = useState<string[]>([]);

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
        ? await updateClassSessionAction(initialData.id, formData)
        : await createClassSessionAction(formData);
      if (!result.success) {
        setValidationMessages(
          Array.from(
            new Set(
              Object.values(result.errors || {})
                .flatMap((messages) => messages || [])
            )
          )
        );
        toast.error(result.message);
        return;
      }
      setValidationMessages([]);
      toast.success(result.message);
      router.push("/teacher/routine");
      router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-6" aria-busy={pending}>
      {validationMessages.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800"
        >
          <p className="font-black">Please correct the following:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {validationMessages.map((message) => <li key={message}>{message}</li>)}
          </ul>
        </div>
      )}
      <section className="overflow-hidden rounded-3xl border border-border/60 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#F8FBFF,#EEF4FF)] px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-blue-100 p-3 text-blue-700">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-black text-primary">Class setup</h2>
              <p className="mt-1 text-xs font-semibold text-muted">
                Connect this class to the exact batch, subject, and chapter students are studying.
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
                setUnitId("");
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
              onChange={(event) => {
                setSubjectId(event.target.value);
                setUnitId("");
              }}
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
              value={unitId}
              disabled={!subjectId}
              onChange={(event) => setUnitId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-bold outline-none disabled:bg-slate-50 focus:border-blue-400"
            >
              <option value="">General subject class</option>
              {visibleUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>#{unit.sequence_no} · {unit.title}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-xs font-black text-primary lg:col-span-2">
            Class title / topic <span className="text-rose-500">*</span>
            <input
              name="title"
              required
              maxLength={180}
              defaultValue={initialData?.title || ""}
              placeholder="e.g. Vector addition and resolution"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm font-bold outline-none focus:border-blue-400"
            />
          </label>

          <label className="space-y-2 text-xs font-black text-primary">
            Class type
            <select name="sessionType" defaultValue={initialData?.session_type || "REGULAR"} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-bold outline-none focus:border-blue-400">
              {classSessionTypes.map((type) => <option key={type} value={type}>{humanize(type)}</option>)}
            </select>
          </label>

          <label className="space-y-2 text-xs font-black text-primary">
            Status
            <select name="status" defaultValue={initialData?.status || "SCHEDULED"} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs font-bold outline-none focus:border-blue-400">
              {classSessionStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
            </select>
          </label>

          <label className="space-y-2 text-xs font-black text-primary">
            Start date & time <span className="text-rose-500">*</span>
            <input name="startsAt" type="datetime-local" required defaultValue={dhakaInputValue(initialData?.starts_at || defaultStartsAt || "1970-01-01T00:00:00.000Z")} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-xs font-bold outline-none focus:border-blue-400" />
          </label>

          <label className="space-y-2 text-xs font-black text-primary">
            End date & time <span className="text-rose-500">*</span>
            <input name="endsAt" type="datetime-local" required defaultValue={dhakaInputValue(initialData?.ends_at || defaultEndsAt || "1970-01-01T01:30:00.000Z")} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-xs font-bold outline-none focus:border-blue-400" />
          </label>

          <label className="space-y-2 text-xs font-black text-primary">
            Room / location <span className="font-semibold text-muted">(optional)</span>
            <input name="location" maxLength={240} defaultValue={initialData?.location || ""} placeholder="e.g. Room 301" className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-xs font-semibold outline-none focus:border-blue-400" />
          </label>

          <label className="space-y-2 text-xs font-black text-primary">
            Online class link <span className="font-semibold text-muted">(optional)</span>
            <input name="classLink" type="url" defaultValue={initialData?.class_link || ""} placeholder="https://..." className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-xs font-semibold outline-none focus:border-blue-400" />
          </label>

          <label className="space-y-2 text-xs font-black text-primary lg:col-span-2">
            Note for students <span className="font-semibold text-muted">(optional)</span>
            <textarea name="studentNote" rows={4} maxLength={3000} defaultValue={initialData?.student_note || ""} placeholder="Preparation, book, chapter range, or anything students should bring" className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-xs font-semibold leading-6 outline-none focus:border-blue-400" />
          </label>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Link href="/teacher/routine" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-600 transition hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Cancel
        </Link>
        <button type="submit" disabled={pending} className="primary-btn inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-xs font-black disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pending ? "Saving..." : initialData ? "Save routine entry" : "Schedule class"}
        </button>
      </div>
    </form>
  );
}
