"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type BatchOption = {
  id: string;
  name: string;
  code: string;
};

type SubjectOption = {
  id: string;
  batch_id: string;
  name: string;
  code: string;
};

export function AcademicReportFilters({
  batches,
  subjects,
  selectedBatchId,
  selectedSubjectId,
}: {
  batches: BatchOption[];
  subjects: SubjectOption[];
  selectedBatchId: string;
  selectedSubjectId: string;
}) {
  const [batchId, setBatchId] = useState(selectedBatchId);
  const [subjectId, setSubjectId] = useState(selectedSubjectId);

  const batchNames = useMemo(
    () => new Map(batches.map((batch) => [batch.id, batch.name])),
    [batches]
  );
  const availableSubjects = subjects.filter(
    (subject) => !batchId || subject.batch_id === batchId
  );

  const handleBatchChange = (nextBatchId: string) => {
    setBatchId(nextBatchId);
    const currentSubject = subjects.find((subject) => subject.id === subjectId);
    if (currentSubject && nextBatchId && currentSubject.batch_id !== nextBatchId) {
      setSubjectId("");
    }
  };

  return (
    <form
      method="GET"
      action="/teacher/reports/academic"
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        Batch
        <select
          name="batchId"
          value={batchId}
          onChange={(event) => handleBatchChange(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-blue-400"
        >
          <option value="">All batches</option>
          {batches.map((batch) => (
            <option key={batch.id} value={batch.id}>
              {batch.name} ({batch.code})
            </option>
          ))}
        </select>
      </label>

      <label className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        Subject
        <select
          name="subjectId"
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold normal-case tracking-normal text-slate-800 outline-none focus:border-blue-400"
        >
          <option value="">All subjects</option>
          {availableSubjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name} ({subject.code})
              {!batchId ? ` · ${batchNames.get(subject.batch_id) || "Batch"}` : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="primary-btn rounded-xl px-5 py-2.5 text-xs font-black">
          Apply filters
        </button>
        <Link
          href="/teacher/reports/academic"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}
