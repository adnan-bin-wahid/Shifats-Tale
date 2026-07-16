import React from "react";
import { redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { Calendar, Filter, Award, Percent, Users, AlertTriangle, Download } from "lucide-react";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    batchId?: string;
    examType?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function StudentResultsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const batchId = sp.batchId || "";
  const examType = sp.examType || "";
  const startDate = sp.startDate || "";
  const endDate = sp.endDate || "";

  const { destination, studentProfile } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") {
    redirect("/login");
  }
  if (!studentProfile) {
    redirect("/");
  }

  const supabase = await createClient();

  // Query active batch enrollments for the student
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      batch_id,
      batch:batches (
        id,
        name,
        code
      )
    `)
    .eq("student_id", studentProfile.id)
    .eq("status", "ACTIVE");

  const activeBatchIds = enrollments?.map((e) => e.batch_id) || [];
  const activeBatchesList = enrollments?.map((e: any) => e.batch).filter(Boolean) || [];

  if (activeBatchIds.length === 0) {
    return (
      <div className="space-y-8 text-xs font-bold text-primary">
        <DashboardPageHeader
          title="My Academic Performance"
          description="Track your test results, grades, and percentile ranks across batches."
        />
        <div className="p-8 bg-white border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center">
          <Award className="h-10 w-10 text-muted stroke-1 mb-4" />
          <h3 className="text-sm font-extrabold text-primary">No Active Enrollments</h3>
          <p className="text-xs text-muted max-w-sm font-medium mt-1 leading-relaxed">
            You must be enrolled actively in a batch to view your performance grades.
          </p>
        </div>
      </div>
    );
  }

  // Fetch all exam results for the student
  const { data: results, error } = await supabase
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
        batch_id,
        published_at,
        batches (
          id,
          name,
          code
        )
      )
    `)
    .eq("student_id", studentProfile.id);

  if (error) {
    console.error("Failed to query student results:", error);
  }

  // Apply visibility gating:
  // 1. Exam status must be RESULT_PUBLISHED
  // 2. Exam batch must be active for this student (inside activeBatchIds)
  const publishedResults = (results || []).filter((r: any) => {
    if (!r.exam) return false;
    const isPublished = r.exam.status === "RESULT_PUBLISHED";
    const isBatchActive = activeBatchIds.includes(r.exam.batch_id);
    return isPublished && isBatchActive;
  });

  // Apply query filter selections
  const filteredResults = publishedResults.filter((r: any) => {
    if (batchId && r.exam.batch_id !== batchId) return false;
    if (examType && r.exam.exam_type !== examType) return false;
    if (startDate && r.exam.exam_date < startDate) return false;
    if (endDate && r.exam.exam_date > endDate) return false;
    return true;
  });

  // Calculate statistics over ALL published active results (ignores dropdown filters for stats)
  const totalExams = publishedResults.length;
  let passCount = 0;
  let failCount = 0;
  let absentCount = 0;
  let presentCount = 0;
  const percentages: number[] = [];

  publishedResults.forEach((r: any) => {
    if (r.attendance_status === "ABSENT") {
      absentCount++;
    } else {
      presentCount++;
      const marks = r.obtained_marks !== null ? Number(r.obtained_marks) : 0;
      const total = Number(r.exam.total_marks) || 100;
      percentages.push((marks / total) * 100);
      if (marks >= Number(r.exam.pass_marks)) {
        passCount++;
      } else {
        failCount++;
      }
    }
  });

  const sumPercent = percentages.reduce((sum, p) => sum + p, 0);
  const averagePercentage = percentages.length > 0 ? (sumPercent / percentages.length).toFixed(2) : null;

  // Sorting filtered results for recent list
  const recentResults = [...filteredResults].sort(
    (a: any, b: any) => new Date(b.exam.exam_date).getTime() - new Date(a.exam.exam_date).getTime()
  );

  return (
    <div className="space-y-8 text-xs font-bold text-primary">
      <DashboardPageHeader
        title="My Academic Performance"
        description="Review your scores, pass boundaries, grades, and rankings assigned for published examinations."
      />

      {/* Summary dashboard widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-center">
          <span className="text-2xl font-extrabold text-slate-700 font-display block leading-none">
            {totalExams}
          </span>
          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wide mt-2 block">
            Published Exams
          </span>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
          <span className="text-2xl font-extrabold text-emerald-700 font-display block leading-none">
            {passCount}
          </span>
          <span className="text-[9px] uppercase font-bold text-emerald-600/80 tracking-wide mt-2 block">
            Passed Exams
          </span>
        </div>

        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
          <span className="text-2xl font-extrabold text-rose-700 font-display block leading-none">
            {failCount}
          </span>
          <span className="text-[9px] uppercase font-bold text-rose-600/80 tracking-wide mt-2 block">
            Failed Exams
          </span>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
          <span className="text-2xl font-extrabold text-amber-700 font-display block leading-none">
            {absentCount}
          </span>
          <span className="text-[9px] uppercase font-bold text-amber-600/80 tracking-wide mt-2 block">
            Absences Record
          </span>
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center col-span-1 sm:col-span-2 md:col-span-1">
          <span className="text-2xl font-extrabold text-primary font-display block leading-none">
            {averagePercentage !== null ? `${averagePercentage}%` : "N/A"}
          </span>
          <span className="text-[9px] uppercase font-bold text-primary/80 tracking-wide mt-2 block">
            Average Score
          </span>
        </div>
      </div>

      {/* Filter panel */}
      <form method="GET" className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Batch filter */}
          <div>
            <label className="block text-[9px] uppercase font-extrabold tracking-wider text-muted mb-2">Class Batch</label>
            <select
              name="batchId"
              defaultValue={batchId}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            >
              <option value="">All Batches</option>
              {activeBatchesList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type filter */}
          <div>
            <label className="block text-[9px] uppercase font-extrabold tracking-wider text-muted mb-2">Exam Type</label>
            <select
              name="examType"
              defaultValue={examType}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="CLASS_TEST">Class Test</option>
              <option value="WEEKLY_EXAM">Weekly Exam</option>
              <option value="MONTHLY_EXAM">Monthly Exam</option>
              <option value="MODEL_TEST">Model Test</option>
              <option value="ASSIGNMENT">Assignment</option>
              <option value="FINAL_EXAM">Final Exam</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[9px] uppercase font-extrabold tracking-wider text-muted mb-2">Start Date</label>
            <input
              type="date"
              name="startDate"
              defaultValue={startDate}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[9px] uppercase font-extrabold tracking-wider text-muted mb-2">End Date</label>
            <input
              type="date"
              name="endDate"
              defaultValue={endDate}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-border/20 pt-3">
          <Link
            href="/student/results"
            className="px-4 py-2 border border-border/80 bg-white hover:bg-slate-50 text-xs font-bold text-muted rounded-xl transition-all"
          >
            Reset Filters
          </Link>
          <button
            type="submit"
            className="px-5 py-2 primary-btn text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Apply Filters</span>
          </button>
        </div>
      </form>

      {/* Ledger list of filtered results */}
      <div className="bg-white border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        {recentResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50/50 border-b border-border/30 text-muted uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-4 px-6">Examination Name</th>
                  <th className="py-4 px-6">Batch Code</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6 text-center">Marks Score</th>
                  <th className="py-4 px-6 text-center">Grade</th>
                  <th className="py-4 px-6 text-center">Rank</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-primary">
                {recentResults.map((r: any) => {
                  const isAbs = r.attendance_status === "ABSENT";
                  const marks = r.obtained_marks !== null ? Number(r.obtained_marks) : 0;
                  const passes = marks >= Number(r.exam.pass_marks);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-extrabold text-slate-800 text-sm block">{r.exam.name}</span>
                        <span className="text-[10px] text-muted font-normal block mt-0.5">
                          Type: {r.exam.exam_type.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-slate-700">
                        {r.exam.batches?.name} ({r.exam.batches?.code})
                      </td>

                      <td className="py-4 px-6 whitespace-nowrap text-slate-500">
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

                      <td className="py-4 px-6 text-right space-x-1.5">
                        <Link
                          href={`/student/batches/${r.exam.batch_id}/exams/${r.exam.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg transition-all border border-border/40"
                        >
                          Details Card
                        </Link>
                        <a
                          href={`/api/exams/${r.exam.id}/result-pdf`}
                          download
                          className="inline-flex items-center gap-1 px-3 py-1 bg-[#010E62] hover:bg-blue-900 text-white text-[10px] font-bold rounded-lg transition-all shadow-xs"
                        >
                          <Download className="h-3 w-3" /> PDF
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <AlertTriangle className="h-10 w-10 text-muted/50 stroke-1 mb-3" />
            <h4 className="text-sm font-bold text-primary">No results found</h4>
            <p className="text-xs text-muted font-medium mt-1 max-w-xs leading-relaxed">
              No results match your selected filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
