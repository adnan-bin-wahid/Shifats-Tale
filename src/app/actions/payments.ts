"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTeacher } from "@/lib/auth-guards";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

/**
 * Assures the actor is an active teacher.
 */
async function assertActiveTeacher() {
  const { profile } = await requireTeacher();
  return profile;
}

/**
 * Validates negative values and status requirements.
 */
function validatePaymentInputs(expectedAmount: number, paidAmount: number) {
  if (expectedAmount < 0) {
    throw new Error("Expected amount cannot be negative.");
  }
  if (paidAmount < 0) {
    throw new Error("Paid amount cannot be negative.");
  }
}

/**
 * Create a new payment record.
 */
export async function createPaymentAction(rawInput: {
  studentId: string;
  enrollmentId: string;
  batchId: string;
  billingMonth: number;
  billingYear: number;
  expectedAmount: number;
  paidAmount: number;
  status?: "UNPAID" | "PAID" | "PARTIALLY_PAID" | "WAIVED" | "REFUNDED" | "CANCELLED";
  paymentMethod?: string;
  paymentDate?: string;
  referenceNumber?: string;
  teacherNote?: string;
  studentNote?: string;
}) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    const {
      studentId,
      enrollmentId,
      batchId,
      billingMonth,
      billingYear,
      expectedAmount,
      paidAmount,
      paymentMethod,
      paymentDate,
      referenceNumber,
      teacherNote,
      studentNote,
    } = rawInput;

    validatePaymentInputs(expectedAmount, paidAmount);

    // Enforce billing month and year boundaries
    if (billingMonth < 1 || billingMonth > 12) {
      return { success: false, message: "Billing month must be between 1 and 12." };
    }
    if (billingYear < 2020) {
      return { success: false, message: "Billing year must be 2020 or later." };
    }

    // Check for duplicate monthly payment
    const { data: existing } = await admin
      .from("payments")
      .select("id")
      .eq("enrollment_id", enrollmentId)
      .eq("billing_month", billingMonth)
      .eq("billing_year", billingYear)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        code: "DUPLICATE",
        paymentId: existing.id,
        message: "A payment record already exists for this enrollment in the selected billing month and year.",
      };
    }

    // Calculate auto status and due amount
    let status = rawInput.status;
    if (!status) {
      if (paidAmount === 0) status = "UNPAID";
      else if (paidAmount < expectedAmount) status = "PARTIALLY_PAID";
      else status = "PAID";
    }

    // Require appropriate notes for exceptional statuses
    if (["WAIVED", "REFUNDED", "CANCELLED"].includes(status)) {
      if (!teacherNote || teacherNote.trim() === "") {
        return {
          success: false,
          message: `A teacher note or reason is required for status: ${status}.`,
        };
      }
    }

    // Calculate due amount
    const dueAmount = status === "WAIVED" ? 0 : Math.max(expectedAmount - paidAmount, 0);

    // Insert record
    const { data: newPayment, error } = await admin
      .from("payments")
      .insert({
        student_id: studentId,
        enrollment_id: enrollmentId,
        batch_id: batchId,
        billing_month: billingMonth,
        billing_year: billingYear,
        expected_amount: expectedAmount,
        paid_amount: paidAmount,
        status,
        payment_method: paymentMethod || null,
        payment_date: paymentDate || null,
        reference_number: referenceNumber || null,
        confirmed_at: ["PAID", "PARTIALLY_PAID"].includes(status) ? new Date().toISOString() : null,
        teacher_note: teacherNote || null,
        student_note: studentNote || null,
      })
      .select("*, batches(name)")
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    // Create Audit Log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "PAYMENT_CREATED",
      entityType: "payments",
      entityId: newPayment.id,
      newValue: newPayment,
    });

    // Notify student if meaningful
    if (["PAID", "PARTIALLY_PAID", "WAIVED", "REFUNDED"].includes(status)) {
      let title = "Payment Recorded";
      let message = `A payment of ৳${paidAmount} has been recorded for ${newPayment.batches?.name || "your batch"} (${billingMonth}/${billingYear}). Status: ${status}.`;
      if (status === "WAIVED") {
        title = "Fee Waived";
        message = `Your tuition fee for ${newPayment.batches?.name || "your batch"} (${billingMonth}/${billingYear}) has been waived.`;
      } else if (status === "REFUNDED") {
        title = "Payment Refunded";
        message = `A payment for ${newPayment.batches?.name || "your batch"} (${billingMonth}/${billingYear}) has been refunded.`;
      }

      await createNotification({
        studentProfileId: studentId,
        type: `PAYMENT_${status}`,
        title,
        message,
        relatedEntityType: "payments",
        relatedEntityId: newPayment.id,
      });
    }

    revalidatePath("/teacher/payments");
    revalidatePath(`/teacher/students/${studentId}`);
    revalidatePath(`/teacher/batches/${batchId}`);
    return { success: true, payment: newPayment };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

/**
 * Edit/Update an existing payment record.
 */
export async function updatePaymentAction(
  paymentId: string,
  rawInput: {
    expectedAmount: number;
    paidAmount: number;
    status: "UNPAID" | "PAID" | "PARTIALLY_PAID" | "WAIVED" | "REFUNDED" | "CANCELLED";
    paymentMethod?: string;
    paymentDate?: string;
    referenceNumber?: string;
    teacherNote?: string;
    studentNote?: string;
    confirmPaidReduction?: boolean;
    reasonForPaidToUnpaidRefundCancelled?: string;
  }
) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    const {
      expectedAmount,
      paidAmount,
      status,
      paymentMethod,
      paymentDate,
      referenceNumber,
      teacherNote,
      studentNote,
      confirmPaidReduction,
      reasonForPaidToUnpaidRefundCancelled,
    } = rawInput;

    validatePaymentInputs(expectedAmount, paidAmount);

    // Fetch existing payment
    const { data: oldPayment, error: fetchError } = await admin
      .from("payments")
      .select("*, batches(name)")
      .eq("id", paymentId)
      .single();

    if (fetchError || !oldPayment) {
      return { success: false, message: "Payment record not found." };
    }

    // Require confirmation for reducing a paid amount
    if (paidAmount < oldPayment.paid_amount && !confirmPaidReduction) {
      return {
        success: false,
        code: "CONFIRM_PAID_REDUCTION",
        message: "Reducing a paid amount requires explicit confirmation.",
      };
    }

    // Require a reason when changing PAID to UNPAID, REFUNDED, or CANCELLED
    if (
      oldPayment.status === "PAID" &&
      ["UNPAID", "REFUNDED", "CANCELLED"].includes(status)
    ) {
      if (!reasonForPaidToUnpaidRefundCancelled || reasonForPaidToUnpaidRefundCancelled.trim() === "") {
        return {
          success: false,
          code: "REQUIRE_REASON",
          message: `A reason is required when changing status from PAID to ${status}.`,
        };
      }
    }

    // Require notes for exceptional statuses (WAIVED, REFUNDED, CANCELLED)
    if (["WAIVED", "REFUNDED", "CANCELLED"].includes(status)) {
      if (!teacherNote || teacherNote.trim() === "") {
        return {
          success: false,
          message: `A teacher note or reason is required for status: ${status}.`,
        };
      }
    }

    // Recalculate due amount
    const dueAmount = status === "WAIVED" ? 0 : Math.max(expectedAmount - paidAmount, 0);

    // Prepare updates
    const updates: any = {
      expected_amount: expectedAmount,
      paid_amount: paidAmount,
      status,
      payment_method: paymentMethod || null,
      payment_date: paymentDate || null,
      reference_number: referenceNumber || null,
      teacher_note: teacherNote || oldPayment.teacher_note,
      student_note: studentNote || null,
    };

    // If status became PAID/PARTIALLY_PAID and wasn't before, set confirmed_at
    if (
      ["PAID", "PARTIALLY_PAID"].includes(status) &&
      !["PAID", "PARTIALLY_PAID"].includes(oldPayment.status)
    ) {
      updates.confirmed_at = new Date().toISOString();
    }

    // If reason was provided for downgrade/exceptional status, append to teacher note
    if (reasonForPaidToUnpaidRefundCancelled) {
      const appendNote = `[Status Change Reason]: ${reasonForPaidToUnpaidRefundCancelled}`;
      updates.teacher_note = updates.teacher_note 
        ? `${updates.teacher_note}\n${appendNote}`
        : appendNote;
    }

    const { data: updatedPayment, error } = await admin
      .from("payments")
      .update(updates)
      .eq("id", paymentId)
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    // Create Audit Log
    await createAuditLog({
      actorProfileId: teacher.id,
      action: "PAYMENT_UPDATED",
      entityType: "payments",
      entityId: paymentId,
      oldValue: oldPayment,
      newValue: updatedPayment,
    });

    // Determine if notification is needed for material correction
    const isMaterialChange =
      oldPayment.expected_amount !== expectedAmount ||
      oldPayment.paid_amount !== paidAmount ||
      oldPayment.status !== status ||
      oldPayment.payment_method !== paymentMethod ||
      oldPayment.payment_date !== paymentDate;

    if (isMaterialChange) {
      let title = "Payment Details Updated";
      let message = `Your tuition payment record for ${oldPayment.batches?.name || "your batch"} (${oldPayment.billing_month}/${oldPayment.billing_year}) was updated by the teacher. Status: ${status}.`;
      
      if (status === "WAIVED") {
        title = "Fee Waived";
        message = `Your tuition fee for ${oldPayment.batches?.name || "your batch"} (${oldPayment.billing_month}/${oldPayment.billing_year}) has been waived.`;
      } else if (status === "REFUNDED") {
        title = "Payment Refunded";
        message = `Your tuition payment for ${oldPayment.batches?.name || "your batch"} (${oldPayment.billing_month}/${oldPayment.billing_year}) has been refunded. Reason: ${teacherNote || "Refund processed"}`;
      }

      await createNotification({
        studentProfileId: oldPayment.student_id,
        type: "PAYMENT_UPDATED",
        title,
        message,
        relatedEntityType: "payments",
        relatedEntityId: paymentId,
      });
    }

    revalidatePath("/teacher/payments");
    revalidatePath(`/teacher/payments/${paymentId}`);
    revalidatePath(`/teacher/students/${oldPayment.student_id}`);
    revalidatePath(`/teacher/batches/${oldPayment.batch_id}`);
    return { success: true, payment: updatedPayment };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

/**
 * Generate unpaid payment records for students with active enrollments in a batch.
 */
export async function generateMonthlyDuesAction(
  batchId: string,
  billingMonth: number,
  billingYear: number
) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    // Validate inputs
    if (billingMonth < 1 || billingMonth > 12) {
      return { success: false, message: "Month must be between 1 and 12." };
    }
    if (billingYear < 2020) {
      return { success: false, message: "Year must be 2020 or later." };
    }

    // Fetch batch details (for standard monthly fee)
    const { data: batch, error: batchError } = await admin
      .from("batches")
      .select("name, monthly_fee")
      .eq("id", batchId)
      .single();

    if (batchError || !batch) {
      return { success: false, message: "Batch not found." };
    }

    // Fetch active enrollments in the batch
    const { data: enrollments, error: enrollError } = await admin
      .from("enrollments")
      .select("id, student_id")
      .eq("batch_id", batchId)
      .eq("status", "ACTIVE");

    if (enrollError) {
      return { success: false, message: enrollError.message };
    }

    if (!enrollments || enrollments.length === 0) {
      return {
        success: true,
        createdCount: 0,
        skippedCount: 0,
        message: "No active enrollments found for this batch to generate dues.",
      };
    }

    // Fetch existing payment records for this batch, month, year
    const { data: existingPayments } = await admin
      .from("payments")
      .select("enrollment_id")
      .eq("batch_id", batchId)
      .eq("billing_month", billingMonth)
      .eq("billing_year", billingYear);

    const existingEnrollmentIds = new Set(
      existingPayments?.map((p) => p.enrollment_id) || []
    );

    const recordsToInsert = [];
    let skippedCount = 0;

    for (const enr of enrollments) {
      if (existingEnrollmentIds.has(enr.id)) {
        skippedCount++;
      } else {
        recordsToInsert.push({
          student_id: enr.student_id,
          enrollment_id: enr.id,
          batch_id: batchId,
          billing_month: billingMonth,
          billing_year: billingYear,
          expected_amount: batch.monthly_fee,
          paid_amount: 0.00,
          status: "UNPAID",
        });
      }
    }

    let createdCount = 0;
    if (recordsToInsert.length > 0) {
      const { data: inserted, error: insertError } = await admin
        .from("payments")
        .insert(recordsToInsert)
        .select("id");

      if (insertError) {
        return { success: false, message: insertError.message };
      }
      createdCount = inserted?.length || 0;

      // Audit log the generation event
      await createAuditLog({
        actorProfileId: teacher.id,
        action: "MONTHLY_DUES_GENERATED",
        entityType: "batches",
        entityId: batchId,
        newValue: {
          billingMonth,
          billingYear,
          createdCount,
          skippedCount,
        },
      });
    }

    revalidatePath("/teacher/payments");
    revalidatePath(`/teacher/batches/${batchId}`);
    return {
      success: true,
      createdCount,
      skippedCount,
      message: `Monthly dues generation complete: Created ${createdCount} new records, skipped ${skippedCount} existing records.`,
    };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}

/**
 * Delete a payment record permanently.
 */
export async function deletePaymentAction(paymentId: string) {
  try {
    const teacher = await assertActiveTeacher();
    const admin = createAdminClient();

    const { data: payment, error: fetchError } = await admin
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (fetchError || !payment) {
      return { success: false, message: "Payment record not found." };
    }

    // Clean up related notifications if any
    await admin.from("notifications").delete().eq("related_entity_id", paymentId);

    const { error: dbError } = await admin
      .from("payments")
      .delete()
      .eq("id", paymentId);

    if (dbError) {
      return { success: false, message: `Database deletion failed: ${dbError.message}` };
    }

    await createAuditLog({
      actorProfileId: teacher.id,
      action: "PAYMENT_DELETED",
      entityType: "payments",
      entityId: paymentId,
      oldValue: payment,
    });

    revalidatePath("/teacher/payments");
    if (payment.batch_id) {
      revalidatePath(`/teacher/batches/${payment.batch_id}`);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message || "Internal server error" };
  }
}
