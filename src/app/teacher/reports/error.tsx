"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function TeacherReportsError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto inline-flex rounded-2xl bg-rose-50 p-3 text-rose-600">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h2 className="mt-4 font-display text-lg font-black text-slate-900">
        Reports could not be loaded
      </h2>
      <p className="mx-auto mt-2 max-w-md text-xs font-semibold leading-5 text-slate-500">
        The report data request failed. Retry once; if it continues, check the database connection and applied migrations.
      </p>
      <button
        type="button"
        onClick={unstable_retry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#102A66] px-5 py-2.5 text-xs font-black text-white"
      >
        <RotateCcw className="h-4 w-4" /> Retry
      </button>
    </div>
  );
}
