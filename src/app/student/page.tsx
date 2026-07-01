import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatCurrency } from "@/lib/currency";
import { 
  Calendar, 
  Bell, 
  BookOpen, 
  Clock, 
  CreditCard, 
  GraduationCap, 
  FileText, 
  Award,
  ChevronRight,
  TrendingUp,
  User,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default async function StudentDashboardPage() {
  const { profile, studentProfile, destination } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") redirect("/login");
  if (destination === "PENDING_APPROVAL") redirect("/pending-approval");
  if (destination === "ACCOUNT_DISABLED") redirect("/account-disabled");
  if (destination === "INVALID_PROFILE" || !profile || !studentProfile) {
    redirect("/login?error=invalid_profile");
  }

  const supabase = await createClient();

  // Fetch coaching center settings for default localization & grading values
  const { data: settings } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", true)
    .single();

  const gradesDisplayed = settings?.grades_displayed ?? true;

  // Current month and year for billing queries
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYearVal = currentDate.getFullYear();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonthName = monthNames[currentMonth - 1];

  // 1. Fetch active enrollments for this student only
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("*, batches(*)")
    .eq("student_id", studentProfile.id)
    .eq("status", "ACTIVE");

  const activeEnrollments = enrollments || [];
  const activeBatchCount = activeEnrollments.length;
  const activeBatchIds = activeEnrollments.map((e) => e.batch_id);

  // 2. Fetch current month payments for the student
  const { data: currentPayments } = activeBatchIds.length > 0 
    ? await supabase
        .from("payments")
        .select("*, batches(name, code)")
        .eq("student_id", studentProfile.id)
        .eq("billing_month", currentMonth)
        .eq("billing_year", currentYearVal)
    : { data: [] };

  // Calculate aggregates
  let totalExpected = 0;
  let totalPaid = 0;
  let totalDue = 0;

  currentPayments?.forEach((p) => {
    const exp = Number(p.expected_amount) || 0;
    const paid = Number(p.paid_amount) || 0;
    totalExpected += exp;
    totalPaid += paid;
    if (p.status === "WAIVED") {
      totalDue += 0;
    } else {
      totalDue += Math.max(exp - paid, 0);
    }
  });

  const overallPaymentStatus = totalDue > 0
    ? "Dues Pending"
    : totalExpected > 0 ? "Paid" : "No Dues Generated";

  // 3. Fetch unread notification count
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .is("read_at", null);

  // 4. Fetch upcoming examinations (non-draft, date >= today, sorted ascending, limit 5)
  const todayStr = currentDate.toISOString().split("T")[0];
  const { data: exams } = activeBatchIds.length > 0
    ? await supabase
        .from("exams")
        .select("*, batches(name)")
        .in("batch_id", activeBatchIds)
        .neq("status", "DRAFT")
        .gte("exam_date", todayStr)
        .order("exam_date", { ascending: true })
        .limit(5)
    : { data: [] };

  const upcomingExams = exams || [];

  // 5. Fetch recently published exam results (limit 5)
  const { data: results } = activeBatchIds.length > 0
    ? await supabase
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
        .eq("student_id", studentProfile.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const recentPublishedResults = (results || [])
    .filter((r: any) => r.exam && r.exam.status === "RESULT_PUBLISHED" && activeBatchIds.includes(r.exam.batch_id))
    .slice(0, 5);

  // 6. Fetch recently published study materials (released, unexpired, limit 5)
  const { data: materials } = activeBatchIds.length > 0
    ? await supabase
        .from("batch_contents")
        .select("*, batches(name)")
        .in("batch_id", activeBatchIds)
        .eq("status", "PUBLISHED")
        .order("created_at", { ascending: false })
    : { data: [] };

  const recentMaterials = (materials || [])
    .filter((m) => {
      const isReleased = !m.release_at || new Date(m.release_at) <= new Date();
      const isNotExpired = !m.expires_at || new Date(m.expires_at) > new Date();
      return isReleased && isNotExpired;
    })
    .slice(0, 5);

  // 7. Fetch recent announcements (released, unexpired, limit 5)
  const { data: announcements } = activeBatchIds.length > 0
    ? await supabase
        .from("announcements")
        .select("*, batches(name), profiles(full_name)")
        .in("batch_id", activeBatchIds)
        .eq("status", "PUBLISHED")
        .order("created_at", { ascending: false })
    : { data: [] };

  const recentAnnouncements = (announcements || [])
    .filter((a) => {
      const isReleased = !a.release_at || new Date(a.release_at) <= new Date();
      const isNotExpired = !a.expires_at || new Date(a.expires_at) > new Date();
      return isReleased && isNotExpired;
    })
    .slice(0, 5);

  // Fallback avatar generator initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-8 text-xs font-bold text-primary">
      {/* 1. Header */}
      <DashboardPageHeader
        title={`Welcome back, ${profile.full_name}`}
        description="Here is your learning overview, payment dashboard, notices, and test score reports."
        actions={
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted uppercase tracking-wider font-extrabold">Student ID:</span>
            <span className="text-xs font-black text-primary font-display bg-primary/5 px-3 py-1 rounded-xl border border-primary/10">
              {studentProfile.student_code}
            </span>
          </div>
        }
      />

      {/* 2. Top Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Active Batches Count Widget */}
        <div className="bg-white border border-border/40 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[26px] font-extrabold text-slate-800 leading-none block">{activeBatchCount}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted font-bold block mt-1">Active Batches</span>
          </div>
        </div>

        {/* Unread Notifications Count Widget */}
        <Link href="/student/notifications" className="bg-white border border-border/40 p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3.5 bg-purple-50 text-purple-700 rounded-2xl border border-purple-100">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[26px] font-extrabold text-slate-800 leading-none block">{unreadCount || 0}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted font-bold block mt-1">Unread Alerts</span>
          </div>
        </Link>

        {/* Current Month Collection Status */}
        <div className="bg-white border border-border/40 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className={`p-3.5 rounded-2xl border ${
            totalDue > 0 
              ? "bg-rose-50 text-rose-700 border-rose-100" 
              : totalExpected > 0 
                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                : "bg-slate-50 text-slate-600 border-slate-200"
          }`}>
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <span className="text-sm font-extrabold text-slate-800 leading-none block">{overallPaymentStatus}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted font-bold block mt-1">{currentMonthName} Bill Status</span>
          </div>
        </div>

        {/* Total Month Due balance */}
        <div className="bg-white border border-border/40 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[22px] font-extrabold text-slate-800 leading-none block">{formatCurrency(totalDue, settings?.default_currency)}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted font-bold block mt-1">Outstanding Due</span>
          </div>
        </div>
      </div>

      {/* 3. Main Grid layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns (Span 2): Active Batches, Upcoming Exams, Recent Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Batches Section */}
          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border/20 pb-3">
              <h3 className="text-sm font-extrabold font-display flex items-center gap-2">
                <BookOpen className="h-4.5 w-4.5 text-primary" />
                <span>My Active Enrolled Batches</span>
              </h3>
              <span className="text-[9px] uppercase tracking-wider text-muted font-extrabold">
                Joined {activeBatchCount} Batches
              </span>
            </div>

            {activeBatchCount > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeEnrollments.map((enr) => {
                  const batch = enr.batches;
                  const payment = currentPayments?.find(p => p.batch_id === enr.batch_id);
                  const schedule = (
                    batch?.schedule && typeof batch.schedule === "object"
                      ? (batch.schedule as any)
                      : batch?.schedule
                      ? JSON.parse(batch.schedule as string)
                      : null
                  ) as any;

                  return (
                    <div key={enr.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/30 flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="px-2 py-0.5 bg-primary/5 text-primary rounded-lg text-[9px] font-black uppercase tracking-wider">
                            {batch?.code}
                          </span>
                          {payment ? (
                            <StatusBadge status={payment.status} />
                          ) : (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-lg border">
                              Unbilled
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-xs font-black text-slate-800 line-clamp-1">{batch?.name}</h4>
                          <span className="text-[10px] text-muted block mt-0.5 font-semibold">
                            Level: {batch?.academic_level} &bull; Subject: {batch?.subject}
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500 space-y-1 font-semibold border-t border-slate-100 pt-2">
                          <p className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>{schedule?.days || "Not configured"}</span>
                          </p>
                          <p className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>{schedule?.time || "Not configured"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <Link
                          href={`/student/batches/${enr.batch_id}`}
                          className="w-full py-1.5 bg-primary text-white hover:bg-primary-dark rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1"
                        >
                          <span>Open Batch Console</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-muted font-semibold text-[11px] border border-dashed border-border rounded-xl">
                <BookOpen className="h-10 w-10 text-muted/40 mx-auto mb-3" />
                <p>You have no active batch enrollments.</p>
                <p className="text-[10px] text-muted font-normal mt-0.5">Please contact coaching administration to get approved.</p>
              </div>
            )}
          </div>

          {/* Upcoming Examinations Ledger */}
          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border/20 pb-3">
              <h3 className="text-sm font-extrabold font-display flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-primary" />
                <span>Upcoming Examinations Schedules</span>
              </h3>
              <Link href="/student/exams" className="text-[10px] text-primary hover:text-accent flex items-center gap-0.5">
                <span>View All</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {upcomingExams.length > 0 ? (
              <div className="divide-y divide-border/10">
                {upcomingExams.map((exam) => (
                  <div key={exam.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">{exam.name}</h4>
                      <p className="text-[10px] text-muted font-semibold mt-0.5">
                        Batch: {(exam.batches as any)?.name} &bull; Marks: {Number(exam.total_marks)}
                      </p>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span className="font-extrabold text-slate-800 text-[11px] block">{exam.exam_date}</span>
                      <span className="text-[9px] uppercase tracking-wider text-muted font-bold block mt-0.5">
                        {exam.exam_type.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted font-medium text-[11px]">
                No upcoming examinations scheduled.
              </div>
            )}
          </div>

          {/* Recent Published Exam Results */}
          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border/20 pb-3">
              <h3 className="text-sm font-extrabold font-display flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-primary" />
                <span>Recent Examination Results</span>
              </h3>
              <Link href="/student/results" className="text-[10px] text-primary hover:text-accent flex items-center gap-0.5">
                <span>Performance Ledger</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {recentPublishedResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-primary">
                  <thead>
                    <tr className="border-b border-border/20 text-muted uppercase text-[9px] font-extrabold">
                      <th className="pb-2">Exam</th>
                      <th className="pb-2">Batch</th>
                      <th className="pb-2 text-center">Score</th>
                      {gradesDisplayed && <th className="pb-2 text-center">Grade</th>}
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10 text-primary">
                    {recentPublishedResults.map((r: any) => {
                      const isAbs = r.attendance_status === "ABSENT";
                      const obtained = Number(r.obtained_marks) || 0;
                      const passes = obtained >= Number(r.exam.pass_marks);

                      return (
                        <tr key={r.id}>
                          <td className="py-2.5 font-extrabold text-slate-800">{r.exam.name}</td>
                          <td className="py-2.5 text-slate-600">{(r.exam.batches as any)?.name}</td>
                          <td className="py-2.5 text-center font-bold">
                            {isAbs ? (
                              <span className="text-rose-700 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 text-[9px]">ABSENT</span>
                            ) : (
                              <span className={passes ? "text-emerald-700" : "text-rose-700"}>
                                {obtained} / {Number(r.exam.total_marks)}
                              </span>
                            )}
                          </td>
                          {gradesDisplayed && (
                            <td className="py-2.5 text-center font-display font-black text-slate-800">
                              {isAbs ? "F" : r.grade || "-"}
                            </td>
                          )}
                          <td className="py-2.5 text-right">
                            <Link href={`/student/batches/${r.exam.batch_id}/exams/${r.exam.id}`} className="px-2 py-1 text-[9px] border border-border rounded hover:bg-slate-50">View Details</Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted font-medium text-[11px]">
                No published exam results found.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Payments Ledger Summary, Quick Actions, Notices & Materials */}
        <div className="space-y-6">
          {/* Quick Actions Panel */}
          <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted border-b border-border/20 pb-2">
              Student Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <Link href="/student/profile" className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-primary hover:text-white transition-colors flex flex-col items-center gap-1.5">
                <User className="h-4.5 w-4.5 text-muted group-hover:text-white" />
                <span>My Profile</span>
              </Link>
              <Link href="/student/payments" className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-primary hover:text-white transition-colors flex flex-col items-center gap-1.5">
                <CreditCard className="h-4.5 w-4.5 text-muted group-hover:text-white" />
                <span>Payments</span>
              </Link>
              <Link href="/student/results" className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-primary hover:text-white transition-colors flex flex-col items-center gap-1.5">
                <Award className="h-4.5 w-4.5 text-muted group-hover:text-white" />
                <span>Report Cards</span>
              </Link>
              <Link href="/student/exams" className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-primary hover:text-white transition-colors flex flex-col items-center gap-1.5">
                <GraduationCap className="h-4.5 w-4.5 text-muted group-hover:text-white" />
                <span>Examinations</span>
              </Link>
            </div>
          </div>

          {/* Current Month Batch-wise Payments Ledger */}
          <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted border-b border-border/20 pb-2">
              Batch Billing - {currentMonthName}
            </h3>

            {activeBatchCount > 0 ? (
              <div className="space-y-3">
                {activeEnrollments.map((enr) => {
                  const batch = enr.batches;
                  const payment = currentPayments?.find(p => p.batch_id === enr.batch_id);

                  return (
                    <div key={enr.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <span className="font-extrabold block text-slate-800">{batch?.name}</span>
                        <span className="text-[10px] text-muted block mt-0.5">
                          {payment 
                            ? `Billing: ${formatCurrency(payment.expected_amount, settings?.default_currency)}` 
                            : "Payment record has not been generated for this month."
                          }
                        </span>
                      </div>
                      <div>
                        {payment ? (
                          <StatusBadge status={payment.status} />
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 border text-slate-500 rounded text-[9px] font-bold">Unbilled</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-center text-muted py-2">No active batches enrolled.</p>
            )}
          </div>

          {/* Recent Study Materials */}
          <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted border-b border-border/20 pb-2 flex justify-between items-center">
              <span>Recently Shared Study Materials</span>
              <FileText className="h-4 w-4 text-muted" />
            </h3>

            {recentMaterials.length > 0 ? (
              <div className="space-y-3">
                {recentMaterials.map((m) => (
                  <div key={m.id} className="p-3 bg-slate-50/30 border border-slate-100 rounded-xl flex justify-between items-start gap-2.5">
                    <div className="space-y-1">
                      <span className="inline-flex px-1.5 py-0.2 bg-slate-100 border text-[8px] rounded uppercase font-black tracking-wider text-slate-600">
                        {m.content_type}
                      </span>
                      <h4 className="font-extrabold text-[11px] text-slate-800 line-clamp-1">{m.title}</h4>
                      <p className="text-[9px] text-muted font-semibold mt-0.5">Batch: {m.batches?.name}</p>
                    </div>
                    <Link
                      href={`/student/batches/${m.batch_id}/materials`}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-[9px] font-black border text-slate-700 rounded-lg shrink-0"
                    >
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-[10px] text-muted font-bold">
                No study materials shared yet.
              </div>
            )}
          </div>

          {/* Recent Announcements */}
          <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted border-b border-border/20 pb-2 flex justify-between items-center">
              <span>Class Notices Board</span>
              <Bell className="h-4 w-4 text-muted" />
            </h3>

            {recentAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {recentAnnouncements.map((ann) => (
                  <div key={ann.id} className="p-3 bg-slate-50/30 border border-slate-100 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-muted font-bold">{new Date(ann.published_at || ann.created_at).toLocaleDateString()}</span>
                      <span className="text-[9px] text-slate-700 font-extrabold">Batch: {ann.batches?.name}</span>
                    </div>
                    <h4 className="font-extrabold text-[11px] text-slate-800 line-clamp-1">{ann.title}</h4>
                    <p className="text-[10px] text-slate-600 font-semibold leading-relaxed line-clamp-2">{ann.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-[10px] text-muted font-bold">
                No active announcements posted yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
