"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Search } from "lucide-react";

interface BatchOption {
  id: string;
  name: string;
  code: string;
}

interface StudentOption {
  id: string;
  batchId: string;
  fullName: string;
  studentCode: string;
  enrollmentStatus: string;
}

interface Props {
  batches: BatchOption[];
  students: StudentOption[];
  initialBatchId?: string;
  initialStudentId?: string;
}

export function StudentProgressReportFilters({
  batches,
  students,
  initialBatchId = "",
  initialStudentId = "",
}: Props) {
  const router = useRouter();
  const [batchId, setBatchId] = useState(initialBatchId);
  const [studentId, setStudentId] = useState(initialStudentId);
  const [search, setSearch] = useState("");

  const availableStudents = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return students.filter(
      (student) =>
        student.batchId === batchId &&
        (!normalized ||
          student.fullName.toLowerCase().includes(normalized) ||
          student.studentCode.toLowerCase().includes(normalized))
    );
  }, [batchId, search, students]);

  function handleBatchChange(value: string) {
    setBatchId(value);
    setStudentId("");
    setSearch("");
  }

  function openReport() {
    if (!batchId || !studentId) return;
    router.push(
      `/teacher/reports/student-progress/${studentId}?batchId=${encodeURIComponent(batchId)}`
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1fr_1.4fr_auto] lg:items-end">
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
            Academic batch
          </span>
          <select
            value={batchId}
            onChange={(event) => handleBatchChange(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white"
          >
            <option value="">Select batch</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name} ({batch.code})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
            Find student
          </span>
          <span className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={!batchId}
              placeholder="Name or student ID"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
            Student
          </span>
          <select
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            disabled={!batchId}
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {batchId
                ? availableStudents.length
                  ? "Select student"
                  : "No matching student"
                : "Select a batch first"}
            </option>
            {availableStudents.map((student) => (
              <option key={`${student.batchId}-${student.id}`} value={student.id}>
                {student.fullName} · {student.studentCode} · {student.enrollmentStatus}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={openReport}
          disabled={!batchId || !studentId}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0B1E4B] px-5 text-[10px] font-black uppercase tracking-wide text-white shadow-lg shadow-blue-950/15 transition hover:bg-[#12306F] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <FileText className="h-4 w-4" /> Build report
        </button>
      </div>
      <p className="mt-4 text-[10px] font-semibold leading-5 text-slate-400">
        Only active or completed enrollments are available. The generated report is read-only and uses published academic records.
      </p>
    </div>
  );
}
