import React from "react";
import { requireTeacher } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatCurrency } from "@/lib/currency";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, Plus } from "lucide-react";

interface PageProps {
  params: Promise<{
    studentId: string;
  }>;
}

export default async function TeacherStudentPaymentsPage({ params }: PageProps) {
  await requireTeacher();
  const { studentId } = await params;
  const admin = createAdminClient();

  // Fetch Student Profile
  const { data: student, error: studentError } = await admin
    .from("student_profiles")
    .select(`
      id,
      student_code,
      profile:profiles (
        id,
        full_name,
        email,
        phone
      )
    `)
    .eq("id", studentId)
    .single();

  if (studentError || !student) {
    notFound();
  }

  // Fetch all payment records for this student
  const { data: payments, error: paymentsError } = await admin
    .from("payments")
    .select(`
      *,
      batch:batches (
        name,
        code
      )
    `)
    .eq("student_id", studentId)
    .order("billing_year", { ascending: false })
    .order("billing_month", { ascending: false });

  // Calculate aggregates
  let expectedTotal = 0;
  let collectedTotal = 0;
  let dueTotal = 0;

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
  });

  const studentName = (student.profile as any)?.full_name || "Student";
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-8 text-xs font-bold text-primary">
      {/* Header */}
      <DashboardPageHeader
        title={`Payment Ledger: ${studentName}`}
        description={`Complete historical billing history for student code ${student.student_code}`}
        actions={
          <div className="flex gap-3">
            <Link
              href={`/teacher/students/${studentId}`}
              className="px-4 py-2 border border-border/80 bg-white hover:bg-slate-50 text-xs font-bold text-muted rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Student Profile</span>
            </Link>
            <Link
              href="/teacher/payments/new"
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Record Payment</span>
            </Link>
          </div>
        }
      />

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="Total Expected Fees"
          description="Lifetime expected amount"
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
          description="Lifetime paid amount"
          icon={<CreditCard className="h-5 w-5 text-emerald-600" />}
        >
          <div className="pt-2">
            <span className="text-xl font-extrabold text-emerald-700 block">
              {formatCurrency(collectedTotal)}
            </span>
          </div>
        </DashboardCard>

        <DashboardCard
          title="Outstanding Dues"
          description="Total unpaid balance"
          icon={<CreditCard className="h-5 w-5 text-rose-600" />}
        >
          <div className="pt-2">
            <span className={`text-xl font-extrabold block ${dueTotal > 0 ? "text-rose-700" : "text-muted"}`}>
              {formatCurrency(dueTotal)}
            </span>
          </div>
        </DashboardCard>
      </div>

      {/* Payments List Table */}
      <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold font-display border-b border-border/20 pb-3">
          Historical Tuition Slips
        </h3>

        {payments && payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold text-primary">
              <thead>
                <tr className="border-b border-border/20 text-muted uppercase tracking-wider text-[9px] font-extrabold">
                  <th className="pb-3">Billing Cycle</th>
                  <th className="pb-3">Batch Name</th>
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
                  const batchName = (p.batch as any)?.name || "Batch";
                  const batchCode = (p.batch as any)?.code || "";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/20">
                      <td className="py-3 font-extrabold">
                        {monthNames[p.billing_month - 1]} {p.billing_year}
                      </td>
                      <td className="py-3 text-slate-700">
                        {batchName} ({batchCode})
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
                          Manage Slip
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted">
            <CreditCard className="h-8 w-8 text-muted mx-auto mb-2" />
            <p>No historical billing records exist for this student.</p>
          </div>
        )}
      </div>
    </div>
  );
}
