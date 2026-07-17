"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteStudentByAdminAction } from "@/app/actions/profiles";
import { Eye, Edit, Trash2, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface StudentListActionsProps {
  studentId: string;
  studentName: string;
  studentCode: string;
}

export function StudentListActions({
  studentId,
  studentName,
  studentCode,
}: StudentListActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteConfirm = async () => {
    setLoading(true);
    setShowDeleteModal(false);
    try {
      const res = await deleteStudentByAdminAction(studentId);
      if (!res.success) {
        toast.error(res.message || "Failed to delete student");
      } else {
        toast.success("Student deleted permanently!");
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
    <div className="relative inline-flex items-center justify-end gap-1.5">
      {loading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}

      {/* View Details */}
      <Link
        href={`/teacher/students/${studentId}`}
        className="px-2.5 py-1.5 rounded-xl border border-border bg-white hover:bg-slate-50 text-xs font-bold text-muted hover:text-primary transition-all inline-flex items-center gap-1 shadow-2xs"
        title="View Student Details"
      >
        <Eye className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Details</span>
      </Link>

      {/* Delete Button */}
      <button
        type="button"
        onClick={() => setShowDeleteModal(true)}
        className="p-1.5 rounded-xl border border-rose-200/60 bg-rose-50/60 hover:bg-rose-100 text-rose-600 transition-all shadow-2xs"
        title="Delete Student Permanently"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

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
                  Are you sure you want to permanently delete student <strong className="text-primary font-bold">{studentName} ({studentCode})</strong> along with all associated enrollments, payments, and exam results? This action cannot be undone.
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
