import React from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Calendar, Clock, CreditCard, FileText, Award, Layers, Bell } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { getStudentFacingSettings } from "@/lib/student-facing-settings";

interface PageProps {
  params: Promise<{
    batchId: string;
  }>;
}

export default async function StudentBatchDetailsPage({ params }: PageProps) {
  const { batchId } = await params;

  // 1. Authoritative Auth Check
  const { destination, profile, studentProfile } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") {
    redirect("/login");
  }
  if (destination === "PENDING_APPROVAL") {
    redirect("/pending-approval");
  }
  if (destination === "ACCOUNT_DISABLED") {
    redirect("/account-disabled");
  }
  if (destination === "INVALID_PROFILE") {
    redirect("/login?error=invalid_profile");
  }

  // 2. Query Batch details
  const supabase = await createClient();
  const displaySettings = await getStudentFacingSettings();
  const gradesDisplayed = displaySettings.gradesDisplayed;

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    notFound();
  }

  // 3. Authorization Check:
  // Teacher can see any batch.
  // Student must have an ACTIVE enrollment in this batch.
  let enrollment = null;
  if (profile?.role === "STUDENT") {
    if (!studentProfile) {
      redirect("/login?error=invalid_profile");
    }

    const { data: enr, error: enrollError } = await supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", studentProfile.id)
      .eq("batch_id", batchId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (enrollError || !enr) {
      // Guessing URL protection redirect
      redirect("/student?error=unauthorized_batch");
    }
    enrollment = enr;
  }

  // 4. Fetch payment records for this student and batch
  let studentBatchPayments: any[] = [];
  if (profile?.role === "STUDENT" && studentProfile) {
    const { data: pay } = await supabase
      .from("payments")
      .select("*")
      .eq("student_id", studentProfile.id)
      .eq("batch_id", batchId)
      .order("billing_year", { ascending: false })
      .order("billing_month", { ascending: false });
    studentBatchPayments = pay || [];
  }

  // Fetch materials for count and recent list
  const { data: dbMaterials } = await supabase
    .from("batch_contents")
    .select("*")
    .eq("batch_id", batchId)
    .eq("status", "PUBLISHED");

  const now = new Date();
  const activeMaterials = (dbMaterials || []).filter(
    (m) =>
      (!m.release_at || new Date(m.release_at) <= now) &&
      (!m.expires_at || new Date(m.expires_at) > now)
  );
  const recentMaterials = activeMaterials.slice(0, 3);
  const materialsCount = activeMaterials.length;

  // Fetch announcements for count and recent list
  const { data: dbAnnouncements } = await supabase
    .from("announcements")
    .select("*")
    .eq("batch_id", batchId)
    .eq("status", "PUBLISHED");

  const activeAnnouncements = (dbAnnouncements || []).filter(
    (a) =>
      (!a.release_at || new Date(a.release_at) <= now) &&
      (!a.expires_at || new Date(a.expires_at) > now)
  );
  const recentAnnouncements = activeAnnouncements.slice(0, 3);
  const announcementsCount = activeAnnouncements.length;

  // Fetch upcoming/scheduled/taken batch exams (excluding DRAFT)
  const { data: dbExams } = await supabase
    .from("exams")
    .select("*")
    .eq("batch_id", batchId)
    .neq("status", "DRAFT");

  const upcomingExams = (dbExams || [])
    .filter((e) => e.status !== "RESULT_PUBLISHED")
    .slice(0, 3);

  // Fetch student published results for this batch
  const { data: studentResults } = await supabase
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
        batch_id
      )
    `)
    .eq("student_id", studentProfile?.id || "");

  const publishedBatchResults = (studentResults || [])
    .filter((r: any) => r.exam && r.exam.batch_id === batchId && r.exam.status === "RESULT_PUBLISHED")
    .slice(0, 3);

  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();

  const currentMonthPayment = studentBatchPayments.find(
    (p) => p.billing_month === currentMonthNum && p.billing_year === currentYearNum
  );

  const currentMonthStatus = currentMonthPayment ? currentMonthPayment.status : "UNPAID";

  const latestConfirmedPayment = studentBatchPayments.find((p) => p.confirmed_at !== null);
  const latestConfirmation = latestConfirmedPayment
    ? `${new Date(latestConfirmedPayment.confirmed_at).toLocaleDateString()} (${formatCurrency(latestConfirmedPayment.paid_amount)})`
    : "None";

  const outstandingDue = studentBatchPayments.reduce((sum, p) => {
    if (p.status === "WAIVED") return sum;
    return sum + Math.max(Number(p.expected_amount) - Number(p.paid_amount), 0);
  }, 0);

  const recentHistory = studentBatchPayments.slice(0, 3);

  const schedule = (
    batch.schedule && typeof batch.schedule === "object"
      ? batch.schedule
      : batch.schedule
      ? JSON.parse(batch.schedule as string)
      : {}
  ) as any;

  return (
    <div className="space-y-8 text-xs font-bold text-primary">
      {/* Header */}
      <DashboardPageHeader
        title={batch.name}
        description={`Learning syllabus and curriculum details for class code ${batch.code}.`}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted uppercase">Enrollment status:</span>
            <span className="inline-flex px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
              Active
            </span>
          </div>
        }
      />

      {/* Grid: Overview Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Schedule card */}
        <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary/5 text-primary rounded-xl border border-primary/10">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted uppercase block">Weekly Schedule</span>
            <span className="text-xs font-extrabold text-primary mt-1 block">
              {schedule.days || "Schedule Not Set"}
            </span>
          </div>
        </div>

        {/* Time Card */}
        <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary/5 text-primary rounded-xl border border-primary/10">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted uppercase block">Class Time Slot</span>
            <span className="text-xs font-extrabold text-primary mt-1 block">
              {schedule.time || "Time Not Set"}
            </span>
          </div>
        </div>

        {/* Subject Card */}
        <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary/5 text-primary rounded-xl border border-primary/10">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted uppercase block">Subject & level</span>
            <span className="text-xs font-extrabold text-primary mt-1 block">
              {batch.subject} ({batch.academic_level})
            </span>
          </div>
        </div>
      </div>

      {/* Modules Placeholder Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Study Materials */}
        <DashboardCard
          title={`Class Materials & Resources (${materialsCount})`}
          description="Handouts, PDF files, and lectures"
          icon={<FileText className="h-5 w-5 text-accent" />}
        >
          <div className="space-y-4 pt-2 text-xs font-bold text-primary">
            {recentMaterials.length > 0 ? (
              <div className="space-y-2">
                {recentMaterials.map((m) => (
                  <div key={m.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <span className="font-extrabold text-slate-800 line-clamp-1 flex-1 mr-2">{m.title}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-slate-200 text-slate-700">
                      {m.content_type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-border/60 rounded-xl bg-slate-50/30 text-center py-6">
                <p className="text-[10px] text-muted font-semibold">No materials uploaded yet.</p>
              </div>
            )}
            <div className="pt-2 border-t border-border/20 text-center">
              <Link
                href={`/student/batches/${batchId}/materials`}
                className="text-[10px] text-primary hover:underline"
              >
                View All Materials &rarr;
              </Link>
            </div>
          </div>
        </DashboardCard>

        {/* Announcements */}
        <DashboardCard
          title={`Announcements & Notices (${announcementsCount})`}
          description="Batch alerts and messages"
          icon={<Bell className="h-5 w-5 text-accent" />}
        >
          <div className="space-y-4 pt-2 text-xs font-bold text-primary">
            {recentAnnouncements.length > 0 ? (
              <div className="space-y-2">
                {recentAnnouncements.map((a) => (
                  <div key={a.id} className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 space-y-1">
                    <span className="font-extrabold text-slate-800 block line-clamp-1">{a.title}</span>
                    <span className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-semibold block">{a.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-border/60 rounded-xl bg-slate-50/30 text-center py-6">
                <p className="text-[10px] text-muted font-semibold">No announcements posted yet.</p>
              </div>
            )}
            <div className="pt-2 border-t border-border/20 text-center">
              <Link
                href={`/student/batches/${batchId}/announcements`}
                className="text-[10px] text-primary hover:underline"
              >
                View All Announcements &rarr;
              </Link>
            </div>
          </div>
        </DashboardCard>

        {/* Examinations */}
        <DashboardCard
          title="Upcoming Exams & Tests"
          description="Scheduled examinations and class tests"
          icon={<Award className="h-5 w-5 text-accent" />}
        >
          <div className="space-y-4 pt-2 text-xs font-bold text-primary">
            {upcomingExams.length > 0 ? (
              <div className="space-y-2">
                {upcomingExams.map((e) => (
                  <div key={e.id} className="flex justify-between items-center bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="font-extrabold text-slate-800 text-sm block">{e.name}</span>
                      <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Date: {e.exam_date}</span>
                    </div>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-slate-200 text-slate-700">
                      {e.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-border/60 rounded-xl bg-slate-50/30 text-center py-6">
                <p className="text-[10px] text-muted font-semibold">No upcoming examinations.</p>
              </div>
            )}
            <div className="pt-2 border-t border-border/20 text-center">
              <Link
                href={`/student/batches/${batchId}/exams`}
                className="text-[10px] text-primary hover:underline"
              >
                View All Exams &rarr;
              </Link>
            </div>
          </div>
        </DashboardCard>

        {/* Results */}
        <DashboardCard
          title="Academic Performance Results"
          description={gradesDisplayed ? "Exam scores & letter grades" : "Exam scores & percentages"}
          icon={<Layers className="h-5 w-5 text-accent" />}
        >
          <div className="space-y-4 pt-2 text-xs font-bold text-primary">
            {publishedBatchResults.length > 0 ? (
              <div className="space-y-2">
                {publishedBatchResults.map((r: any) => {
                  const isAbs = r.attendance_status === "ABSENT";
                  const marks = r.obtained_marks !== null ? Number(r.obtained_marks) : 0;
                  const total = Number(r.exam.total_marks) || 100;
                  
                  return (
                    <Link 
                      key={r.id} 
                      href={`/student/batches/${batchId}/exams/${r.exam.id}`}
                      className="flex justify-between items-center bg-slate-50 hover:bg-slate-100/80 px-3 py-2.5 rounded-xl border border-slate-100 transition-all block"
                    >
                      <div>
                        <span className="font-extrabold text-slate-800 text-sm block">{r.exam.name}</span>
                        <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">
                          {gradesDisplayed
                            ? `Grade: ${isAbs ? "F (ABSENT)" : `${r.grade || "-"} (${((marks / total) * 100).toFixed(0)}%)`}`
                            : `Score: ${isAbs ? "ABSENT" : `${marks} / ${total} (${((marks / total) * 100).toFixed(0)}%)`}`}
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-primary">
                        Details &rarr;
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 border border-dashed border-border/60 rounded-xl bg-slate-50/30 text-center py-6">
                <p className="text-[10px] text-muted font-semibold">No graded results published yet.</p>
              </div>
            )}
            <div className="pt-2 border-t border-border/20 text-center">
              <Link
                href={`/student/batches/${batchId}/results`}
                className="text-[10px] text-primary hover:underline"
              >
                View Performance Ledger &rarr;
              </Link>
            </div>
          </div>
        </DashboardCard>

        {/* Payments */}
        <DashboardCard
          title="Tuition Fees & Payments"
          description="Monthly fee ledger logs"
          icon={<CreditCard className="h-5 w-5 text-accent" />}
        >
          <div className="space-y-4 pt-2 text-xs font-bold text-primary">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[9px] uppercase tracking-wide text-muted block">Current Month Status</span>
                <span className="mt-1 block">
                  <StatusBadge status={currentMonthStatus} />
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wide text-muted block">Outstanding Due</span>
                <span className={`text-sm font-black mt-1 block ${outstandingDue > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                  {formatCurrency(outstandingDue)}
                </span>
              </div>
            </div>

            <div className="border-t border-border/20 pt-3">
              <span className="text-[9px] uppercase tracking-wide text-muted block">Latest Confirmation</span>
              <span className="font-extrabold text-slate-800 mt-1 block">{latestConfirmation}</span>
            </div>

            <div className="border-t border-border/20 pt-3 space-y-2">
              <span className="text-[9px] uppercase tracking-wide text-muted block">Recent History</span>
              {recentHistory.length > 0 ? (
                <div className="space-y-1.5 font-semibold text-slate-600">
                  {recentHistory.map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-[10px]">
                      <span>{p.billing_month}/{p.billing_year}</span>
                      <span className="font-bold">{formatCurrency(p.paid_amount)} paid</span>
                      <span><StatusBadge status={p.status} /></span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted italic">No payment history recorded.</p>
              )}
            </div>

            <div className="pt-3 border-t border-border/20 text-center">
              <Link
                href={`/student/batches/${batchId}/payments`}
                className="text-[10px] text-primary hover:underline"
              >
                View Full Payments History &rarr;
              </Link>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
