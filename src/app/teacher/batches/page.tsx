import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { BatchListActions } from "@/components/dashboard/batch-list-actions";
import { Plus, Search, Filter, BookOpen } from "lucide-react";
import { DebouncedSearchInput } from "@/components/ui/debounced-search-input";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    admissionOpen?: string;
    subject?: string;
    level?: string;
    page?: string;
  }>;
}

export default async function TeacherBatchesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const search = sp.search || "";
  const status = sp.status || "";
  const admissionOpen = sp.admissionOpen || "";
  const subject = sp.subject || "";
  const level = sp.level || "";
  const page = parseInt(sp.page || "1", 10);
  const pageSize = 10;

  const supabase = await createClient();

  // Populate dynamic filter options from database
  const { data: subjectsData } = await supabase.from("batches").select("subject");
  const subjects = Array.from(new Set(subjectsData?.map((b) => b.subject).filter(Boolean) || []));

  const { data: levelsData } = await supabase.from("batches").select("academic_level");
  const levels = Array.from(new Set(levelsData?.map((b) => b.academic_level).filter(Boolean) || []));

  // Query batches with filtering
  let query = supabase.from("batches").select("*", { count: "exact" });

  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (admissionOpen) {
    query = query.eq("admission_open", admissionOpen === "true");
  }
  if (subject) {
    query = query.eq("subject", subject);
  }
  if (level) {
    query = query.eq("academic_level", level);
  }

  query = query.order("created_at", { ascending: false });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: batches, count } = await query.range(from, to);
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Aggregation maps to avoid N+1 queries
  const batchIds = batches?.map((b) => b.id) || [];
  const countsMap: Record<string, { total: number; active: number }> = {};
  
  batchIds.forEach((id) => {
    countsMap[id] = { total: 0, active: 0 };
  });

  if (batchIds.length > 0) {
    const { data: enrollData } = await supabase
      .from("enrollments")
      .select("batch_id, status")
      .in("batch_id", batchIds);

    enrollData?.forEach((e) => {
      if (countsMap[e.batch_id]) {
        countsMap[e.batch_id].total++;
        if (e.status === "ACTIVE") {
          countsMap[e.batch_id].active++;
        }
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <DashboardPageHeader
        title="Manage Batches"
        description="Configure academic programs, set schedules, adjust capacities, and manage admission gates."
        actions={
          <Link
            href="/teacher/batches/new"
            className="primary-btn py-2 px-4 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-primary/10 transition-all hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" />
            <span>Create Batch</span>
          </Link>
        }
      />

      {/* Filters Bar */}
      <form method="GET" className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {/* Search bar */}
          <div className="md:col-span-2">
            <DebouncedSearchInput
              placeholder="Search by name or code..."
              defaultValue={search}
            />
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
              <option value="OPEN">Open</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Admission filter */}
          <div>
            <select
              name="admissionOpen"
              defaultValue={admissionOpen}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            >
              <option value="">All Admissions</option>
              <option value="true">Admission Open</option>
              <option value="false">Admission Closed</option>
            </select>
          </div>

          {/* Subject filter */}
          <div>
            <select
              name="subject"
              defaultValue={subject}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            >
              <option value="">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-border/20">
          <div>
            <select
              name="level"
              defaultValue={level}
              className="px-3.5 py-2 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            >
              <option value="">All Levels</option>
              {levels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2.5">
            <Link
              href="/teacher/batches"
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

      {/* Batches Table Grid */}
      <div className="bg-white border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        {batches && batches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50/50 border-b border-border/30 text-muted uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-4 px-6">Batch Name & Code</th>
                  <th className="py-4 px-6">Subject & Level</th>
                  <th className="py-4 px-6">Dates</th>
                  <th className="py-4 px-6">Fees</th>
                  <th className="py-4 px-6 text-center">Students (Active/Total)</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Admission</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-primary">
                {batches.map((batch) => {
                  const studentCounts = countsMap[batch.id] || { total: 0, active: 0 };
                  const isDraft = batch.status === "DRAFT";
                  const hasEnrollments = studentCounts.total > 0;
                  // Universal admin deletion enabled for any batch
                  const canDelete = true;

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/30 transition-colors">
                      {/* Name & Code */}
                      <td className="py-4.5 px-6">
                        <Link
                          href={`/teacher/batches/${batch.id}`}
                          className="font-extrabold text-primary hover:text-accent font-display block text-sm"
                        >
                          {batch.name}
                        </Link>
                        <span className="text-[10px] font-bold text-muted/70 block mt-0.5">
                          Code: <span className="font-display font-bold">{batch.code}</span>
                        </span>
                      </td>

                      {/* Subject & Level */}
                      <td className="py-4.5 px-6">
                        <span className="font-extrabold block">{batch.subject}</span>
                        <span className="text-[10px] text-muted font-bold block mt-0.5">
                          {batch.academic_level}
                        </span>
                      </td>

                      {/* Dates */}
                      <td className="py-4.5 px-6 whitespace-nowrap">
                        <span className="block font-bold">Start: {batch.start_date}</span>
                        <span className="text-[10px] text-muted font-bold block mt-0.5">
                          End: {batch.end_date || "Continuous"}
                        </span>
                      </td>

                      {/* Fees */}
                      <td className="py-4.5 px-6">
                        <span className="font-extrabold block text-slate-800">
                          {batch.monthly_fee} BDT / mo
                        </span>
                        {batch.admission_fee > 0 && (
                          <span className="text-[10px] text-muted font-bold block mt-0.5">
                            Adm: {batch.admission_fee} BDT
                          </span>
                        )}
                      </td>

                      {/* Students count */}
                      <td className="py-4.5 px-6 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-xl text-primary font-display font-extrabold">
                          <span className="text-emerald-700">{studentCounts.active}</span>
                          <span className="text-muted/50 font-normal">/</span>
                          <span>{studentCounts.total}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4.5 px-6 text-center">
                        <div className="flex justify-center">
                          <StatusBadge status={batch.status} />
                        </div>
                      </td>

                      {/* Admission */}
                      <td className="py-4.5 px-6 text-center">
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border ${
                              batch.admission_open
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {batch.admission_open ? "Open" : "Closed"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4.5 px-6 text-right">
                        <BatchListActions
                          batchId={batch.id}
                          batchCode={batch.code}
                          batchStatus={batch.status}
                          admissionOpen={batch.admission_open}
                          canDelete={canDelete}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <BookOpen className="h-10 w-10 text-muted/50 stroke-1 mb-3" />
            <h4 className="text-sm font-bold text-primary">No batches configured</h4>
            <p className="text-xs text-muted font-medium mt-1 max-w-xs leading-relaxed">
              No academic programs have been created matching your filter parameters.
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
                href={`/teacher/batches?page=${page - 1}&search=${search}&status=${status}&admissionOpen=${admissionOpen}&subject=${subject}&level=${level}`}
                className={`px-3 py-1.5 border border-border/60 bg-white hover:bg-slate-50 text-xs font-bold rounded-xl transition-all ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Previous
              </Link>
              <Link
                href={`/teacher/batches?page=${page + 1}&search=${search}&status=${status}&admissionOpen=${admissionOpen}&subject=${subject}&level=${level}`}
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
