import React from "react";
import { notFound, redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { Calendar, Eye, GraduationCap, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    batchId: string;
  }>;
}

export default async function StudentBatchExamsPage({ params }: PageProps) {
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

  // Fetch exams for this batch, excluding DRAFT
  const { data: exams } = await supabase
    .from("exams")
    .select("*")
    .eq("batch_id", batchId)
    .neq("status", "DRAFT")
    .order("exam_date", { ascending: false });

  return (
    <div className="space-y-8 text-xs font-bold text-primary">
      {/* Header bar */}
      <div className="space-y-4">
        <Link
          href={`/student/batches/${batchId}`}
          className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors font-bold text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Batch Portal
        </Link>
        <DashboardPageHeader
          title={`Exams Schedule: ${batch.name}`}
          description={`Track weekly examinations, class tests, and results published for class ${batch.code}.`}
        />
      </div>

      {/* Table list */}
      <div className="bg-white border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        {exams && exams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50/50 border-b border-border/30 text-muted uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-4 px-6">Examination Name</th>
                  <th className="py-4 px-6">Type</th>
                  <th className="py-4 px-6">Exam Date</th>
                  <th className="py-4 px-6 text-center">Marks config</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-primary">
                {exams.map((exam) => {
                  const isPublished = exam.status === "RESULT_PUBLISHED";

                  return (
                    <tr key={exam.id} className="hover:bg-slate-50/30 transition-colors">
                      {/* Name */}
                      <td className="py-4 px-6">
                        <span className="font-extrabold text-slate-800 text-sm block">{exam.name}</span>
                        {exam.description && (
                          <span className="text-[10px] text-muted font-normal block mt-0.5 line-clamp-1">
                            {exam.description}
                          </span>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-4 px-6 text-slate-700">
                        {exam.exam_type.replace("_", " ")}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                        {exam.exam_date}
                      </td>

                      {/* Marks */}
                      <td className="py-4 px-6 text-center">
                        <span className="font-extrabold block text-slate-800">Total: {Number(exam.total_marks)}</span>
                        <span className="text-[10px] text-muted font-bold block mt-0.5">Pass: {Number(exam.pass_marks)}</span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          isPublished
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}>
                          {isPublished ? "GRADED" : exam.status}
                        </span>
                      </td>

                      {/* View result link */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {isPublished ? (
                          <Link
                            href={`/student/batches/${batchId}/exams/${exam.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-white hover:bg-primary-dark text-[10px] font-bold rounded-lg transition-all"
                          >
                            <Eye className="h-3 w-3" />
                            <span>View Score</span>
                          </Link>
                        ) : (
                          <span className="text-[10px] text-muted font-normal italic">
                            Result not published yet
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
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <GraduationCap className="h-10 w-10 text-muted/50 stroke-1 mb-3" />
            <h4 className="text-sm font-bold text-primary">No examinations scheduled</h4>
            <p className="text-xs text-muted font-medium mt-1 max-w-xs leading-relaxed">
              There are no examinations logged for this batch.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
