"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePaymentAction, deletePaymentAction } from "@/app/actions/payments";
import { formatCurrency } from "@/lib/currency";
import { Loader2, AlertCircle, Trash2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface Payment {
  id: string;
  expected_amount: number;
  paid_amount: number;
  status: "UNPAID" | "PAID" | "PARTIALLY_PAID" | "WAIVED" | "REFUNDED" | "CANCELLED";
  payment_method: string | null;
  payment_date: string | null;
  reference_number: string | null;
  teacher_note: string | null;
  student_note: string | null;
  billing_month: number;
  billing_year: number;
}

interface EditPaymentFormProps {
  payment: Payment;
}

export function EditPaymentForm({ payment }: EditPaymentFormProps) {
  const router = useRouter();

  // State initialization
  const [expectedAmount, setExpectedAmount] = useState<number>(Number(payment.expected_amount));
  const [paidAmount, setPaidAmount] = useState<number>(Number(payment.paid_amount));
  const [status, setStatus] = useState<"UNPAID" | "PAID" | "PARTIALLY_PAID" | "WAIVED" | "REFUNDED" | "CANCELLED">(payment.status);

  // Payment method parsing
  const initialMethod = payment.payment_method?.startsWith("OTHER:") ? "OTHER" : (payment.payment_method || "CASH");
  const initialOtherDesc = payment.payment_method?.startsWith("OTHER:") ? payment.payment_method.replace("OTHER:", "").trim() : "";
  
  const [paymentMethod, setPaymentMethod] = useState<string>(initialMethod);
  const [otherMethodDescription, setOtherMethodDescription] = useState<string>(initialOtherDesc);
  const [paymentDate, setPaymentDate] = useState<string>(payment.payment_date || new Date().toISOString().split("T")[0]);
  const [referenceNumber, setReferenceNumber] = useState<string>(payment.reference_number || "");
  const [teacherNote, setTeacherNote] = useState<string>(payment.teacher_note || "");
  const [studentNote, setStudentNote] = useState<string>(payment.student_note || "");

  // Confirmation / Extra Fields
  const [confirmPaidReduction, setConfirmPaidReduction] = useState<boolean>(false);
  const [reasonForDowngrade, setReasonForDowngrade] = useState<string>("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dynamic checks
  const isPaidReduction = paidAmount < Number(payment.paid_amount);
  const isStatusDowngrade = payment.status === "PAID" && ["UNPAID", "REFUNDED", "CANCELLED"].includes(status);

  const calculatedDue = status === "WAIVED" ? 0 : Math.max(expectedAmount - paidAmount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Negative amounts check
    if (expectedAmount < 0 || paidAmount < 0) {
      setErrorMessage("Amounts cannot be negative.");
      return;
    }

    // Require confirm check
    if (isPaidReduction && !confirmPaidReduction) {
      setErrorMessage("You are reducing the paid amount. Please check the confirmation box below to save.");
      return;
    }

    // Require reason for status downgrade from PAID
    if (isStatusDowngrade && !reasonForDowngrade.trim()) {
      setErrorMessage("Please fill in the reason for changing the status from PAID to UNPAID/REFUNDED/CANCELLED.");
      return;
    }

    // Require teacher notes for WAIVED / REFUNDED / CANCELLED
    if (["WAIVED", "REFUNDED", "CANCELLED"].includes(status)) {
      if (!teacherNote.trim()) {
        setErrorMessage(`A teacher note / reason is required for status: ${status}.`);
        return;
      }
    }

    setLoading(true);

    try {
      const finalMethod = paymentMethod === "OTHER" 
        ? `OTHER: ${otherMethodDescription}`
        : paymentMethod;

      const res = await updatePaymentAction(payment.id, {
        expectedAmount,
        paidAmount,
        status,
        paymentMethod: finalMethod,
        paymentDate: paidAmount > 0 ? paymentDate : undefined,
        referenceNumber,
        teacherNote,
        studentNote,
        confirmPaidReduction,
        reasonForPaidToUnpaidRefundCancelled: isStatusDowngrade ? reasonForDowngrade : undefined,
      });

      if (!res.success) {
        if (res.code === "CONFIRM_PAID_REDUCTION") {
          setErrorMessage(res.message || "Reduction check needed.");
        } else if (res.code === "REQUIRE_REASON") {
          setErrorMessage(res.message || "Downgrade reason needed.");
        } else {
          setErrorMessage(res.message || "Failed to update payment record.");
        }
      } else {
        setSuccessMessage("Billing record corrected successfully!");
        toast.success("Billing record corrected successfully!");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("An unexpected error occurred while updating the payment record.");
      toast.error("An unexpected error occurred while updating the payment record.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deletePaymentAction(payment.id);
      if (res.success) {
        toast.success("Payment record deleted permanently!");
        router.push("/teacher/payments");
        router.refresh();
      } else {
        toast.error(res.message || "Failed to delete payment record.");
        setDeleting(false);
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-xs font-bold text-primary">
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 font-bold flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 font-bold flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Amounts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] text-muted uppercase font-bold mb-1.5">
            Expected Fee (BDT)
          </label>
          <input
            type="number"
            value={expectedAmount}
            onChange={(e) => setExpectedAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] text-muted uppercase font-bold mb-1.5">
            Paid Amount (BDT)
          </label>
          <input
            type="number"
            value={paidAmount}
            onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <span className="block text-[10px] text-muted uppercase font-bold mb-1.5">
            Recalculated Due Balance
          </span>
          <div className="px-3 py-2 rounded-xl border border-dashed border-border/60 bg-slate-50/50 text-slate-800 text-sm font-extrabold">
            {formatCurrency(calculatedDue)}
          </div>
        </div>
      </div>

      {/* Reduction Warning */}
      {isPaidReduction && (
        <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 space-y-2.5 font-bold">
          <div className="flex gap-2 items-start">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
            <p className="text-xs">Warning: You are reducing the recorded paid amount from {formatCurrency(payment.paid_amount)} to {formatCurrency(paidAmount)}.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmPaidReduction}
              onChange={(e) => setConfirmPaidReduction(e.target.checked)}
              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 h-4.5 w-4.5"
            />
            <span>Yes, I confirm reducing the paid amount.</span>
          </label>
        </div>
      )}

      {/* Status & Method */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] text-muted uppercase font-bold mb-1.5">
            Billing Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full px-3 py-2 border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none text-xs"
          >
            <option value="UNPAID">UNPAID</option>
            <option value="PAID">PAID</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
            <option value="WAIVED">WAIVED</option>
            <option value="REFUNDED">REFUNDED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-muted uppercase font-bold mb-1.5">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none text-xs"
              disabled={paidAmount === 0}
            >
              <option value="CASH">CASH</option>
              <option value="BANK_TRANSFER">BANK TRANSFER</option>
              <option value="MOBILE_FINANCIAL_SERVICE">MFS (bKash/Nagad...)</option>
              <option value="OTHER">OTHER</option>
            </select>
            {paymentMethod === "OTHER" && (
              <input
                type="text"
                value={otherMethodDescription}
                onChange={(e) => setOtherMethodDescription(e.target.value)}
                placeholder="Specify method..."
                className="w-full px-3 py-2 border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none"
              />
            )}
          </div>
        </div>
      </div>

      {/* Downgrade Reason Input */}
      {isStatusDowngrade && (
        <div className="space-y-1.5 p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl">
          <label className="block text-[10px] text-amber-800 uppercase font-black">
            Reason for Status Change * (Required for Downgrading PAID status)
          </label>
          <input
            type="text"
            value={reasonForDowngrade}
            onChange={(e) => setReasonForDowngrade(e.target.value)}
            placeholder="Explain why the fully paid slip was marked as unpaid, refunded, or cancelled..."
            className="w-full px-3 py-2 border border-amber-250 bg-white rounded-xl focus:border-amber-500 focus:outline-none text-xs font-bold text-amber-900"
          />
        </div>
      )}

      {/* Payment Date & Reference */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] text-muted uppercase font-bold mb-1.5">
            Payment Date
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-3 py-2 border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none"
            disabled={paidAmount === 0}
          />
        </div>

        <div>
          <label className="block text-[10px] text-muted uppercase font-bold mb-1.5">
            Reference / Receipt Number
          </label>
          <input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="Transaction ID, Receipt code..."
            className="w-full px-3 py-2 border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-4 pt-2 border-t border-border/10">
        <div>
          <label className="block text-[10px] text-muted uppercase font-bold mb-1.5">
            Teacher Private Note (Confidential) {["WAIVED", "REFUNDED", "CANCELLED"].includes(status) && <span className="text-rose-600">* Required</span>}
          </label>
          <textarea
            rows={3}
            value={teacherNote}
            onChange={(e) => setTeacherNote(e.target.value)}
            placeholder="Document exceptional statuses reasons, adjustments, etc..."
            className="w-full p-3 border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none text-xs font-bold"
          />
        </div>

        <div>
          <label className="block text-[10px] text-muted uppercase font-bold mb-1.5">
            Student Visible Note
          </label>
          <textarea
            rows={3}
            value={studentNote}
            onChange={(e) => setStudentNote(e.target.value)}
            placeholder="Notes visible to the student on their dashboard..."
            className="w-full p-3 border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none text-xs font-bold"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border/30">
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={loading || deleting}
          className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all border border-rose-200"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete Record</span>
        </button>

        <button
          type="submit"
          disabled={loading || deleting}
          className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>Save Modifications</span>
        </button>
      </div>

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
                  Are you sure you want to permanently delete this ledger payment record? This will remove the record from all billing reports and student dues calculations immediately.
                </p>
              </div>
            </div>
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
    </form>
  );
}
