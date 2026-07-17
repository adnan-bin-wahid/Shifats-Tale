import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { ArrowLeft, Plus, Calendar, Eye, Edit, ListTodo, GraduationCap } from "lucide-react";
import { ExamListActions } from "@/components/dashboard/exam-list-actions";

interface PageProps {
  params: Promise<{
    batchId: string;
  }>;
}

export default async function BatchExamsPage({ params }: PageProps) {
  const { batchId } = await params;
  const { destination } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") {
    redirect("/login");
  }
  if (destination !== "TEACHER_DASHBOARD") {
    redirect("/");
  }

  const supabase = await createClient();

  // Fetch Batch Details
  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    notFound();
  }

  // Query exams for this batch
  const { data: exams, error: examsError } = await supabase
    .from("exams")
    .select("*")
    .eq("batch_id", batchId)
    .order("exam_date", { ascending: false });

  // Load enrollment count for active students in this batch
  const { count: activeCount } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .eq("status", "ACTIVE");

  // Load other counts to display in tabs
  const { count: totalEnrollmentsCount } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId);

  const { count: totalMaterialsCount } = await supabase
    .from("batch_contents")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId);

  // Fetch entered results count per exam
  const examIds = exams?.map((e) => e.id) || [];
  const enteredCounts: Record<string, number> = {};
  if (examIds.length > 0) {
    for (const exam of exams || []) {
      const { count } = await supabase
        .from("exam_results")
        .select("id", { count: "exact", head: true })
        .eq("exam_id", exam.id);
      enteredCounts[exam.id] = count || 0;
    }
  }

  return (
    <div className="space-y-8 text-xs font-bold text-primary">
      {/* Header */}
      <DashboardPageHeader
        title={`Exams: ${batch.name}`}
        description={`Schedule exams and manage grades files for batch code ${batch.code}.`}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/teacher/batches/${batchId}`}
              className="px-4 py-2 border border-border/80 bg-white hover:bg-slate-50 text-xs font-bold text-muted rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Batch</span>
            </Link>
            
            {batch.status !== "ARCHIVED" && batch.status !== "CANCELLED" && (
              <Link
                href={`/teacher/exams/new?batchId=${batchId}`}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Create Exam</span>
              </Link>
            )}
          </div>
        }
      />

      {/* Tabs Menu */}
      <div className="flex border-b border-border/40 gap-4 overflow-x-auto text-xs font-bold text-muted">
        <Link
          href={`/teacher/batches/${batchId}?tab=overview`}
          className="pb-3 px-1 transition-all border-b-2 border-transparent hover:text-primary"
        >
          Overview
        </Link>
        <Link
          href={`/teacher/batches/${batchId}/students`}
          className="pb-3 px-1 transition-all border-b-2 border-transparent hover:text-primary"
        >
          Students ({totalEnrollmentsCount || 0})
        </Link>
        <Link
          href={`/teacher/batches/${batchId}?tab=payments`}
          className="pb-3 px-1 transition-all border-b-2 border-transparent hover:text-primary"
        >
          Payments (Placeholder)
        </Link>
        <Link
          href={`/teacher/batches/${batchId}?tab=materials`}
          className="pb-3 px-1 transition-all border-b-2 border-transparent hover:text-primary"
        >
          Materials ({totalMaterialsCount || 0})
        </Link>
        <Link
          href={`/teacher/batches/${batchId}/exams`}
          className="pb-3 px-1 transition-all border-b-2 border-primary text-primary font-bold"
        >
          Exams ({exams?.length || 0})
        </Link>
      </div>

      {/* Exams list table */}
      <div className="bg-white border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        {exams && exams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50/50 border-b border-border/30 text-muted uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-4 px-6">Examination Name</th>
                  <th className="py-4 px-6">Type & Date</th>
                  <th className="py-4 px-6 text-center">Marks config</th>
                  <th className="py-4 px-6 text-center">Grades Entered</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-primary">
                {exams.map((exam) => {
                  const entered = enteredCounts[exam.id] || 0;
                  const total = activeCount || 0;
                  const isArchived = exam.status === "ARCHIVED";

                  return (
                    <tr key={exam.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <Link
                          href={`/teacher/exams/${exam.id}`}
                          className="font-extrabold text-primary hover:text-accent font-display block text-sm"
                        >
                          {exam.name}
                        </Link>
                        {exam.description && (
                          <span className="text-[10px] text-muted font-normal block mt-0.5 line-clamp-1">
                            {exam.description}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="font-extrabold block text-slate-800">{exam.exam_type.replace("_", " ")}</span>
                        <div className="flex items-center gap-1 text-[10px] text-muted font-bold mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>{exam.exam_date}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <div className="inline-block text-center">
                          <span className="font-extrabold block text-slate-800">Total: {Number(exam.total_marks)}</span>
                          <span className="text-[10px] text-muted font-bold block mt-0.5">Pass: {Number(exam.pass_marks)}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-lg text-primary font-display text-[11px] font-extrabold">
                          <span className={entered === total ? "text-emerald-700" : "text-amber-700"}>{entered}</span>
                          <span className="text-muted/40 font-normal">/</span>
                          <span>{total}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center">
                          <StatusBadge status={exam.status} />
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <ExamListActions examId={exam.id} examName={exam.name} status={exam.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <GraduationCap className="h-10 w-10 text-muted/50 stroke-1 mb-3" />
            <h4 className="text-sm font-bold text-primary">No examinations configured</h4>
            <p className="text-xs text-muted font-medium mt-1 max-w-xs leading-relaxed">
              No examinations have been created for this batch yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
