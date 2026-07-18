import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Plus, Search, Filter, GraduationCap, Calendar, CheckCircle, XCircle } from "lucide-react";
import { DebouncedSearchInput } from "@/components/ui/debounced-search-input";
import { ExamListActions } from "@/components/dashboard/exam-list-actions";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    batchId?: string;
    examType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}

export default async function TeacherExamsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const search = sp.search || "";
  const batchId = sp.batchId || "";
  const examType = sp.examType || "";
  const status = sp.status || "";
  const startDate = sp.startDate || "";
  const endDate = sp.endDate || "";
  const page = parseInt(sp.page || "1", 10);
  const pageSize = 10;

  const supabase = await createClient();

  // Load all batches for filter dropdown
  const { data: batchesList } = await supabase
    .from("batches")
    .select("id, name, code")
    .order("name", { ascending: true });

  // Resolve matching batch IDs if search term is provided
  let matchingBatchIds: string[] = [];
  if (search) {
    const { data: matchedBatches } = await supabase
      .from("batches")
      .select("id")
      .ilike("name", `%${search}%`);
    matchingBatchIds = matchedBatches?.map((b) => b.id) || [];
  }

  // Build Query
  let query = supabase.from("exams").select("*, batches(name, code)", { count: "exact" });

  if (search) {
    if (matchingBatchIds.length > 0) {
      query = query.or(`name.ilike.%${search}%,batch_id.in.(${matchingBatchIds.map(id => `"${id}"`).join(",")})`);
    } else {
      query = query.ilike("name", `%${search}%`);
    }
  }

  if (batchId) {
    query = query.eq("batch_id", batchId);
  }
  if (examType) {
    query = query.eq("exam_type", examType);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (startDate) {
    query = query.gte("exam_date", startDate);
  }
  if (endDate) {
    query = query.lte("exam_date", endDate);
  }

  query = query.order("exam_date", { ascending: false }).order("created_at", { ascending: false });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: exams, count } = await query.range(from, to);
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Fetch counts map (enrollments and results) for the exams
  const examIds = exams?.map((e) => e.id) || [];
  const enrolledCounts: Record<string, number> = {};
  const resultCounts: Record<string, number> = {};

  if (exams && exams.length > 0) {
    for (const exam of exams) {
      // Enrolled students count (ACTIVE enrollments in the batch)
      const { count: enrCount } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("batch_id", exam.batch_id)
        .eq("status", "ACTIVE");
      
      enrolledCounts[exam.id] = enrCount || 0;

      // Result entries count
      const { count: resCount } = await supabase
        .from("exam_results")
        .select("id", { count: "exact", head: true })
        .eq("exam_id", exam.id);

      resultCounts[exam.id] = resCount || 0;
    }
  }

  return (
    <div className="space-y-8 text-xs font-bold text-primary">
      {/* Page Header */}
      <DashboardPageHeader
        title="Manage Examinations"
        description="Schedule new tests, record student marksheets, configure grading scales, and manage results publication."
        actions={
          <Link
            href="/teacher/exams/new"
            className="primary-btn py-2 px-4 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-primary/10 transition-all hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            <span>Create Examination</span>
          </Link>
        }
      />

      {/* Filters Bar */}
      <form method="GET" className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Search bar */}
          <div>
            <DebouncedSearchInput
              placeholder="Search by exam or batch name..."
              defaultValue={search}
            />
          </div>

          {/* Batch filter */}
          <div>
            <select
              name="batchId"
              defaultValue={batchId}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            >
              <option value="">All Batches</option>
              {batchesList?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type filter */}
          <div>
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

          {/* Status filter */}
          <div>
            <select
              name="status"
              defaultValue={status}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="RESULT_DRAFT">Result Draft</option>
              <option value="RESULT_PUBLISHED">Result Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2 border-t border-border/20">
          {/* Date range filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted text-[10px] uppercase font-extrabold mr-1">Date Range:</span>
            <input
              type="date"
              name="startDate"
              defaultValue={startDate}
              className="px-3.5 py-2 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            />
            <span className="text-muted font-normal text-xs">to</span>
            <input
              type="date"
              name="endDate"
              defaultValue={endDate}
              className="px-3.5 py-2 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            />
          </div>

          {/* Submit buttons */}
          <div className="flex gap-2.5 w-full sm:w-auto justify-end">
            <Link
              href="/teacher/exams"
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
        </div>
      </form>

      {/* Exams Table List */}
      <div className="bg-white border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        {exams && exams.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50/50 border-b border-border/30 text-muted uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-4 px-6">Exam Name & Batch</th>
                  <th className="py-4 px-6">Type & Date</th>
                  <th className="py-4 px-6 text-center">Marks config</th>
                  <th className="py-4 px-6 text-center">Enrolled Students</th>
                  <th className="py-4 px-6 text-center">Result entries</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-primary">
                {exams.map((exam) => {
                  const enrolled = enrolledCounts[exam.id] || 0;
                  const entered = resultCounts[exam.id] || 0;
                  const isPublished = exam.status === "RESULT_PUBLISHED";
                  const isArchived = exam.status === "ARCHIVED";

                  return (
                    <tr key={exam.id} className="hover:bg-slate-50/30 transition-colors">
                      {/* Name & Batch */}
                      <td className="py-4 px-6">
                        <Link
                          href={`/teacher/exams/${exam.id}`}
                          className="font-extrabold text-primary hover:text-accent font-display block text-sm"
                        >
                          {exam.name}
                        </Link>
                        <span className="text-[10px] font-bold text-muted/70 block mt-0.5">
                          Batch: <Link href={`/teacher/batches/${exam.batch_id}`} className="hover:underline text-primary">{exam.batches?.name} ({exam.batches?.code})</Link>
                        </span>
                      </td>

                      {/* Type & Date */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="font-extrabold block text-slate-800">{exam.exam_type.replace("_", " ")}</span>
                        <div className="flex items-center gap-1 text-[10px] text-muted font-bold mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>{exam.exam_date}</span>
                        </div>
                      </td>

                      {/* Marks Config */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-block text-center">
                          <span className="font-extrabold block text-slate-800">Total: {Number(exam.total_marks)}</span>
                          <span className="text-[10px] text-muted font-bold block mt-0.5">Pass: {Number(exam.pass_marks)}</span>
                        </div>
                      </td>

                      {/* Enrolled Students */}
                      <td className="py-4 px-6 text-center font-display font-extrabold text-sm text-slate-700">
                        {enrolled}
                      </td>

                      {/* Result entries */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-lg text-primary font-display text-[11px] font-extrabold">
                          <span className={entered === enrolled ? "text-emerald-700" : "text-amber-700"}>{entered}</span>
                          <span className="text-muted/40 font-normal">/</span>
                          <span>{enrolled}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center">
                          <StatusBadge status={exam.status} />
                        </div>
                      </td>

                      {/* Actions */}
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
            <h4 className="text-sm font-bold text-primary">No examinations found</h4>
            <p className="text-xs text-muted font-medium mt-1 max-w-xs leading-relaxed">
              No exams have been created or schedules match your search filters.
            </p>
          </div>
        )}

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/30 bg-slate-50/50">
            <span className="text-xs font-semibold text-muted">
              Page <span className="font-extrabold text-primary font-display">{page}</span> of{" "}
              <span className="font-extrabold text-primary font-display">{totalPages}</span>
            </span>
            <div className="flex gap-2">
              <Link
                href={`/teacher/exams?page=${page - 1}&search=${search}&batchId=${batchId}&examType=${examType}&status=${status}&startDate=${startDate}&endDate=${endDate}`}
                className={`px-3 py-1.5 border border-border/60 bg-white hover:bg-slate-50 text-xs font-bold rounded-xl transition-all ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Previous
              </Link>
              <Link
                href={`/teacher/exams?page=${page + 1}&search=${search}&batchId=${batchId}&examType=${examType}&status=${status}&startDate=${startDate}&endDate=${endDate}`}
                className={`px-3 py-1.5 border border-border/60 bg-white hover:bg-slate-50 text-xs font-bold rounded-xl transition-all ${
                  page >= totalPages ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Next
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
