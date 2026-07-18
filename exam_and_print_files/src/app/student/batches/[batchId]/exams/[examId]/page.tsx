import React from "react";
import { notFound, redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { ArrowLeft, Award, Calendar, Layers, CheckCircle2, XCircle, Bell, Star } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    batchId: string;
    examId: string;
  }>;
}

export default async function StudentExamScorePage({ params }: PageProps) {
  const { batchId, examId } = await params;
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

  // Fetch Examination details
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("*, batches(name, code)")
    .eq("id", examId)
    .single();

  if (examError || !exam) {
    notFound();
  }

  // Results details must be published
  if (exam.status !== "RESULT_PUBLISHED") {
    redirect(`/student/batches/${batchId}?error=result_not_published`);
  }

  // Query ONLY the matching result record for this specific student
  const { data: result, error: resultError } = await supabase
    .from("exam_results")
    .select("*")
    .eq("exam_id", examId)
    .eq("student_id", studentProfile.id)
    .maybeSingle();

  if (resultError) {
    console.error("Failed to query student score:", resultError);
  }

  // Calculate fields
  const isAbs = result?.attendance_status === "ABSENT";
  const marks = result?.obtained_marks !== null ? Number(result.obtained_marks) : null;
  const total = Number(exam.total_marks) || 100;
  const percentage = marks !== null ? ((marks / total) * 100).toFixed(1) : "0.0";
  const passed = marks !== null && marks >= Number(exam.pass_marks);

  const passFailStatus = isAbs ? "ABSENT" : passed ? "PASS" : "FAIL";

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
          title={`Detailed Score Card`}
          description={`Individual result details for: ${exam.name}`}
        />
      </div>

      {/* Main card */}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border border-border/40 rounded-2xl overflow-hidden shadow-md">
          
          {/* Header block with result state */}
          <div className={`p-6 border-b border-border/20 flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isAbs 
              ? "bg-slate-50" 
              : passed 
              ? "bg-emerald-50/40" 
              : "bg-rose-50/40"
          }`}>
            <div className="flex items-center gap-3">
              {isAbs ? (
                <XCircle className="h-10 w-10 text-slate-400 stroke-1" />
              ) : passed ? (
                <CheckCircle2 className="h-10 w-10 text-emerald-600 stroke-1" />
              ) : (
                <XCircle className="h-10 w-10 text-rose-600 stroke-1" />
              )}
              
              <div>
                <span className="text-[10px] text-muted uppercase tracking-wider block font-black">Examination Result</span>
                <h2 className="text-base font-extrabold text-primary font-display mt-0.5">{exam.name}</h2>
              </div>
            </div>

            <div className="text-center sm:text-right">
              <span className="text-[10px] text-muted uppercase tracking-wider block mb-1">Status</span>
              <span className={`inline-flex px-3 py-1 rounded-xl text-xs font-black uppercase border ${
                isAbs 
                  ? "bg-slate-100 text-slate-600 border-slate-200" 
                  : passed 
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                  : "bg-rose-100 text-rose-800 border-rose-200"
              }`}>
                {passFailStatus}
              </span>
            </div>
          </div>

          {/* Core breakdown score grids */}
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Main Score widgets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-border/20 text-center">
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Your Marks</span>
                <span className={`text-xl font-black font-display block mt-1.5 ${
                  isAbs ? "text-slate-400" : passed ? "text-emerald-700" : "text-rose-700"
                }`}>
                  {isAbs ? "ABS" : marks}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">out of {Number(exam.total_marks)}</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-border/20 text-center">
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Percentage</span>
                <span className="text-xl font-black font-display text-slate-800 block mt-1.5">
                  {isAbs ? "0.0%" : `${percentage}%`}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">of total criteria</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-border/20 text-center">
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Letter Grade</span>
                <span className="text-xl font-black font-display text-slate-800 block mt-1.5">
                  {isAbs ? "F" : result?.grade || "-"}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">grading scale</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-border/20 text-center">
                <span className="text-[10px] uppercase font-bold text-muted tracking-wider block">Class Rank</span>
                <span className="text-xl font-black font-display text-amber-700 block mt-1.5">
                  {isAbs || !result || result.rank === null ? "-" : `#${result.rank}`}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5">competition rank</span>
              </div>
            </div>

            {/* Exam Parameters details card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-primary pt-2 border-t border-border/20">
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Class Batch</span>
                <span className="font-extrabold mt-0.5 block">{exam.batches?.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Exam Type</span>
                <span className="font-extrabold mt-0.5 block">{exam.exam_type.replace("_", " ")}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Total Marks Limit</span>
                <span className="font-extrabold mt-0.5 block text-slate-800">{Number(exam.total_marks)}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Pass Threshold</span>
                <span className="font-extrabold mt-0.5 block text-rose-700">{Number(exam.pass_marks)}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Exam Date</span>
                <span className="font-extrabold mt-0.5 block">{exam.exam_date}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Results Published At</span>
                <span className="font-extrabold mt-0.5 block text-slate-500">
                  {exam.published_at ? new Date(exam.published_at).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>

            {/* Teacher Remarks note section */}
            {result?.remarks && (
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 space-y-1.5">
                <span className="text-[10px] uppercase text-primary font-black flex items-center gap-1">
                  <Bell className="h-3.5 w-3.5" />
                  <span>Teacher's remarks note</span>
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                  "{result.remarks}"
                </p>
              </div>
            )}

            {/* Publication Note */}
            {exam.result_publication_note && (
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 space-y-1.5">
                <span className="text-[10px] uppercase text-amber-700 font-black flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" />
                  <span>Publication Note</span>
                </span>
                <p className="text-xs text-amber-800 leading-relaxed font-semibold">
                  "{exam.result_publication_note}"
                </p>
              </div>
            )}

          </div>

          {/* Footer controls link */}
          <div className="px-6 py-4 bg-slate-50 border-t border-border/10 text-center">
            <Link
              href={`/student/batches/${batchId}`}
              className="text-[10px] text-primary hover:underline font-extrabold"
            >
              &larr; Back to batch dashboard portal
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
