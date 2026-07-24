"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEnrollmentStatusAction, deleteEnrollmentAction } from "@/app/actions/teacher";
import { Loader2, Settings, Ban, ShieldCheck, CheckCircle2, RotateCcw, AlertTriangle, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { CascadeDeletionDetails } from "@/components/common/cascade-deletion-details";

interface EnrollmentRowActionsProps {
  enrollmentId: string;
  currentStatus: "PENDING" | "ACTIVE" | "DISABLED" | "COMPLETED" | "REJECTED" | "CANCELLED";
  studentName: string;
}

export function EnrollmentRowActions({
  enrollmentId,
  currentStatus,
  studentName,
}: EnrollmentRowActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleTransition = async (
    newStatus: "PENDING" | "ACTIVE" | "DISABLED" | "COMPLETED" | "REJECTED" | "CANCELLED"
  ) => {
    let reason: string | null = null;
    let explicitConfirmation = false;

    // 1. Check for disabling reason
    if (newStatus === "DISABLED") {
      const input = prompt(`Please enter a reason for disabling ${studentName}'s enrollment:`);
      if (input === null) return; // Cancelled prompt
      if (input.trim() === "") {
        alert("A reason is required to suspend enrollment.");
        return;
      }
      reason = input.trim();
    }

    // 2. Check for completed -> active explicit confirmation
    if (currentStatus === "COMPLETED" && newStatus === "ACTIVE") {
      const confirmActive = confirm(
        `Are you sure you want to reactivate this COMPLETED enrollment? This requires explicit confirmation.`
      );
      if (!confirmActive) return;
      explicitConfirmation = true;
    }

    // 3. Check for rejected -> pending explicit confirmation
    if (currentStatus === "REJECTED" && newStatus === "PENDING") {
      const confirmPending = confirm(
        `Are you sure you want to return this REJECTED enrollment to PENDING? This requires explicit confirmation.`
      );
      if (!confirmPending) return;
      explicitConfirmation = true;
    }

    setLoading(true);
    setOpen(false);
    try {
      const res = await updateEnrollmentStatusAction({
        enrollmentId,
        newStatus,
        disableReason: reason,
        explicitConfirmation,
      });

      if (!res.success) {
        toast.error(res.message || "Failed to update enrollment status");
      } else {
        toast.success(`Enrollment updated to ${newStatus}`);
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteEnrollmentAction(enrollmentId);
      if (res.success) {
        toast.success("Enrollment record deleted permanently!");
        setShowDeleteConfirm(false);
        router.refresh();
      } else {
        toast.error(res.message || "Failed to delete enrollment record.");
        setDeleting(false);
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred during deletion.");
      setDeleting(false);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1.5 text-xs font-bold text-primary">
      {loading && <Loader2 className="h-4 w-4 animate-spin text-muted" />}

      <button
        onClick={() => setOpen(!open)}
        className="px-2.5 py-1 rounded-xl border border-border/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-primary transition-all flex items-center gap-1"
        type="button"
      >
        <Settings className="h-3.5 w-3.5" />
        <span>Manage</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-8 top-0 z-20 w-44 rounded-xl border border-border bg-white p-1 shadow-lg text-left">
            {/* PENDING -> ACTIVE, REJECTED, CANCELLED */}
            {currentStatus === "PENDING" && (
              <>
                <button
                  onClick={() => handleTransition("ACTIVE")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-emerald-50 text-emerald-700 text-left"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Activate</span>
                </button>
                <button
                  onClick={() => handleTransition("REJECTED")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-rose-50 text-rose-700 text-left"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => handleTransition("CANCELLED")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50 text-slate-600 text-left"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
              </>
            )}

            {/* ACTIVE -> DISABLED, COMPLETED, CANCELLED */}
            {currentStatus === "ACTIVE" && (
              <>
                <button
                  onClick={() => handleTransition("DISABLED")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-rose-50 text-rose-700 text-left"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Disable/Suspend</span>
                </button>
                <button
                  onClick={() => handleTransition("COMPLETED")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-blue-50 text-blue-700 text-left"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Complete</span>
                </button>
                <button
                  onClick={() => handleTransition("CANCELLED")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50 text-slate-600 text-left"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
              </>
            )}

            {/* DISABLED -> ACTIVE, CANCELLED */}
            {currentStatus === "DISABLED" && (
              <>
                <button
                  onClick={() => handleTransition("ACTIVE")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-emerald-50 text-emerald-700 text-left"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reactivate</span>
                </button>
                <button
                  onClick={() => handleTransition("CANCELLED")}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50 text-slate-600 text-left"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Cancel</span>
                </button>
              </>
            )}

            {/* COMPLETED -> ACTIVE (requires confirmation) */}
            {currentStatus === "COMPLETED" && (
              <button
                onClick={() => handleTransition("ACTIVE")}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-emerald-50 text-emerald-700 text-left"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reactivate (Force)</span>
              </button>
            )}

            {/* REJECTED -> PENDING (requires confirmation) */}
            {currentStatus === "REJECTED" && (
              <button
                onClick={() => handleTransition("PENDING")}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-slate-50 text-slate-600 text-left"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Reset to Pending</span>
              </button>
            )}

            <div className="my-1 border-t border-border/40" />

            {/* DELETE ENROLLMENT */}
            <button
              onClick={() => {
                setOpen(false);
                setShowDeleteConfirm(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-rose-50 text-rose-600 text-left font-extrabold"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Enrollment</span>
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border-2 border-rose-300 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-800 rounded-xl shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-primary text-base">Permanent Delete</h4>
                <p className="text-xs text-muted leading-relaxed font-medium mt-1">
                  Are you sure you want to permanently delete this enrollment for <strong className="text-primary font-bold">{studentName}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <CascadeDeletionDetails
              entityName="Batch Enrollment"
              deletedItems={[
                {
                  label: "Enrollment Connection & Access",
                  description: "The specific student-to-batch connection entry (`enrollments` table)",
                  subItems: [
                    "Assigned seat number, batch roll number, and enrollment status record",
                    "Student access permissions to this specific batch's study materials and recorded lectures",
                    "Assigned batch routine and live class join links on student dashboard",
                  ],
                },
                {
                  label: "Enrollment Fee Ledgers",
                  description: "All payments and invoices specifically generated under this enrollment ID",
                  subItems: [
                    "Tuition fee invoices, due tracking ledgers, and billing slips generated for this enrollment (`payments` table)",
                    "Any batch-specific scholarship or discount calculations attached to this enrollment",
                  ],
                },
                {
                  label: "Exam Result Records",
                  description: "Exam marks and present/absent result status tied to this enrollment",
                  subItems: [
                    "Marks, grades, ranks, and `attendance_status` values in `exam_results`",
                  ],
                },
              ]}
              preservedItems={[
                {
                  label: "Main Student Profile Account",
                  description: "The student's central profile, auth credentials, and other enrollments remain 100% intact",
                  subItems: [
                    "Central student profile record (`student_profiles` table: phone, photo, parent details)",
                    "Supabase Auth credentials and active login sessions (`auth.users`)",
                    "Student enrollments, exam results, and fee ledgers in all other academic batches",
                  ],
                },
                {
                  label: "Parent Batch Configuration",
                  description: "The academic batch and its curriculum remain untouched",
                  subItems: [
                    "The academic batch record (`batches` table: teacher assignments, routine, syllabus)",
                    "Other enrolled students and their exam-result/payment records in this batch",
                  ],
                },
              ]}
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
