"use client";

import { useTransition } from "react";
import { CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { updateClassSessionStatusAction } from "@/app/actions/class-routine";
import type { ClassSessionStatus } from "@/lib/validations/class-routine";

export function ClassSessionStatusActions({
  sessionId,
  status,
}: {
  sessionId: string;
  status: ClassSessionStatus;
}) {
  const [pending, startTransition] = useTransition();

  function update(nextStatus: ClassSessionStatus) {
    startTransition(async () => {
      const result = await updateClassSessionStatusAction(sessionId, nextStatus);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  if (pending) {
    return <span className="inline-flex items-center gap-2 text-[10px] font-black text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating</span>;
  }

  if (status === "SCHEDULED") {
    return (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => update("COMPLETED")} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</button>
        <button type="button" onClick={() => update("CANCELLED")} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-rose-700 hover:bg-rose-100"><XCircle className="h-3.5 w-3.5" /> Cancel</button>
      </div>
    );
  }

  return <button type="button" onClick={() => update("SCHEDULED")} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-blue-700 hover:bg-blue-100"><RotateCcw className="h-3.5 w-3.5" /> Restore</button>;
}
