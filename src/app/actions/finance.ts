"use server";

import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { requireTeacher } from "@/lib/auth-guards";
import { deleteR2File, generateR2UploadUrl } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  financeExpenseInputSchema,
  financeVoidInputSchema,
  type FinanceExpenseInput,
} from "@/lib/validations/finance";

const RECEIPT_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Internal server error";
}

function isFinanceReceiptPath(path: string | null | undefined) {
  return Boolean(path?.startsWith("finance/receipts/"));
}

function revalidateFinancePaths() {
  revalidatePath("/teacher/finance");
  revalidatePath("/teacher/payments");
}

async function assertCategory(categoryId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("finance_expense_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Select an active expense category.");
  }
}

function receiptColumns(input: FinanceExpenseInput) {
  if (input.removeExistingReceipt) {
    return {
      receipt_storage_path: null,
      receipt_file_name: null,
      receipt_content_type: null,
      receipt_size_bytes: null,
    };
  }

  if (input.receipt?.storagePath) {
    return {
      receipt_storage_path: input.receipt.storagePath,
      receipt_file_name: input.receipt.fileName,
      receipt_content_type: input.receipt.contentType,
      receipt_size_bytes: input.receipt.sizeBytes,
    };
  }

  return {};
}

export async function getFinanceReceiptUploadUrl(input: {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}) {
  try {
    await requireTeacher();

    if (!RECEIPT_CONTENT_TYPES.has(input.contentType)) {
      return {
        success: false,
        message: "Receipt must be a PDF, JPG, PNG, or WebP file.",
      };
    }
    if (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 1 || input.sizeBytes > MAX_RECEIPT_BYTES) {
      return {
        success: false,
        message: "Receipt file size must be between 1 byte and 10 MB.",
      };
    }

    const extensionByType: Record<string, string> = {
      "application/pdf": "pdf",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const safeBaseName =
      input.fileName
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 80) || "receipt";
    const storagePath = `finance/receipts/${new Date().getUTCFullYear()}/${crypto.randomUUID()}-${safeBaseName}.${extensionByType[input.contentType]}`;
    const uploadUrl = await generateR2UploadUrl(storagePath, input.contentType);

    return {
      success: true,
      uploadUrl,
      storagePath,
    };
  } catch (error: unknown) {
    return { success: false, message: errorMessage(error) };
  }
}

export async function createFinanceExpenseAction(rawInput: FinanceExpenseInput) {
  let uploadedPath: string | null = null;

  try {
    const { profile } = await requireTeacher();
    const parsed = financeExpenseInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Invalid expense details.",
      };
    }

    const input = parsed.data;
    await assertCategory(input.categoryId);
    uploadedPath = input.receipt?.storagePath || null;
    const admin = createAdminClient();
    const { data: expense, error } = await admin
      .from("finance_expenses")
      .insert({
        category_id: input.categoryId,
        title: input.title,
        amount: input.amount,
        expense_date: input.expenseDate,
        payment_method: input.paymentMethod,
        payee: input.payee,
        reference_number: input.referenceNumber,
        description: input.description,
        ...receiptColumns(input),
        status: "POSTED",
        created_by: profile.id,
        updated_by: profile.id,
      })
      .select("*, category:finance_expense_categories(id, name, color_hex)")
      .single();

    if (error || !expense) {
      if (isFinanceReceiptPath(uploadedPath)) await deleteR2File(uploadedPath!);
      return {
        success: false,
        message: error?.message || "Failed to save the expense.",
      };
    }

    await createAuditLog({
      actorProfileId: profile.id,
      action: "FINANCE_EXPENSE_CREATED",
      entityType: "finance_expenses",
      entityId: expense.id,
      newValue: expense,
    });
    revalidateFinancePaths();
    return { success: true, expense };
  } catch (error: unknown) {
    if (isFinanceReceiptPath(uploadedPath)) await deleteR2File(uploadedPath!);
    return { success: false, message: errorMessage(error) };
  }
}

export async function updateFinanceExpenseAction(
  expenseId: string,
  rawInput: FinanceExpenseInput
) {
  let newUploadedPath: string | null = null;

  try {
    const { profile } = await requireTeacher();
    const parsed = financeExpenseInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Invalid expense details.",
      };
    }

    const input = parsed.data;
    newUploadedPath = input.receipt?.storagePath || null;
    await assertCategory(input.categoryId);
    const admin = createAdminClient();
    const { data: oldExpense, error: fetchError } = await admin
      .from("finance_expenses")
      .select("*")
      .eq("id", expenseId)
      .maybeSingle();

    if (fetchError || !oldExpense) {
      if (isFinanceReceiptPath(newUploadedPath)) await deleteR2File(newUploadedPath!);
      return { success: false, message: "Expense record not found." };
    }
    if (oldExpense.status === "VOID") {
      if (isFinanceReceiptPath(newUploadedPath)) await deleteR2File(newUploadedPath!);
      return {
        success: false,
        message: "Restore this voided expense before editing it.",
      };
    }

    const { data: expense, error } = await admin
      .from("finance_expenses")
      .update({
        category_id: input.categoryId,
        title: input.title,
        amount: input.amount,
        expense_date: input.expenseDate,
        payment_method: input.paymentMethod,
        payee: input.payee,
        reference_number: input.referenceNumber,
        description: input.description,
        ...receiptColumns(input),
        updated_by: profile.id,
      })
      .eq("id", expenseId)
      .select("*, category:finance_expense_categories(id, name, color_hex)")
      .single();

    if (error || !expense) {
      if (isFinanceReceiptPath(newUploadedPath)) await deleteR2File(newUploadedPath!);
      return {
        success: false,
        message: error?.message || "Failed to update the expense.",
      };
    }

    const oldReceiptWasReplaced =
      oldExpense.receipt_storage_path &&
      (input.removeExistingReceipt ||
        (newUploadedPath && newUploadedPath !== oldExpense.receipt_storage_path));
    if (oldReceiptWasReplaced && isFinanceReceiptPath(oldExpense.receipt_storage_path)) {
      await deleteR2File(oldExpense.receipt_storage_path);
    }

    await createAuditLog({
      actorProfileId: profile.id,
      action: "FINANCE_EXPENSE_UPDATED",
      entityType: "finance_expenses",
      entityId: expenseId,
      oldValue: oldExpense,
      newValue: expense,
    });
    revalidateFinancePaths();
    return { success: true, expense };
  } catch (error: unknown) {
    if (isFinanceReceiptPath(newUploadedPath)) await deleteR2File(newUploadedPath!);
    return { success: false, message: errorMessage(error) };
  }
}

export async function voidFinanceExpenseAction(expenseId: string, reason: string) {
  try {
    const { profile } = await requireTeacher();
    const parsed = financeVoidInputSchema.safeParse({ reason });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "A void reason is required.",
      };
    }

    const admin = createAdminClient();
    const { data: oldExpense } = await admin
      .from("finance_expenses")
      .select("*")
      .eq("id", expenseId)
      .maybeSingle();
    if (!oldExpense) return { success: false, message: "Expense record not found." };
    if (oldExpense.status === "VOID") {
      return { success: false, message: "This expense is already voided." };
    }

    const { data: expense, error } = await admin
      .from("finance_expenses")
      .update({
        status: "VOID",
        void_reason: parsed.data.reason,
        voided_at: new Date().toISOString(),
        voided_by: profile.id,
        updated_by: profile.id,
      })
      .eq("id", expenseId)
      .select("*")
      .single();
    if (error || !expense) {
      return { success: false, message: error?.message || "Failed to void expense." };
    }

    await createAuditLog({
      actorProfileId: profile.id,
      action: "FINANCE_EXPENSE_VOIDED",
      entityType: "finance_expenses",
      entityId: expenseId,
      oldValue: oldExpense,
      newValue: expense,
    });
    revalidateFinancePaths();
    return { success: true, expense };
  } catch (error: unknown) {
    return { success: false, message: errorMessage(error) };
  }
}

export async function restoreFinanceExpenseAction(expenseId: string) {
  try {
    const { profile } = await requireTeacher();
    const admin = createAdminClient();
    const { data: oldExpense } = await admin
      .from("finance_expenses")
      .select("*")
      .eq("id", expenseId)
      .maybeSingle();
    if (!oldExpense) return { success: false, message: "Expense record not found." };
    if (oldExpense.status !== "VOID") {
      return { success: false, message: "This expense is already posted." };
    }

    const { data: expense, error } = await admin
      .from("finance_expenses")
      .update({
        status: "POSTED",
        void_reason: null,
        voided_at: null,
        voided_by: null,
        updated_by: profile.id,
      })
      .eq("id", expenseId)
      .select("*")
      .single();
    if (error || !expense) {
      return { success: false, message: error?.message || "Failed to restore expense." };
    }

    await createAuditLog({
      actorProfileId: profile.id,
      action: "FINANCE_EXPENSE_RESTORED",
      entityType: "finance_expenses",
      entityId: expenseId,
      oldValue: oldExpense,
      newValue: expense,
    });
    revalidateFinancePaths();
    return { success: true, expense };
  } catch (error: unknown) {
    return { success: false, message: errorMessage(error) };
  }
}
