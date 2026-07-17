import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Search, Filter, Users, Mail, Phone, Calendar } from "lucide-react";
import { DebouncedSearchInput } from "@/components/ui/debounced-search-input";
import { StudentListActions } from "@/components/dashboard/student-list-actions";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    regStatus?: string;
    accStatus?: string;
    batchId?: string;
    hasActiveBatch?: string;
    page?: string;
  }>;
}

export default async function TeacherStudentsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const search = sp.search || "";
  const regStatus = sp.regStatus || "";
  const accStatus = sp.accStatus || "";
  const batchId = sp.batchId || "";
  const hasActiveBatch = sp.hasActiveBatch || "";
  const page = parseInt(sp.page || "1", 10);
  const pageSize = 10;

  const supabase = await createClient();

  // Fetch batches for filter dropdown
  const { data: allBatches } = await supabase
    .from("batches")
    .select("id, name, code")
    .order("name", { ascending: true });

  // Base Student Profiles Query
  let studentQuery = supabase
    .from("student_profiles")
    .select(`
      id,
      student_code,
      academic_level,
      institution,
      registration_status,
      registered_at,
      profile:profiles (
        id,
        full_name,
        email,
        phone,
        account_status
      )
    `, { count: "exact" });

  // 1. Search Query Resolver
  if (search) {
    const { data: matchedProfiles } = await supabase
      .from("profiles")
      .select("id")
      .or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);

    const profileIds = matchedProfiles?.map((p) => p.id) || [];
    
    if (profileIds.length > 0) {
      studentQuery = studentQuery.or(`student_code.ilike.%${search}%,profile_id.in.(${profileIds.map(id => `"${id}"`).join(",")})`);
    } else {
      studentQuery = studentQuery.ilike("student_code", `%${search}%`);
    }
  }

  // 2. Registration Status Filter
  if (regStatus) {
    studentQuery = studentQuery.eq("registration_status", regStatus);
  }

  // 3. Account Status Filter
  if (accStatus) {
    const { data: matchedProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("account_status", accStatus);
    const profileIds = matchedProfiles?.map((p) => p.id) || [];
    if (profileIds.length > 0) {
      studentQuery = studentQuery.in("profile_id", profileIds);
    } else {
      // Return nothing if none matches
      studentQuery = studentQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  // 4. Batch Enrollment Filter
  if (batchId) {
    const { data: enrolls } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("batch_id", batchId);
    const studentIds = enrolls?.map((e) => e.student_id) || [];
    if (studentIds.length > 0) {
      studentQuery = studentQuery.in("id", studentIds);
    } else {
      studentQuery = studentQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  // 5. Active Enrollment Status Filter
  if (hasActiveBatch) {
    const { data: enrolls } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("status", "ACTIVE");
    const activeStudentIds = Array.from(new Set(enrolls?.map((e) => e.student_id) || []));
    
    if (hasActiveBatch === "true") {
      if (activeStudentIds.length > 0) {
        studentQuery = studentQuery.in("id", activeStudentIds);
      } else {
        studentQuery = studentQuery.eq("id", "00000000-0000-0000-0000-000000000000");
      }
    } else {
      if (activeStudentIds.length > 0) {
        studentQuery = studentQuery.not("id", "in", `(${activeStudentIds.map(id => `"${id}"`).join(",")})`);
      }
    }
  }

  // Pagination & Order
  studentQuery = studentQuery.order("registered_at", { ascending: false });
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: students, count } = await studentQuery.range(from, to);
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Enrollments mapper
  const studentIds = students?.map((s) => s.id) || [];
  const enrollCountsMap: Record<string, { total: number; active: number }> = {};
  studentIds.forEach((id) => {
    enrollCountsMap[id] = { total: 0, active: 0 };
  });

  if (studentIds.length > 0) {
    const { data: enrolls } = await supabase
      .from("enrollments")
      .select("student_id, status")
      .in("student_id", studentIds);

    enrolls?.forEach((e) => {
      if (enrollCountsMap[e.student_id]) {
        enrollCountsMap[e.student_id].total++;
        if (e.status === "ACTIVE") {
          enrollCountsMap[e.student_id].active++;
        }
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <DashboardPageHeader
        title="Manage Students"
        description="Verify registrations, suspend profiles, add enrollments, and check academic stats."
      />

      {/* Filters Form */}
      <form method="GET" className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
          {/* Search bar */}
          <div className="md:col-span-2">
            <DebouncedSearchInput
              placeholder="Search ID, Name, Email, Phone..."
              defaultValue={search}
            />
          </div>

          {/* Registration Status filter */}
          <div>
            <select
              name="regStatus"
              defaultValue={regStatus}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            >
              <option value="">Reg Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Account Status filter */}
          <div>
            <select
              name="accStatus"
              defaultValue={accStatus}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            >
              <option value="">Account Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Suspended</option>
            </select>
          </div>

          {/* Batch filter */}
          <div>
            <select
              name="batchId"
              defaultValue={batchId}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            >
              <option value="">By Batch</option>
              {allBatches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Has Active Batch filter */}
          <div>
            <select
              name="hasActiveBatch"
              defaultValue={hasActiveBatch}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-bg/20 text-xs font-bold text-primary focus:border-primary focus:outline-none"
            >
              <option value="">Active Batch Status</option>
              <option value="true">Has Active Batch</option>
              <option value="false">No Active Batch</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-border/20">
          <Link
            href="/teacher/students"
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

      {/* Dedicated Section for Pending Registration and Approval workflow */}
      {/* If any student has PENDING registration and no active batch, show a special callout card list */}
      {page === 1 && !search && !regStatus && !accStatus && !batchId && !hasActiveBatch && (
        <PendingRegistrationWorkflow />
      )}

      {/* Students Table */}
      <div className="bg-white border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        {students && students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50/50 border-b border-border/30 text-muted uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-4 px-6">Student Code & Name</th>
                  <th className="py-4 px-6">Contact Info</th>
                  <th className="py-4 px-6">Academic & School</th>
                  <th className="py-4 px-6 text-center">Active Batches</th>
                  <th className="py-4 px-6 text-center">Reg Status</th>
                  <th className="py-4 px-6 text-center">Account status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-primary">
                {students.map((student: any) => {
                  const profile = student.profile || {};
                  const counts = enrollCountsMap[student.id] || { total: 0, active: 0 };
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/30 transition-colors">
                      {/* Name & ID */}
                      <td className="py-4 px-6">
                        <Link
                          href={`/teacher/students/${student.id}`}
                          className="font-extrabold text-primary hover:text-accent font-display block text-sm"
                        >
                          {profile.full_name}
                        </Link>
                        <span className="text-[10px] font-bold text-muted/70 block mt-0.5">
                          ID: <span className="font-display font-bold">{student.student_code}</span>
                        </span>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-6 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="h-3.5 w-3.5 text-muted" />
                          <span>{profile.email}</span>
                        </div>
                        {profile.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Phone className="h-3 w-3 text-muted" />
                            <span>{profile.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Academic & School */}
                      <td className="py-4 px-6">
                        <span className="font-extrabold block">{student.academic_level}</span>
                        <span className="text-[10px] text-muted font-bold block mt-0.5 truncate max-w-[150px]" title={student.institution}>
                          {student.institution}
                        </span>
                      </td>

                      {/* Active batch count */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center gap-1 bg-primary/5 px-2 py-0.5 border border-primary/10 rounded-lg text-primary font-display font-bold text-[11px]">
                          <span>{counts.active}</span>
                          <span className="text-muted/50 font-normal">/</span>
                          <span>{counts.total}</span>
                        </div>
                      </td>

                      {/* Registration Status */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center">
                          <StatusBadge status={student.registration_status} />
                        </div>
                      </td>

                      {/* Account status */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wide border ${
                              profile.account_status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-rose-50 text-rose-700 border-rose-100"
                            }`}
                          >
                            {profile.account_status === "ACTIVE" ? "Active" : "Suspended"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <StudentListActions
                          studentId={student.id}
                          studentName={profile.full_name || "Unknown"}
                          studentCode={student.student_code}
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
            <Users className="h-10 w-10 text-muted/50 stroke-1 mb-3" />
            <h4 className="text-sm font-bold text-primary">No student profiles found</h4>
            <p className="text-xs text-muted font-medium mt-1 max-w-xs leading-relaxed">
              No registered students match your search or filter configuration.
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
                href={`/teacher/students?page=${page - 1}&search=${search}&regStatus=${regStatus}&accStatus=${accStatus}&batchId=${batchId}&hasActiveBatch=${hasActiveBatch}`}
                className={`px-3 py-1.5 border border-border/60 bg-white hover:bg-slate-50 text-xs font-bold rounded-xl transition-all ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Previous
              </Link>
              <Link
                href={`/teacher/students?page=${page + 1}&search=${search}&regStatus=${regStatus}&accStatus=${accStatus}&batchId=${batchId}&hasActiveBatch=${hasActiveBatch}`}
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

// Sub-component: Pending registrations console callout
async function PendingRegistrationWorkflow() {
  const supabase = await createClient();

  // Query student profiles whose registration is PENDING
  const { data: pendingStudents } = await supabase
    .from("student_profiles")
    .select(`
      id,
      student_code,
      academic_level,
      registered_at,
      profile:profiles (
        id,
        full_name,
        email
      )
    `)
    .eq("registration_status", "PENDING")
    .limit(5);

  if (!pendingStudents || pendingStudents.length === 0) {
    return null;
  }

  // Filter out any that actually have a batch enrollment (even disabled ones to be safe, or just check those with no active enrollment)
  const pendingStudentIds = pendingStudents.map((s) => s.id);
  const { data: enrolls } = await supabase
    .from("enrollments")
    .select("student_id")
    .in("student_id", pendingStudentIds);

  const enrolledStudentIds = new Set(enrolls?.map((e) => e.student_id) || []);
  const pendingList = pendingStudents.filter((s) => !enrolledStudentIds.has(s.id));

  if (pendingList.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50/50 border border-amber-200/60 p-5 rounded-2xl space-y-4">
      <div className="flex items-center gap-2 text-amber-800">
        <Users className="h-5 w-5" />
        <h3 className="text-sm font-extrabold font-display">
          Action Required: Pending Registrations ({pendingList.length})
        </h3>
      </div>
      <p className="text-xs text-muted max-w-2xl font-medium leading-relaxed">
        These students registered successfully on the public portal but have no active enrollments. Select a student to configure their first class and approve their account.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {pendingList.map((st: any) => (
          <div key={st.id} className="bg-white border border-amber-200/40 rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <span className="text-[10px] font-bold text-amber-700/80 uppercase font-display tracking-wider block">
                ID Code: {st.student_code}
              </span>
              <h4 className="text-sm font-extrabold text-primary mt-1 font-display">
                {st.profile?.full_name}
              </h4>
              <div className="flex gap-2 text-[10px] text-muted font-bold mt-1">
                <span>{st.academic_level}</span>
                <span>&bull;</span>
                <span>Registered: {new Date(st.registered_at).toLocaleDateString()}</span>
              </div>
            </div>
            <Link
              href={`/teacher/students/${st.id}`}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              Review & Approve
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
