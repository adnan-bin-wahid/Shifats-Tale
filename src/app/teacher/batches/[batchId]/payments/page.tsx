import React from "react";
import { requireTeacher } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatCurrency } from "@/lib/currency";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, Sparkles } from "lucide-react";
import { GenerateDuesForm } from "./generate-dues-form";

interface PageProps {
  params: Promise<{
    batchId: string;
  }>;
  searchParams: Promise<{
    month?: string;
    year?: string;
  }>;
}

export default async function TeacherBatchPaymentsPage({ params, searchParams }: PageProps) {
  await requireTeacher();
  const { batchId } = await params;
  const sp = await searchParams;
  const admin = createAdminClient();

  // Date filters
  const currentSystemDate = new Date();
  const defaultMonth = (currentSystemDate.getMonth() + 1).toString();
  const defaultYear = currentSystemDate.getFullYear().toString();
  const month = sp.month || defaultMonth;
  const year = sp.year || defaultYear;

  // Fetch Batch Details
  const { data: batch, error: batchError } = await admin
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    notFound();
  }

  // Fetch payments for this batch matching the selected month/year
  const { data: payments } = await admin
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
    .eq("billing_month", parseInt(month))
    .eq("billing_year", parseInt(year))
    .order("created_at", { ascending: false });

  // Calculate aggregates for this batch, month and year
  let expectedTotal = 0;
  let collectedTotal = 0;
  let dueTotal = 0;
  let paidCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;

  payments?.forEach((p) => {
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

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-8 text-xs font-bold text-primary">
      {/* Header */}
      <DashboardPageHeader
        title={`Tuition Logs: ${batch.name}`}
        description={`Collections and monthly billing for batch code ${batch.code}`}
        actions={
          <Link
            href={`/teacher/batches/${batchId}`}
            className="px-4 py-2 border border-border/80 bg-white hover:bg-slate-50 text-xs font-bold text-muted rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Batch Details</span>
          </Link>
        }
      />

      {/* Aggregates row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="Total Expected"
          description={`${monthNames[parseInt(month) - 1]} ${year}`}
          icon={<CreditCard className="h-5 w-5 text-indigo-600" />}
        >
          <div className="pt-2">
            <span className="text-xl font-extrabold text-slate-800 block">
              {formatCurrency(expectedTotal)}
            </span>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Total Collected"
          description={`${monthNames[parseInt(month) - 1]} ${year}`}
          icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
        >
          <div className="pt-2">
            <span className="text-xl font-extrabold text-emerald-700 block">
              {formatCurrency(collectedTotal)}
            </span>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Outstanding Due"
          description={`${monthNames[parseInt(month) - 1]} ${year}`}
          icon={<CreditCard className="h-5 w-5 text-rose-600" />}
        >
          <div className="pt-2">
            <span className={`text-xl font-extrabold block ${dueTotal > 0 ? "text-rose-700" : "text-muted"}`}>
              {formatCurrency(dueTotal)}
            </span>
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payments List Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border/20 pb-3">
              <h3 className="text-sm font-extrabold font-display">
                Payments list ({monthNames[parseInt(month) - 1]} {year})
              </h3>
              <span className="text-[10px] text-muted uppercase font-bold">
                {payments?.length || 0} Students
              </span>
            </div>

            {payments && payments.length > 0 ? (
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
                    {payments.map((p) => {
                      const due = p.status === "WAIVED" ? 0 : Math.max(Number(p.expected_amount) - Number(p.paid_amount), 0);
                      const sName = (p.student as any)?.profile?.full_name || "Unknown";
                      const sCode = (p.student as any)?.student_code || "";

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/20">
                          <td className="py-3">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-sm">{sName}</span>
                              <span className="text-[9px] text-muted uppercase mt-0.5">{sCode}</span>
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
                            <Link
                              href={`/teacher/payments/${p.id}`}
                              className="px-2.5 py-1 text-[10px] font-bold border border-border/80 bg-white hover:bg-slate-50 text-primary rounded-lg transition-all inline-block"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-muted">
                <CreditCard className="h-8 w-8 text-muted mx-auto mb-2" />
                <p>No billing records found for this month and year.</p>
              </div>
            )}
          </div>
        </div>

        {/* Generate Dues Form Column */}
        <div className="space-y-6">
          {/* Month/Year selector for views */}
          <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold font-display border-b border-border/30 pb-2">
              Viewing Cycle
            </h3>
            <form method="GET" className="space-y-3">
              <div>
                <label className="block text-[10px] text-muted uppercase font-bold mb-1">Month</label>
                <select
                  name="month"
                  defaultValue={month}
                  className="w-full px-3 py-2 border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none"
                >
                  {monthNames.map((name, i) => (
                    <option key={i + 1} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-muted uppercase font-bold mb-1">Year</label>
                <select
                  name="year"
                  defaultValue={year}
                  className="w-full px-3 py-2 border border-border/60 rounded-xl bg-bg/25 focus:border-primary focus:outline-none"
                >
                  {Array.from({ length: 5 }, (_, i) => currentSystemDate.getFullYear() - 1 + i).map(yr => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-primary hover:bg-primary/95 text-white rounded-xl font-bold text-center"
              >
                Change Cycle
              </button>
            </form>
          </div>

          {/* Dues generator client component */}
          <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold font-display border-b border-border/30 pb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Generate Dues</span>
            </h3>
            <p className="text-[10px] text-muted font-medium leading-relaxed">
              Accept batch, month, and year. Find valid students for the batch, create missing UNPAID records, and skip existing ones. Does not automatically generate unlimited future payments.
            </p>
            <GenerateDuesForm batchId={batchId} defaultMonth={parseInt(month)} defaultYear={parseInt(year)} />
          </div>
        </div>
      </div>
    </div>
  );
}
