"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  updateBatchStatusAction, 
  deleteBatchAction 
} from "@/app/actions/teacher";
import { 
  Eye, 
  Edit, 
  Play, 
  CheckCircle, 
  Archive, 
  XCircle, 
  Unlock, 
  Lock, 
  Trash2,
  Loader2,
  MoreVertical,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface BatchListActionsProps {
  batchId: string;
  batchCode: string;
  batchStatus: string;
  admissionOpen: boolean;
  canDelete: boolean;
}

export function BatchListActions({
  batchId,
  batchCode,
  batchStatus,
  admissionOpen,
  canDelete
}: BatchListActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleStatusChange = async (
    status?: "DRAFT" | "OPEN" | "RUNNING" | "COMPLETED" | "ARCHIVED" | "CANCELLED",
    openAdmission?: boolean
  ) => {
    setLoading(true);
    setMenuOpen(false);
    try {
      const res = await updateBatchStatusAction(batchId, status, openAdmission);
      if (!res.success) {
        toast.error(res.message || "Failed to update batch status");
      } else {
        toast.success("Batch updated successfully!");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setLoading(true);
    setShowDeleteModal(false);
    setMenuOpen(false);
    try {
      const res = await deleteBatchAction(batchId);
      if (!res.success) {
        toast.error(res.message || "Failed to delete batch");
      } else {
        toast.success("Batch deleted permanently!");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during deletion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-end gap-2">
      {loading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}

      {/* Primary Actions (View & Edit) */}
      <Link
        href={`/teacher/batches/${batchId}`}
        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-primary transition-colors"
        title="View details"
      >
        <Eye className="h-4 w-4" />
      </Link>
      
      <Link
        href={`/teacher/batches/${batchId}/edit`}
        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-primary transition-colors"
        title="Edit batch"
      >
        <Edit className="h-4 w-4" />
      </Link>

      {/* Status Menu Trigger */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-primary transition-colors"
          type="button"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 mt-1 z-20 w-48 rounded-xl border border-border bg-white p-1 shadow-lg text-xs font-bold text-text">
              {/* Toggle Admission */}
              {admissionOpen ? (
                <button
                  onClick={() => handleStatusChange(undefined, false)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-rose-50 text-rose-600 text-left"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Close Admission</span>
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange(undefined, true)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-emerald-50 text-emerald-600 text-left"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Open Admission</span>
                </button>
              )}

              {/* Status Transitions */}
              {batchStatus !== "RUNNING" && (
                <button
                  onClick={() => handleStatusChange("RUNNING")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-bg text-text text-left"
                >
                  <Play className="h-3.5 w-3.5 text-muted" />
                  <span>Mark as Running</span>
                </button>
              )}

              {batchStatus !== "COMPLETED" && (
                <button
                  onClick={() => handleStatusChange("COMPLETED")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-bg text-text text-left"
                >
                  <CheckCircle className="h-3.5 w-3.5 text-muted" />
                  <span>Mark as Completed</span>
                </button>
              )}

              {batchStatus !== "ARCHIVED" && (
                <button
                  onClick={() => handleStatusChange("ARCHIVED")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-bg text-text text-left"
                >
                  <Archive className="h-3.5 w-3.5 text-muted" />
                  <span>Archive Batch</span>
                </button>
              )}

              {batchStatus !== "CANCELLED" && (
                <button
                  onClick={() => handleStatusChange("CANCELLED")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-bg text-text text-left"
                >
                  <XCircle className="h-3.5 w-3.5 text-muted" />
                  <span>Cancel Batch</span>
                </button>
              )}

              {/* Universal Admin Delete Batch */}
              {canDelete && (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setShowDeleteModal(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-red-50 text-red-600 border-t border-border/40 mt-1 text-left"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Batch</span>
                </button>
              )}
            </div>
          </>
        )}
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
                  Are you sure you want to permanently delete batch <strong className="text-primary font-bold">{batchCode}</strong> along with all associated enrollments, exams, and records? This cannot be undone.
                </p>
              </div>
            </div>
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
