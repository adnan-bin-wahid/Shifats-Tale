import React from "react";
import { notFound, redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Award, Calendar, Eye, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    batchId: string;
  }>;
}

export default async function StudentBatchResultsPage({ params }: PageProps) {
  const { batchId } = await params;
  const { destination, studentProfile } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") {
    redirect("/login");
  }
  if (!studentProfile) {
    redirect("/");
  }

  const supabase = await createClient();

  // Authorization Check: Student must have an ACTIVE enrollment in this batch.
  const { data: enrollment, error: enrollError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", studentProfile.id)
    .eq("batch_id", batchId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (enrollError || !enrollment) {
    redirect("/student?error=unauthorized_batch");
  }

  // Fetch Batch Details
  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (batchError || !batch) {
    notFound();
  }

  // Fetch results for this student in this batch
  const { data: results, error: resultsError } = await supabase
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
    .eq("student_id", studentProfile.id);

  const batchResults = (results || []).filter((r: any) => {
    return r.exam && r.exam.batch_id === batchId && r.exam.status === "RESULT_PUBLISHED";
  });

  return (
    <div className="space-y-8 text-xs font-bold text-primary">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href={`/student/batches/${batchId}`}
          className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors font-bold text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Batch Portal
        </Link>
        <DashboardPageHeader
          title={`Performance Ledger: ${batch.name}`}
          description={`Review all grading logs, average percentiles, and scores published for batch ${batch.code}.`}
        />
      </div>

      {/* Grid List */}
      <div className="bg-white border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        {batchResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50/50 border-b border-border/30 text-muted uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-4 px-6">Examination Name</th>
                  <th className="py-4 px-6">Exam Type</th>
                  <th className="py-4 px-6">Grading Date</th>
                  <th className="py-4 px-6 text-center">Score obtained</th>
                  <th className="py-4 px-6 text-center">Grade</th>
                  <th className="py-4 px-6 text-center">Class Rank</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-primary">
                {batchResults.map((r: any) => {
                  const isAbs = r.attendance_status === "ABSENT";
                  const marks = r.obtained_marks !== null ? Number(r.obtained_marks) : 0;
                  const passes = marks >= Number(r.exam.pass_marks);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-extrabold text-slate-800 text-sm block">{r.exam.name}</span>
                      </td>

                      <td className="py-4 px-6 text-slate-700">
                        {r.exam.exam_type.replace("_", " ")}
                      </td>

                      <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                        {r.exam.exam_date}
                      </td>

                      <td className="py-4 px-6 text-center">
                        {isAbs ? (
                          <span className="text-rose-700 font-extrabold bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5">ABSENT</span>
                        ) : (
                          <div className="inline-block text-center">
                            <span className={`font-extrabold block ${passes ? "text-emerald-700" : "text-rose-700"}`}>
                              {marks} / {Number(r.exam.total_marks)}
                            </span>
                            <span className="text-[9px] text-muted block mt-0.5">({((marks / Number(r.exam.total_marks)) * 100).toFixed(0)}%)</span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center font-display font-black text-slate-800 text-sm">
                        {isAbs ? "F" : r.grade || "-"}
                      </td>

                      <td className="py-4 px-6 text-center font-display font-black text-amber-700 text-sm">
                        {r.rank !== null ? `#${r.rank}` : "-"}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/student/batches/${batchId}/exams/${r.exam.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-all border border-border/40"
                        >
                          View Card
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Award className="h-10 w-10 text-muted/50 stroke-1 mb-3" />
            <h4 className="text-sm font-bold text-primary">No results published</h4>
            <p className="text-xs text-muted font-medium mt-1 max-w-xs leading-relaxed">
              No examination marks have been published for this class yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
