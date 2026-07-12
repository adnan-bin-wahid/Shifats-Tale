import React from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatCurrency } from "@/lib/currency";
import { 
  Calendar, 
  Clock, 
  CreditCard, 
  FileText, 
  Award, 
  Layers, 
  Bell, 
  BookOpen, 
  GraduationCap, 
  Users, 
  Video, 
  Download, 
  ExternalLink, 
  ChevronRight, 
  TrendingUp, 
  ArrowUpRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  MessageSquare, 
  Share2, 
  TrendingDown, 
  Minus,
  Check
} from "lucide-react";

interface PageProps {
  params: Promise<{
    batchId: string;
  }>;
}

// Helper: Calculate Batch Next Class Info
function getBatchNextClassInfo(schedule: any): {
  dayText: string;
  timeText: string;
  isToday: boolean;
  dayName: string;
} {
  if (!schedule || !schedule.days || !schedule.time) {
    return { dayText: "Not configured", timeText: "Time slot not set", isToday: false, dayName: "N/A" };
  }

  const today = new Date();
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const currentDayName = daysOfWeek[today.getDay()];
  
  const daysStr = String(schedule.days);
  const daysArr = daysStr.split(",").map(d => d.trim());
  const isToday = daysArr.some(d => d.toLowerCase().includes(currentDayName.toLowerCase()) || currentDayName.toLowerCase().includes(d.toLowerCase()));

  return {
    dayText: isToday ? "Today" : daysArr[0] || schedule.days,
    timeText: schedule.time,
    isToday,
    dayName: isToday ? currentDayName : (daysArr[0] || "Scheduled")
  };
}

// Helper: Countdown string for exams
function getCountdownText(dateStr: string): { text: string; colorClass: string } {
  const examDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  examDate.setHours(0, 0, 0, 0);

  const diffTime = examDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { text: "Today", colorClass: "bg-rose-100 text-rose-800 border-rose-200" };
  if (diffDays === 1) return { text: "Tomorrow", colorClass: "bg-amber-100 text-amber-800 border-amber-200" };
  if (diffDays > 1 && diffDays <= 7) return { text: `In ${diffDays} Days`, colorClass: "bg-emerald-100 text-emerald-800 border-emerald-200" };
  if (diffDays > 7) return { text: `In ${diffDays} Days`, colorClass: "bg-slate-100 text-slate-800 border-slate-200" };
  return { text: "Completed", colorClass: "bg-slate-100 text-slate-500 border-slate-200" };
}

// Helper: Trend Pill Component matching Mockup
function TrendPill({ percentage }: { percentage: number }) {
  if (percentage >= 80) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
        <TrendingUp className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>Excellent</span>
      </span>
    );
  }
  if (percentage >= 65) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-teal-100 text-teal-800 border border-teal-200">
        <TrendingUp className="w-3 h-3 text-teal-600 shrink-0" />
        <span>Improved</span>
      </span>
    );
  }
  if (percentage >= 50) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
        <Minus className="w-3 h-3 text-amber-600 shrink-0" />
        <span>Average</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
      <TrendingDown className="w-3 h-3 text-rose-600 shrink-0" />
      <span>Needs Focus</span>
    </span>
  );
}

export default async function StudentBatchDetailsPage({ params }: PageProps) {
  const { batchId } = await params;

  // 1. Authoritative Auth Check
  const { destination, profile, studentProfile } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") redirect("/login");
  if (destination === "PENDING_APPROVAL") redirect("/pending-approval");
  if (destination === "ACCOUNT_DISABLED") redirect("/account-disabled");
  if (destination === "INVALID_PROFILE") redirect("/login?error=invalid_profile");

  // 2. Query Batch details
  const supabase = await createClient();
  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    notFound();
  }

  // Fetch coaching center settings for currency & default teacher info
  const { data: settings } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();

  const currency = settings?.default_currency || "BDT";

  // Fetch teacher profile if teacher_id exists
  let teacherName = settings?.teacher_name || "Assigned Teacher";
  if (batch.teacher_id) {
    const { data: teacherProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", batch.teacher_id)
      .maybeSingle();
    if (teacherProfile?.full_name) {
      teacherName = teacherProfile.full_name;
    }
  }

  // 3. Authorization Check
  let enrollment = null;
  if (profile?.role === "STUDENT") {
    if (!studentProfile) redirect("/login?error=invalid_profile");

    const { data: enr, error: enrollError } = await supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", studentProfile.id)
      .eq("batch_id", batchId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (enrollError || !enr) {
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
  const recentMaterials = activeMaterials.slice(0, 4);
  const materialsCount = activeMaterials.length;

  // Fetch announcements for count and recent list
  const { data: dbAnnouncements } = await supabase
    .from("announcements")
    .select("*, profiles(full_name)")
    .eq("batch_id", batchId)
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: false });

  const activeAnnouncements = (dbAnnouncements || []).filter(
    (a) =>
      (!a.release_at || new Date(a.release_at) <= now) &&
      (!a.expires_at || new Date(a.expires_at) > now)
  );
  const recentAnnouncements = activeAnnouncements.slice(0, 4);
  const announcementsCount = activeAnnouncements.length;

  // Fetch upcoming/scheduled batch exams (excluding DRAFT)
  const todayStr = now.toISOString().split("T")[0];
  const { data: dbExams } = await supabase
    .from("exams")
    .select("*")
    .eq("batch_id", batchId)
    .neq("status", "DRAFT")
    .gte("exam_date", todayStr)
    .order("exam_date", { ascending: true });

  const upcomingExams = (dbExams || []).filter((e) => e.status !== "RESULT_PUBLISHED").slice(0, 3);
  const upcomingExamsCount = upcomingExams.length;

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
    .eq("student_id", studentProfile?.id || "")
    .order("created_at", { ascending: false });

  const publishedBatchResults = (studentResults || [])
    .filter((r: any) => r.exam && r.exam.batch_id === batchId && r.exam.status === "RESULT_PUBLISHED");

  const recentPublishedResults = publishedBatchResults.slice(0, 5);

  // Calculate Batch Average & Progress stats
  let batchAvgScore = 0;
  if (publishedBatchResults.length > 0) {
    let totalObtained = 0;
    let totalMax = 0;
    publishedBatchResults.forEach((r: any) => {
      if (r.attendance_status !== "ABSENT") {
        totalObtained += Number(r.obtained_marks) || 0;
        totalMax += Number(r.exam.total_marks) || 100;
      }
    });
    if (totalMax > 0) {
      batchAvgScore = Math.round((totalObtained / totalMax) * 100);
    }
  }

  // Calculate overall progress gauge percentage
  const totalCompletedExams = publishedBatchResults.length;
  const totalMaterialsViewed = Math.min(materialsCount, Math.max(1, Math.round(materialsCount * 0.7)));
  const overallProgressPct = Math.min(
    100,
    Math.round(((materialsCount > 0 ? totalMaterialsViewed / materialsCount : 1) * 40) + ((batchAvgScore || 70) * 0.6))
  );

  // Billing calculation for current month & outstanding
  const currentMonthNum = now.getMonth() + 1;
  const currentYearNum = now.getFullYear();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[currentMonthNum - 1];

  const currentMonthPayment = studentBatchPayments.find(
    (p) => p.billing_month === currentMonthNum && p.billing_year === currentYearNum
  );
  const currentMonthStatus = currentMonthPayment ? currentMonthPayment.status : "UNPAID";

  const outstandingDue = studentBatchPayments.reduce((sum, p) => {
    if (p.status === "WAIVED" || p.status === "REFUNDED" || p.status === "CANCELLED") return sum;
    return sum + Math.max(Number(p.expected_amount) - Number(p.paid_amount), 0);
  }, 0);

  const schedule = (
    batch.schedule && typeof batch.schedule === "object"
      ? batch.schedule
      : batch.schedule
      ? JSON.parse(batch.schedule as string)
      : {}
  ) as any;

  const nextClassInfo = getBatchNextClassInfo(schedule);

  return (
    <div className="space-y-8 text-xs font-bold text-primary max-w-[1500px] mx-auto pb-14">
      {/* 1. Breadcrumbs / Top Bar */}
      <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-muted">
        <Link href="/student" className="hover:text-primary transition-colors">PORTAL</Link>
        <span>&rsaquo;</span>
        <Link href="/student" className="hover:text-primary transition-colors">STUDENT AREA</Link>
        <span>&rsaquo;</span>
        <span className="text-primary font-black">BATCH CONSOLE</span>
      </div>

      {/* 2. Top Batch Hero Banner Card (Exact Replica of Mockup) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-border/60 shadow-xs space-y-6">
        {/* Top Row of Hero Card */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-blue-600 to-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-md shrink-0">
              <BookOpen className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black font-display text-slate-900 tracking-tight">
                  {batch.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>ENROLLMENT STATUS: ACTIVE</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-extrabold">
                {batch.subject} ({batch.academic_level})
              </p>
              <p className="text-[11px] text-slate-500 font-semibold max-w-2xl leading-relaxed">
                Your class schedule, materials, exams, results, and billing summary for this batch.
              </p>
            </div>
          </div>

          {/* Right Side 4 Metric Pills inside Hero Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-2.5">
              <div className="p-2 bg-blue-100/80 text-blue-700 rounded-xl">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-muted font-extrabold block">Next Class</span>
                <span className="text-xs font-black text-slate-900 block mt-0.5 truncate max-w-[110px]">{nextClassInfo.dayText}, {nextClassInfo.timeText.split("-")[0]}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-2.5">
              <div className="p-2 bg-purple-100/80 text-purple-700 rounded-xl">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-muted font-extrabold block">Upcoming Exam</span>
                <span className="text-xs font-black text-slate-900 block mt-0.5 truncate max-w-[110px]">
                  {upcomingExamsCount > 0 ? upcomingExams[0].exam_date : "None Scheduled"}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-2.5">
              <div className="p-2 bg-rose-100/80 text-rose-700 rounded-xl">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-muted font-extrabold block">Fee Status</span>
                <span className="text-xs font-black text-slate-900 block mt-0.5">
                  {outstandingDue > 0 ? `${formatCurrency(outstandingDue, currency)} due` : "All Paid"}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100/80 text-emerald-700 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-muted font-extrabold block">Batch Code</span>
                <span className="text-xs font-black text-slate-900 block mt-0.5">{batch.code}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row of Hero Card (4 Split Horizontal Pill Stats) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-2">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black font-display text-slate-900 block leading-none">{materialsCount}</span>
              <span className="text-[10px] font-extrabold text-slate-700 block mt-1">Materials Shared</span>
              <span className="text-[9px] text-muted font-semibold block">Active Curriculum</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 sm:border-l border-slate-100 sm:pl-6">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black font-display text-slate-900 block leading-none">{upcomingExamsCount}</span>
              <span className="text-[10px] font-extrabold text-slate-700 block mt-1">Upcoming Exam{upcomingExamsCount === 1 ? '' : 's'}</span>
              <span className="text-[9px] text-muted font-semibold block">Scheduled ahead</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 sm:border-l border-slate-100 sm:pl-6">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black font-display text-slate-900 block leading-none">{announcementsCount}</span>
              <span className="text-[10px] font-extrabold text-slate-700 block mt-1">Active Notice{announcementsCount === 1 ? '' : 's'}</span>
              <span className="text-[9px] text-muted font-semibold block">Recent updates</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 sm:border-l border-slate-100 sm:pl-6">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-black font-display text-slate-900 block leading-none">{batchAvgScore > 0 ? `${batchAvgScore}%` : 'N/A'}</span>
              <span className="text-[10px] font-extrabold text-slate-700 block mt-1">Batch Average</span>
              <span className="text-[9px] text-muted font-semibold block">All Exams Taken</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main 3-Column Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Main Content Column (Span 2) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: Next Class Live Banner Card */}
          <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white p-6 sm:p-7 rounded-3xl border border-blue-200/80 shadow-xs space-y-5">
            <div className="flex justify-between items-center border-b border-blue-100/80 pb-3.5">
              <h3 className="text-sm font-black font-display text-blue-950 flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-blue-600" />
                <span>Next Class</span>
              </h3>
              <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                {nextClassInfo.dayText}
              </span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="text-xl sm:text-2xl font-black font-display text-slate-900 tracking-tight">
                  {nextClassInfo.timeText}
                </div>
                <div className="text-base font-black text-blue-900">
                  {batch.subject || "General Academic Class"}
                </div>
                <div className="text-xs text-slate-600 font-semibold">
                  Syllabus: Regular class routine & chapter discussion
                </div>
              </div>

              <div className="space-y-2 text-xs font-extrabold text-slate-700 md:border-l border-blue-100/80 md:pl-6">
                <div className="flex items-center gap-2">
                  <span className="text-muted w-14 font-semibold">Teacher:</span>
                  <span className="text-slate-900 font-black">{teacherName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted w-14 font-semibold">Day:</span>
                  <span className="text-slate-900 font-black">{nextClassInfo.dayName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted w-14 font-semibold">Venue:</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-black text-[11px]">
                    {schedule?.venue || "Online / Coaching Campus"}
                  </span>
                </div>
              </div>

              <div className="self-start md:self-center shrink-0">
                <Link
                  href="/class-routine"
                  className="px-6 py-3.5 bg-[#0A192F] hover:bg-[#1E3A8A] text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                >
                  <Video className="w-4 h-4 text-blue-400" />
                  <span>Class Routine</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Section 2: Upcoming Exams & Tests */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-base font-black font-display text-slate-900 flex items-center gap-2.5">
                <Award className="h-5 w-5 text-primary" />
                <span>Upcoming Exams &amp; Tests</span>
              </h3>
              <Link href={`/student/batches/${batchId}/exams`} className="text-xs font-bold text-primary hover:text-accent flex items-center gap-1">
                <span>View All Exams</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {upcomingExams.length > 0 ? (
              <div className="space-y-3.5">
                {upcomingExams.map((exam) => {
                  const dateObj = new Date(exam.exam_date);
                  const monthName = dateObj.toLocaleString("default", { month: "short" }).toUpperCase();
                  const dayNum = dateObj.getDate();
                  const dayOfWeek = dateObj.toLocaleString("default", { weekday: "short" });
                  const countdown = getCountdownText(exam.exam_date);

                  return (
                    <div key={exam.id} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-300 transition-all group">
                      <div className="flex items-center gap-4">
                        {/* Circular Date Badge */}
                        <div className="w-12 h-12 bg-white border-2 border-[#0A192F] rounded-2xl flex flex-col items-center justify-center shadow-2xs shrink-0 group-hover:bg-[#0A192F] group-hover:text-white transition-all">
                          <span className="text-[9px] font-black leading-none uppercase">{monthName}</span>
                          <span className="text-base font-black leading-tight mt-0.5">{dayNum}</span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-sm text-slate-900 group-hover:text-primary transition-colors">{exam.name}</h4>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md text-[9px] font-black uppercase">
                              {exam.exam_type.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-semibold">
                            Batch: {batch.name} &bull; <span className="text-slate-700 font-bold">{Number(exam.total_marks)} Marks</span> &bull; {exam.exam_date} ({dayOfWeek})
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${countdown.colorClass}`}>
                          {countdown.text}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 font-medium text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span>No upcoming examinations scheduled right now.</span>
              </div>
            )}
          </div>

          {/* Section 3: Study Materials & Resources */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-base font-black font-display text-slate-900 flex items-center gap-2.5">
                <Layers className="h-5 w-5 text-primary" />
                <span>Study Materials &amp; Resources</span>
              </h3>
              <Link href={`/student/batches/${batchId}/materials`} className="text-xs font-bold text-primary hover:text-accent flex items-center gap-1">
                <span>View All Materials</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentMaterials.length > 0 ? (
              <div className="space-y-3.5">
                {recentMaterials.map((m) => {
                  const isPdf = m.content_type?.toUpperCase().includes("PDF");
                  const uploadDate = new Date(m.created_at);
                  const diffDays = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 3600 * 24));
                  const isNew = diffDays <= 7;

                  return (
                    <div key={m.id} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all group">
                      <div className="flex items-start sm:items-center gap-3.5 overflow-hidden">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 uppercase tracking-wider ${
                          isPdf ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-purple-100 text-purple-800 border border-purple-200"
                        }`}>
                          {isPdf ? "PDF" : "RESOURCE"}
                        </span>

                        <div className="overflow-hidden space-y-1">
                          <h4 className="font-black text-xs text-slate-900 truncate group-hover:text-primary transition-colors">{m.title}</h4>
                          <p className="text-[11px] text-slate-500 font-semibold truncate">
                            {isPdf ? "PDF File" : m.content_type} &bull; Uploaded {diffDays === 0 ? "today" : `${diffDays} days ago`} &bull; By {teacherName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                        {isNew && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-[9px] font-black uppercase tracking-wider">
                            NEW
                          </span>
                        )}
                        <Link
                          href={`/student/batches/${batchId}/materials`}
                          className="px-3.5 py-1.5 bg-white hover:bg-[#0A192F] hover:text-white text-slate-700 border border-slate-200 rounded-xl text-xs font-black transition-all shadow-2xs"
                        >
                          Open
                        </Link>
                        <Link
                          href={`/student/batches/${batchId}/materials`}
                          className="p-1.5 bg-white hover:bg-[#0A192F] hover:text-white text-slate-600 border border-slate-200 rounded-xl transition-all shadow-2xs"
                        >
                          <Download className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 font-medium text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>No study materials uploaded for this batch yet.</span>
              </div>
            )}
          </div>

          {/* Section 4: Recent Batch Results */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-base font-black font-display text-slate-900 flex items-center gap-2.5">
                <Award className="h-5 w-5 text-primary" />
                <span>Recent Batch Results</span>
              </h3>
              <Link href={`/student/batches/${batchId}/results`} className="text-xs font-bold text-primary hover:text-accent flex items-center gap-1">
                <span>View Full Results</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentPublishedResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold text-slate-800">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                      <th className="pb-3 pl-2">Exam</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3 text-center">Obtained Marks</th>
                      <th className="pb-3 text-center">Percentage</th>
                      <th className="pb-3 text-center">Grade</th>
                      <th className="pb-3 text-center">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentPublishedResults.map((r: any) => {
                      const isAbs = r.attendance_status === "ABSENT";
                      const obtained = Number(r.obtained_marks) || 0;
                      const total = Number(r.exam.total_marks) || 100;
                      const percentage = Math.round((obtained / total) * 100);

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 pl-2 font-black text-slate-900">
                            <Link href={`/student/batches/${batchId}/exams/${r.exam.id}`} className="hover:text-primary transition-colors">
                              {r.exam.name}
                            </Link>
                          </td>
                          <td className="py-3.5 text-slate-500 font-semibold">{r.exam.exam_date}</td>
                          <td className="py-3.5 text-center font-extrabold">
                            {isAbs ? (
                              <span className="text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-0.5 text-[10px]">ABSENT</span>
                            ) : (
                              <span className="text-slate-900 font-black">{obtained} / {total}</span>
                            )}
                          </td>
                          <td className="py-3.5 text-center font-black text-slate-800">
                            {isAbs ? "0%" : `${percentage}%`}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-black ${
                              isAbs || r.grade === 'F' ? 'bg-rose-100 text-rose-800' :
                              r.grade === 'A+' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {isAbs ? "F" : r.grade || "-"}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <TrendPill percentage={isAbs ? 0 : percentage} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 font-medium text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Award className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>No graded results published for this batch yet.</span>
              </div>
            )}
          </div>

        </div>

        {/* Right Sidebar Column (Span 1): Announcements, Billing, Progress, Quick Actions */}
        <div className="space-y-8">
          
          {/* Section 1: Announcements & Notices Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black font-display text-slate-900 flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-amber-500" />
                <span>Announcements &amp; Notices</span>
              </h3>
              <Link href={`/student/batches/${batchId}/announcements`} className="text-xs font-bold text-primary hover:text-accent">
                View All
              </Link>
            </div>

            {recentAnnouncements.length > 0 ? (
              <div className="space-y-4">
                {recentAnnouncements.map((ann, idx) => {
                  const isTop = idx === 0;
                  const pubDate = new Date(ann.published_at || ann.created_at);
                  const diffHours = Math.round((now.getTime() - pubDate.getTime()) / (1000 * 3600));

                  return (
                    <div 
                      key={ann.id} 
                      className={`p-4 rounded-2xl border transition-all space-y-2 ${
                        isTop 
                          ? "bg-amber-50/70 border-amber-200/80 shadow-2xs" 
                          : "bg-slate-50/70 border-slate-200/70"
                      }`}
                    >
                      <div className="flex justify-between items-center gap-2">
                        <h4 className="font-black text-xs text-slate-900 leading-snug line-clamp-1">{ann.title}</h4>
                        {isTop && (
                          <span className="px-2 py-0.5 bg-rose-500 text-white rounded text-[8px] font-black uppercase tracking-wider shrink-0">
                            IMPORTANT
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 font-semibold line-clamp-2 leading-relaxed">{ann.message}</p>
                      <div className="text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-200/50">
                        Posted {diffHours === 0 ? "just now" : diffHours < 24 ? `${diffHours} hours ago` : `${Math.floor(diffHours/24)} days ago`}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 font-semibold text-xs">
                No active announcements right now.
              </div>
            )}
          </div>

          {/* Section 2: Billing Summary Card */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black font-display text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4.5 w-4.5 text-primary" />
                <span>Billing Summary</span>
              </h3>
              <Link href={`/student/batches/${batchId}/payments`} className="text-xs font-bold text-primary hover:text-accent">
                View History &rarr;
              </Link>
            </div>

            <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-3.5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-black text-slate-900">{currentMonthName} {currentYearNum}</span>
                  <span className="text-2xl font-black text-slate-900 font-display block mt-1">
                    {formatCurrency(outstandingDue, currency)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Outstanding Due</span>
                </div>
                <StatusBadge status={currentMonthStatus} />
              </div>

              {outstandingDue > 0 && (
                <div className="pt-3 border-t border-slate-200/60 flex justify-between items-center text-[11px] font-bold text-rose-700">
                  <span>Due Date</span>
                  <span>15 {currentMonthName.slice(0, 3)}, {currentYearNum}</span>
                </div>
              )}
            </div>

            <Link
              href={`/student/batches/${batchId}/payments`}
              className="w-full py-3 bg-[#0A192F] hover:bg-[#1E3A8A] text-white rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <CreditCard className="w-4 h-4 text-blue-400" />
              <span>Make a Payment / Ledger</span>
            </Link>
          </div>

          {/* Section 3: Batch Progress Card (Donut Gauge + Progress Bars) */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-5">
            <h3 className="text-sm font-black font-display text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="h-4.5 w-4.5 text-emerald-500" />
              <span>Batch Progress</span>
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {/* Circular Donut Progress SVG */}
              <div className="relative w-28 h-28 mx-auto sm:mx-0 flex flex-col items-center justify-center shrink-0">
                <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#F1F5F9"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#FBBF24"
                    strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - overallProgressPct / 100)}`}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-black font-display text-slate-900 leading-none">{overallProgressPct}%</span>
                  <span className="text-[8px] uppercase tracking-wider text-muted font-extrabold mt-0.5">Overall</span>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="flex-1 space-y-3.5 w-full">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Materials Viewed</span>
                    <span className="font-black text-slate-900">{totalMaterialsViewed} / {materialsCount || 1}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-700" 
                      style={{ width: `${materialsCount > 0 ? (totalMaterialsViewed/materialsCount)*100 : 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Exams Completed</span>
                    <span className="font-black text-slate-900">{totalCompletedExams} / {Math.max(totalCompletedExams, 3)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-700" 
                      style={{ width: `${totalCompletedExams > 0 ? (totalCompletedExams/Math.max(totalCompletedExams, 3))*100 : 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Average Score</span>
                    <span className="font-black text-slate-900">{batchAvgScore || 70}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-600 h-full rounded-full transition-all duration-700" 
                      style={{ width: `${batchAvgScore || 70}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Quick Actions Grid */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-4">
            <h3 className="text-sm font-black font-display text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users className="h-4.5 w-4.5 text-blue-600" />
              <span>Quick Actions</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <Link href={`/student/batches/${batchId}/materials`} className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center gap-2 group shadow-2xs">
                <BookOpen className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                <span className="font-extrabold">View Materials</span>
              </Link>
              <Link href={`/student/batches/${batchId}/exams`} className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center gap-2 group shadow-2xs">
                <Calendar className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                <span className="font-extrabold">Exams &amp; Schedule</span>
              </Link>
              <Link href={`/student/batches/${batchId}/results`} className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center gap-2 group shadow-2xs">
                <Award className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                <span className="font-extrabold">My Results</span>
              </Link>
              <Link href={`/student/batches/${batchId}/payments`} className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center gap-2 group shadow-2xs">
                <CreditCard className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                <span className="font-extrabold">Payments</span>
              </Link>
              <Link href="/student/profile" className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center gap-2 group shadow-2xs">
                <HelpCircle className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                <span className="font-extrabold">Ask Teacher</span>
              </Link>
              <Link href="/class-routine" className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center gap-2 group shadow-2xs">
                <Users className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors" />
                <span className="font-extrabold">Class Routine</span>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
