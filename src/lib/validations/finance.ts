import { z } from "zod";

export const FINANCE_PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "BKASH",
  "NAGAD",
  "CARD",
  "CHEQUE",
  "OTHER",
] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => value || null);

const receiptSchema = z
  .object({
    storagePath: z
      .string()
      .trim()
      .startsWith("finance/receipts/")
      .max(500)
      .nullable()
      .optional(),
    fileName: z.string().trim().min(1).max(180).nullable().optional(),
    contentType: z
      .enum(["application/pdf", "image/jpeg", "image/png", "image/webp"])
      .nullable()
      .optional(),
    sizeBytes: z.coerce.number().int().min(1).max(10 * 1024 * 1024).nullable().optional(),
  })
  .superRefine((value, context) => {
    const values = [value.storagePath, value.fileName, value.contentType, value.sizeBytes];
    const populated = values.filter((item) => item !== null && item !== undefined).length;
    if (populated !== 0 && populated !== values.length) {
      context.addIssue({
        code: "custom",
        message: "Receipt metadata must be complete.",
      });
    }
  });

export const financeExpenseInputSchema = z
  .object({
    categoryId: z.string().uuid(),
    title: z.string().trim().min(2).max(120),
    amount: z.coerce.number().positive().max(9_999_999_999.99),
    expenseDate: z.iso.date(),
    paymentMethod: z.enum(FINANCE_PAYMENT_METHODS),
    payee: optionalText(120),
    referenceNumber: optionalText(100),
    description: optionalText(2000),
    receipt: receiptSchema.optional(),
    removeExistingReceipt: z.boolean().optional().default(false),
  })
  .strict();

export const financeVoidInputSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export type FinanceExpenseInput = z.infer<typeof financeExpenseInputSchema>;
