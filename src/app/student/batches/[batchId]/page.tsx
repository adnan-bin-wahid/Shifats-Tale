import React from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { 
  Calendar, 
  Clock, 
  CreditCard, 
  FileText, 
  Award, 
  Layers, 
  Bell, 
  BookOpen, 
  ChevronRight, 
  Download, 
  ExternalLink, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowUpRight,
  GraduationCap,
  Activity,
  DollarSign
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";

interface PageProps {
  params: Promise<{
    batchId: string;
  }>;
}

// Helper: Calculate Next Class string from schedule days & time
function getNextClassDisplay(schedule: any): { dayText: string; timeText: string; isToday: boolean } | null {
  if (!schedule || !schedule.days || !schedule.time) return null;
  
  const today = new Date();
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const currentDayName = daysOfWeek[today.getDay()];
  
  const daysStr = String(schedule.days);
  const daysArr = daysStr.split(",").map(d => d.trim());
  const isToday = daysArr.some(d => d.toLowerCase().includes(currentDayName.toLowerCase()) || currentDayName.toLowerCase().includes(d.toLowerCase()));

  return {
    dayText: isToday ? "Today" : daysArr[0] || schedule.days,
    timeText: schedule.time,
    isToday
  };
}

// Helper: Format countdown from today
function getExamCountdown(examDateStr: string): string {
  if (!examDateStr) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const examDate = new Date(examDateStr);
  examDate.setHours(0, 0, 0, 0);
  
  const diffTime = examDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays > 1) return `In ${diffDays} Days`;
  return "Past";
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

  // Fetch app settings for currency
  const { data: settings } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", true)
    .single();

  const currency = settings?.default_currency || "BDT";

  // 3. Authorization Check:
  // Teacher can see any batch. Student must have an ACTIVE enrollment in this batch.
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
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: false });

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
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: false });

  const activeAnnouncements = (dbAnnouncements || []).filter(
    (a) =>
      (!a.release_at || new Date(a.release_at) <= now) &&
      (!a.expires_at || new Date(a.expires_at) > now)
  );
  const recentAnnouncements = activeAnnouncements.slice(0, 3);
  const announcementsCount = activeAnnouncements.length;

  // Fetch upcoming/scheduled/taken batch exams (excluding DRAFT)
  const todayStr = now.toISOString().split("T")[0];
  const { data: dbExams } = await supabase
    .from("exams")
    .select("*")
    .eq("batch_id", batchId)
    .neq("status", "DRAFT")
    .order("exam_date", { ascending: true });

  const totalExamsCount = (dbExams || []).length;
  const upcomingExams = (dbExams || [])
    .filter((e) => e.status !== "RESULT_PUBLISHED" && e.exam_date >= todayStr)
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
    .eq("student_id", studentProfile?.id || "")
    .order("created_at", { ascending: false });

  const publishedBatchResults = (studentResults || [])
    .filter((r: any) => r.exam && r.exam.batch_id === batchId && r.exam.status === "RESULT_PUBLISHED")
    .slice(0, 4);

  // Calculate Average Percentage across published exams
  let totalObtained = 0;
  let totalMax = 0;
  publishedBatchResults.forEach((r: any) => {
    if (r.attendance_status !== "ABSENT") {
      totalObtained += Number(r.obtained_marks) || 0;
      totalMax += Number(r.exam?.total_marks) || 100;
    }
  });
  const avgPercentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();

  const currentMonthPayment = studentBatchPayments.find(
    (p) => p.billing_month === currentMonthNum && p.billing_year === currentYearNum
  );

  const currentMonthStatus = currentMonthPayment ? currentMonthPayment.status : "UNPAID";

  const latestConfirmedPayment = studentBatchPayments.find((p) => p.confirmed_at !== null);
  const latestConfirmation = latestConfirmedPayment
    ? `${new Date(latestConfirmedPayment.confirmed_at).toLocaleDateString()} (${formatCurrency(latestConfirmedPayment.paid_amount, currency)})`
    : "No payments confirmed yet";

  const outstandingDue = studentBatchPayments.reduce((sum, p) => {
    if (p.status === "WAIVED") return sum;
    return sum + Math.max(Number(p.expected_amount) - Number(p.paid_amount), 0);
  }, 0);

  const schedule = (
    batch.schedule && typeof batch.schedule === "object"
      ? batch.schedule
      : batch.schedule
      ? JSON.parse(batch.schedule as string)
      : {}
  ) as any;

  const nextClassDisplay = getNextClassDisplay(schedule);

  // Progress gauge calculations (realistic based on actual system items)
  const progressPercent = totalExamsCount > 0 
    ? Math.min(Math.round(((publishedBatchResults.length + (materialsCount > 0 ? 1 : 0)) / (totalExamsCount + 1)) * 100), 100) 
    : materialsCount > 0 ? 50 : 0;

  return (
    <div className="space-y-8 text-xs font-bold text-primary max-w-[1500px] mx-auto pb-12">
      
      {/* 1. Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted">
        <Link href="/student" className="hover:text-primary transition-colors">PORTAL</Link>
        <span>&bull;</span>
        <span className="text-slate-500">STUDENT AREA</span>
        <span>&bull;</span>
        <span className="text-[#0A192F] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">BATCH CONSOLE</span>
      </div>

      {/* 2. Masterpiece Hero Banner Card */}
      <div className="bg-white p-5 sm:p-8 rounded-3xl border border-border/60 shadow-xs space-y-6 sm:space-y-7 min-w-0">
        
        {/* Top Half: Batch Identity & Top 4 Metric Pills */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
            <div className="p-3.5 sm:p-4 bg-gradient-to-tr from-[#0A192F] to-blue-800 text-white rounded-2xl shadow-md shrink-0">
              <BookOpen className="w-7 h-7 sm:w-9 sm:h-9" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black font-display text-slate-900 leading-tight break-words">
                  {batch.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Enrollment
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-1 break-words">
                Subject: <span className="text-primary font-black">{batch.subject || "General"}</span> &bull; Academic Year: <span className="text-primary font-black">{batch.academic_level || "N/A"}</span>
              </p>
            </div>
          </div>

          {/* Right Side 4 Top Metric Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:items-center gap-3 w-full xl:w-auto">
            <div className="bg-slate-50/90 border border-slate-200/80 p-3 rounded-2xl flex items-center gap-3 shrink-0 min-w-0">
              <Calendar className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-muted font-extrabold uppercase block truncate">Weekly Schedule</span>
                <span className="text-xs font-black text-slate-900 truncate block" title={schedule.days || "Not configured"}>{schedule.days || "Not configured"}</span>
              </div>
            </div>

            <div className="bg-slate-50/90 border border-slate-200/80 p-3 rounded-2xl flex items-center gap-3 shrink-0 min-w-0">
              <Clock className="w-5 h-5 text-purple-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-muted font-extrabold uppercase block truncate">Class Time Slot</span>
                <span className="text-xs font-black text-slate-900 truncate block" title={schedule.time || "Not configured"}>{schedule.time || "Not configured"}</span>
              </div>
            </div>

            <Link href={`/student/batches/${batchId}/payments`} className="bg-slate-50/90 hover:bg-rose-50/80 border border-slate-200/80 hover:border-rose-200 p-3 rounded-2xl flex items-center gap-3 shrink-0 transition-all group min-w-0">
              <CreditCard className="w-5 h-5 text-rose-600 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-muted font-extrabold uppercase block truncate">Fee Status</span>
                <span className={`text-xs font-black truncate block ${outstandingDue > 0 ? "text-rose-700" : "text-emerald-700"}`} title={outstandingDue > 0 ? `${formatCurrency(outstandingDue, currency)} Due` : "All Paid"}>
                  {outstandingDue > 0 ? `${formatCurrency(outstandingDue, currency)} Due` : "All Paid"}
                </span>
              </div>
            </Link>

            <div className="bg-slate-50/90 border border-slate-200/80 p-3 rounded-2xl flex items-center gap-3 shrink-0 min-w-0">
              <Layers className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[9px] text-muted font-extrabold uppercase block truncate">Batch Code</span>
                <span className="text-xs font-black text-slate-900 truncate block" title={batch.code}>{batch.code}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Half: 4 Pill Stats Row (Avg Score, Monthly Fee, Progress, Materials) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 pt-1">
          {/* Stat 1 */}
          <Link href={`/student/batches/${batchId}/exams`} className="bg-slate-50/60 hover:bg-slate-100/80 border border-slate-200/80 p-4 rounded-2xl flex items-center gap-3.5 transition-all group min-w-0">
            <div className="p-2.5 bg-amber-100/90 text-amber-800 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-xs font-extrabold text-muted uppercase block truncate">Batch Avg Score</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-display truncate">{avgPercentage}%</span>
                <span className="text-[10px] text-emerald-600 font-extrabold shrink-0">Overall</span>
              </div>
            </div>
          </Link>

          {/* Stat 2 */}
          <Link href={`/student/batches/${batchId}/payments`} className="bg-slate-50/60 hover:bg-slate-100/80 border border-slate-200/80 p-4 rounded-2xl flex items-center gap-3.5 transition-all group min-w-0">
            <div className="p-2.5 bg-rose-100/90 text-rose-800 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-xs font-extrabold text-muted uppercase block truncate">Monthly Fee</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg sm:text-xl font-black text-slate-900 font-display truncate" title={formatCurrency(Number(batch.monthly_fee) || 0, currency)}>{formatCurrency(Number(batch.monthly_fee) || 0, currency)}</span>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                  currentMonthStatus === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                }`}>
                  {currentMonthStatus}
                </span>
              </div>
            </div>
          </Link>

          {/* Stat 3 */}
          <Link href={`/student/batches/${batchId}/exams`} className="bg-slate-50/60 hover:bg-slate-100/80 border border-slate-200/80 p-4 rounded-2xl flex items-center gap-3.5 transition-all group min-w-0">
            <div className="p-2.5 bg-purple-100/90 text-purple-800 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-xs font-extrabold text-muted uppercase block truncate">Batch Progress</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: `${progressPercent}%` }} />
                </div>
                <span className="text-xs font-black text-slate-800 shrink-0">{progressPercent}%</span>
              </div>
            </div>
          </Link>

          {/* Stat 4 */}
          <Link href={`/student/batches/${batchId}/materials`} className="bg-slate-50/60 hover:bg-slate-100/80 border border-slate-200/80 p-4 rounded-2xl flex items-center gap-3.5 transition-all group min-w-0">
            <div className="p-2.5 bg-blue-100/90 text-blue-800 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-xs font-extrabold text-muted uppercase block truncate">Study Materials</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-display truncate">{materialsCount}</span>
                <span className="text-[10px] text-slate-500 font-bold truncate">Shared</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Live Next Class & Weekly Routine Box */}
        <div className="bg-gradient-to-r from-[#0A192F] via-slate-900 to-indigo-950 p-5 sm:p-7 rounded-3xl text-white shadow-md relative overflow-hidden border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-5 min-w-0">
          <div className="space-y-2.5 z-10 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/40 flex items-center gap-1.5 shadow-2xs shrink-0">
                <Calendar className="w-3.5 h-3.5 text-blue-300" /> Next Class Routine
              </span>
              {nextClassDisplay?.isToday && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 animate-bounce shadow-2xs shrink-0">
                  Today!
                </span>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl md:text-2xl font-black font-display !text-white tracking-tight leading-snug drop-shadow-xs break-words" style={{ color: '#FFFFFF' }}>
                {nextClassDisplay ? `${nextClassDisplay.dayText} • ${nextClassDisplay.timeText}` : "Class Schedule Not Set"}
              </h3>
              <p className="text-xs !text-slate-200 font-semibold mt-1.5 leading-relaxed break-words" style={{ color: '#E2E8F0' }}>
                Schedule Days: <span className="!text-white font-black underline decoration-blue-400 decoration-2" style={{ color: '#FFFFFF' }}>{schedule.days || "N/A"}</span> &bull; Subject: <span className="!text-amber-300 font-black" style={{ color: '#FCD34D' }}>{batch.subject || "General"}</span>
              </p>
            </div>
          </div>

          <div className="z-10 shrink-0 self-start sm:self-center">
            <Link
              href="/class-routine"
              className="px-6 py-3.5 bg-white hover:bg-slate-100 !text-[#0A192F] rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md shrink-0 hover:scale-105"
              style={{ color: '#0A192F' }}
            >
              <span>View Full Routine</span>
              <ArrowUpRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Main 3-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Span 2): Next Class Banner, Exams, Materials, Results */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Upcoming Exams & Tests Card */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-5 min-w-0">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-base font-black font-display text-slate-900 flex items-center gap-2.5">
                <Award className="h-5 w-5 text-primary shrink-0" />
                <span>Upcoming Exams &amp; Tests</span>
              </h3>
              <Link href={`/student/batches/${batchId}/exams`} className="text-xs font-bold text-primary hover:text-accent flex items-center gap-1 shrink-0">
                <span>View All Exams</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {upcomingExams.length > 0 ? (
              <div className="space-y-3.5">
                {upcomingExams.map((exam) => {
                  const countdown = getExamCountdown(exam.exam_date);
                  const dateObj = new Date(exam.exam_date);
                  const monthName = dateObj.toLocaleString("default", { month: "short" }).toUpperCase();
                  const dayNum = dateObj.getDate();
                  const dayOfWeek = dateObj.toLocaleString("default", { weekday: "short" });

                  return (
                    <Link
                      key={exam.id}
                      href={`/student/batches/${batchId}/exams`}
                      className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group min-w-0"
                    >
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                        {/* Circular/Box Date Badge */}
                        <div className="w-12 h-13 bg-white border-2 border-[#0A192F] rounded-xl flex flex-col items-center justify-center text-center shrink-0 shadow-2xs group-hover:bg-[#0A192F] group-hover:text-white transition-all">
                          <span className="text-[9px] font-black leading-none uppercase">{monthName}</span>
                          <span className="text-base font-black leading-tight mt-0.5">{dayNum}</span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-sm text-slate-900 group-hover:text-primary transition-colors truncate" title={exam.name}>{exam.name}</h4>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[9px] font-black uppercase tracking-wider shrink-0">
                              {exam.exam_type.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-semibold mt-1 truncate">
                            Total Marks: <span className="text-slate-800 font-extrabold">{Number(exam.total_marks)}</span> &bull; Date: <span className="text-slate-800 font-extrabold">{exam.exam_date} ({dayOfWeek})</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          countdown === "Today" || countdown === "Tomorrow" || countdown.includes("In")
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {countdown}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 font-medium text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <span>No upcoming examinations scheduled for this batch right now.</span>
              </div>
            )}
          </div>

          {/* Study Materials & Resources Card with [NEW] Pill & Download Action */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-5 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h3 className="text-base font-black font-display text-slate-900 flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <span>Study Materials &amp; Resources</span>
              </h3>
              <Link href={`/student/batches/${batchId}/materials`} className="text-xs font-bold text-primary hover:text-accent flex items-center gap-1 self-start sm:self-auto shrink-0">
                <span>View All Materials ({materialsCount})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentMaterials.length > 0 ? (
              <div className="space-y-3.5">
                {recentMaterials.map((m) => {
                  const isPdf = m.content_type?.toUpperCase().includes("PDF");
                  const uploadDate = new Date(m.created_at || now);
                  const daysAgo = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24));
                  const isNew = daysAgo <= 3;

                  return (
                    <div key={m.id} className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:border-slate-300 transition-all group min-w-0">
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 ${
                          isPdf ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {isPdf ? "PDF" : "LINK"}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-primary transition-colors truncate" title={m.title}>{m.title}</h4>
                            {isNew && (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black uppercase tracking-wider shrink-0">
                                NEW
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
                            {m.content_type} &bull; Uploaded {daysAgo === 0 ? "Today" : `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                        <Link
                          href={`/student/batches/${batchId}/materials`}
                          className="px-3 py-1.5 bg-white hover:bg-[#0A192F] hover:text-white text-slate-700 rounded-xl text-xs font-extrabold border border-slate-200 transition-all shadow-2xs"
                        >
                          Open
                        </Link>
                        <Link
                          href={`/student/batches/${batchId}/materials`}
                          className="p-2 bg-white hover:bg-[#0A192F] hover:text-white text-slate-700 rounded-xl border border-slate-200 transition-all shadow-2xs"
                          title="Download / View"
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
                <span>No study materials uploaded for this batch right now.</span>
              </div>
            )}
          </div>

          {/* Recent Batch Results Table with TREND Pills */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-5 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h3 className="text-base font-black font-display text-slate-900 flex items-center gap-2.5">
                <Layers className="h-5 w-5 text-primary shrink-0" />
                <span>Recent Batch Results</span>
              </h3>
              <Link href={`/student/batches/${batchId}/results`} className="text-xs font-bold text-primary hover:text-accent flex items-center gap-1 self-start sm:self-auto shrink-0">
                <span>View Full Ledger</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {publishedBatchResults.length > 0 ? (
              <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
                <table className="w-full text-left text-xs font-bold text-slate-800 min-w-[550px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                      <th className="pb-3 pl-2">Exam</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3 text-center">Marks</th>
                      <th className="pb-3 text-center">Percentage</th>
                      <th className="pb-3 text-center">Grade</th>
                      <th className="pb-3 text-center pr-2">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {publishedBatchResults.map((r: any) => {
                      const isAbs = r.attendance_status === "ABSENT";
                      const obtained = Number(r.obtained_marks) || 0;
                      const total = Number(r.exam?.total_marks) || 100;
                      const percentage = total > 0 ? Math.round((obtained / total) * 100) : 0;
                      const passes = obtained >= Number(r.exam?.pass_marks || 0);

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="py-3.5 pl-2 font-black text-slate-900 group-hover:text-primary transition-colors max-w-[160px] truncate" title={r.exam.name}>
                            <Link href={`/student/batches/${batchId}/exams/${r.exam.id}`}>
                              {r.exam.name}
                            </Link>
                          </td>
                          <td className="py-3.5 text-slate-500 font-semibold truncate max-w-[110px]">{r.exam.exam_date}</td>
                          <td className="py-3.5 text-center font-extrabold">
                            {isAbs ? (
                              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[10px] border border-rose-200">ABSENT</span>
                            ) : (
                              <span className={passes ? "text-emerald-700 font-black" : "text-rose-600 font-black"}>
                                {obtained} / {total}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 text-center font-black text-slate-800">
                            {isAbs ? "-" : `${percentage}%`}
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
                          <td className="py-3.5 text-center pr-2">
                            {isAbs || percentage < 50 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                                <span>↓ Needs Focus</span>
                              </span>
                            ) : percentage >= 80 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span>↑ Excellent</span>
                              </span>
                            ) : percentage >= 65 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                                <span>↗ Improved</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                                <span>→ Average</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 font-medium text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>No graded examination results published for this batch yet.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar (Span 1): Announcements, Billing, Progress, Quick Actions */}
        <div className="space-y-6 sm:space-y-8 min-w-0">
          
          {/* Announcements Box */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-4 min-w-0">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black font-display text-slate-900 flex items-center gap-2">
                <Bell className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                <span>Announcements &amp; Notices</span>
              </h3>
              <Link href={`/student/batches/${batchId}/announcements`} className="text-xs font-bold text-primary hover:text-accent shrink-0">
                View All
              </Link>
            </div>

            {recentAnnouncements.length > 0 ? (
              <div className="space-y-3.5">
                {recentAnnouncements.map((ann, idx) => (
                  <div key={ann.id} className="p-4 bg-amber-50/50 border border-amber-200/70 rounded-2xl space-y-2 hover:border-amber-300 transition-all min-w-0">
                    <div className="flex justify-between items-center gap-2">
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-[9px] font-black uppercase tracking-wider shrink-0">
                        {idx === 0 ? "IMPORTANT" : "NOTICE"}
                      </span>
                      <span className="text-[10px] text-amber-900/60 font-bold shrink-0">
                        {new Date(ann.published_at || ann.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-black text-xs text-slate-900 leading-snug break-words">{ann.title}</h4>
                    <p className="text-[11px] text-slate-600 font-semibold line-clamp-3 leading-relaxed break-words">{ann.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 font-semibold text-xs">
                No active announcements right now.
              </div>
            )}
          </div>

          {/* Billing Summary Box */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-5 min-w-0">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black font-display text-slate-900 flex items-center gap-2">
                <CreditCard className="h-4.5 w-4.5 text-primary shrink-0" />
                <span>Billing Summary</span>
              </h3>
              <Link href={`/student/batches/${batchId}/payments`} className="text-xs font-bold text-primary hover:text-accent shrink-0">
                View History
              </Link>
            </div>

            <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-3 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-black text-slate-900 block truncate">{currentMonthPayment ? `Month: ${currentMonthPayment.billing_month}/${currentMonthPayment.billing_year}` : "Current Status"}</span>
                  <span className="text-[11px] font-semibold text-slate-500 block mt-0.5 truncate">Outstanding Balance</span>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={currentMonthStatus} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex justify-between items-baseline gap-2">
                <span className={`text-xl sm:text-2xl font-black font-display truncate ${outstandingDue > 0 ? "text-rose-600" : "text-emerald-600"}`} title={formatCurrency(outstandingDue, currency)}>
                  {formatCurrency(outstandingDue, currency)}
                </span>
                <span className="text-[10px] font-extrabold text-slate-500 shrink-0">
                  {latestConfirmation !== "No payments confirmed yet" ? "Paid recently" : "Fee log"}
                </span>
              </div>
            </div>

            <Link
              href={`/student/batches/${batchId}/payments`}
              className="w-full py-3 bg-[#0A192F] text-white hover:bg-[#1E3A8A] rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-2xs"
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span className="truncate">Make a Payment / View Log</span>
            </Link>
          </div>

          {/* Batch Progress Meter (Realistic based on actual exams & materials) */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-5 min-w-0">
            <h3 className="text-sm font-black font-display text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Activity className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <span>Batch Progress</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-5 pt-1">
              {/* Circular Donut Gauge SVG */}
              <div className="relative w-22 h-22 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-500 transition-all duration-1000 ease-out"
                    strokeDasharray={`${progressPercent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-base font-black font-display text-slate-900 leading-none">{progressPercent}%</span>
                  <span className="text-[8px] uppercase tracking-wider text-muted font-bold mt-0.5">Overall</span>
                </div>
              </div>

              {/* 3 Progress Bars */}
              <div className="w-full sm:flex-1 space-y-3 min-w-0">
                <div>
                  <div className="flex justify-between text-[11px] font-extrabold text-slate-700 mb-1">
                    <span className="truncate pr-2">Study Materials</span>
                    <span className="shrink-0">{materialsCount} items</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(materialsCount * 20, 100)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-extrabold text-slate-700 mb-1">
                    <span className="truncate pr-2">Exams Graded</span>
                    <span className="shrink-0">{publishedBatchResults.length} / {totalExamsCount || 1}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalExamsCount > 0 ? Math.round((publishedBatchResults.length / totalExamsCount) * 100) : 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-extrabold text-slate-700 mb-1">
                    <span className="truncate pr-2">Average Score</span>
                    <span className="shrink-0">{avgPercentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${avgPercentage}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid (Exactly the 4 real modules of our system) */}
          <div className="bg-white p-5 sm:p-7 rounded-3xl border border-border/60 shadow-xs space-y-4 min-w-0">
            <h3 className="text-sm font-black font-display text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="h-4.5 w-4.5 text-amber-500 shrink-0" />
              <span>Quick Actions</span>
            </h3>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-center text-xs">
              <Link href={`/student/batches/${batchId}/materials`} className="p-3.5 sm:p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center justify-center gap-2 group shadow-2xs min-w-0">
                <FileText className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors shrink-0" />
                <span className="font-extrabold truncate w-full">Materials</span>
              </Link>
              <Link href={`/student/batches/${batchId}/exams`} className="p-3.5 sm:p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center justify-center gap-2 group shadow-2xs min-w-0">
                <GraduationCap className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors shrink-0" />
                <span className="font-extrabold truncate w-full">Schedule</span>
              </Link>
              <Link href={`/student/batches/${batchId}/results`} className="p-3.5 sm:p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center justify-center gap-2 group shadow-2xs min-w-0">
                <Award className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors shrink-0" />
                <span className="font-extrabold truncate w-full">My Results</span>
              </Link>
              <Link href={`/student/batches/${batchId}/payments`} className="p-3.5 sm:p-4 border border-slate-200/80 rounded-2xl bg-slate-50/60 hover:bg-[#0A192F] hover:text-white transition-all flex flex-col items-center justify-center gap-2 group shadow-2xs min-w-0">
                <CreditCard className="h-5 w-5 text-slate-600 group-hover:text-white transition-colors shrink-0" />
                <span className="font-extrabold truncate w-full">Payments</span>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
