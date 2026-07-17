"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { deletePaymentAction } from "@/app/actions/payments";
import { Edit, Trash2, Loader2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { CascadeDeletionDetails } from "@/components/common/cascade-deletion-details";

interface PaymentListActionsProps {
  paymentId: string;
  studentName: string;
  billingInfo?: string;
}

export function PaymentListActions({ paymentId, studentName, billingInfo }: PaymentListActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await deletePaymentAction(paymentId);
        if (res.success) {
          toast.success("Payment record deleted permanently!");
          setShowDeleteConfirm(false);
          router.refresh();
        } else {
          toast.error(res.message || "Failed to delete payment record.");
        }
      } catch (err: any) {
        toast.error(err.message || "An unexpected error occurred.");
      }
    });
  };

  return (
    <div className="relative flex items-center justify-end gap-1.5">
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-accent mr-1" />}

      <Link
        href={`/teacher/payments/${paymentId}`}
        className="px-2.5 py-1 text-[10px] font-bold border border-border/80 bg-white hover:bg-slate-50 text-primary rounded-lg transition-all inline-flex items-center gap-1"
        title="View / Manage Ledger Record"
      >
        <Edit className="h-3 w-3" />
        <span>Manage</span>
      </Link>

      <button
        type="button"
        onClick={() => setShowDeleteConfirm(true)}
        className="p-1.5 bg-rose-50/60 hover:bg-rose-100 text-rose-700 rounded-lg transition-all border border-rose-200/50 shadow-xs"
        title="Delete Payment Record Permanently (Requires Confirmation)"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

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
                  Are you sure you want to permanently delete the ledger payment record for <strong className="text-primary font-bold">{studentName}</strong> {billingInfo ? `(${billingInfo})` : ""}? This action cannot be undone.
                </p>
              </div>
            </div>

            <CascadeDeletionDetails
              entityName="Payment Record"
              deletedItems={[
                {
                  label: "Ledger Transaction Entry",
                  description: "The fee payment row and receipt log in database",
                  subItems: [
                    "The transaction entry inside the accounting ledger (`payments` table)",
                    "Assigned invoice ID, payment receipt number, and collected cash/online log",
                    "Teacher collection reconciliation entries tied to this payment ID",
                  ],
                },
                {
                  label: "Payment Alerts & Receipts",
                  description: "Any automated notifications dispatched for this payment ID",
                  subItems: [
                    "Payment confirmation SMS logs and invoice delivery records",
                    "Dashboard receipt download link history for the student",
                  ],
                },
              ]}
              preservedItems={[
                {
                  label: "Student & Enrollment Status",
                  description: "The student's enrollment and account profile remain intact",
                  subItems: [
                    "The student profile (`student_profiles` table) and active academic enrollments",
                    "Previous and future payment slips and transaction ledgers",
                  ],
                },
                {
                  label: "Auto-Recalculated Dues",
                  description: "The student's net outstanding balance will adjust cleanly",
                  subItems: [
                    "The student's net outstanding due amount will automatically recalculate without this receipt",
                    "Batch fee structure and discount allocations remain unaffected",
                  ],
                },
              ]}
            />

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
