"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";

export default function AcademicRouteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const [retrying, startRetry] = useTransition();

  useEffect(() => {
    console.error("Academic route failed", error);
  }, [error]);

  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-rose-100 bg-white p-6 text-center shadow-sm" role="alert">
      <div className="max-w-md">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="h-7 w-7" />
        </span>
        <h1 className="mt-5 font-display text-xl font-black text-slate-900">Academic data could not be loaded</h1>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
          Your data is safe. The connection may be temporary—please retry the request.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button
            type="button"
            disabled={retrying}
            onClick={() => startRetry(() => unstable_retry())}
            className="primary-btn inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black disabled:opacity-60"
          >
            {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {retrying ? "Retrying..." : "Try again"}
          </button>
          <Link href="/" className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50">
            Go to home
          </Link>
        </div>
        {error.digest && <p className="mt-4 text-[9px] font-bold text-slate-300">Reference: {error.digest}</p>}
      </div>
    </div>
  );
}
