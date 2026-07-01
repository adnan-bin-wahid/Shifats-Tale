import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuditLog } from "@/lib/audit";
import { requireTeacher } from "@/lib/auth-guards";
import { RateLimitError, rateLimit } from "@/lib/rate-limit";
import { escapeCSV } from "@/lib/csv";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_TABS = new Set(["enrollment", "payment", "examination"]);
const ENROLLMENT_STATUSES = new Set(["PENDING", "ACTIVE", "DISABLED", "COMPLETED", "REJECTED", "CANCELLED"]);
const ACCOUNT_STATUSES = new Set(["ACTIVE", "DISABLED", "ARCHIVED"]);
const PAYMENT_STATUSES = new Set(["UNPAID", "PAID", "PARTIALLY_PAID", "WAIVED", "REFUNDED", "CANCELLED"]);
const EXAM_TYPES = new Set(["CLASS_TEST", "WEEKLY_EXAM", "MONTHLY_EXAM", "MODEL_TEST", "ASSIGNMENT", "FINAL_EXAM"]);
const EXAM_STATUSES = new Set(["DRAFT", "SCHEDULED", "COMPLETED", "RESULT_DRAFT", "RESULT_PUBLISHED", "ARCHIVED"]);

function invalidFilter(message: string) {
  return new NextResponse(message, { status: 400 });
}

function parseOptionalInteger(raw: string, min: number, max: number): number | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return Number.NaN;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : Number.NaN;
}

function isValidOptionalDate(value: string) {
  if (!value) return true;
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isAllowedOptional(value: string, allowed: Set<string>) {
  return !value || allowed.has(value);
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate first so anonymous traffic cannot consume database-backed tokens.
    let profile;
    try {
      const auth = await requireTeacher();
      profile = auth.profile;
    } catch {
      return new NextResponse("Forbidden: Teacher access required.", { status: 403 });
    }

    // 2. Atomically rate limit by authenticated teacher and observed client IP.
    try {
      await rateLimit(`csv-export-${profile.id}`, 5, 600);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return new NextResponse(error.message, { status: 429 });
      }
      return new NextResponse("Report service temporarily unavailable.", { status: 503 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "enrollment";

    if (!ALLOWED_TABS.has(tab)) {
      return invalidFilter("Unsupported report type.");
    }

    let csvContent = "\uFEFF";
    let filename = `report-${tab}.csv`;
    const auditFilters: Record<string, unknown> = {};

    if (tab === "enrollment") {
      const batchId = searchParams.get("batchId") || "";
      const status = searchParams.get("status") || "";
      const accountStatus = searchParams.get("accountStatus") || "";
      const startDate = searchParams.get("startDate") || "";
      const endDate = searchParams.get("endDate") || "";

      if (batchId && !UUID_PATTERN.test(batchId)) return invalidFilter("Invalid batch filter.");
      if (!isAllowedOptional(status, ENROLLMENT_STATUSES)) return invalidFilter("Invalid enrollment status filter.");
      if (!isAllowedOptional(accountStatus, ACCOUNT_STATUSES)) return invalidFilter("Invalid account status filter.");
      if (!isValidOptionalDate(startDate) || !isValidOptionalDate(endDate)) return invalidFilter("Invalid date filter.");
      if (startDate && endDate && startDate > endDate) return invalidFilter("Start date cannot be after end date.");

      Object.assign(auditFilters, { batchId, status, accountStatus, startDate, endDate });

      let query = supabase
        .from("enrollments")
        .select(`
          status,
          approved_at,
          disabled_at,
          disable_reason,
          batch:batches (name, code),
          student:student_profiles (
            student_code,
            profile:profiles (full_name, account_status)
          )
        `);

      if (batchId) query = query.eq("batch_id", batchId);
      if (status) query = query.eq("status", status);
      if (accountStatus) query = query.eq("student.profile.account_status", accountStatus);
      if (startDate) query = query.gte("created_at", startDate);
      if (endDate) query = query.lte("created_at", endDate);

      const { data: enrollments, error } = await query;
      if (error) throw error;

      csvContent += "Student ID,Student Name,Batch,Enrollment Status,Account Status,Approval Date,Disabled Date,Disable Reason\n";

      enrollments?.forEach((e: any) => {
        const stud = e.student || {};
        const prof = stud.profile || {};
        const batch = e.batch || {};

        csvContent += `${escapeCSV(stud.student_code)},`;
        csvContent += `${escapeCSV(prof.full_name)},`;
        csvContent += `${escapeCSV(`${batch.name} (${batch.code})`)},`;
        csvContent += `${escapeCSV(e.status)},`;
        csvContent += `${escapeCSV(prof.account_status)},`;
        csvContent += `${escapeCSV(e.approved_at ? new Date(e.approved_at).toLocaleDateString() : "")},`;
        csvContent += `${escapeCSV(e.disabled_at ? new Date(e.disabled_at).toLocaleDateString() : "")},`;
        csvContent += `${escapeCSV(e.disable_reason || "")}\n`;
      });

      filename = `batch-enrollments-${new Date().toISOString().split("T")[0]}.csv`;
    } else if (tab === "payment") {
      const billingMonthRaw = searchParams.get("month") || "";
      const billingYearRaw = searchParams.get("year") || "";
      const billingMonth = parseOptionalInteger(billingMonthRaw, 1, 12);
      const billingYear = parseOptionalInteger(billingYearRaw, 2020, 2100);
      const batchId = searchParams.get("batchId") || "";
      const status = searchParams.get("status") || "";
      const paymentMethod = searchParams.get("paymentMethod") || "";

      if (Number.isNaN(billingMonth)) return invalidFilter("Billing month must be between 1 and 12.");
      if (Number.isNaN(billingYear)) return invalidFilter("Billing year is invalid.");
      if (batchId && !UUID_PATTERN.test(batchId)) return invalidFilter("Invalid batch filter.");
      if (!isAllowedOptional(status, PAYMENT_STATUSES)) return invalidFilter("Invalid payment status filter.");
      if (paymentMethod.length > 100) return invalidFilter("Payment method filter is too long.");

      Object.assign(auditFilters, {
        billingMonth: billingMonthRaw,
        billingYear: billingYearRaw,
        batchId,
        status,
        paymentMethod,
      });

      let query = supabase
        .from("payments")
        .select(`
          billing_month,
          billing_year,
          expected_amount,
          paid_amount,
          status,
          payment_date,
          reference_number,
          payment_method,
          batch:batches (name, code),
          student:student_profiles (
            student_code,
            profile:profiles (full_name)
          )
        `);

      if (billingMonth !== null) query = query.eq("billing_month", billingMonth);
      if (billingYear !== null) query = query.eq("billing_year", billingYear);
      if (batchId) query = query.eq("batch_id", batchId);
      if (status) query = query.eq("status", status);
      if (paymentMethod) query = query.eq("payment_method", paymentMethod);

      const { data: payments, error } = await query;
      if (error) throw error;

      csvContent += "Student ID,Student Name,Batch,Billing Month,Billing Year,Expected Amount,Paid Amount,Due Amount,Status,Payment Date,Payment Method,Reference Number\n";

      payments?.forEach((payment: any) => {
        const stud = payment.student || {};
        const prof = stud.profile || {};
        const batch = payment.batch || {};
        const expected = Number(payment.expected_amount) || 0;
        const paid = Number(payment.paid_amount) || 0;
        const due = payment.status === "WAIVED" ? 0 : Math.max(expected - paid, 0);

        csvContent += `${escapeCSV(stud.student_code)},`;
        csvContent += `${escapeCSV(prof.full_name)},`;
        csvContent += `${escapeCSV(`${batch.name} (${batch.code})`)},`;
        csvContent += `${escapeCSV(payment.billing_month)},`;
        csvContent += `${escapeCSV(payment.billing_year)},`;
        csvContent += `${escapeCSV(expected)},`;
        csvContent += `${escapeCSV(paid)},`;
        csvContent += `${escapeCSV(due)},`;
        csvContent += `${escapeCSV(payment.status)},`;
        csvContent += `${escapeCSV(payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : "")},`;
        csvContent += `${escapeCSV(payment.payment_method || "")},`;
        csvContent += `${escapeCSV(payment.reference_number || "")}\n`;
      });

      filename = `payments-${billingYearRaw || new Date().getFullYear()}-${billingMonthRaw || new Date().getMonth() + 1}.csv`;
    } else {
      const batchId = searchParams.get("batchId") || "";
      const examType = searchParams.get("examType") || "";
      const publicationStatus = searchParams.get("pubStatus") || "";
      const startDate = searchParams.get("startDate") || "";
      const endDate = searchParams.get("endDate") || "";

      if (batchId && !UUID_PATTERN.test(batchId)) return invalidFilter("Invalid batch filter.");
      if (!isAllowedOptional(examType, EXAM_TYPES)) return invalidFilter("Invalid examination type filter.");
      if (!isAllowedOptional(publicationStatus, EXAM_STATUSES)) return invalidFilter("Invalid examination status filter.");
      if (!isValidOptionalDate(startDate) || !isValidOptionalDate(endDate)) return invalidFilter("Invalid date filter.");
      if (startDate && endDate && startDate > endDate) return invalidFilter("Start date cannot be after end date.");

      Object.assign(auditFilters, { batchId, examType, pubStatus: publicationStatus, startDate, endDate });

      let query = supabase
        .from("exams")
        .select(`
          id,
          name,
          exam_type,
          exam_date,
          total_marks,
          pass_marks,
          status,
          batch:batches (name, code)
        `);

      if (batchId) query = query.eq("batch_id", batchId);
      if (examType) query = query.eq("exam_type", examType);
      if (publicationStatus) query = query.eq("status", publicationStatus);
      if (startDate) query = query.gte("exam_date", startDate);
      if (endDate) query = query.lte("exam_date", endDate);

      const { data: exams, error } = await query;
      if (error) throw error;

      const examIds = (exams || []).map((exam) => exam.id);
      const resultsByExam = new Map<string, Array<{ attendance_status: string; obtained_marks: number | null }>>();

      if (examIds.length > 0) {
        const { data: allResults, error: resultsError } = await supabase
          .from("exam_results")
          .select("exam_id, attendance_status, obtained_marks")
          .in("exam_id", examIds);

        if (resultsError) throw resultsError;

        allResults?.forEach((result) => {
          const existing = resultsByExam.get(result.exam_id) || [];
          existing.push({
            attendance_status: result.attendance_status,
            obtained_marks: result.obtained_marks === null ? null : Number(result.obtained_marks),
          });
          resultsByExam.set(result.exam_id, existing);
        });
      }

      csvContent += "Exam Name,Batch,Date,Exam Type,Total Marks,Pass Marks,Status,Total Students,Present,Absent,Passed,Failed,Pass Percentage\n";

      for (const exam of exams || []) {
        const results = resultsByExam.get(exam.id) || [];
        const totalStudents = results.length;
        const presentResults = results.filter((result) => result.attendance_status === "PRESENT");
        const present = presentResults.length;
        const absent = results.filter((result) => result.attendance_status === "ABSENT").length;
        const passed = presentResults.filter((result) => Number(result.obtained_marks) >= Number(exam.pass_marks)).length;
        const failed = present - passed;
        const passPercentage = present > 0 ? `${((passed / present) * 100).toFixed(0)}%` : "0%";
        const batch = (exam.batch as any) || {};

        csvContent += `${escapeCSV(exam.name)},`;
        csvContent += `${escapeCSV(`${batch.name || ""} (${batch.code || ""})`)},`;
        csvContent += `${escapeCSV(exam.exam_date)},`;
        csvContent += `${escapeCSV(exam.exam_type)},`;
        csvContent += `${escapeCSV(Number(exam.total_marks))},`;
        csvContent += `${escapeCSV(Number(exam.pass_marks))},`;
        csvContent += `${escapeCSV(exam.status)},`;
        csvContent += `${escapeCSV(totalStudents)},`;
        csvContent += `${escapeCSV(present)},`;
        csvContent += `${escapeCSV(absent)},`;
        csvContent += `${escapeCSV(passed)},`;
        csvContent += `${escapeCSV(failed)},`;
        csvContent += `${escapeCSV(passPercentage)}\n`;
      }

      filename = `exam-reports-${new Date().toISOString().split("T")[0]}.csv`;
    }

    await createAuditLog({
      actorProfileId: profile.id,
      action: "REPORT_CSV_EXPORTED",
      entityType: "reports",
      entityId: "00000000-0000-0000-0000-000000000000",
      newValue: { tab, filters: auditFilters },
    });

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("CSV Export failure:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
