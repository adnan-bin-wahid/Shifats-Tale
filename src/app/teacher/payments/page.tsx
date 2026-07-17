import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DebouncedSearchInput } from "@/components/ui/debounced-search-input";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { PaymentListActions } from "@/components/dashboard/payment-list-actions";
import { formatCurrency } from "@/lib/currency";
import { 
  CreditCard, 
  Search, 
  Filter, 
  Plus, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    month?: string;
    year?: string;
    batch?: string;
    status?: string;
    method?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function TeacherPaymentsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const supabase = await createClient();

  // Get current date values to use as default filters
  const currentSystemDate = new Date();
  const defaultMonth = (currentSystemDate.getMonth() + 1).toString();
  const defaultYear = currentSystemDate.getFullYear().toString();

  const month = sp.month || defaultMonth;
  const year = sp.year || defaultYear;
  const batchId = sp.batch || "";
  const status = sp.status || "";
  const paymentMethod = sp.method || "";
  const search = sp.search || "";
  const currentPage = Math.max(1, parseInt(sp.page || "1"));
  const pageSize = 10;

  // Fetch all batches for filter dropdown
  const { data: batches } = await supabase
    .from("batches")
    .select("id, name, code")
    .order("name", { ascending: true });

  // 1. Fetch Aggregates for the selected Month/Year & Batch
  let aggQuery = supabase
    .from("payments")
    .select("expected_amount, paid_amount, status")
    .eq("billing_month", parseInt(month))
    .eq("billing_year", parseInt(year));

  if (batchId) {
    aggQuery = aggQuery.eq("batch_id", batchId);
  }

  const { data: aggData } = await aggQuery;

  let expectedTotal = 0;
  let collectedTotal = 0;
  let dueTotal = 0;
  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;

  aggData?.forEach((p) => {
    const exp = Number(p.expected_amount) || 0;
    const paid = Number(p.paid_amount) || 0;

    expectedTotal += exp;
    collectedTotal += paid;

    if (p.status === "WAIVED") {
      dueTotal += 0;
    } else {
      dueTotal += Math.max(exp - paid, 0);
    }

    if (p.status === "PAID") paidCount++;
    else if (p.status === "PARTIALLY_PAID") partialCount++;
    else if (p.status === "UNPAID") unpaidCount++;
  });

  // 2. Resolve Student ID Search mapping
  let searchStudentIds: string[] = [];
  if (search) {
    const { data: students } = await supabase
      .from("student_profiles")
      .select("id, student_code, profile:profiles(full_name)")
      .or(`student_code.ilike.%${search}%,profile.full_name.ilike.%${search}%`);
    searchStudentIds = students?.map((s) => s.id) || [];
  }

  // 3. Paginated Payments Query
  let query = supabase
    .from("payments")
    .select(`
      *,
      student:student_profiles (
        id,
        student_code,
        profile:profiles (
          id,
          full_name,
          email,
          phone
        )
      ),
      batch:batches (
        id,
        name,
        code
      )
    `, { count: "exact" });

  query = query.eq("billing_month", parseInt(month)).eq("billing_year", parseInt(year));

  if (batchId) query = query.eq("batch_id", batchId);
  if (status) query = query.eq("status", status);
  if (paymentMethod) query = query.eq("payment_method", paymentMethod);

  if (search) {
    if (searchStudentIds.length > 0) {
      query = query.or(`student_id.in.(${searchStudentIds.join(",")}),reference_number.ilike.%${search}%`);
    } else {
      query = query.ilike("reference_number", `%${search}%`);
    }
  }

  // Sorting: newest payments first
  query = query.order("created_at", { ascending: false });

  // Pagination bounds
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data: payments, count } = await query.range(from, to);

  const totalPages = Math.ceil((count || 0) / pageSize);

  // 4. Recent Payment Confirmations (confirmed_at is not null)
  const { data: recentConfirmations } = await supabase
    .from("payments")
    .select(`
      id,
      paid_amount,
      confirmed_at,
      billing_month,
      billing_year,
      student:student_profiles (
        profile:profiles (
          full_name
        )
      ),
      batch:batches (
        name
      )
    `)
    .not("confirmed_at", "is", null)
    .order("confirmed_at", { ascending: false })
    .limit(5);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-8 text-xs font-bold text-primary">
      {/* Header */}
      <DashboardPageHeader
        title="Tuition Payments Ledger"
        description="Verify offline collections, update billing status, and analyze tuition aggregates."
        actions={
          <div className="flex gap-3">
            <Link
              href="/teacher/payments/new"
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Record Offline Payment</span>
            </Link>
          </div>
        }
      />

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="Tuition Dues Expected"
          description={`Selected month: ${monthNames[parseInt(month) - 1]} ${year}`}
          icon={<DollarSign className="h-5 w-5 text-indigo-600" />}
        >
          <div className="pt-2">
            <span className="text-2xl font-extrabold font-display text-slate-800 tracking-tight block">
              {formatCurrency(expectedTotal)}
            </span>
            <span className="text-[10px] text-muted font-bold block mt-1">
              Total invoiced tuition fee amount
            </span>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Tuition Dues Collected"
          description={`Selected month: ${monthNames[parseInt(month) - 1]} ${year}`}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        >
          <div className="pt-2">
            <span className="text-2xl font-extrabold font-display text-emerald-700 tracking-tight block">
              {formatCurrency(collectedTotal)}
            </span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-1">
              {expectedTotal > 0 ? `${Math.round((collectedTotal / expectedTotal) * 100)}% collection rate` : "No billing rows"}
            </span>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Outstanding Tuition Balance"
          description={`Selected month: ${monthNames[parseInt(month) - 1]} ${year}`}
          icon={<AlertCircle className="h-5 w-5 text-rose-600" />}
        >
          <div className="pt-2">
            <span className="text-2xl font-extrabold font-display text-rose-700 tracking-tight block">
              {formatCurrency(dueTotal)}
            </span>
            <span className="text-[10px] text-rose-600 font-bold block mt-1">
              Unpaid and outstanding dues
            </span>
          </div>
        </DashboardCard>
      </div>

      {/* Students Status count grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-center">
          <span className="text-xl font-extrabold text-emerald-700 font-display block leading-none">
            {paidCount}
          </span>
          <span className="text-[9px] uppercase font-bold text-emerald-600/80 tracking-wide mt-2 block">
            Fully Paid Students
          </span>
        </div>
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-center">
          <span className="text-xl font-extrabold text-amber-700 font-display block leading-none">
            {partialCount}
          </span>
          <span className="text-[9px] uppercase font-bold text-amber-600/80 tracking-wide mt-2 block">
            Partially Paid Students
          </span>
        </div>
        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 text-center">
          <span className="text-xl font-extrabold text-rose-700 font-display block leading-none">
            {unpaidCount}
          </span>
          <span className="text-[9px] uppercase font-bold text-rose-600/80 tracking-wide mt-2 block">
            Unpaid Students
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Column */}
        <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-5 h-fit">
          <div className="flex items-center gap-1.5 border-b border-border/20 pb-3">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-extrabold font-display">Ledger Filters</h3>
          </div>

          <form method="GET" className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-[10px] text-muted uppercase font-bold mb-1.5">
                Search Students / Ref
              </label>
              <div>
                <DebouncedSearchInput
                  placeholder="ID, Name, Reference..."
                  defaultValue={search}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/20 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Month */}
            <div>
              <label className="block text-[10px] text-muted uppercase font-bold mb-1.5">
                Billing Month
              </label>
              <select
                name="month"
                defaultValue={month}
                className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/20 focus:border-primary focus:outline-none"
              >
                {monthNames.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-[10px] text-muted uppercase font-bold mb-1.5">
                Billing Year
              </label>
              <select
                name="year"
                defaultValue={year}
                className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/20 focus:border-primary focus:outline-none"
              >
                {Array.from({ length: 7 }, (_, i) => 2024 + i).map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch */}
            <div>
              <label className="block text-[10px] text-muted uppercase font-bold mb-1.5">
                Class Batch
              </label>
              <select
                name="batch"
                defaultValue={batchId}
                className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/20 focus:border-primary focus:outline-none"
              >
                <option value="">All Batches</option>
                {batches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[10px] text-muted uppercase font-bold mb-1.5">
                Payment Status
              </label>
              <select
                name="status"
                defaultValue={status}
                className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/20 focus:border-primary focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PAID">Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="WAIVED">Waived</option>
                <option value="REFUNDED">Refunded</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Method */}
            <div>
              <label className="block text-[10px] text-muted uppercase font-bold mb-1.5">
                Payment Method
              </label>
              <select
                name="method"
                defaultValue={paymentMethod}
                className="w-full px-3 py-2 text-xs border border-border/60 rounded-xl bg-bg/20 focus:border-primary focus:outline-none"
              >
                <option value="">All Methods</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="MOBILE_FINANCIAL_SERVICE">Mobile Financial Service (MFS)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Apply Filter
            </button>
          </form>
        </div>

        {/* Ledger Table Section */}
        <div className="lg:col-span-3 space-y-6">
          {/* Recent Confirmations Drawer/Section */}
          <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-muted font-extrabold flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span>Recent Payment Confirmations</span>
            </h3>
            {recentConfirmations && recentConfirmations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-1">
                {recentConfirmations.map((rec) => (
                  <div key={rec.id} className="p-3 bg-slate-50/50 rounded-xl border border-border/20 text-[10px] font-bold text-primary flex flex-col justify-between">
                    <div>
                      <span className="font-extrabold line-clamp-1 block">{(rec.student as any)?.profile?.full_name}</span>
                      <span className="text-muted block text-[9px] mt-0.5 font-medium">{(rec.batch as any)?.name}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border/10 flex justify-between items-center">
                      <span className="font-black text-emerald-700">{formatCurrency(rec.paid_amount)}</span>
                      <span className="text-muted text-[8px]">{rec.billing_month}/{rec.billing_year}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted font-bold py-2 text-center">No payment confirmations recorded yet.</p>
            )}
          </div>

          {/* Core Payments List Card */}
          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border/30 pb-3">
              <h3 className="text-sm font-extrabold font-display">Tuition Slip Logs</h3>
              <span className="text-[10px] text-muted uppercase font-bold">Total Slips Found: {count || 0}</span>
            </div>

            {payments && payments.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold text-primary">
                    <thead>
                      <tr className="border-b border-border/20 text-muted uppercase tracking-wider text-[9px] font-extrabold">
                        <th className="pb-3">Student</th>
                        <th className="pb-3">Class Batch</th>
                        <th className="pb-3 text-right">Expected</th>
                        <th className="pb-3 text-right">Collected</th>
                        <th className="pb-3 text-right">Outstanding</th>
                        <th className="pb-3 text-center">Status</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {payments.map((p) => {
                        const studentCode = (p.student as any)?.student_code || "";
                        const studentName = (p.student as any)?.profile?.full_name || "Unknown";
                        const batchName = (p.batch as any)?.name || "Unknown";
                        const due = p.status === "WAIVED" ? 0 : Math.max(Number(p.expected_amount) - Number(p.paid_amount), 0);

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/30">
                            <td className="py-3">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-sm">{studentName}</span>
                                <span className="text-[9px] text-muted uppercase mt-0.5">{studentCode}</span>
                              </div>
                            </td>
                            <td className="py-3 text-slate-700">
                              <div className="flex flex-col">
                                <span className="font-extrabold">{batchName}</span>
                                <span className="text-[9px] text-muted uppercase mt-0.5">
                                  Billing: {monthNames[p.billing_month - 1]} {p.billing_year}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 text-right text-slate-800 font-bold">
                              {formatCurrency(p.expected_amount)}
                            </td>
                            <td className="py-3 text-right text-emerald-700 font-bold">
                              {formatCurrency(p.paid_amount)}
                            </td>
                            <td className={`py-3 text-right font-bold ${due > 0 ? "text-rose-600" : "text-muted"}`}>
                              {formatCurrency(due)}
                            </td>
                            <td className="py-3 text-center">
                              <span className="inline-flex">
                                <StatusBadge status={p.status} />
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <PaymentListActions
                                paymentId={p.id}
                                studentName={studentName}
                                billingInfo={`${monthNames[p.billing_month - 1]} ${p.billing_year}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center pt-4 border-t border-border/20">
                    <span className="text-[10px] text-muted">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Link
                        href={`/teacher/payments?month=${month}&year=${year}&batch=${batchId}&status=${status}&method=${paymentMethod}&search=${search}&page=${currentPage - 1}`}
                        className={`p-2 border border-border/80 rounded-xl bg-white hover:bg-slate-50 ${currentPage <= 1 ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/teacher/payments?month=${month}&year=${year}&batch=${batchId}&status=${status}&method=${paymentMethod}&search=${search}&page=${currentPage + 1}`}
                        className={`p-2 border border-border/80 rounded-xl bg-white hover:bg-slate-50 ${currentPage >= totalPages ? "opacity-50 pointer-events-none" : ""}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted">
                <CreditCard className="h-10 w-10 text-muted stroke-1 mx-auto mb-3" />
                <h4 className="text-sm font-extrabold text-primary">No Payment Slips Found</h4>
                <p className="text-xs text-muted max-w-sm font-medium mt-1 mx-auto leading-relaxed">
                  No payment records match the current filters. Ensure dues are generated for this month, or adjust filters to explore logs.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
