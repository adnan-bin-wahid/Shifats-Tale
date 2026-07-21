"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Send } from "lucide-react";
import toast from "react-hot-toast";
import { submitAssignmentAction } from "@/app/actions/assignments";

export function StudentAssignmentSubmissionForm({
  assignmentId,
  existing,
  disabled,
  disabledReason,
}: {
  assignmentId: string;
  existing: {
    submission_text: string | null;
    submission_url: string | null;
    status: string;
  } | null;
  disabled: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await submitAssignmentAction(assignmentId, formData);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
      if (result.success) router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <label className="block space-y-2 text-xs font-black text-primary">
        Your response
        <textarea
          name="submissionText"
          rows={8}
          maxLength={12000}
          disabled={disabled || pending}
          defaultValue={existing?.submission_text || ""}
          placeholder="Write your answer, explanation, or submission note here..."
          className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold leading-6 text-slate-700 outline-none disabled:bg-slate-50 disabled:text-slate-400 focus:border-blue-400"
        />
      </label>
      <label className="block space-y-2 text-xs font-black text-primary">
        Submission link <span className="font-semibold text-muted">(Google Drive, Docs, GitHub, etc.)</span>
        <div className="relative">
          <ExternalLink className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          <input
            name="submissionUrl"
            type="url"
            disabled={disabled || pending}
            defaultValue={existing?.submission_url || ""}
            placeholder="https://..."
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-xs font-semibold outline-none disabled:bg-slate-50 focus:border-blue-400"
          />
        </div>
      </label>
      {disabled && disabledReason && (
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[10px] font-bold leading-5 text-amber-700">{disabledReason}</p>
      )}
      <button type="submit" disabled={disabled || pending} className="primary-btn inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {pending ? "Submitting..." : existing ? "Update submission" : "Submit assignment"}
      </button>
    </form>
  );
}
