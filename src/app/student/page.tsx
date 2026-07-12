import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
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
  AlertCircle,
  HelpCircle,
  Download,
  ExternalLink,
  Sparkles,
  Zap,
  Check,
  TrendingDown,
  Minus
} from "lucide-react";

// Helper: Calculate Next Class Schedule
function getNextClassInfo(activeEnrollments: any[]): {
  text: string;
  batchName: string;
  scheduleDays: string;
  scheduleTime: string;
} | null {
  if (!activeEnrollments || activeEnrollments.length === 0) return null;

  const today = new Date();
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const currentDayName = daysOfWeek[today.getDay()];

  for (const enr of activeEnrollments) {
    const batch = enr.batches;
    if (!batch) continue;
    const schedule = (
      batch?.schedule && typeof batch.schedule === "object"
        ? (batch.schedule as any)
        : batch?.schedule
        ? JSON.parse(batch.schedule as string)
        : null
    ) as any;

    if (schedule && schedule.days && schedule.time) {
      const daysStr = schedule.days as string;
      const daysArr = daysStr.split(",").map((d: string) => d.trim());
      const isToday = daysArr.some((d: string) => d.toLowerCase().includes(currentDayName.toLowerCase()) || currentDayName.toLowerCase().includes(d.toLowerCase()));

      let timeText = schedule.time;
      // Extract start time for display
      const timeParts = timeText.split("-").map((t: string) => t.trim());
      const startTime = timeParts[0] || timeText;

      return {
        text: isToday ? `Today, ${startTime}` : `${daysArr[0]}, ${startTime}`,
        batchName: batch.name,
        scheduleDays: schedule.days,
        scheduleTime: schedule.time,
      };
    }
  }
  return null;
}

// Helper: Mini SVG Sparkline Wave for Trend / Insights
function TrendSparkline({ type = "up" }: { type?: "up" | "down" | "flat" }) {
  if (type === "up") {
    return (
      <svg className="w-12 h-6 text-emerald-500 overflow-visible" viewBox="0 0 50 20" fill="none">
        <path
          d="M 2 16 Q 12 18, 20 10 T 38 6 L 46 3"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="46" cy="3" r="2.5" fill="currentColor" />
      </svg>
    );
  }
  if (type === "down") {
    return (
      <svg className="w-12 h-6 text-rose-500 overflow-visible" viewBox="0 0 50 20" fill="none">
        <path
          d="M 2 4 Q 12 6, 20 12 T 38 15 L 46 17"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="46" cy="17" r="2.5" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className="w-12 h-6 text-amber-500 overflow-visible" viewBox="0 0 50 20" fill="none">
      <path
        d="M 2 10 Q 15 8, 25 11 T 46 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="46" cy="10" r="2.5" fill="currentColor" />
    </svg>
  );
}

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

  const currency = settings?.default_currency || "BDT";

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

  // 2. Fetch all payments for the student (for both current month due & outstanding history due)
  const { data: allPayments } = await supabase
    .from("payments")
    .select("*, batches(name, code)")
    .eq("student_id", studentProfile.id);

  const paymentsList = allPayments || [];
  const currentPayments = paymentsList.filter(
    (p) => p.billing_month === currentMonth && p.billing_year === currentYearVal
  );

  // Calculate aggregates
  let totalDueThisMonth = 0;
  let pendingCountThisMonth = 0;
  let totalOutstandingDue = 0;
  let totalOutstandingInvoices = 0;

  currentPayments.forEach((p) => {
    const exp = Number(p.expected_amount) || 0;
    const paid = Number(p.paid_amount) || 0;
    if (p.status !== "WAIVED") {
      const due = Math.max(exp - paid, 0);
      if (due > 0) {
        totalDueThisMonth += due;
        pendingCountThisMonth += 1;
      }
    }
  });

  paymentsList.forEach((p) => {
    const exp = Number(p.expected_amount) || 0;
    const paid = Number(p.paid_amount) || 0;
    if (p.status !== "WAIVED" && p.status !== "REFUNDED" && p.status !== "CANCELLED") {
      const due = Math.max(exp - paid, 0);
      if (due > 0) {
        totalOutstandingDue += due;
        totalOutstandingInvoices += 1;
      }
    }
  });

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

  // 5. Fetch recently published exam results (limit 10 for insights)
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

  const publishedResults = (results || [])
    .filter((r: any) => r.exam && r.exam.status === "RESULT_PUBLISHED" && activeBatchIds.includes(r.exam.batch_id));

  const recentPublishedResults = publishedResults.slice(0, 5);

  // Calculate Student Insight if results exist
  let avgPercentage = 0;
  let monthlyGrowth = 0;
  let hasValidInsight = false;

  if (publishedResults.length > 0) {
    let totalObtained = 0;
    let totalMax = 0;
    publishedResults.forEach((r: any) => {
      if (r.attendance_status !== "ABSENT") {
        totalObtained += Number(r.obtained_marks) || 0;
        totalMax += Number(r.exam.total_marks) || 100;
      }
    });
    if (totalMax > 0) {
      avgPercentage = Math.round((totalObtained / totalMax) * 100);
      hasValidInsight = true;
      // Calculate trend growth comparison
      if (publishedResults.length >= 2) {
        const latest = Number(publishedResults[0].obtained_marks) / (Number(publishedResults[0].exam.total_marks) || 100);
        const prev = Number(publishedResults[1].obtained_marks) / (Number(publishedResults[1].exam.total_marks) || 100);
        monthlyGrowth = Math.round((latest - prev) * 100);
      }
    }
  }

  // 6. Fetch recently published study materials (released, unexpired, limit 4)
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
    .slice(0, 4);

  // 7. Fetch recent announcements (released, unexpired, limit 4)
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
    .slice(0, 4);

  // Next Class Info
  const nextClassInfo = getNextClassInfo(activeEnrollments);

  const totalActionItems = (totalOutstandingDue > 0 ? 1 : 0) + ((unreadCount || 0) > 0 ? 1 : 0);

  return (
    <div className="space-y-8 text-xs font-bold text-primary max-w-[1500px] mx-auto pb-12">
      {/* 1. Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Welcome back, {profile.full_name}</span>
            <span className="animate-wave inline-block">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
            Stay consistent—small efforts today, big results tomorrow.
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-slate-50/80 px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs self-start md:self-auto">
          <span className="text-[10px] text-muted uppercase tracking-wider font-extrabold">Student ID:</span>
          <span className="text-xs font-black text-[#0A192F] font-display">
            {studentProfile.student_code}
          </span>
        </div>
      </div>

      {/* 2. Micro-Alerts Banner Row (4 Pill Cards exactly like UI Mockup) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Banner 1: Needs Attention */}
        <div className="bg-amber-50/80 border border-amber-200/80 p-4 rounded-2xl flex items-center gap-3.5 shadow-2xs hover:shadow-sm transition-all">
          <div className="p-2.5 bg-amber-100/90 text-amber-800 rounded-xl shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-black text-amber-900 leading-tight">Needs Attention</div>
            <div className="text-[11px] font-semibold text-amber-800/80 truncate mt-0.5">
              {totalActionItems > 0 ? `${totalActionItems} item${totalActionItems > 1 ? 's' : ''} need your action` : 'No action needed right now'}
            </div>
          </div>
        </div>

        {/* Banner 2: Payment Due */}
        <Link href="/student/payments" className="bg-rose-50/80 border border-rose-200/80 p-4 rounded-2xl flex items-center gap-3.5 shadow-2xs hover:shadow-sm transition-all group">
          <div className="p-2.5 bg-rose-100/90 text-rose-800 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-black text-rose-900 leading-tight">
              {totalDueThisMonth > 0 ? `${pendingCountThisMonth} Payment Due` : 'All Paid'}
            </div>
            <div className="text-[11px] font-extrabold text-rose-800/90 truncate mt-0.5">
              {formatCurrency(totalDueThisMonth, currency)}
            </div>
          </div>
        </Link>

        {/* Banner 3: Unread Alert */}
        <Link href="/student/notifications" className="bg-purple-50/80 border border-purple-200/80 p-4 rounded-2xl flex items-center gap-3.5 shadow-2xs hover:shadow-sm transition-all group">
          <div className="p-2.5 bg-purple-100/90 text-purple-800 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
            <Bell className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-black text-purple-900 leading-tight">
              {unreadCount || 0} Unread Alert{(unreadCount || 0) === 1 ? '' : 's'}
            </div>
            <div className="text-[11px] font-semibold text-purple-800/80 truncate mt-0.5">
              {(unreadCount || 0) > 0 ? 'New announcement posted' : 'No new notifications'}
            </div>
          </div>
        </Link>

        {/* Banner 4: Next Class */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center gap-3.5 shadow-2xs hover:shadow-sm transition-all">
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-black text-slate-800 leading-tight">Next Class</div>
            <div className="text-[11px] font-bold text-slate-600 truncate mt-0.5">
              {nextClassInfo ? `${nextClassInfo.text} • ${nextClassInfo.batchName}` : "Schedule not configured"}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Big Metric Cards Row (4 White Cards with Icons & Navigation Arrows) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Active Batches */}
        <Link href="/student/profile" className="bg-white border border-border/60 p-6 rounded-3xl shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="p-3.5 bg-blue-50/90 text-blue-700 rounded-2xl border border-blue-100 group-hover:scale-105 transition-transform">
              <BookOpen className="h-6 w-6" />
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
          <div className="mt-5">
            <span className="text-3xl font-black text-slate-900 font-display block leading-none">{activeBatchCount}</span>
            <span className="text-xs font-black text-slate-800 block mt-1.5">Active Batches</span>
            <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">Keep up the great work!</span>
          </div>
        </Link>

        {/* Card 2: Unread Alerts */}
        <Link href="/student/notifications" className="bg-white border border-border/60 p-6 rounded-3xl shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="p-3.5 bg-purple-50/90 text-purple-700 rounded-2xl border border-purple-100 group-hover:scale-105 transition-transform">
              <Bell className="h-6 w-6" />
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
          <div className="mt-5">
            <span className="text-3xl font-black text-slate-900 font-display block leading-none">{unreadCount || 0}</span>
            <span className="text-xs font-black text-slate-800 block mt-1.5">Unread Alerts</span>
            <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">Check your updates</span>
          </div>
        </Link>

        {/* Card 3: Due this Month */}
        <Link href="/student/payments" className="bg-white border border-border/60 p-6 rounded-3xl shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="p-3.5 bg-rose-50/90 text-rose-700 rounded-2xl border border-rose-100 group-hover:scale-105 transition-transform">
              <CreditCard className="h-6 w-6" />
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
          <div className="mt-5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-display block leading-none">{formatCurrency(totalDueThisMonth, currency)}</span>
            <span className="text-xs font-black text-slate-800 block mt-1.5">Due this Month</span>
            <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
              {pendingCountThisMonth > 0 ? `${pendingCountThisMonth} payment pending` : 'All cleared for this month'}
            </span>
          </div>
        </Link>

        {/* Card 4: Outstanding Due */}
        <Link href="/student/payments" className="bg-white border border-border/60 p-6 rounded-3xl shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="p-3.5 bg-amber-50/90 text-amber-700 rounded-2xl border border-amber-100 group-hover:scale-105 transition-transform">
              <TrendingUp className="h-6 w-6" />
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
          <div className="mt-5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-display block leading-none">{formatCurrency(totalOutstandingDue, currency)}</span>
            <span className="text-xs font-black text-slate-800 block mt-1.5">Outstanding Due</span>
            <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">View billing details</span>
          </div>
        </Link>
      </div>

      {/* 4. Main 3-Column Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns (Span 2): Active Batches, Upcoming Exams, Recent Results */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Batches Section */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-base font-black font-display text-slate-900 flex items-center gap-2.5">
                <BookOpen className="h-5 w-5 text-primary" />
                <span>Active Batches</span>
              </h3>
              <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                Joined {activeBatchCount} Batch{activeBatchCount === 1 ? '' : 'es'}
              </span>
            </div>

            {activeBatchCount > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeEnrollments.map((enr) => {
                  const batch = enr.batches;
                  const payment = currentPayments.find(p => p.batch_id === enr.batch_id);
                  const isPaid = !payment || payment.status === "PAID" || payment.status === "WAIVED";
                  const schedule = (
                    batch?.schedule && typeof batch.schedule === "object"
                      ? (batch.schedule as any)
                      : batch?.schedule
                      ? JSON.parse(batch.schedule as string)
                      : null
                  ) as any;

                  return (
                    <div key={enr.id} className="p-5 border border-slate-200/80 rounded-2xl bg-white flex flex-col justify-between hover:shadow-md hover:border-slate-300 transition-all group">
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-start">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            {batch?.code}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                            isPaid 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? "bg-emerald-500" : "bg-amber-500"}`} />
                            {isPaid ? "Enrolled" : "Unpaid"}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-slate-900 line-clamp-1">{batch?.name}</h4>
                          <span className="text-xs text-slate-500 block mt-1 font-semibold">
                            Level: {batch?.academic_level || 'N/A'} &bull; Subject: {batch?.subject || 'General'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                          <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-muted block font-extrabold uppercase flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-primary" /> Next Class
                            </span>
                            <span className="text-xs font-extrabold text-slate-800 block mt-1 truncate">
                              {schedule?.time || "Not configured"}
                            </span>
                          </div>
                          <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-muted block font-extrabold uppercase flex items-center gap-1">
                              <Clock className="w-3 h-3 text-primary" /> Schedule
                            </span>
                            <span className="text-xs font-extrabold text-slate-800 block mt-1 truncate">
                              {schedule?.days || "Not configured"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3">
                        <Link
                          href={`/student/batches/${enr.batch_id}`}
                          className="w-full py-2.5 bg-[#0A192F] text-white hover:bg-[#1E3A8A] rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-xs group-hover:shadow-md"
                        >
                          <span>Open Batch Console</span>
                          <ArrowUpRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-14 text-center text-muted font-semibold text-xs border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-extrabold text-slate-700">No active batch enrollments yet.</p>
                <p className="text-xs text-slate-500 font-medium mt-1">Join your first batch or contact administration for access.</p>
              </div>
            )}
          </div>

          {/* Upcoming Examinations Timeline Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-base font-black font-display text-slate-900 flex items-center gap-2.5">
                <Calendar className="h-5 w-5 text-primary" />
                <span>Upcoming Examinations</span>
              </h3>
              <Link href="/student/exams" className="text-xs font-bold text-primary hover:text-accent flex items-center gap-1">
                <span>View All</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {upcomingExams.length > 0 ? (
              <div className="border-l-2 border-slate-200 ml-3 sm:ml-5 pl-5 sm:pl-7 space-y-6 relative py-1">
                {upcomingExams.map((exam) => {
                  const dateObj = new Date(exam.exam_date);
                  const monthName = dateObj.toLocaleString("default", { month: "short" }).toUpperCase();
                  const dayNum = dateObj.getDate();
                  const dayOfWeek = dateObj.toLocaleString("default", { weekday: "long" });

                  return (
                    <div key={exam.id} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                      {/* Timeline Circular Dot / Badge on line */}
                      <div className="absolute -left-[35px] sm:-left-[43px] top-0 sm:top-1 w-10 h-11 bg-white border-2 border-[#0A192F] rounded-xl flex flex-col items-center justify-center shadow-xs text-center group-hover:scale-110 group-hover:bg-[#0A192F] group-hover:text-white transition-all">
                        <span className="text-[9px] font-black leading-none uppercase">{monthName}</span>
                        <span className="text-sm font-black leading-tight mt-0.5">{dayNum}</span>
                      </div>

                      <div className="pl-6 sm:pl-3">
                        <h4 className="font-black text-sm text-slate-900 group-hover:text-primary transition-colors">{exam.name}</h4>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                          {(exam.batches as any)?.name} &bull; <span className="text-primary font-bold">{exam.exam_type.replace("_", " ")}</span>
                        </p>
                      </div>

                      <div className="pl-6 sm:pl-0 sm:text-right">
                        <span className="font-extrabold text-slate-800 text-xs block">{exam.exam_date}</span>
                        <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">{dayOfWeek}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 font-medium text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span>No upcoming examinations scheduled at the moment.</span>
              </div>
            )}
          </div>

          {/* Recent Results Ledger & Trend Table */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-base font-black font-display text-slate-900 flex items-center gap-2.5">
                <Award className="h-5 w-5 text-primary" />
                <span>Recent Results</span>
              </h3>
              <Link href="/student/results" className="text-xs font-bold text-primary hover:text-accent flex items-center gap-1">
                <span>View Performance Ledger</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentPublishedResults.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-bold text-slate-800">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                        <th className="pb-3 pl-2">Exam</th>
                        <th className="pb-3">Batch</th>
                        <th className="pb-3 text-center">Score</th>
                        <th className="pb-3 text-center">Grade</th>
                        <th className="pb-3 text-center">Trend</th>
                        <th className="pb-3 text-right pr-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentPublishedResults.map((r: any, idx: number) => {
                        const isAbs = r.attendance_status === "ABSENT";
                        const obtained = Number(r.obtained_marks) || 0;
                        const total = Number(r.exam.total_marks) || 100;
                        const passes = obtained >= Number(r.exam.pass_marks);

                        // Determine trend vs previous result if available
                        let trendType: "up" | "down" | "flat" = "up";
                        if (idx < recentPublishedResults.length - 1) {
                          const nextR = recentPublishedResults[idx + 1];
                          const currentPct = obtained / total;
                          const nextPct = (Number(nextR.obtained_marks) || 0) / (Number(nextR.exam.total_marks) || 100);
                          if (currentPct > nextPct + 0.03) trendType = "up";
                          else if (currentPct < nextPct - 0.03) trendType = "down";
                          else trendType = "flat";
                        } else {
                          trendType = passes ? "up" : "down";
                        }

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="py-3.5 pl-2 font-black text-slate-900 group-hover:text-primary transition-colors">{r.exam.name}</td>
                            <td className="py-3.5 text-slate-500 font-semibold truncate max-w-[150px]">{(r.exam.batches as any)?.name}</td>
                            <td className="py-3.5 text-center font-extrabold">
                              {isAbs ? (
                                <span className="text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-0.5 text-[10px]">ABSENT</span>
                              ) : (
                                <span className={passes ? "text-emerald-700 font-black" : "text-rose-600 font-black"}>
                                  {obtained} / {total}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black ${
                                isAbs || r.grade === 'F' ? 'bg-rose-100 text-rose-800' :
                                r.grade === 'A+' ? 'bg-emerald-100 text-emerald-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {isAbs ? "F" : r.grade || "-"}
                              </span>
                            </td>
                            <td className="py-3.5 text-center">
                              <div className="flex items-center justify-center">
                                <TrendSparkline type={trendType} />
                              </div>
                            </td>
                            <td className="py-3.5 text-right pr-2">
                              <Link 
                                href={`/student/batches/${r.exam.batch_id}/exams/${r.exam.id}`} 
                                className="px-3 py-1.5 text-xs font-extrabold bg-slate-100 hover:bg-[#0A192F] hover:text-white text-slate-700 rounded-xl transition-all inline-block"
                              >
                                View Details
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="text-center pt-2 text-xs text-slate-400 font-semibold">
                  Showing 1 to {recentPublishedResults.length} of {publishedResults.length} results
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 font-medium text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>No published examination results found yet.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Sidebar - Span 1): Quick Actions, Billing, Materials, Notices, Insights */}
        <div className="space-y-8">
          
          {/* Quick Actions Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-4">
            <h3 className="text-sm font-black font-display text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Zap className="h-4.5 w-4.5 text-amber-500" />
              <span>Quick Actions</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <Link href="/student/profile" className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center gap-2 group shadow-2xs">
                <User className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                <span className="font-extrabold">My Profile</span>
              </Link>
              <Link href="/student/payments" className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center gap-2 group shadow-2xs">
                <CreditCard className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                <span className="font-extrabold">Payments</span>
              </Link>
              <Link href="/student/results" className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center gap-2 group shadow-2xs">
                <Award className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                <span className="font-extrabold">Report Cards</span>
              </Link>
              <Link href="/student/exams" className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center gap-2 group shadow-2xs">
                <GraduationCap className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                <span className="font-extrabold">Examinations</span>
              </Link>
              <Link href="/student/profile" className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center gap-2 group shadow-2xs">
                <FileText className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                <span className="font-extrabold">Study Materials</span>
              </Link>
              <Link href="/class-routine" className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center gap-2 group shadow-2xs">
                <Calendar className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                <span className="font-extrabold">Class Routine</span>
              </Link>
            </div>
          </div>

          {/* Billing Summary Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-5">
            <h3 className="text-sm font-black font-display text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="h-4.5 w-4.5 text-primary" />
              <span>Billing Summary</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <span className="text-[10px] text-muted font-black uppercase tracking-wider block">Current Dues</span>
                <span className="text-xl font-black text-rose-600 font-display block mt-1">
                  {formatCurrency(totalDueThisMonth, currency)}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                  {pendingCountThisMonth > 0 ? `${pendingCountThisMonth} invoice pending` : 'All cleared'}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <span className="text-[10px] text-muted font-black uppercase tracking-wider block">Outstanding Due</span>
                <span className="text-xl font-black text-amber-600 font-display block mt-1">
                  {formatCurrency(totalOutstandingDue, currency)}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold block mt-1">
                  Total remaining
                </span>
              </div>
            </div>

            <Link
              href="/student/payments"
              className="w-full py-3 bg-slate-100 hover:bg-[#0A192F] hover:text-white text-slate-800 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-2xs"
            >
              <span>View Billing &amp; History</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Recent Study Materials Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black font-display text-slate-900 flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-primary" />
                <span>Recent Study Materials</span>
              </h3>
              <Link href="/student/profile" className="text-xs font-bold text-primary hover:text-accent">
                View All
              </Link>
            </div>

            {recentMaterials.length > 0 ? (
              <div className="space-y-3">
                {recentMaterials.map((m) => {
                  const isPdf = m.content_type?.toUpperCase().includes("PDF");
                  return (
                    <div key={m.id} className="p-3.5 bg-slate-50/70 border border-slate-200/70 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-300 transition-all group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black shrink-0 ${
                          isPdf ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {isPdf ? "PDF" : "LINK"}
                        </span>
                        <div className="overflow-hidden">
                          <h4 className="font-extrabold text-xs text-slate-900 truncate group-hover:text-primary transition-colors">{m.title}</h4>
                          <p className="text-[10px] text-slate-500 font-semibold truncate mt-0.5">{m.batches?.name}</p>
                        </div>
                      </div>
                      <Link
                        href={`/student/batches/${m.batch_id}/materials`}
                        className="p-2 bg-white hover:bg-[#0A192F] hover:text-white text-slate-600 rounded-xl border border-slate-200 shrink-0 transition-colors shadow-2xs"
                      >
                        <Download className="w-4 h-4" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 font-semibold text-xs">
                No recent study materials shared yet.
              </div>
            )}
          </div>

          {/* Latest Notices Board Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black font-display text-slate-900 flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-primary" />
                <span>Latest Notices</span>
              </h3>
              <Link href="/student/notifications" className="text-xs font-bold text-primary hover:text-accent">
                View All
              </Link>
            </div>

            {recentAnnouncements.length > 0 ? (
              <div className="space-y-3.5">
                {recentAnnouncements.map((ann) => (
                  <div key={ann.id} className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl space-y-1.5 hover:border-slate-300 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[9px] font-black uppercase tracking-wider">
                        Announcement
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(ann.published_at || ann.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-xs text-slate-900 leading-snug">{ann.title}</h4>
                    <p className="text-[11px] text-slate-500 font-semibold line-clamp-2">{ann.message}</p>
                  </div>
                ))}
                <div className="text-center pt-1 text-[11px] text-slate-400 font-semibold">
                  No more notices
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 font-semibold text-xs">
                No notices posted right now.
              </div>
            )}
          </div>

          {/* Section X: Student Insight Chart (Only shown if data exists as instructed) */}
          {hasValidInsight && (
            <div className="bg-gradient-to-br from-slate-900 via-[#0A192F] to-indigo-950 p-6 sm:p-7 rounded-3xl text-white shadow-lg space-y-5 relative overflow-hidden border border-slate-800">
              <div className="flex justify-between items-center border-b border-white/10 pb-3">
                <h3 className="text-sm font-black font-display flex items-center gap-2 text-white">
                  <Sparkles className="h-4.5 w-4.5 text-amber-400" />
                  <span>Student Insight</span>
                </h3>
                <span className="text-xs font-extrabold text-white/70 bg-white/10 px-3 py-1 rounded-full">
                  This Month
                </span>
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-white/60 font-black block">Average Score</span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-4xl font-black font-display tracking-tight text-white">{avgPercentage}%</span>
                  {monthlyGrowth !== 0 && (
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                      monthlyGrowth > 0 ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}>
                      {monthlyGrowth > 0 ? `↑ ${monthlyGrowth}%` : `↓ ${Math.abs(monthlyGrowth)}%`} vs last month
                    </span>
                  )}
                </div>
              </div>

              {/* Decorative SVG Sparkline Graph at the bottom */}
              <div className="pt-2">
                <svg className="w-full h-20 text-amber-400 overflow-visible" viewBox="0 0 300 80" fill="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 60 Q 50 20, 100 45 T 200 30 T 300 15 L 300 80 L 0 80 Z"
                    fill="url(#chartGradient)"
                  />
                  <path
                    d="M 0 60 Q 50 20, 100 45 T 200 30 T 300 15"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <circle cx="300" cy="15" r="5" fill="#FBBF24" stroke="#0A192F" strokeWidth="2.5" />
                  <circle cx="200" cy="30" r="4" fill="#FBBF24" opacity="0.8" />
                  <circle cx="100" cy="45" r="4" fill="#FBBF24" opacity="0.8" />
                </svg>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
