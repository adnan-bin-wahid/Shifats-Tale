import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { QuickActions } from "./quick-actions";
import { 
  Users, 
  Calendar, 
  Clock, 
  CreditCard, 
  BookOpen, 
  FileText, 
  GraduationCap, 
  ArrowLeft,
  Settings,
  HelpCircle,
  Sparkles,
  Plus
} from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { GenerateDuesForm } from "./payments/generate-dues-form";

interface PageProps {
  params: Promise<{
    batchId: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function TeacherBatchDetailsPage({ params, searchParams }: PageProps) {
  const { batchId } = await params;
  const sp = await searchParams;
  const activeTab = sp.tab || "overview";

  const supabase = await createClient();

  // Fetch Batch Details
  const { data: batch, error } = await supabase
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (error || !batch) {
    notFound();
  }

  // Fetch Enrollments Counts
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("status")
    .eq("batch_id", batchId);

  let activeCount = 0;
  let pendingCount = 0;
  let disabledCount = 0;
  let completedCount = 0;

  enrollments?.forEach((e) => {
    if (e.status === "ACTIVE") activeCount++;
    else if (e.status === "PENDING") pendingCount++;
    else if (e.status === "DISABLED") disabledCount++;
    else if (e.status === "COMPLETED") completedCount++;
  });

  // Fetch Recent Enrollments (limit 5)
  const { data: recentEnrollments } = await supabase
    .from("enrollments")
    .select(`
      id,
      status,
      created_at,
      student_id,
      student:student_profiles (
        id,
        student_code,
        profile:profiles (
          id,
          full_name,
          email
        )
      )
    `)
    .eq("batch_id", batchId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch payments for this batch in the current month/year
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();

  const { data: batchPayments } = await supabase
    .from("payments")
    .select(`
      *,
      student:student_profiles (
        student_code,
        profile:profiles (
          full_name
        )
      )
    `)
    .eq("batch_id", batchId)
    .eq("billing_month", currentMonthNum)
    .eq("billing_year", currentYearNum);

  let curMonthExpected = 0;
  let curMonthPaid = 0;
  let curMonthDue = 0;
  let curMonthPaidCount = 0;
  let curMonthPartialCount = 0;
  let curMonthUnpaidCount = 0;

  batchPayments?.forEach((p) => {
    const exp = Number(p.expected_amount) || 0;
    const paid = Number(p.paid_amount) || 0;
    curMonthExpected += exp;
    curMonthPaid += paid;
    if (p.status === "WAIVED") {
      curMonthDue += 0;
    } else {
      curMonthDue += Math.max(exp - paid, 0);
    }

    if (p.status === "PAID") curMonthPaidCount++;
    else if (p.status === "PARTIALLY_PAID") curMonthPartialCount++;
    else if (p.status === "UNPAID") curMonthUnpaidCount++;
  });

  // Fetch materials for this batch
  const { data: batchMaterials } = await supabase
    .from("batch_contents")
    .select("*")
    .eq("batch_id", batchId);

  let totalMatCount = 0;
  let pubMatCount = 0;
  let draftMatCount = 0;
  let archMatCount = 0;

  batchMaterials?.forEach((m) => {
    totalMatCount++;
    if (m.status === "PUBLISHED") pubMatCount++;
    else if (m.status === "DRAFT") draftMatCount++;
    else if (m.status === "ARCHIVED") archMatCount++;
  });

  const recentBatchMaterials = batchMaterials?.slice(0, 5) || [];

  // Fetch announcements for this batch
  const { data: batchAnnouncements } = await supabase
    .from("announcements")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: false });

  const recentBatchAnnouncements = batchAnnouncements?.slice(0, 5) || [];

  // Fetch examinations count
  const { count: examsCount } = await supabase
    .from("exams")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId);

  const { count: subjectsCount } = await supabase
    .from("batch_subjects")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId);

  const schedule = (
    batch.schedule && typeof batch.schedule === "object"
      ? batch.schedule
      : batch.schedule
      ? JSON.parse(batch.schedule as string)
      : {}
  ) as any;

  return (
    <div className="space-y-8">
      {/* Header */}
      <DashboardPageHeader
        title={`Batch: ${batch.name}`}
        description={`Manage enrollments, resources, exams, and settings for batch code ${batch.code}.`}
        actions={
          <Link
            href="/teacher/batches"
            className="px-4 py-2 border border-border/80 bg-white hover:bg-slate-50 text-xs font-bold text-muted rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Batches</span>
          </Link>
        }
      />

      {/* Tabs Menu */}
      <div className="flex border-b border-border/40 gap-4 overflow-x-auto text-xs font-bold text-muted">
        <Link
          href={`/teacher/batches/${batchId}?tab=overview`}
          className={`pb-3 px-1 transition-all border-b-2 hover:text-primary ${
            activeTab === "overview" ? "border-primary text-primary" : "border-transparent"
          }`}
        >
          Overview
        </Link>
        <Link
          href={`/teacher/batches/${batchId}/students`}
          className="pb-3 px-1 transition-all border-b-2 border-transparent hover:text-primary"
        >
          Students ({activeCount + pendingCount + disabledCount + completedCount})
        </Link>
        <Link
          href={`/teacher/academic/${batchId}`}
          className="pb-3 px-1 transition-all border-b-2 border-transparent hover:text-primary"
        >
          Academics ({subjectsCount ?? 0})
        </Link>
        <Link
          href={`/teacher/batches/${batchId}?tab=payments`}
          className={`pb-3 px-1 transition-all border-b-2 hover:text-primary ${
            activeTab === "payments" ? "border-primary text-primary" : "border-transparent"
          }`}
        >
          Payments (Placeholder)
        </Link>
        <Link
          href={`/teacher/batches/${batchId}?tab=materials`}
          className={`pb-3 px-1 transition-all border-b-2 hover:text-primary ${
            activeTab === "materials" ? "border-primary text-primary" : "border-transparent"
          }`}
        >
          Materials ({totalMatCount})
        </Link>
        <Link
          href={`/teacher/batches/${batchId}/exams`}
          className={`pb-3 px-1 transition-all border-b-2 hover:text-primary border-transparent`}
        >
          Exams ({examsCount ?? 0})
        </Link>
      </div>

      {/* Dynamic Content by Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Dashboard Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                <span className="text-2xl font-extrabold text-emerald-700 font-display block leading-none">
                  {activeCount}
                </span>
                <span className="text-[9px] uppercase font-bold text-emerald-600/80 tracking-wide mt-2 block">
                  Active
                </span>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                <span className="text-2xl font-extrabold text-amber-700 font-display block leading-none">
                  {pendingCount}
                </span>
                <span className="text-[9px] uppercase font-bold text-amber-600/80 tracking-wide mt-2 block">
                  Pending
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center">
                <span className="text-2xl font-extrabold text-slate-600 font-display block leading-none">
                  {disabledCount}
                </span>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wide mt-2 block">
                  Disabled
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                <span className="text-2xl font-extrabold text-blue-700 font-display block leading-none">
                  {completedCount}
                </span>
                <span className="text-[9px] uppercase font-bold text-blue-600/80 tracking-wide mt-2 block">
                  Completed
                </span>
              </div>
            </div>

            {/* Batch Info Card */}
            <DashboardCard
              title="Batch Information"
              description="Detailed attributes of this curriculum"
              icon={<BookOpen className="h-5 w-5 text-primary" />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold pt-2 text-primary">
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">Subject</span>
                  <span className="font-extrabold mt-0.5 block">{batch.subject}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">Academic Level</span>
                  <span className="font-extrabold mt-0.5 block">{batch.academic_level}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">Start Date</span>
                  <span className="font-extrabold mt-0.5 block">{batch.start_date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">End Date</span>
                  <span className="font-extrabold mt-0.5 block">{batch.end_date || "Continuous"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">Schedule</span>
                  <span className="font-extrabold mt-0.5 block">
                    {schedule.days || "Not Set"} &bull; {schedule.time || "Not Set"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">Fees</span>
                  <span className="font-extrabold mt-0.5 block">
                    Monthly: {batch.monthly_fee} BDT {batch.admission_fee > 0 ? `| Admission: ${batch.admission_fee} BDT` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">Capacity Limit</span>
                  <span className="font-extrabold mt-0.5 block">{batch.capacity || "Unlimited"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted uppercase font-bold block">Batch Code</span>
                  <span className="font-extrabold mt-0.5 block font-display uppercase">{batch.code}</span>
                </div>
              </div>

              {batch.description && (
                <div className="border-t border-border/20 pt-4.5 mt-4.5 text-xs text-muted leading-relaxed font-medium">
                  <span className="text-[10px] text-muted uppercase font-bold block mb-1">Description</span>
                  {batch.description}
                </div>
              )}
            </DashboardCard>

            {/* Recent Enrollments */}
            <DashboardCard
              title="Recent Enrollments"
              description="Latest student signups for this batch"
              icon={<Users className="h-5 w-5 text-primary" />}
            >
              {recentEnrollments && recentEnrollments.length > 0 ? (
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead>
                      <tr className="border-b border-border/20 text-muted uppercase tracking-wider text-[9px] font-extrabold">
                        <th className="pb-3">Student Name</th>
                        <th className="pb-3">ID Code</th>
                        <th className="pb-3 text-center">Status</th>
                        <th className="pb-3 text-right">Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentEnrollments.map((enr: any) => (
                        <tr key={enr.id} className="border-b border-border/10 last:border-0">
                          <td className="py-3 font-extrabold text-primary">
                            {enr.student?.profile?.full_name}
                          </td>
                          <td className="py-3 font-display text-primary font-bold">
                            {enr.student?.student_code}
                          </td>
                          <td className="py-3 text-center">
                            <span className="inline-flex justify-center">
                              <StatusBadge status={enr.status} />
                            </span>
                          </td>
                          <td className="py-3 text-right text-muted text-[11px] font-bold">
                            {new Date(enr.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-muted font-bold">
                  No students have been enrolled in this batch yet.
                </div>
              )}
            </DashboardCard>
          </div>

          {/* Sidebar Quick Actions and Status Cards */}
          <div className="space-y-6">
            {/* Status Panel */}
            <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4 text-xs font-bold text-primary">
              <h3 className="text-sm font-extrabold font-display border-b border-border/30 pb-2">
                Batch Status Details
              </h3>
              <div className="flex justify-between items-center">
                <span className="text-muted">Lifecycle Status:</span>
                <StatusBadge status={batch.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Admission status:</span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase border ${
                    batch.admission_open
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  {batch.admission_open ? "Open" : "Closed"}
                </span>
              </div>
            </div>

            {/* Quick Actions Component */}
            <QuickActions
              batchId={batchId}
              status={batch.status}
              admissionOpen={batch.admission_open}
            />
          </div>
        </div>
      )}

      {/* Payments tab */}
      {activeTab === "payments" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-bold text-primary">
          <div className="lg:col-span-2 space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-border/20 rounded-2xl p-4 text-center">
                <span className="text-[10px] text-muted uppercase block">Total Expected</span>
                <span className="text-lg font-black text-slate-800 mt-1 block">{formatCurrency(curMonthExpected)}</span>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-center">
                <span className="text-[10px] text-muted uppercase block">Total Collected</span>
                <span className="text-lg font-black text-emerald-700 mt-1 block">{formatCurrency(curMonthPaid)}</span>
              </div>
              <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 text-center">
                <span className="text-[10px] text-muted uppercase block">Outstanding Due</span>
                <span className={`text-lg font-black mt-1 block ${curMonthDue > 0 ? "text-rose-700" : "text-muted"}`}>{formatCurrency(curMonthDue)}</span>
              </div>
            </div>

            {/* Payments List */}
            <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-border/20 pb-3">
                <h3 className="text-sm font-extrabold font-display">Current Month Tuition Slips ({currentMonthNum}/{currentYearNum})</h3>
                <Link
                  href={`/teacher/batches/${batchId}/payments`}
                  className="text-[10px] text-primary hover:underline"
                >
                  View Full History &rarr;
                </Link>
              </div>

              {batchPayments && batchPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold text-primary">
                    <thead>
                      <tr className="border-b border-border/20 text-muted uppercase tracking-wider text-[9px] font-extrabold font-sans">
                        <th className="pb-3">Student</th>
                        <th className="pb-3 text-right">Expected</th>
                        <th className="pb-3 text-right">Paid</th>
                        <th className="pb-3 text-right">Due</th>
                        <th className="pb-3 text-center">Status</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {batchPayments.map((p) => {
                        const due = p.status === "WAIVED" ? 0 : Math.max(Number(p.expected_amount) - Number(p.paid_amount), 0);
                        const sName = (p.student as any)?.profile?.full_name || "Unknown";
                        const sCode = (p.student as any)?.student_code || "";
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/20">
                            <td className="py-2.5">
                              <span className="font-extrabold text-sm block">{sName}</span>
                              <span className="text-[9px] text-muted block uppercase mt-0.5">{sCode}</span>
                            </td>
                            <td className="py-2.5 text-right font-bold text-slate-800">{formatCurrency(p.expected_amount)}</td>
                            <td className="py-2.5 text-right font-bold text-emerald-700">{formatCurrency(p.paid_amount)}</td>
                            <td className={`py-2.5 text-right font-bold ${due > 0 ? "text-rose-700" : "text-muted"}`}>{formatCurrency(due)}</td>
                            <td className="py-2.5 text-center">
                              <span className="inline-flex"><StatusBadge status={p.status} /></span>
                            </td>
                            <td className="py-2.5 text-right">
                              <Link href={`/teacher/payments/${p.id}`} className="px-2 py-1 text-[9px] border rounded hover:bg-slate-50">Manage</Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-6 text-xs text-muted font-bold">No payments generated for this month yet. Use the Generate Dues panel on the right.</p>
              )}
            </div>
          </div>

          {/* Dues action & summary sidebars */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold font-display border-b border-border/20 pb-2">Collections Progress</h3>
              <div className="space-y-3 font-bold text-primary">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted">Paid Count:</span>
                  <span className="text-emerald-700">{curMonthPaidCount} students</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted">Partial Count:</span>
                  <span className="text-amber-700">{curMonthPartialCount} students</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted">Unpaid Count:</span>
                  <span className="text-rose-700">{curMonthUnpaidCount} students</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold font-display border-b border-border/30 pb-2 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Generate Monthly Dues</span>
              </h3>
              <p className="text-[10px] text-muted font-medium leading-relaxed">
                Add billing rows for all active students enrolled in this batch for the current billing cycle. Duplicate checks are automatically enforced.
              </p>
              <GenerateDuesForm batchId={batchId} defaultMonth={currentMonthNum} defaultYear={currentYearNum} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "materials" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-bold text-primary">
          <div className="lg:col-span-2 space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-border/20 rounded-2xl p-4 text-center">
                <span className="text-xl font-extrabold text-slate-700 font-display block leading-none">{totalMatCount}</span>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wide mt-2 block">Total Materials</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                <span className="text-xl font-extrabold text-emerald-700 font-display block leading-none">{pubMatCount}</span>
                <span className="text-[9px] uppercase font-bold text-emerald-600/80 tracking-wide mt-2 block">Published</span>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                <span className="text-xl font-extrabold text-amber-700 font-display block leading-none">{draftMatCount}</span>
                <span className="text-[9px] uppercase font-bold text-amber-600/80 tracking-wide mt-2 block">Draft</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                <span className="text-xl font-extrabold text-slate-600 font-display block leading-none">{archMatCount}</span>
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wide mt-2 block">Archived</span>
              </div>
            </div>

            {/* Materials List */}
            <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-border/20 pb-3">
                <h3 className="text-sm font-extrabold font-display">Recent Batch Materials</h3>
                <Link
                  href={`/teacher/batches/${batchId}/materials`}
                  className="text-[10px] text-primary hover:underline"
                >
                  Manage All Materials &rarr;
                </Link>
              </div>

              {recentBatchMaterials.length > 0 ? (
                <div className="space-y-2">
                  {recentBatchMaterials.map((m) => (
                    <div key={m.id} className="flex justify-between items-center bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="font-extrabold text-slate-800 text-sm block">{m.title}</span>
                        <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Type: {m.content_type}</span>
                      </div>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${
                        m.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-xs text-muted font-bold">No study materials uploaded for this batch yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Quick Create Button Card */}
            <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold font-display border-b border-border/20 pb-2">Add New Material</h3>
              <p className="text-[10px] text-muted font-semibold leading-relaxed">
                Quickly add handouts, notes, and links for this class.
              </p>
              <Link
                href={`/teacher/materials/new?batchId=${batchId}`}
                className="w-full inline-flex justify-center items-center gap-1.5 px-4 py-2.5 bg-primary text-white hover:bg-primary-dark rounded-xl transition-all shadow-sm font-bold text-xs"
              >
                <Plus className="h-4 w-4" />
                Upload New Material
              </Link>
            </div>

            {/* Recent Announcements section */}
            <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-border/20 pb-2">
                <h3 className="text-sm font-extrabold font-display">Batch Announcements</h3>
                <Link
                  href={`/teacher/batches/${batchId}/announcements`}
                  className="text-[9px] text-primary hover:underline"
                >
                  Manage &rarr;
                </Link>
              </div>

              {recentBatchAnnouncements.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {recentBatchAnnouncements.map((a) => (
                    <div key={a.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <span className="font-extrabold text-slate-800 block">{a.title}</span>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-semibold">{a.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-[10px] text-muted italic">No announcements posted.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
