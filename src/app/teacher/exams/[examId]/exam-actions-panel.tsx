"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishResultsAction, unpublishResultsAction, archiveExamAction, unarchiveExamAction } from "@/app/actions/exams";
import { 
  Check, 
  X, 
  Send, 
  Archive, 
  AlertTriangle, 
  FileText, 
  Undo2, 
  Loader2 
} from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  examId: string;
  status: string;
  enrolledCount: number;
  enteredCount: number;
  presentCount: number;
  absentCount: number;
  passCount: number;
  failCount: number;
}

export function ExamActionsPanel({ 
  examId, 
  status, 
  enrolledCount, 
  enteredCount,
  presentCount,
  absentCount,
  passCount,
  failCount
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States for publish and unpublish workflows
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [showUnpublishForm, setShowUnpublishForm] = useState(false);
  const [publishNote, setPublishNote] = useState("");
  const [unpublishReason, setUnpublishReason] = useState("");

  const isPublished = status === "RESULT_PUBLISHED";
  const isArchived = status === "ARCHIVED";

  // Publish workflow handler
  const handlePublish = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (enteredCount === 0) {
      toast.error("Cannot publish results because no marks have been saved yet.");
      setErrorMsg("Cannot publish results because no marks have been saved yet. Please record marks first.");
      return;
    }

    if (enteredCount < enrolledCount) {
      const confirmIncomplete = window.confirm(
        `Warning: You have only entered results for ${enteredCount} out of ${enrolledCount} active students. Are you sure you want to publish these results? Incomplete records will be blocked from student visibility.`
      );
      if (!confirmIncomplete) return;
    } else {
      const confirmPublish = window.confirm("Are you sure you want to publish these examination results? This will make them visible to students in their dashboard.");
      if (!confirmPublish) return;
    }

    startTransition(async () => {
      try {
        const res = await publishResultsAction(examId, publishNote);
        if (res.success) {
          toast.success("Results have been published successfully!");
          setSuccessMsg("Results have been published successfully!");
          setShowPublishForm(false);
          setPublishNote("");
          router.refresh();
        } else {
          toast.error(res.message || "Failed to publish results.");
          setErrorMsg(res.message || "Failed to publish results.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
        setErrorMsg(err.message || "An unexpected error occurred.");
      }
    });
  };

  // Unpublish workflow handler
  const handleUnpublish = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!unpublishReason.trim()) {
      toast.error("A withdrawal reason is required to unpublish results.");
      setErrorMsg("A withdrawal reason is required to unpublish results.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await unpublishResultsAction(examId, unpublishReason);
        if (res.success) {
          toast.success("Results have been withdrawn successfully.");
          setSuccessMsg("Results have been withdrawn and unpublished successfully.");
          setShowUnpublishForm(false);
          setUnpublishReason("");
          router.refresh();
        } else {
          toast.error(res.message || "Failed to unpublish results.");
          setErrorMsg(res.message || "Failed to unpublish results.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
        setErrorMsg(err.message || "An unexpected error occurred.");
      }
    });
  };

  // Archive handler
  const handleArchive = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!window.confirm("Are you sure you want to archive this examination? It will be marked as read-only.")) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await archiveExamAction(examId);
        if (res.success) {
          toast.success("Examination archived successfully.");
          setSuccessMsg("Examination archived successfully.");
          router.refresh();
        } else {
          toast.error(res.message || "Failed to archive examination.");
          setErrorMsg(res.message || "Failed to archive examination.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
        setErrorMsg(err.message || "An unexpected error occurred.");
      }
    });
  };

  // Restore (Unarchive) handler
  const handleRestore = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!window.confirm("Are you sure you want to restore (unarchive) this examination back to active status?")) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await unarchiveExamAction(examId);
        if (res.success) {
          toast.success("Examination restored successfully from archive.");
          setSuccessMsg("Examination restored successfully.");
          router.refresh();
        } else {
          toast.error(res.message || "Failed to restore examination.");
          setErrorMsg(res.message || "Failed to restore examination.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
        setErrorMsg(err.message || "An unexpected error occurred.");
      }
    });
  };

  if (isArchived) {
    return (
      <div className="bg-slate-50 border border-border/40 p-5 rounded-2xl text-center space-y-3">
        <div>
          <span className="text-muted text-[10px] uppercase block">Examination Status</span>
          <span className="font-extrabold text-sm text-slate-500 block uppercase font-display">ARCHIVED</span>
          <p className="text-[10px] text-muted leading-relaxed font-semibold mt-1">
            This examination is archived and marked as read-only.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRestore}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
          <span>Restore Examination</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-150 text-rose-700 rounded-xl text-xs">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs flex items-center gap-1.5">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Operations Block */}
      <div className="bg-white border border-border/40 p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold border-b border-border/20 pb-2">Publication & Operations</h3>
        
        {!isPublished ? (
          <div className="space-y-4">
            <p className="text-[10px] text-muted leading-relaxed font-semibold">
              Results are currently in draft. Students cannot see their grades or ranks. Review the statistics and student marksheets before publishing.
            </p>
            
            {!showPublishForm ? (
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowPublishForm(true)}
                  disabled={isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Publish Results</span>
                </button>
                
                <button
                  onClick={handleArchive}
                  disabled={isPending}
                  className="px-4 py-2 border border-border/80 hover:bg-slate-50 text-muted rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>Archive Exam</span>
                </button>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-border/20 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Confirm Results Publication</span>
                </h4>
                
                {enteredCount < enrolledCount && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[10px] font-semibold leading-relaxed">
                    Note: Results are missing for {enrolledCount - enteredCount} enrolled students. They will not be assigned a rank or grades.
                  </div>
                )}
                
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">
                    Publication Note <span className="text-muted font-normal">(Optional, visible to students)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={publishNote}
                    onChange={(e) => setPublishNote(e.target.value)}
                    placeholder="e.g. Excellent performance in vectors batch. Retake scheduled for next Monday."
                    className="w-full px-3 py-2 rounded-lg border border-border/60 bg-white text-xs font-semibold focus:border-primary focus:outline-none resize-none"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handlePublish}
                    disabled={isPending}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    <span>Confirm & Publish</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowPublishForm(false);
                      setPublishNote("");
                    }}
                    className="px-3 py-2 border border-border/80 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-2.5 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-lg text-[10px] font-semibold">
              Results are published and visible to students in their dashboards. Ranks and grades are finalized.
            </div>
            
            {!showUnpublishForm ? (
              <button
                onClick={() => setShowUnpublishForm(true)}
                disabled={isPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span>Withdraw/Unpublish Results</span>
              </button>
            ) : (
              <div className="bg-slate-50 p-4 rounded-xl border border-border/20 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>Withdraw Results for Correction</span>
                </h4>
                
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">
                    Reason for Withdrawal <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={unpublishReason}
                    onChange={(e) => setUnpublishReason(e.target.value)}
                    placeholder="Provide a brief explanation for withdrawing these results (logged to audit logs)..."
                    className="w-full px-3 py-2 rounded-lg border border-border/60 bg-white text-xs font-semibold focus:border-primary focus:outline-none resize-none"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleUnpublish}
                    disabled={isPending}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                    <span>Confirm Withdrawal</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUnpublishForm(false);
                      setUnpublishReason("");
                    }}
                    className="px-3 py-2 border border-border/80 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
