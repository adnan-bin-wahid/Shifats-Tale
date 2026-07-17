"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBatchStatusAction, deleteBatchAction } from "@/app/actions/teacher";
import { Play, CheckCircle, Archive, XCircle, Unlock, Lock, Edit, Loader2, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { CascadeDeletionDetails } from "@/components/common/cascade-deletion-details";

interface QuickActionsProps {
  batchId: string;
  status: string;
  admissionOpen: boolean;
}

export function QuickActions({ batchId, status, admissionOpen }: QuickActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleAction = async (newStatus?: any, openAdm?: boolean) => {
    setLoading(true);
    try {
      const res = await updateBatchStatusAction(batchId, newStatus, openAdm);
      if (!res.success) {
        toast.error(res.message || "Failed to update batch");
      } else {
        toast.success("Batch updated successfully!");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setLoading(true);
    setShowDeleteModal(false);
    try {
      const res = await deleteBatchAction(batchId);
      if (!res.success) {
        toast.error(res.message || "Failed to delete batch");
      } else {
        toast.success("Batch permanently deleted!");
        router.push("/teacher/batches");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during deletion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4 text-xs font-bold text-primary relative">
      <h3 className="text-sm font-extrabold font-display border-b border-border/30 pb-2">
        Quick Administrative Controls
      </h3>

      {loading && (
        <div className="flex items-center gap-2 text-muted animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>Processing action...</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Toggle Admission */}
        {admissionOpen ? (
          <button
            onClick={() => handleAction(undefined, false)}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-2.5 px-3 border border-rose-250 bg-rose-50 hover:bg-rose-100/50 text-rose-700 rounded-xl transition-all"
          >
            <Lock className="h-4 w-4" />
            <span>Close Admission</span>
          </button>
        ) : (
          <button
            onClick={() => handleAction(undefined, true)}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-2.5 px-3 border border-emerald-250 bg-emerald-50 hover:bg-emerald-100/50 text-emerald-700 rounded-xl transition-all"
          >
            <Unlock className="h-4 w-4" />
            <span>Open Admission</span>
          </button>
        )}

        {/* Edit */}
        <Link
          href={`/teacher/batches/${batchId}/edit`}
          className="flex items-center justify-center gap-2 py-2.5 px-3 border border-border/80 bg-white hover:bg-slate-50 text-muted rounded-xl transition-all text-center"
        >
          <Edit className="h-4 w-4" />
          <span>Edit Details</span>
        </Link>
      </div>

      <div className="border-t border-border/30 pt-3 space-y-2">
        <span className="text-[10px] text-muted uppercase tracking-wider block">Transition Status</span>
        <div className="grid grid-cols-2 gap-2">
          {status !== "RUNNING" && (
            <button
              onClick={() => handleAction("RUNNING")}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-2 px-3 border border-border/60 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
            >
              <Play className="h-3.5 w-3.5" />
              <span>Mark Running</span>
            </button>
          )}

          {status !== "COMPLETED" && (
            <button
              onClick={() => handleAction("COMPLETED")}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-2 px-3 border border-border/60 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Complete Batch</span>
            </button>
          )}

          {status !== "ARCHIVED" && (
            <button
              onClick={() => handleAction("ARCHIVED")}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-2 px-3 border border-border/60 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>Archive</span>
            </button>
          )}

          {status !== "CANCELLED" && (
            <button
              onClick={() => handleAction("CANCELLED")}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-2 px-3 border border-border/60 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-all"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Cancel Batch</span>
            </button>
          )}
        </div>
      </div>

      {/* Permanent Deletion Option */}
      <div className="border-t border-rose-200/60 pt-3">
        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 border border-rose-300 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 rounded-xl transition-all font-extrabold"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete Batch Permanently</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border-2 border-rose-300 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-800 rounded-xl shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-primary text-base">Confirm Permanent Deletion</h4>
                <p className="text-xs text-muted leading-relaxed font-medium mt-1">
                  Are you sure you want to permanently delete this batch along with all associated enrollments, study materials, exams, attendance, and fee records? <span className="font-bold text-emerald-700">(Note: Registered student account profiles will remain preserved).</span> This action cannot be undone.
                </p>
              </div>
            </div>

            <CascadeDeletionDetails
              entityName="Batch"
              deletedItems={[
                { label: "Student Enrollments", description: "All enrollment links under this batch" },
                { label: "Exams & Exam Results", description: "All exams, questions, attendance logs, and student scorecards" },
                { label: "Study Materials & R2 Files", description: "All uploaded notes, PDFs, and Cloudflare R2 storage files for this batch" },
                { label: "Financial Payments & Fee Ledgers", description: "All payment records, invoice history, and fee structures tied to this batch" },
                { label: "Attendance & Batch Announcements", description: "Daily attendance sheets, batch notices, and class updates" },
              ]}
              preservedItems={[
                { label: "Registered Student Accounts", description: "Main student_profiles and auth accounts are completely preserved" },
                { label: "Other Center Batches", description: "All other academic batches and institutional configurations remain untouched" },
              ]}
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
