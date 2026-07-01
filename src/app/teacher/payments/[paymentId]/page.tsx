import React from "react";
import { requireTeacher } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { formatCurrency } from "@/lib/currency";
import { StatusBadge } from "@/components/dashboard/status-badge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, History, AlertTriangle } from "lucide-react";
import { EditPaymentForm } from "./edit-payment-form";

interface PageProps {
  params: Promise<{
    paymentId: string;
  }>;
}

export default async function PaymentDetailsPage({ params }: PageProps) {
  await requireTeacher();
  const { paymentId } = await params;
  
  // Create Supabase clients
  // We use admin client to fetch the full payment including teacher_note, which is column-level restricted from public read
  const admin = createAdminClient();
  const supabase = await createClient();

  const { data: payment, error } = await admin
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
        code,
        monthly_fee
      )
    `)
    .eq("id", paymentId)
    .single();

  if (error || !payment) {
    notFound();
  }

  // Fetch audit logs for this specific payment record
  const { data: auditLogs } = await admin
    .from("audit_logs")
    .select("*")
    .eq("entity_type", "payments")
    .eq("entity_id", paymentId)
    .order("created_at", { ascending: false });

  // Map actor names
  const actorIds = Array.from(new Set(auditLogs?.map((log) => log.actor_user_id).filter(Boolean) || [])) as string[];
  const actorMap: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: actors } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", actorIds);
    actors?.forEach((a) => {
      actorMap[a.id] = a.full_name;
    });
  }

  const studentName = (payment.student as any)?.profile?.full_name || "Student";
  const studentCode = (payment.student as any)?.student_code || "";
  const batchName = (payment.batch as any)?.name || "Batch";

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const due = payment.status === "WAIVED" ? 0 : Math.max(Number(payment.expected_amount) - Number(payment.paid_amount), 0);

  return (
    <div className="space-y-8 text-xs font-bold text-primary">
      {/* Header */}
      <DashboardPageHeader
        title={`Tuition Record: ${studentName}`}
        description={`Billing slip for ${batchName} (${monthNames[payment.billing_month - 1]} ${payment.billing_year})`}
        actions={
          <Link
            href="/teacher/payments"
            className="px-4 py-2 border border-border/80 bg-white hover:bg-slate-50 text-xs font-bold text-muted rounded-xl transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Ledger</span>
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Overview details and edit form */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Static details panel */}
          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-6">
            <h3 className="text-sm font-extrabold font-display border-b border-border/20 pb-3 flex justify-between items-center">
              <span>Billing Slip Information</span>
              <StatusBadge status={payment.status} />
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <span className="text-[10px] text-muted uppercase block">Student Details</span>
                <span className="text-sm font-black text-primary block mt-1">{studentName}</span>
                <span className="text-[10px] text-muted uppercase font-bold block mt-0.5">{studentCode}</span>
              </div>

              <div>
                <span className="text-[10px] text-muted uppercase block">Class Batch</span>
                <span className="text-sm font-black text-primary block mt-1">{batchName}</span>
                <span className="text-[10px] text-muted uppercase font-bold block mt-0.5">{(payment.batch as any)?.code}</span>
              </div>

              <div>
                <span className="text-[10px] text-muted uppercase block font-bold">Billing Cycle</span>
                <span className="text-sm font-black text-primary block mt-0.5">{monthNames[payment.billing_month - 1]} {payment.billing_year}</span>
              </div>

              <div>
                <span className="text-[10px] text-muted uppercase block font-bold">Payment Method</span>
                <span className="text-sm font-black text-primary block mt-0.5">{payment.payment_method || "N/A"}</span>
              </div>

              <div>
                <span className="text-[10px] text-muted uppercase block font-bold">Reference / Receipt Number</span>
                <span className="text-sm font-black text-primary block mt-0.5">{payment.reference_number || "N/A"}</span>
              </div>

              <div>
                <span className="text-[10px] text-muted uppercase block font-bold">Payment Date</span>
                <span className="text-sm font-black text-primary block mt-0.5">{payment.payment_date || "N/A"}</span>
              </div>

              <div>
                <span className="text-[10px] text-muted uppercase block font-bold">Confirmation Stamp</span>
                <span className="text-xs font-bold text-slate-600 block mt-0.5">
                  {payment.confirmed_at ? new Date(payment.confirmed_at).toLocaleString() : "Unconfirmed / Pending"}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-muted uppercase block font-bold">Timestamps</span>
                <span className="text-[10px] text-muted block mt-0.5">Created: {new Date(payment.created_at).toLocaleString()}</span>
                <span className="text-[10px] text-muted block mt-0.5">Updated: {new Date(payment.updated_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Balances summary */}
            <div className="p-4 bg-slate-50 border border-border/20 rounded-xl grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-[9px] uppercase tracking-wide text-muted block">Expected</span>
                <span className="text-base font-black text-slate-800 mt-1 block">{formatCurrency(payment.expected_amount)}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wide text-muted block">Collected</span>
                <span className="text-base font-black text-emerald-700 mt-1 block">{formatCurrency(payment.paid_amount)}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wide text-muted block">Outstanding</span>
                <span className={`text-base font-black mt-1 block ${due > 0 ? "text-rose-700" : "text-muted"}`}>{formatCurrency(due)}</span>
              </div>
            </div>

            {/* Notes display */}
            <div className="space-y-3.5 pt-4 border-t border-border/10">
              <div>
                <span className="text-[10px] text-muted uppercase block font-bold">Teacher Private Note</span>
                <p className="text-xs text-primary bg-slate-50/50 p-3 rounded-xl border border-border/25 mt-1 font-semibold leading-relaxed whitespace-pre-line min-h-[40px]">
                  {payment.teacher_note || "No private internal note registered."}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-muted uppercase block font-bold">Student Visible Note</span>
                <p className="text-xs text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-border/25 mt-1 font-semibold leading-relaxed whitespace-pre-line min-h-[40px]">
                  {payment.student_note || "No student-facing note registered."}
                </p>
              </div>
            </div>
          </div>

          {/* Edit form panel */}
          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold font-display border-b border-border/20 pb-3 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <span>Correct Billing Details</span>
            </h3>
            <EditPaymentForm payment={payment} />
          </div>
        </div>

        {/* Right column: Audit History Logs */}
        <div className="space-y-6">
          <DashboardCard
            title="Audit Trail Logs"
            description="Historical revisions made to this slip"
            icon={<History className="h-5 w-5 text-primary" />}
          >
            {auditLogs && auditLogs.length > 0 ? (
              <div className="space-y-4 pt-2">
                {auditLogs.map((log) => {
                  const actorName = log.actor_user_id ? actorMap[log.actor_user_id] || "Teacher" : "System";
                  const oldVal = log.old_value || {};
                  const newVal = log.new_value || {};

                  return (
                    <div key={log.id} className="p-3 bg-slate-50/50 border border-border/20 rounded-xl space-y-2 text-[10px] font-bold text-primary">
                      <div className="flex justify-between items-center border-b border-border/10 pb-1.5">
                        <span className="uppercase text-[9px] tracking-wide text-primary font-black">
                          {log.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-muted font-bold text-[9px]">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 font-medium">
                        Performed by <span className="font-extrabold">{actorName}</span>
                      </p>
                      
                      {/* Diff details if available */}
                      {log.action === "PAYMENT_UPDATED" && (
                        <div className="mt-2 pt-1 border-t border-border/10 space-y-1 font-semibold text-slate-700">
                          {oldVal.expected_amount !== newVal.expected_amount && (
                            <div>Expected: <span className="line-through text-rose-600">{formatCurrency(oldVal.expected_amount)}</span> &rarr; <span className="text-emerald-700">{formatCurrency(newVal.expected_amount)}</span></div>
                          )}
                          {oldVal.paid_amount !== newVal.paid_amount && (
                            <div>Paid: <span className="line-through text-rose-600">{formatCurrency(oldVal.paid_amount)}</span> &rarr; <span className="text-emerald-700">{formatCurrency(newVal.paid_amount)}</span></div>
                          )}
                          {oldVal.status !== newVal.status && (
                            <div>Status: <span className="line-through text-rose-600">{oldVal.status}</span> &rarr; <span className="text-emerald-700">{newVal.status}</span></div>
                          )}
                          {oldVal.payment_method !== newVal.payment_method && (
                            <div>Method: <span className="line-through text-rose-600">{oldVal.payment_method || "None"}</span> &rarr; <span className="text-emerald-700">{newVal.payment_method || "None"}</span></div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-6 text-xs text-muted font-bold">
                No audit events registered for this payment record.
              </p>
            )}
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
