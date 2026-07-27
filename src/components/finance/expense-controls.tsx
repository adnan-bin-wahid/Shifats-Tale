"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Loader2, Pencil, Plus, RotateCcw, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  createFinanceExpenseAction,
  getFinanceReceiptUploadUrl,
  restoreFinanceExpenseAction,
  updateFinanceExpenseAction,
  voidFinanceExpenseAction,
} from "@/app/actions/finance";
import { FINANCE_PAYMENT_METHODS } from "@/lib/validations/finance";

export type FinanceCategoryOption = {
  id: string;
  name: string;
  color_hex: string;
};

export type FinanceExpenseForEdit = {
  id: string;
  category_id: string;
  title: string;
  amount: number;
  expense_date: string;
  payment_method: (typeof FINANCE_PAYMENT_METHODS)[number];
  payee: string | null;
  reference_number: string | null;
  description: string | null;
  receipt_storage_path: string | null;
  receipt_file_name: string | null;
  receipt_content_type: string | null;
  receipt_size_bytes: number | null;
  status: "POSTED" | "VOID";
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
const labelClass = "text-[11px] font-black uppercase tracking-wider text-slate-600";

function paymentMethodLabel(method: string) {
  if (method === "BANK_TRANSFER") return "Bank transfer";
  if (method === "BKASH") return "bKash";
  if (method === "NAGAD") return "Nagad";
  return method.charAt(0) + method.slice(1).toLowerCase();
}

async function uploadReceipt(file: File) {
  const result = await getFinanceReceiptUploadUrl({
    fileName: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  });
  if (!result.success || !result.uploadUrl || !result.storagePath) {
    throw new Error(result.message || "Could not initialize receipt upload.");
  }

  const response = await fetch(result.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) throw new Error("Receipt upload failed. Please try again.");

  return {
    storagePath: result.storagePath,
    fileName: file.name,
    contentType: file.type as "application/pdf" | "image/jpeg" | "image/png" | "image/webp",
    sizeBytes: file.size,
  };
}

export function ExpenseEditor({
  categories,
  today,
  expense,
}: {
  categories: FinanceCategoryOption[];
  today: string;
  expense?: FinanceExpenseForEdit;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const editing = Boolean(expense);

  function close() {
    if (pending) return;
    setOpen(false);
    setFile(null);
    setRemoveReceipt(false);
    formRef.current?.reset();
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        const receipt = file ? await uploadReceipt(file) : undefined;
        const input = {
          categoryId: String(formData.get("categoryId") || ""),
          title: String(formData.get("title") || ""),
          amount: Number(formData.get("amount")),
          expenseDate: String(formData.get("expenseDate") || ""),
          paymentMethod: String(formData.get("paymentMethod") || "CASH") as (typeof FINANCE_PAYMENT_METHODS)[number],
          payee: String(formData.get("payee") || ""),
          referenceNumber: String(formData.get("referenceNumber") || ""),
          description: String(formData.get("description") || ""),
          receipt,
          removeExistingReceipt: removeReceipt,
        };
        const result = expense
          ? await updateFinanceExpenseAction(expense.id, input)
          : await createFinanceExpenseAction(input);

        if (!result.success) throw new Error(result.message || "Expense could not be saved.");
        toast.success(editing ? "Expense updated." : "Expense recorded.");
        setOpen(false);
        setFile(null);
        setRemoveReceipt(false);
        formRef.current?.reset();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Expense could not be saved.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={expense?.status === "VOID"}
        className={
          editing
            ? "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-black text-slate-700 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            : "inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-black text-primary shadow-sm hover:bg-amber-400"
        }
      >
        {editing ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
        {editing ? "Edit" : "Add expense"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/20 bg-[#FFFCF7] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">
                  Finance ledger
                </p>
                <h2 className="mt-1 text-xl font-black text-primary">
                  {editing ? "Edit expense record" : "Record a new expense"}
                </h2>
                <p className="mt-1 text-xs font-semibold text-muted">
                  Only actual paid costs belong here. Keep the receipt for a paperless audit trail.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Close expense form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form ref={formRef} action={submit} className="space-y-5 p-5 sm:p-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className={labelClass}>Expense category *</span>
                  <select
                    name="categoryId"
                    required
                    defaultValue={expense?.category_id || categories[0]?.id}
                    className={inputClass}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Expense date *</span>
                  <input
                    name="expenseDate"
                    type="date"
                    required
                    max={today}
                    defaultValue={expense?.expense_date || today}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
                <label>
                  <span className={labelClass}>Title / purpose *</span>
                  <input
                    name="title"
                    required
                    minLength={2}
                    maxLength={120}
                    defaultValue={expense?.title}
                    placeholder="e.g. July classroom rent"
                    className={inputClass}
                  />
                </label>
                <label>
                  <span className={labelClass}>Amount (BDT) *</span>
                  <input
                    name="amount"
                    type="number"
                    required
                    min="0.01"
                    max="9999999999.99"
                    step="0.01"
                    defaultValue={expense?.amount}
                    placeholder="0.00"
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label>
                  <span className={labelClass}>Payment method *</span>
                  <select
                    name="paymentMethod"
                    required
                    defaultValue={expense?.payment_method || "CASH"}
                    className={inputClass}
                  >
                    {FINANCE_PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {paymentMethodLabel(method)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className={labelClass}>Paid to / vendor</span>
                  <input
                    name="payee"
                    maxLength={120}
                    defaultValue={expense?.payee || ""}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </label>
                <label>
                  <span className={labelClass}>Reference / trx ID</span>
                  <input
                    name="referenceNumber"
                    maxLength={100}
                    defaultValue={expense?.reference_number || ""}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </label>
              </div>

              <label className="block">
                <span className={labelClass}>Description / event details</span>
                <textarea
                  name="description"
                  rows={3}
                  maxLength={2000}
                  defaultValue={expense?.description || ""}
                  placeholder="Add the breakdown, event name, quantity, or any note needed later."
                  className={inputClass}
                />
              </label>

              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-slate-100 p-2.5 text-primary">
                    <Upload className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-slate-800">Digital receipt / voucher</p>
                    <p className="mt-1 text-[10px] font-semibold text-muted">
                      PDF, JPG, PNG or WebP · maximum 10 MB
                    </p>
                    {expense?.receipt_file_name && !removeReceipt && !file && (
                      <a
                        href={`/api/finance/expenses/${expense.id}/receipt`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-black text-primary hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {expense.receipt_file_name}
                      </a>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      onChange={(event) => {
                        setFile(event.target.files?.[0] || null);
                        if (event.target.files?.[0]) setRemoveReceipt(false);
                      }}
                      className="mt-3 block w-full text-[11px] font-bold text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-[10px] file:font-black file:text-white"
                    />
                    {file && (
                      <p className="mt-2 truncate text-[10px] font-bold text-emerald-700">
                        Selected: {file.name}
                      </p>
                    )}
                    {expense?.receipt_storage_path && (
                      <label className="mt-3 flex items-center gap-2 text-[10px] font-bold text-rose-700">
                        <input
                          type="checkbox"
                          checked={removeReceipt}
                          onChange={(event) => {
                            setRemoveReceipt(event.target.checked);
                            if (event.target.checked) setFile(null);
                          }}
                        />
                        Remove the existing receipt
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || categories.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {pending ? "Saving…" : editing ? "Save changes" : "Record expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function ExpenseStatusAction({ expense }: { expense: FinanceExpenseForEdit }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function changeStatus() {
    if (expense.status === "VOID") {
      if (!window.confirm("Restore this expense and include it in financial totals again?")) return;
      startTransition(async () => {
        const result = await restoreFinanceExpenseAction(expense.id);
        if (result.success) {
          toast.success("Expense restored.");
          router.refresh();
        } else {
          toast.error(result.message || "Could not restore expense.");
        }
      });
      return;
    }

    const reason = window.prompt(
      "Why is this expense being voided? The record will remain in the audit trail."
    );
    if (!reason) return;
    startTransition(async () => {
      const result = await voidFinanceExpenseAction(expense.id, reason);
      if (result.success) {
        toast.success("Expense voided and excluded from totals.");
        router.refresh();
      } else {
        toast.error(result.message || "Could not void expense.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={changeStatus}
      disabled={pending}
      className={
        expense.status === "VOID"
          ? "inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black text-emerald-700"
          : "inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-black text-rose-700"
      }
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <RotateCcw className="h-3.5 w-3.5" />
      )}
      {expense.status === "VOID" ? "Restore" : "Void"}
    </button>
  );
}

export function PrintFinanceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black text-slate-700 hover:border-primary hover:text-primary"
    >
      Print report
    </button>
  );
}
