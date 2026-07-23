"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter, RotateCcw, Search } from "lucide-react";

export function RoutineFilters({
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
  const router = useRouter();
  const [batchId, setBatchId] = useState(initialBatchId);
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [status, setStatus] = useState(initialStatus);
  const [query, setQuery] = useState(initialQuery);
  const visibleSubjects = useMemo(
    () => subjects.filter((subject) => !batchId || subject.batch_id === batchId),
    [batchId, subjects]
  );

  function apply() {
    const params = new URLSearchParams();
    if (batchId) params.set("batchId", batchId);
    if (subjectId) params.set("subjectId", subjectId);
    if (status) params.set("status", status);
    if (query.trim()) params.set("q", query.trim());
    router.push(`/teacher/routine${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_.8fr_1.2fr_auto_auto]">
        <select value={batchId} onChange={(event) => { setBatchId(event.target.value); setSubjectId(""); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-blue-400">
          <option value="">All batches</option>
          {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
        </select>
        <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-blue-400">
          <option value="">All subjects</option>
          {visibleSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-blue-400">
          <option value="">All statuses</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") apply(); }} placeholder="Search class topic" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-semibold outline-none focus:border-blue-400" />
        </label>
        <button type="button" onClick={apply} className="primary-btn inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black"><Filter className="h-4 w-4" /> Apply</button>
        <button type="button" onClick={() => { setBatchId(""); setSubjectId(""); setStatus(""); setQuery(""); router.push("/teacher/routine"); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50"><RotateCcw className="h-4 w-4" /> Reset</button>
      </div>
    </section>
  );
}
