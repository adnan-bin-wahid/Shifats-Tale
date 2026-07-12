"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  archiveExamAction, 
  unarchiveExamAction, 
  deleteExamAction 
} from "@/app/actions/exams";
import { 
  Eye, 
  Edit, 
  FileSpreadsheet, 
  Archive, 
  Undo2, 
  Trash2, 
  Loader2, 
  AlertTriangle 
} from "lucide-react";
import toast from "react-hot-toast";

interface ExamListActionsProps {
  examId: string;
  examName: string;
  status: string;
}

export function ExamListActions({ examId, examName, status }: ExamListActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Confirmation modal states
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isPublished = status === "RESULT_PUBLISHED";
  const isArchived = status === "ARCHIVED";

  const handleArchive = () => {
    startTransition(async () => {
      try {
        const res = await archiveExamAction(examId);
        if (res.success) {
          toast.success("Examination archived successfully.");
          setShowArchiveConfirm(false);
          router.refresh();
        } else {
          toast.error(res.message || "Failed to archive examination.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      }
    });
  };

  const handleRestore = () => {
    startTransition(async () => {
      try {
        const res = await unarchiveExamAction(examId);
        if (res.success) {
          toast.success("Examination restored successfully from archive.");
          setShowRestoreConfirm(false);
          router.refresh();
        } else {
          toast.error(res.message || "Failed to restore examination.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await deleteExamAction(examId);
        if (res.success) {
          toast.success("Examination deleted permanently.");
          setShowDeleteConfirm(false);
          router.refresh();
        } else {
          toast.error(res.message || "Failed to delete examination.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      }
    });
  };

  return (
    <div className="relative flex items-center justify-end gap-1.5">
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-accent mr-1" />}

      {/* 1. View Statistics & Overview Dashboard (Eye Icon) */}
      <Link
        href={`/teacher/exams/${examId}`}
        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-primary rounded-lg transition-all border border-slate-200/60 shadow-xs"
        title="View Exam Statistics & Overview Dashboard"
      >
        <Eye className="h-4 w-4" />
      </Link>

      {/* 2. Edit Details Icon */}
      {!isArchived && (
        <>
          {!isPublished ? (
            <Link
              href={`/teacher/exams/${examId}/edit`}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-primary rounded-lg transition-all border border-slate-200/60 shadow-xs"
              title="Edit Exam Details"
            >
              <Edit className="h-4 w-4" />
            </Link>
          ) : (
            <span
              className="p-1.5 opacity-30 cursor-not-allowed text-muted bg-slate-50 rounded-lg border border-slate-200/60"
              title="Unpublish results from grading sheet before editing details"
            >
              <Edit className="h-4 w-4" />
            </span>
          )}

          {/* 3. Grading Sheet & Marks Entry (FileSpreadsheet Icon - distinct from Eye) */}
          <Link
            href={`/teacher/exams/${examId}/results`}
            className="p-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg transition-all border border-primary/20 shadow-xs"
            title="Grading Sheet & Marks Entry (Publish / Review Results)"
          >
            <FileSpreadsheet className="h-4 w-4" />
          </Link>
        </>
      )}

      {/* Quick Actions Separator (Archive / Restore / Delete) */}
      <div className="inline-flex items-center gap-1 ml-1 pl-1.5 border-l border-slate-200">
        {!isArchived ? (
          <button
            type="button"
            onClick={() => setShowArchiveConfirm(true)}
            className="p-1.5 bg-amber-50/60 hover:bg-amber-100 text-amber-700 rounded-lg transition-all border border-amber-200/50 shadow-xs"
            title="Archive Examination (Requires Confirmation)"
          >
            <Archive className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowRestoreConfirm(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-all border border-emerald-300 text-xs font-extrabold shadow-xs"
            title="Restore / Unarchive Examination (Requires Confirmation)"
          >
            <Undo2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Restore</span>
          </button>
        )}

        {status === "DRAFT" && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 bg-rose-50/60 hover:bg-rose-100 text-rose-700 rounded-lg transition-all border border-rose-200/50 shadow-xs"
            title="Delete Examination (Requires Confirmation)"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Double Confirmation Modal: ARCHIVE */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border-2 border-amber-300 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h4 className="font-extrabold text-primary text-base">Confirm Archive</h4>
                <p className="text-xs text-muted leading-relaxed font-medium mt-1">
                  Are you sure you want to archive <strong className="text-primary font-bold">{examName}</strong>? It will be marked as read-only. You can restore it later if needed.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(false)}
                disabled={isPending}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Double Confirmation Modal: RESTORE (UNARCHIVE) */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border-2 border-emerald-300 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                <Undo2 className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h4 className="font-extrabold text-primary text-base">Confirm Restore</h4>
                <p className="text-xs text-muted leading-relaxed font-medium mt-1">
                  Are you sure you want to restore <strong className="text-primary font-bold">{examName}</strong> from archive? It will be returned to active status so you can review or update results.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowRestoreConfirm(false)}
                disabled={isPending}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestore}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Double Confirmation Modal: DELETE */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border-2 border-rose-300 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-800 rounded-xl shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h4 className="font-extrabold text-primary text-base">Permanent Delete</h4>
                <p className="text-xs text-muted leading-relaxed font-medium mt-1">
                  Are you sure you want to permanently delete <strong className="text-primary font-bold">{examName}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
