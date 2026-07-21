"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, RotateCcw } from "lucide-react";
import { assignmentStatuses } from "@/lib/validations/assignments";

export function AssignmentFilters({
  batches,
  subjects,
  initialBatchId,
  initialSubjectId,
  initialStatus,
  initialQuery,
}: {
  batches: { id: string; name: string }[];
  subjects: { id: string; batch_id: string; name: string }[];
  initialBatchId: string;
  initialSubjectId: string;
  initialStatus: string;
  initialQuery: string;
}) {
  const [batchId, setBatchId] = useState(initialBatchId);
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const visibleSubjects = useMemo(
    () => subjects.filter((subject) => !batchId || subject.batch_id === batchId),
    [batchId, subjects]
  );

  return (
    <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto] md:items-end">
      <label className="space-y-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
        Search
        <input name="q" defaultValue={initialQuery} placeholder="Title or keyword" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold normal-case tracking-normal text-primary outline-none focus:border-blue-400" />
      </label>
      <label className="space-y-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
        Batch
        <select name="batchId" value={batchId} onChange={(event) => { setBatchId(event.target.value); setSubjectId(""); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold normal-case tracking-normal text-primary outline-none focus:border-blue-400">
          <option value="">All batches</option>
          {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
        </select>
      </label>
      <label className="space-y-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
        Subject
        <select name="subjectId" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold normal-case tracking-normal text-primary outline-none focus:border-blue-400">
          <option value="">All subjects</option>
          {visibleSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
      </label>
      <label className="space-y-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
        Status
        <select name="status" defaultValue={initialStatus} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold normal-case tracking-normal text-primary outline-none focus:border-blue-400">
          <option value="">All statuses</option>
          {assignmentStatuses.map((status) => <option key={status} value={status}>{status.toLowerCase()}</option>)}
        </select>
      </label>
      <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102A66] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#173B89]">
        <Filter className="h-3.5 w-3.5" /> Apply
      </button>
      <Link href="/teacher/assignments" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-500 transition hover:bg-slate-50">
        <RotateCcw className="h-3.5 w-3.5" /> Reset
      </Link>
    </form>
  );
}
