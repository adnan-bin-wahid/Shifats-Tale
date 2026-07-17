import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EnrollmentRowActions } from "@/components/dashboard/enrollment-row-actions";
import { Search, Filter, BookOpen, User, Mail, Calendar } from "lucide-react";
import { DebouncedSearchInput } from "@/components/ui/debounced-search-input";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    batchId?: string;
    page?: string;
  }>;
}

export default async function TeacherEnrollmentsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const search = sp.search || "";
  const status = sp.status || "";
  const batchId = sp.batchId || "";
  const page = parseInt(sp.page || "1", 10);
  const pageSize = 10;

  const supabase = await createClient();

  // Fetch batches for filter list
  const { data: allBatches } = await supabase
    .from("batches")
    .select("id, name, code")
    .order("name", { ascending: true });

  // Base query for enrollments
  let enrollQuery = supabase
    .from("enrollments")
    .select(`
      id,
      status,
      approved_at,
      disabled_at,
      disable_reason,
      completed_at,
      created_at,
      student_id,
      batch_id,
      batch:batches!inner (
        id,
        name,
        code,
        monthly_fee
      ),
      student:student_profiles!inner (
        id,
        student_code,
        profile_id,
        profile:profiles!inner (
          id,
          full_name,
          email
        )
      )
    `, { count: "exact" });

  // 1. Filter by Status
  if (status) {
    enrollQuery = enrollQuery.eq("status", status);
  }

  // 2. Filter by Batch
  if (batchId) {
    enrollQuery = enrollQuery.eq("batch_id", batchId);
  }

  // 3. Search (Student Code, Full Name, Batch Code, Batch Name)
  if (search) {
    const { data: matchedProfiles } = await supabase
      .from("profiles")
      .select("id")
      .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    const profileIds = matchedProfiles?.map((p) => p.id) || [];

    let stuQuery = supabase.from("student_profiles").select("id");
    if (profileIds.length > 0) {
      stuQuery = stuQuery.or(`student_code.ilike.%${search}%,profile_id.in.(${profileIds.join(",")})`);
    } else {
      stuQuery = stuQuery.ilike("student_code", `%${search}%`);
    }
    const { data: matchedStudents } = await stuQuery;
    const studentIds = matchedStudents?.map((s) => s.id) || [];

    const { data: matchedBatches } = await supabase
      .from("batches")
      .select("id")
      .or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    const matchingBatchIds = matchedBatches?.map((b) => b.id) || [];

    const filterParts: string[] = [];
    if (studentIds.length > 0) {
      filterParts.push(`student_id.in.(${studentIds.join(",")})`);
    }
    if (matchingBatchIds.length > 0) {
      filterParts.push(`batch_id.in.(${matchingBatchIds.join(",")})`);
    }

    if (filterParts.length > 0) {
      enrollQuery = enrollQuery.or(filterParts.join(","));
    } else {
      enrollQuery = enrollQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  // Sorting & Ranges
  enrollQuery = enrollQuery.order("created_at", { ascending: false });
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: enrollments, count } = await enrollQuery.range(from, to);
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-8 text-xs font-bold text-primary">
      {/* Header */}
      <DashboardPageHeader
        title="Student Enrollments"
        description="Audit all memberships, toggle statuses, and process pending admissions across the coaching center."
      />

      {/* Filters Form */}
      <form method="GET" className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="md:col-span-2">
            <DebouncedSearchInput
              placeholder="Search Student, ID, Batch code..."
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
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Suspended</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Batch filter */}
          <div>
            <select
              name="batchId"
              defaultValue={batchId}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            >
              <option value="">All Batches</option>
              {allBatches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-border/20">
          <Link
            href="/teacher/enrollments"
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

      {/* Enrollments Table */}
      <div className="bg-white border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        {enrollments && enrollments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50/50 border-b border-border/30 text-muted uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-4 px-6">Student ID & Name</th>
                  <th className="py-4 px-6">Class Batch Details</th>
                  <th className="py-4 px-6">Current Status</th>
                  <th className="py-4 px-6">Timestamps</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-primary">
                {enrollments.map((enr: any) => {
                  const student = enr.student || {};
                  const profile = student.profile || {};
                  const batch = enr.batch || {};

                  return (
                    <tr key={enr.id} className="hover:bg-slate-50/30 transition-colors">
                      {/* Student info */}
                      <td className="py-4 px-6">
                        <Link
                          href={`/teacher/students/${student.id}`}
                          className="font-extrabold text-primary hover:text-accent font-display block text-sm"
                        >
                          {profile.full_name || "Unnamed Student"}
                        </Link>
                        <span className="text-[10px] font-bold text-muted/70 block mt-0.5">
                          ID: <span className="font-display font-bold">{student.student_code}</span>
                        </span>
                      </td>

                      {/* Batch info */}
                      <td className="py-4 px-6">
                        <Link
                          href={`/teacher/batches/${batch.id}`}
                          className="font-extrabold text-primary hover:text-accent font-display block text-sm"
                        >
                          {batch.name}
                        </Link>
                        <span className="text-[10px] font-bold text-muted/70 block mt-0.5 uppercase">
                          Code: {batch.code} &bull; {batch.monthly_fee} BDT
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={enr.status} />
                          {enr.status === "DISABLED" && enr.disable_reason && (
                            <span className="text-[10px] text-rose-600 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 max-w-[200px] truncate" title={enr.disable_reason}>
                              Reason: {enr.disable_reason}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Timestamps */}
                      <td className="py-4 px-6 text-muted text-[11px] font-bold space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted" />
                          <span>Registered: {new Date(enr.created_at).toLocaleDateString()}</span>
                        </div>
                        {enr.approved_at && (
                          <div className="flex items-center gap-1 text-emerald-700">
                            <span>Approved: {new Date(enr.approved_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <EnrollmentRowActions
                          enrollmentId={enr.id}
                          currentStatus={enr.status}
                          studentName={profile.full_name || "Student"}
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
            <h4 className="text-sm font-bold text-primary">No enrollment logs registered</h4>
            <p className="text-xs text-muted font-medium mt-1 max-w-xs leading-relaxed">
              No enrollment records exist matching the selected parameters.
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
                href={`/teacher/enrollments?page=${page - 1}&search=${search}&status=${status}&batchId=${batchId}`}
                className={`px-3 py-1.5 border border-border/60 bg-white hover:bg-slate-50 text-xs font-bold rounded-xl transition-all ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Previous
              </Link>
              <Link
                href={`/teacher/enrollments?page=${page + 1}&search=${search}&status=${status}&batchId=${batchId}`}
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
