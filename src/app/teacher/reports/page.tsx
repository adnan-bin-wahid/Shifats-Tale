import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatCurrency } from "@/lib/currency";
import { 
  Users, 
  CreditCard, 
  GraduationCap, 
  BookOpenCheck,
  Download, 
  Printer,
  Layers,
  Award
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    batchId?: string;
    status?: string;
    accountStatus?: string;
    startDate?: string;
    endDate?: string;
    month?: string;
    year?: string;
    paymentMethod?: string;
    examType?: string;
    pubStatus?: string;
    studentId?: string;
  }>;
}

interface ProfileRelation {
  full_name?: string | null;
  account_status?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface BatchRelation {
  id: string;
  name: string;
  code: string;
  schedule?: string | null;
}

interface StudentRelation {
  id: string;
  student_code: string;
  profile: ProfileRelation | null;
}

interface EnrollmentReportRow {
  status: string;
  approved_at: string | null;
  disabled_at: string | null;
  disable_reason: string | null;
  created_at: string;
  batch: BatchRelation | null;
  student: StudentRelation | null;
}

interface PaymentReportRow {
  billing_month: number;
  billing_year: number;
  expected_amount: number;
  paid_amount: number;
  status: string;
  payment_date: string | null;
  reference_number: string | null;
  payment_method: string | null;
  batch: BatchRelation | null;
  student: StudentRelation | null;
}

interface ExamAnalyticsRow {
  id: string;
  name: string;
  exam_type: string;
  exam_date: string;
  total_marks: number;
  pass_marks: number;
  status: string;
  batch: BatchRelation | null;
  totalStudents: number;
  present: number;
  absent: number;
  passed: number;
  failed: number;
  averageMark: string;
  highestMark: number;
  passPercentage: string;
}

interface StudentDirectoryRow {
  id: string;
  student_code: string;
  profile: Pick<ProfileRelation, "full_name"> | null;
}

interface SelectedStudentRow {
  id: string;
  student_code: string;
  academic_level: string;
  institution: string | null;
  registered_at: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  registration_status: string;
  profile: ProfileRelation | null;
}

interface StudentEnrollmentRow {
  status: string;
  approved_at: string | null;
  batch: BatchRelation | null;
}

interface StudentExamRow {
  attendance_status: "PRESENT" | "ABSENT";
  obtained_marks: number | null;
  exam: {
    name: string;
    exam_date: string;
    total_marks: number;
    pass_marks: number;
    status: string;
    batches: { name: string } | null;
  } | null;
}

interface StudentPaymentRow {
  billing_month: number;
  billing_year: number;
  expected_amount: number;
  paid_amount: number;
  status: string;
  batch: { name: string } | null;
}

interface BatchPerformanceRow extends BatchRelation {
  activeStudents: number;
  collectionRate: number;
  totalExams: number;
  averageResultPct: number;
  passPct: number;
  materialsPublished: number;
}

const REPORT_TABS = [
  "enrollment",
  "payment",
  "examination",
  "student",
  "batch",
] as const;

export default async function TeacherReportsPage({ searchParams }: PageProps) {
  const { profile, destination } = await resolveAuthenticatedDestination();

  if (destination !== "TEACHER_DASHBOARD" || !profile || profile.role !== "TEACHER") {
    redirect("/login");
  }

  const supabase = await createClient();
  const sp = await searchParams;
  const activeTab = REPORT_TABS.includes(
    sp.tab as (typeof REPORT_TABS)[number]
  )
    ? (sp.tab as (typeof REPORT_TABS)[number])
    : "enrollment";

  // Fetch settings for default currency and timezone
  const { data: settings, error: settingsError } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (settingsError) throw settingsError;

  const timezone = settings?.timezone || "Asia/Dhaka";

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return new Date(dateStr).toLocaleDateString();
    }
  };

  // Common filters: Fetch batches list
  const { data: batches, error: batchesError } = await supabase
    .from("batches")
    .select("id, name, code")
    .order("name", { ascending: true });
  if (batchesError) throw batchesError;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper variables for calculations
  const currentSystemDate = new Date();
  const currentMonth = currentSystemDate.getMonth() + 1;
  const currentYearVal = currentSystemDate.getFullYear();

  // Tab 1: Enrollment Report variables
  let enrollmentsData: EnrollmentReportRow[] = [];
  const tab1BatchId = sp.batchId || "";
  const tab1Status = sp.status || "";
  const tab1AccountStatus = sp.accountStatus || "";
  const tab1StartDate = sp.startDate || "";
  const tab1EndDate = sp.endDate || "";

  if (activeTab === "enrollment") {
    let q = supabase
      .from("enrollments")
      .select(`
        status,
        approved_at,
        disabled_at,
        disable_reason,
        created_at,
        batch:batches (id, name, code),
        student:student_profiles (
          id,
          student_code,
          profile:profiles (full_name, account_status)
        )
      `);

    if (tab1BatchId) q = q.eq("batch_id", tab1BatchId);
    if (tab1Status) q = q.eq("status", tab1Status);
    if (tab1AccountStatus) q = q.eq("student.profile.account_status", tab1AccountStatus);
    if (tab1StartDate) q = q.gte("created_at", tab1StartDate);
    if (tab1EndDate) q = q.lte("created_at", tab1EndDate);

    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) throw error;
    enrollmentsData = (data || []) as unknown as EnrollmentReportRow[];
  }

  // Tab 2: Payment Report variables
  let paymentsData: PaymentReportRow[] = [];
  const tab2Month = sp.month || currentMonth.toString();
  const tab2Year = sp.year || currentYearVal.toString();
  const tab2BatchId = sp.batchId || "";
  const tab2Status = sp.status || "";
  const tab2Method = sp.paymentMethod || "";

  let payExpected = 0;
  let payCollected = 0;
  let payDue = 0;
  let payPaidCount = 0;
  let payPartialCount = 0;
  let payUnpaidCount = 0;
  let payWaivedAmount = 0;
  let payRefundedAmount = 0;

  if (activeTab === "payment") {
    let q = supabase
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
        batch:batches (id, name, code),
        student:student_profiles (
          id,
          student_code,
          profile:profiles (full_name)
        )
      `);

    if (tab2Month) q = q.eq("billing_month", parseInt(tab2Month));
    if (tab2Year) q = q.eq("billing_year", parseInt(tab2Year));
    if (tab2BatchId) q = q.eq("batch_id", tab2BatchId);
    if (tab2Status) q = q.eq("status", tab2Status);
    if (tab2Method) q = q.eq("payment_method", tab2Method);

    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) throw error;
    paymentsData = (data || []) as unknown as PaymentReportRow[];

    paymentsData.forEach((p) => {
      const exp = Number(p.expected_amount) || 0;
      const paid = Number(p.paid_amount) || 0;

      if (p.status === "WAIVED") {
        payWaivedAmount += exp;
      } else if (p.status === "REFUNDED") {
        payRefundedAmount += paid;
        payExpected += exp;
        payCollected += 0;
        payDue += exp;
      } else {
        payExpected += exp;
        payCollected += paid;
        payDue += Math.max(exp - paid, 0);
      }

      if (p.status === "PAID") payPaidCount++;
      else if (p.status === "PARTIALLY_PAID") payPartialCount++;
      else if (p.status === "UNPAID") payUnpaidCount++;
    });
  }

  // Tab 3: Examination Report variables
  let examsData: ExamAnalyticsRow[] = [];
  const tab3BatchId = sp.batchId || "";
  const tab3ExamType = sp.examType || "";
  const tab3PubStatus = sp.pubStatus || "";
  const tab3StartDate = sp.startDate || "";
  const tab3EndDate = sp.endDate || "";

  if (activeTab === "examination") {
    let q = supabase
      .from("exams")
      .select(`
        id,
        name,
        exam_type,
        exam_date,
        total_marks,
        pass_marks,
        status,
        batch:batches (id, name, code)
      `);

    if (tab3BatchId) q = q.eq("batch_id", tab3BatchId);
    if (tab3ExamType) q = q.eq("exam_type", tab3ExamType);
    if (tab3PubStatus) q = q.eq("status", tab3PubStatus);
    if (tab3StartDate) q = q.gte("exam_date", tab3StartDate);
    if (tab3EndDate) q = q.lte("exam_date", tab3EndDate);

    const { data, error } = await q.order("exam_date", { ascending: false });
    if (error) throw error;
    const rawExams = data || [];

    const examIds = rawExams.map(e => e.id);
    const { data: results, error: resultsError } = examIds.length > 0
      ? await supabase
          .from("exam_results")
          .select("exam_id, attendance_status, obtained_marks")
          .in("exam_id", examIds)
      : { data: [], error: null };
    if (resultsError) throw resultsError;

    examsData = rawExams.map(e => {
      const examResults = results?.filter(r => r.exam_id === e.id) || [];
      const totalStudents = examResults.length;
      const present = examResults.filter(r => r.attendance_status === "PRESENT").length;
      const absent = examResults.filter(r => r.attendance_status === "ABSENT").length;
      
      let passed = 0;
      let failed = 0;
      let totalObtainedMarks = 0;
      let highestMark = 0;

      examResults.forEach(r => {
        if (r.attendance_status === "PRESENT") {
          const marks = Number(r.obtained_marks) || 0;
          totalObtainedMarks += marks;
          if (marks > highestMark) highestMark = marks;
          if (marks >= Number(e.pass_marks)) passed++;
          else failed++;
        }
      });

      const averageMark = present > 0 ? (totalObtainedMarks / present).toFixed(1) : "0.0";
      const passPercentage = present > 0 ? ((passed / present) * 100).toFixed(0) : "0";

      return {
        ...e,
        totalStudents,
        present,
        absent,
        passed,
        failed,
        averageMark,
        highestMark,
        passPercentage
      };
    }) as unknown as ExamAnalyticsRow[];
  }

  // Tab 4: Student Performance Report variables
  let studentsList: StudentDirectoryRow[] = [];
  let selectedStudentData: SelectedStudentRow | null = null;
  let selectedStudentEnrollments: StudentEnrollmentRow[] = [];
  let selectedStudentExams: StudentExamRow[] = [];
  let selectedStudentPayments: StudentPaymentRow[] = [];
  let studentExpectedPay = 0;
  let studentPaidPay = 0;
  let studentDuePay = 0;
  const tab4StudentId = sp.studentId || "";

  if (activeTab === "student") {
    const { data, error } = await supabase
      .from("student_profiles")
      .select("id, student_code, profile:profiles(full_name)")
      .eq("registration_status", "APPROVED")
      .order("student_code", { ascending: true });
    if (error) throw error;
    studentsList = (data || []) as unknown as StudentDirectoryRow[];

    if (tab4StudentId) {
      const { data: std, error: studentError } = await supabase
        .from("student_profiles")
        .select("*, profile:profiles(*)")
        .eq("id", tab4StudentId)
        .single();
      if (studentError) throw studentError;
      selectedStudentData = std as unknown as SelectedStudentRow | null;

      if (std) {
        const { data: enrolls, error: enrollmentsError } = await supabase
          .from("enrollments")
          .select("*, batch:batches(*)")
          .eq("student_id", tab4StudentId);
        if (enrollmentsError) throw enrollmentsError;
        selectedStudentEnrollments = (enrolls || []) as unknown as StudentEnrollmentRow[];

        const { data: exResults, error: examResultsError } = await supabase
          .from("exam_results")
          .select(`
            *,
            exam:exams (
              id,
              name,
              exam_type,
              exam_date,
              total_marks,
              pass_marks,
              status,
              batch_id,
              batches(name)
            )
          `)
          .eq("student_id", tab4StudentId);

        // Keep published results
        if (examResultsError) throw examResultsError;
        selectedStudentExams = ((exResults || []) as unknown as StudentExamRow[])
          .filter(r => r.exam?.status === "RESULT_PUBLISHED");

        const { data: pays, error: paymentsError } = await supabase
          .from("payments")
          .select("*, batch:batches(name)")
          .eq("student_id", tab4StudentId);
        if (paymentsError) throw paymentsError;
        selectedStudentPayments = (pays || []) as unknown as StudentPaymentRow[];

        selectedStudentPayments.forEach(p => {
          const exp = Number(p.expected_amount) || 0;
          const paid = Number(p.paid_amount) || 0;
          if (p.status !== "WAIVED" && p.status !== "REFUNDED") {
            studentExpectedPay += exp;
            studentPaidPay += paid;
            studentDuePay += Math.max(exp - paid, 0);
          }
        });
      }
    }
  }

  // Tab 5: Batch Performance Report variables
  let batchesPerformanceData: BatchPerformanceRow[] = [];
  if (activeTab === "batch") {
    const { data: activeEnrollments, error: activeEnrollmentsError } = await supabase
      .from("enrollments")
      .select("batch_id")
      .eq("status", "ACTIVE");
    if (activeEnrollmentsError) throw activeEnrollmentsError;

    const { data: monthlyPayments, error: monthlyPaymentsError } = await supabase
      .from("payments")
      .select("batch_id, expected_amount, paid_amount, status")
      .eq("billing_month", currentMonth)
      .eq("billing_year", currentYearVal);
    if (monthlyPaymentsError) throw monthlyPaymentsError;

    const { data: allExams, error: allExamsError } = await supabase
      .from("exams")
      .select("id, batch_id, total_marks, pass_marks, status")
      .neq("status", "DRAFT");
    if (allExamsError) throw allExamsError;

    const examIds = allExams?.map(e => e.id) || [];
    const { data: examResults, error: examResultsError } = examIds.length > 0
      ? await supabase
          .from("exam_results")
          .select("obtained_marks, attendance_status, exam_id")
          .in("exam_id", examIds)
      : { data: [], error: null };
    if (examResultsError) throw examResultsError;

    const { data: materials, error: materialsError } = await supabase
      .from("batch_contents")
      .select("batch_id")
      .eq("status", "PUBLISHED");
    if (materialsError) throw materialsError;

    batchesPerformanceData = (batches || []).map(b => {
      const activeStudents = activeEnrollments?.filter(e => e.batch_id === b.id).length || 0;
      
      // Collection rates
      let expected = 0;
      let collected = 0;
      monthlyPayments?.filter(p => p.batch_id === b.id).forEach(p => {
        if (p.status !== "WAIVED" && p.status !== "REFUNDED") {
          expected += Number(p.expected_amount) || 0;
          collected += Number(p.paid_amount) || 0;
        }
      });
      const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

      // Exams
      const batchExams = allExams?.filter(e => e.batch_id === b.id) || [];
      const totalExams = batchExams.filter((exam) =>
        ["COMPLETED", "RESULT_DRAFT", "RESULT_PUBLISHED", "ARCHIVED"].includes(exam.status)
      ).length;

      // Published results pass/fail count and average marks
      const publishedExamIds = new Set(batchExams.filter(e => e.status === "RESULT_PUBLISHED").map(e => e.id));
      const batchResults = examResults?.filter(r => publishedExamIds.has(r.exam_id)) || [];

      let passedResults = 0;
      let presentResults = 0;
      let totalObtained = 0;
      let totalMaxMarks = 0;

      batchResults.forEach(r => {
        if (r.attendance_status === "PRESENT") {
          presentResults++;
          const examSpec = batchExams.find(e => e.id === r.exam_id);
          if (examSpec) {
            const obtained = Number(r.obtained_marks) || 0;
            const total = Number(examSpec.total_marks) || 100;
            const pass = Number(examSpec.pass_marks) || 0;

            totalObtained += obtained;
            totalMaxMarks += total;

            if (obtained >= pass) passedResults++;
          }
        }
      });

      const averageResultPct = totalMaxMarks > 0 ? Math.round((totalObtained / totalMaxMarks) * 100) : 0;
      const passPct = presentResults > 0 ? Math.round((passedResults / presentResults) * 100) : 0;

      const materialsPublished = materials?.filter(m => m.batch_id === b.id).length || 0;

      return {
        ...b,
        activeStudents,
        collectionRate,
        totalExams,
        averageResultPct,
        passPct,
        materialsPublished
      };
    });
  }

  return (
    <div className="space-y-8 text-xs font-bold text-primary max-w-full overflow-hidden">
      <DashboardPageHeader
        title="Teacher Operational & Academic Reports"
        description="Monitor system-wide metrics, export filters to CSV, track batch analytics and individual student histories."
      />

      {/* Tabs list */}
      <div className="flex border-b border-border/40 overflow-x-auto pb-px scrollbar-thin">
        {[
          { id: "enrollment", label: "Enrollment Ledger", icon: <Users className="h-4 w-4" />, href: "/teacher/reports?tab=enrollment" },
          { id: "payment", label: "Monthly Collections", icon: <CreditCard className="h-4 w-4" />, href: "/teacher/reports?tab=payment" },
          { id: "examination", label: "Exams Analysis", icon: <GraduationCap className="h-4 w-4" />, href: "/teacher/reports?tab=examination" },
          { id: "student", label: "Student Performance", icon: <Award className="h-4 w-4" />, href: "/teacher/reports?tab=student" },
          { id: "batch", label: "Batch Performance", icon: <Layers className="h-4 w-4" />, href: "/teacher/reports?tab=batch" },
          { id: "academic", label: "Subject Progress", icon: <BookOpenCheck className="h-4 w-4" />, href: "/teacher/reports/academic" },
          { id: "progress-report", label: "Progress Report", icon: <Printer className="h-4 w-4" />, href: "/teacher/reports/student-progress" },
        ].map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-display text-xs font-black transition-all shrink-0 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-primary/75"
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === "enrollment" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 flex-1">
                <input type="hidden" name="tab" value="enrollment" />
                
                <div>
                  <label className="block text-[10px] text-muted uppercase font-bold mb-1">Batch</label>
                  <select
                    name="batchId"
                    defaultValue={tab1BatchId}
                    className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                  >
                    <option value="">All Batches</option>
                    {batches?.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-muted uppercase font-bold mb-1">Enrollment Status</label>
                  <select
                    name="status"
                    defaultValue={tab1Status}
                    className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                  >
                    <option value="">All Enrollments</option>
                    <option value="PENDING">Pending Approval</option>
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-muted uppercase font-bold mb-1">Account Status</label>
                  <select
                    name="accountStatus"
                    defaultValue={tab1AccountStatus}
                    className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                  >
                    <option value="">All Accounts</option>
                    <option value="ACTIVE">Active Account</option>
                    <option value="DISABLED">Disabled Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-muted uppercase font-bold mb-1">Created From</label>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={tab1StartDate}
                    className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-muted uppercase font-bold mb-1">Created To</label>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={tab1EndDate}
                    className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                  />
                </div>

                <div className="sm:col-span-2 md:col-span-5 flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl font-extrabold shadow-sm transition-all"
                  >
                    Filter List
                  </button>
                  <Link
                    href={`/api/reports/export?tab=enrollment&batchId=${tab1BatchId}&status=${tab1Status}&accountStatus=${tab1AccountStatus}&startDate=${tab1StartDate}&endDate=${tab1EndDate}`}
                    target="_blank"
                    className="px-4 py-2 border border-border bg-white hover:bg-slate-50 text-primary rounded-xl font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>CSV Export</span>
                  </Link>
                </div>
              </form>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold font-display border-b border-border/30 pb-3">Enrollments Report Ledger</h3>
            
            {enrollmentsData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-primary">
                  <thead>
                    <tr className="border-b border-border/20 text-muted uppercase tracking-wider text-[9px] font-extrabold">
                      <th className="pb-3">Student ID</th>
                      <th className="pb-3">Student Name</th>
                      <th className="pb-3">Batch Name</th>
                      <th className="pb-3">Enrollment Status</th>
                      <th className="pb-3">Account Status</th>
                      <th className="pb-3">Approval Date</th>
                      <th className="pb-3">Disabled Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {enrollmentsData.map((e, index) => {
                      const stud = e.student;
                      const prof = stud?.profile;
                      const b = e.batch;
                      return (
                        <tr key={index} className="hover:bg-slate-50/30">
                          <td className="py-3">
                            {stud ? (
                              <Link href={`/teacher/students/${stud.id}/edit`} className="font-extrabold text-indigo-600 hover:underline">
                                {stud.student_code}
                              </Link>
                            ) : "—"}
                          </td>
                          <td className="py-3 font-extrabold">{prof?.full_name || "Unknown"}</td>
                          <td className="py-3 text-slate-700">{b ? `${b.name} (${b.code})` : "—"}</td>
                          <td className="py-3">
                            <StatusBadge status={e.status} />
                          </td>
                          <td className="py-3">
                            <StatusBadge status={prof?.account_status || "UNKNOWN"} />
                          </td>
                          <td className="py-3 text-slate-500">{formatDate(e.approved_at)}</td>
                          <td className="py-3 text-slate-500">
                            {e.disabled_at ? (
                              <div className="flex flex-col">
                                <span>{formatDate(e.disabled_at)}</span>
                                <span className="text-[9px] text-rose-600 font-bold max-w-[150px] truncate" title={e.disable_reason || undefined}>
                                  {e.disable_reason}
                                </span>
                              </div>
                            ) : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted">
                <Users className="h-10 w-10 text-muted stroke-1 mx-auto mb-3" />
                <h4 className="text-sm font-extrabold text-primary">No Enrollments Found</h4>
                <p className="text-xs text-muted max-w-sm mt-1 mx-auto leading-relaxed">
                  Adjust your search filters to find registered student enrollment entries.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "payment" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <input type="hidden" name="tab" value="payment" />
              
              <div>
                <label className="block text-[10px] text-muted uppercase font-bold mb-1">Billing Month</label>
                <select
                  name="month"
                  defaultValue={tab2Month}
                  className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                >
                  {monthNames.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-muted uppercase font-bold mb-1">Billing Year</label>
                <select
                  name="year"
                  defaultValue={tab2Year}
                  className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                >
                  {Array.from({ length: 6 }, (_, i) => 2024 + i).map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-muted uppercase font-bold mb-1">Batch</label>
                <select
                  name="batchId"
                  defaultValue={tab2BatchId}
                  className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                >
                  <option value="">All Batches</option>
                  {batches?.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-muted uppercase font-bold mb-1">Payment Status</label>
                <select
                  name="status"
                  defaultValue={tab2Status}
                  className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                >
                  <option value="">All Statuses</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="WAIVED">Waived</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-muted uppercase font-bold mb-1">Payment Method</label>
                <select
                  name="paymentMethod"
                  defaultValue={tab2Method}
                  className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                >
                  <option value="">All Methods</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_FINANCIAL_SERVICE">Mobile Financial Service (MFS)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="sm:col-span-2 md:col-span-5 flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl font-extrabold shadow-sm transition-all"
                >
                  Filter Report
                </button>
                <Link
                  href={`/api/reports/export?tab=payment&month=${tab2Month}&year=${tab2Year}&batchId=${tab2BatchId}&status=${tab2Status}&paymentMethod=${tab2Method}`}
                  target="_blank"
                  className="px-4 py-2 border border-border bg-white hover:bg-slate-50 text-primary rounded-xl font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV Export</span>
                </Link>
              </div>
            </form>
          </div>

          {/* Summaries layout */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-border/40 shadow-sm">
              <span className="text-[10px] text-muted uppercase font-bold block">Total Expected</span>
              <span className="text-lg font-black text-slate-800 block mt-1">{formatCurrency(payExpected)}</span>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 shadow-sm">
              <span className="text-[10px] text-emerald-600 uppercase font-bold block">Total Collected</span>
              <span className="text-lg font-black text-emerald-700 block mt-1">{formatCurrency(payCollected)}</span>
            </div>
            <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 shadow-sm">
              <span className="text-[10px] text-rose-600 uppercase font-bold block">Total Outstanding Due</span>
              <span className="text-lg font-black text-rose-700 block mt-1">{formatCurrency(payDue)}</span>
            </div>
            <div className="bg-slate-50/50 p-4 rounded-xl border border-border/30 shadow-sm">
              <span className="text-[10px] text-muted uppercase font-bold block">Paid / Partial / Unpaid</span>
              <span className="text-lg font-black text-primary block mt-1">
                {payPaidCount} / {payPartialCount} / {payUnpaidCount}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50/30 p-4 rounded-xl border border-border/30 shadow-sm">
              <span className="text-[10px] text-muted uppercase font-bold block">Waived Amount</span>
              <span className="text-sm font-extrabold text-amber-700 block mt-1">{formatCurrency(payWaivedAmount)}</span>
            </div>
            <div className="bg-slate-50/30 p-4 rounded-xl border border-border/30 shadow-sm">
              <span className="text-[10px] text-muted uppercase font-bold block">Refunded Amount</span>
              <span className="text-sm font-extrabold text-rose-600 block mt-1">{formatCurrency(payRefundedAmount)}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold font-display border-b border-border/30 pb-3">Monthly collections details</h3>
            
            {paymentsData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-primary">
                  <thead>
                    <tr className="border-b border-border/20 text-muted uppercase tracking-wider text-[9px] font-extrabold">
                      <th className="pb-3">Student ID</th>
                      <th className="pb-3">Student Name</th>
                      <th className="pb-3">Batch</th>
                      <th className="pb-3 text-right">Expected</th>
                      <th className="pb-3 text-right">Paid</th>
                      <th className="pb-3 text-right">Due</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3">Payment Date</th>
                      <th className="pb-3">Ref Number</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {paymentsData.map((p, index) => {
                      const stud = p.student;
                      const prof = stud?.profile;
                      const b = p.batch;
                      const exp = Number(p.expected_amount) || 0;
                      const paid = Number(p.paid_amount) || 0;
                      const due = p.status === "WAIVED" ? 0 : Math.max(exp - paid, 0);
                      return (
                        <tr key={index} className="hover:bg-slate-50/30">
                          <td className="py-3">
                            {stud ? (
                              <Link href={`/teacher/students/${stud.id}/edit`} className="font-extrabold text-indigo-600 hover:underline">
                                {stud.student_code}
                              </Link>
                            ) : "—"}
                          </td>
                          <td className="py-3 font-extrabold">{prof?.full_name || "Unknown"}</td>
                          <td className="py-3 text-slate-700">{b ? `${b.name} (${b.code})` : "—"}</td>
                          <td className="py-3 text-right font-bold text-slate-800">{formatCurrency(exp)}</td>
                          <td className="py-3 text-right font-bold text-emerald-700">{formatCurrency(paid)}</td>
                          <td className="py-3 text-right font-bold text-rose-700">{formatCurrency(due)}</td>
                          <td className="py-3 text-center">
                            <StatusBadge status={p.status} />
                          </td>
                          <td className="py-3 text-slate-500">{formatDate(p.payment_date)}</td>
                          <td className="py-3 text-slate-700">{p.reference_number || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted">
                <CreditCard className="h-10 w-10 text-muted stroke-1 mx-auto mb-3" />
                <h4 className="text-sm font-extrabold text-primary">No Payment Records Found</h4>
                <p className="text-xs text-muted max-w-sm mt-1 mx-auto leading-relaxed font-medium">
                  Payment record has not been generated for this month.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "examination" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <input type="hidden" name="tab" value="examination" />
              
              <div>
                <label className="block text-[10px] text-muted uppercase font-bold mb-1">Batch</label>
                <select
                  name="batchId"
                  defaultValue={tab3BatchId}
                  className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                >
                  <option value="">All Batches</option>
                  {batches?.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-muted uppercase font-bold mb-1">Exam Type</label>
                <select
                  name="examType"
                  defaultValue={tab3ExamType}
                  className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                >
                  <option value="">All Types</option>
                  <option value="WEEKLY_TEST">Weekly Test</option>
                  <option value="MONTHLY_TEST">Monthly Test</option>
                  <option value="MOCK_TEST">Mock Test</option>
                  <option value="BOARD_EXAM">Board Exam</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-muted uppercase font-bold mb-1">Publication Status</label>
                <select
                  name="pubStatus"
                  defaultValue={tab3PubStatus}
                  className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                >
                  <option value="">All Statuses</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="RESULT_DRAFT">Marks Entered (Draft)</option>
                  <option value="RESULT_PUBLISHED">Results Published</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-muted uppercase font-bold mb-1">Exam Date From</label>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={tab3StartDate}
                  className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-muted uppercase font-bold mb-1">Exam Date To</label>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={tab3EndDate}
                  className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                />
              </div>

              <div className="sm:col-span-2 md:col-span-5 flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl font-extrabold shadow-sm transition-all"
                >
                  Filter Exams
                </button>
                <Link
                  href={`/api/reports/export?tab=examination&batchId=${tab3BatchId}&examType=${tab3ExamType}&pubStatus=${tab3PubStatus}&startDate=${tab3StartDate}&endDate=${tab3EndDate}`}
                  target="_blank"
                  className="px-4 py-2 border border-border bg-white hover:bg-slate-50 text-primary rounded-xl font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV Export</span>
                </Link>
              </div>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold font-display border-b border-border/30 pb-3">Examinations results analysis</h3>
            
            {examsData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-primary">
                  <thead>
                    <tr className="border-b border-border/20 text-muted uppercase tracking-wider text-[9px] font-extrabold">
                      <th className="pb-3">Examination Name</th>
                      <th className="pb-3">Batch Name</th>
                      <th className="pb-3">Exam Date</th>
                      <th className="pb-3 text-center">Total Students</th>
                      <th className="pb-3 text-center">Present</th>
                      <th className="pb-3 text-center">Absent</th>
                      <th className="pb-3 text-center">Passed</th>
                      <th className="pb-3 text-center">Failed</th>
                      <th className="pb-3 text-center">Average Mark</th>
                      <th className="pb-3 text-center">Highest Mark</th>
                      <th className="pb-3 text-center">Pass %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {examsData.map((e, index) => {
                      const b = e.batch;
                      return (
                        <tr key={index} className="hover:bg-slate-50/30">
                          <td className="py-3">
                            <Link href={`/teacher/exams/${e.id}`} className="font-extrabold text-indigo-600 hover:underline">
                              {e.name}
                            </Link>
                          </td>
                          <td className="py-3 text-slate-700">{b ? `${b.name} (${b.code})` : "—"}</td>
                          <td className="py-3 text-slate-500">{formatDate(e.exam_date)}</td>
                          <td className="py-3 text-center text-slate-800">{e.totalStudents}</td>
                          <td className="py-3 text-center text-emerald-700">{e.present}</td>
                          <td className="py-3 text-center text-rose-600">{e.absent}</td>
                          <td className="py-3 text-center text-emerald-700 font-bold">{e.passed}</td>
                          <td className="py-3 text-center text-rose-700 font-bold">{e.failed}</td>
                          <td className="py-3 text-center font-bold text-slate-800">{e.averageMark} / {Number(e.total_marks)}</td>
                          <td className="py-3 text-center font-bold text-emerald-800">{e.highestMark}</td>
                          <td className={`py-3 text-center font-black ${Number(e.passPercentage) >= 80 ? "text-emerald-700" : Number(e.passPercentage) >= 50 ? "text-amber-700" : "text-rose-700"}`}>
                            {e.passPercentage}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted">
                <GraduationCap className="h-10 w-10 text-muted stroke-1 mx-auto mb-3" />
                <h4 className="text-sm font-extrabold text-primary">No Upcoming Examinations</h4>
                <p className="text-xs text-muted max-w-sm mt-1 mx-auto leading-relaxed">
                  We found no examinations matching your filters.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "student" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <form method="GET" className="flex flex-col sm:flex-row sm:items-end gap-3 max-w-xl">
              <input type="hidden" name="tab" value="student" />
              <div className="flex-1">
                <label className="block text-[10px] text-muted uppercase font-bold mb-1">Select Student profile</label>
                <select
                  name="studentId"
                  defaultValue={tab4StudentId}
                  className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none font-bold"
                >
                  <option value="">-- Choose student --</option>
                  {studentsList.map(s => (
                    <option key={s.id} value={s.id}>{s.student_code} - {s.profile?.full_name || "Unknown"}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="px-5 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl font-extrabold shadow-sm transition-all shrink-0"
              >
                View Academic Profile
              </button>
            </form>
          </div>

          {selectedStudentData ? (
            <div className="space-y-6">
              {/* Profile Summary Card */}
              <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 border-b md:border-b-0 md:border-r border-border/20 pb-4 md:pb-0 md:pr-6">
                  <h4 className="text-[10px] text-muted uppercase tracking-wider font-extrabold">Student Info</h4>
                  <p className="text-base font-black text-primary">{selectedStudentData.profile?.full_name || "Unknown"}</p>
                  <span className="text-[10px] bg-primary/5 border border-primary/10 text-primary px-3 py-1 rounded-full font-black">
                    Code: {selectedStudentData.student_code}
                  </span>
                  <div className="text-[10px] text-muted space-y-1 pt-3 font-semibold">
                    <div>Academic Level: <span className="text-primary font-bold">{selectedStudentData.academic_level}</span></div>
                    <div>Institution: <span className="text-primary font-bold">{selectedStudentData.institution || "N/A"}</span></div>
                    <div>Reg Date: <span className="text-primary font-bold">{formatDate(selectedStudentData.registered_at)}</span></div>
                  </div>
                </div>

                <div className="space-y-2 border-b md:border-b-0 md:border-r border-border/20 pb-4 md:pb-0 md:pr-6">
                  <h4 className="text-[10px] text-muted uppercase tracking-wider font-extrabold">Contact & Guardian Info</h4>
                  <div className="text-[10px] text-primary/80 space-y-1.5 pt-1 font-semibold">
                    <div>Student Email: <span className="text-primary font-bold">{selectedStudentData.profile?.email || "N/A"}</span></div>
                    <div>Student Phone: <span className="text-primary font-bold">{selectedStudentData.profile?.phone || "N/A"}</span></div>
                    <div>Guardian Name: <span className="text-primary font-bold">{selectedStudentData.guardian_name || "N/A"}</span></div>
                    <div>Guardian Phone: <span className="text-primary font-bold">{selectedStudentData.guardian_phone || "N/A"}</span></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] text-muted uppercase tracking-wider font-extrabold">Accounts Status</h4>
                  <div className="flex flex-col gap-2 pt-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted">Enrollment Approval:</span>
                      <StatusBadge status={selectedStudentData.registration_status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted">System Account:</span>
                      <StatusBadge status={selectedStudentData.profile?.account_status || "UNKNOWN"} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch History and Payment Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Batches Card */}
                <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold font-display border-b border-border/30 pb-3 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" />
                    <span>Active and Completed Batches</span>
                  </h3>
                  {selectedStudentEnrollments.length > 0 ? (
                    <div className="divide-y divide-border/15">
                      {selectedStudentEnrollments.map((en, idx) => (
                        <div key={idx} className="py-2.5 flex justify-between items-center text-xs font-semibold">
                          <div>
                            <span className="font-extrabold block text-primary">{en.batch?.name} ({en.batch?.code})</span>
                            <span className="text-[9px] text-muted font-medium block mt-0.5">{en.batch?.schedule}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <StatusBadge status={en.status} />
                            <span className="text-[9px] text-slate-400">Approved: {formatDate(en.approved_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted font-bold py-4 text-center">No batch enrollments recorded for this student.</p>
                  )}
                </div>

                {/* Tuition Ledger Card */}
                <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
                  <h3 className="text-sm font-extrabold font-display border-b border-border/30 pb-3 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span>Payment Summary</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50/50 p-3 rounded-xl text-center border border-border/20">
                      <span className="text-[9px] text-muted uppercase font-bold block">Total Expected</span>
                      <span className="text-sm font-black text-slate-800 block mt-1">{formatCurrency(studentExpectedPay)}</span>
                    </div>
                    <div className="bg-emerald-50/50 p-3 rounded-xl text-center border border-emerald-100">
                      <span className="text-[9px] text-emerald-600 uppercase font-bold block">Total Paid</span>
                      <span className="text-sm font-black text-emerald-700 block mt-1">{formatCurrency(studentPaidPay)}</span>
                    </div>
                    <div className="bg-rose-50/50 p-3 rounded-xl text-center border border-rose-100">
                      <span className="text-[9px] text-rose-600 uppercase font-bold block">Total Due</span>
                      <span className="text-sm font-black text-rose-700 block mt-1">{formatCurrency(studentDuePay)}</span>
                    </div>
                  </div>

                  <div className="overflow-y-auto max-h-[160px] divide-y divide-border/10 pt-2">
                    {selectedStudentPayments.map((p, idx) => (
                      <div key={idx} className="py-2 flex justify-between items-center text-[10px] font-bold">
                        <div>
                          <span>{p.batch?.name}</span>
                          <span className="text-muted text-[8px] font-medium block mt-0.5">Billing: {monthNames[p.billing_month - 1]} {p.billing_year}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-slate-800 block">{formatCurrency(p.expected_amount)}</span>
                            <span className="text-emerald-700 block text-[9px] font-black">{formatCurrency(p.paid_amount)} paid</span>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Examination Performance History */}
              <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold font-display border-b border-border/30 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-primary" />
                    <span>Academic Test Scores & Examination History</span>
                  </div>
                  {selectedStudentExams.length > 0 && (
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full font-black">
                      Total Tests: {selectedStudentExams.length} | Pass Rate: {Math.round((selectedStudentExams.filter(r => r.attendance_status === "PRESENT" && Number(r.obtained_marks) >= Number(r.exam?.pass_marks)).length / selectedStudentExams.filter(r => r.attendance_status === "PRESENT").length) * 100 || 0)}%
                    </span>
                  )}
                </h3>

                {selectedStudentExams.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-semibold text-primary">
                      <thead>
                        <tr className="border-b border-border/20 text-muted uppercase tracking-wider text-[9px] font-extrabold">
                          <th className="pb-3">Examination</th>
                          <th className="pb-3">Batch</th>
                          <th className="pb-3">Exam Date</th>
                          <th className="pb-3 text-center">Marks Obtained</th>
                          <th className="pb-3 text-center">Percentage</th>
                          <th className="pb-3 text-center">Attendance</th>
                          <th className="pb-3 text-center">Result Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/10">
                        {selectedStudentExams.map((r, index) => {
                          const exam = r.exam;
                          if (!exam) return null;
                          const marks = Number(r.obtained_marks) || 0;
                          const total = Number(exam.total_marks) || 100;
                          const percentage = ((marks / total) * 100).toFixed(0);
                          const isPass = marks >= Number(exam.pass_marks);
                          const isPresent = r.attendance_status === "PRESENT";

                          return (
                            <tr key={index} className="hover:bg-slate-50/30">
                              <td className="py-3 font-extrabold">{exam.name}</td>
                              <td className="py-3 text-slate-700">{exam.batches?.name}</td>
                              <td className="py-3 text-slate-500">{formatDate(exam.exam_date)}</td>
                              <td className="py-3 text-center font-bold">
                                {isPresent ? `${marks} / ${total}` : "-"}
                              </td>
                              <td className="py-3 text-center font-extrabold text-slate-800">
                                {isPresent ? `${percentage}%` : "-"}
                              </td>
                              <td className="py-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${isPresent ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"}`}>
                                  {r.attendance_status}
                                </span>
                              </td>
                              <td className="py-3 text-center">
                                {isPresent ? (
                                  <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${isPass ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                    {isPass ? "Passed" : "Failed"}
                                  </span>
                                ) : (
                                  <span className="text-muted text-[10px] font-medium">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted">
                    <Award className="h-8 w-8 text-muted stroke-1 mx-auto mb-2" />
                    <h4 className="text-xs font-bold text-primary">No published exam results</h4>
                    <p className="text-[10px] text-muted max-w-sm mt-1 mx-auto font-medium">
                      No published examination results records exist for this student profile yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-border/40 shadow-sm text-center text-muted">
              <GraduationCap className="h-12 w-12 text-muted stroke-1 mx-auto mb-3" />
              <h4 className="text-sm font-extrabold text-primary">Select Student Profile</h4>
              <p className="text-xs text-muted max-w-sm mt-1 mx-auto font-medium leading-relaxed">
                Choose a student profile above to load their comprehensive academic progress ledger, examination results history, and tuition payments status.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "batch" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <h3 className="text-sm font-extrabold font-display">Batch Performance & Enrollment Report</h3>
              <span className="text-[10px] text-muted uppercase font-bold">Total Batches: {batchesPerformanceData.length}</span>
            </div>

            {batchesPerformanceData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-primary">
                  <thead>
                    <tr className="border-b border-border/20 text-muted uppercase tracking-wider text-[9px] font-extrabold">
                      <th className="pb-3">Batch Name</th>
                      <th className="pb-3 text-center">Active Students</th>
                      <th className="pb-3 text-center">Current Month Collection Rate</th>
                      <th className="pb-3 text-center">Total Exams Conducted</th>
                      <th className="pb-3 text-center">Average Results Percentage</th>
                      <th className="pb-3 text-center">Average Pass Percentage</th>
                      <th className="pb-3 text-center">Study Materials Published</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {batchesPerformanceData.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30">
                        <td className="py-3">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-sm text-primary">{b.name}</span>
                            <span className="text-[9px] text-muted uppercase mt-0.5">Code: {b.code}</span>
                          </div>
                        </td>
                        <td className="py-3 text-center text-slate-800 font-extrabold">{b.activeStudents}</td>
                        <td className="py-3 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${b.collectionRate >= 90 ? "text-emerald-700 bg-emerald-50" : b.collectionRate >= 50 ? "text-amber-700 bg-amber-50" : "text-rose-700 bg-rose-50"}`}>
                            {b.collectionRate}%
                          </span>
                        </td>
                        <td className="py-3 text-center text-slate-700">{b.totalExams}</td>
                        <td className="py-3 text-center font-extrabold text-slate-800">{b.averageResultPct}%</td>
                        <td className={`py-3 text-center font-black ${b.passPct >= 80 ? "text-emerald-700" : b.passPct >= 50 ? "text-amber-700" : "text-rose-700"}`}>
                          {b.passPct}%
                        </td>
                        <td className="py-3 text-center text-slate-600">{b.materialsPublished}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted">
                <Layers className="h-10 w-10 text-muted stroke-1 mx-auto mb-3" />
                <h4 className="text-sm font-extrabold text-primary">No Batches Found</h4>
                <p className="text-xs text-muted max-w-sm mt-1 mx-auto font-medium leading-relaxed">
                  No batches have been created in the academic panel database yet.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
