import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { 
  ShieldAlert, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  GraduationCap,
  Users,
  Settings,
  ArrowRight
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    category?: string;
    action?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}

export default async function TeacherAuditLogsPage({ searchParams }: PageProps) {
  const { profile, destination } = await resolveAuthenticatedDestination();

  if (destination !== "TEACHER_DASHBOARD" || !profile || profile.role !== "TEACHER") {
    redirect("/login");
  }

  const admin = createAdminClient();
  const sp = await searchParams;

  const activeCategory = sp.category || "ALL";
  const filterAction = sp.action || "";
  const filterEntityType = sp.entityType || "";
  const filterStartDate = sp.startDate || "";
  const filterEndDate = sp.endDate || "";
  const currentPage = Math.max(1, parseInt(sp.page || "1"));
  const pageSize = 15;

  // 1. Fetch distinct action & entity options
  const { data: actionsData } = await admin.from("audit_logs").select("action");
  const actionsList = Array.from(new Set(actionsData?.map(a => a.action) || [])).sort();

  const { data: entitiesData } = await admin.from("audit_logs").select("entity_type");
  const entitiesList = Array.from(new Set(entitiesData?.map(e => e.entity_type) || [])).sort();

  // 2. Build Query
  let query = admin.from("audit_logs").select("*", { count: "exact" });

  if (activeCategory === "STUDENTS") {
    query = query.in("entity_type", ["student_profile", "enrollment", "student_profiles", "enrollments"]);
  } else if (activeCategory === "EXAMS") {
    query = query.in("entity_type", ["exam", "exam_result", "exams", "exam_results"]);
  } else if (activeCategory === "PAYMENTS") {
    query = query.in("entity_type", ["payment", "payments"]);
  } else if (activeCategory === "SYSTEM") {
    query = query.in("entity_type", ["setting", "settings", "teacher_profile", "teacher_profiles", "profile"]);
  }

  if (filterAction) query = query.eq("action", filterAction);
  if (filterEntityType) query = query.eq("entity_type", filterEntityType);
  if (filterStartDate) query = query.gte("created_at", filterStartDate);
  if (filterEndDate) query = query.lte("created_at", `${filterEndDate}T23:59:59.999Z`);

  query = query.order("created_at", { ascending: false });
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: rawLogs, count } = await query.range(from, to);
  const totalPages = Math.ceil((count || 0) / pageSize);

  // 3. Robust Actor Profile Lookup (bulletproof against foreign key mismatches)
  const actorIds = Array.from(new Set(rawLogs?.map(l => l.actor_user_id).filter(Boolean) || []));
  let profileMap = new Map<string, { id: string; full_name: string; email: string; role: string }>();

  if (actorIds.length > 0) {
    const { data: profilesData } = await admin
      .from("profiles")
      .select("id, full_name, email, role")
      .in("id", actorIds);
    if (profilesData) {
      profileMap = new Map(profilesData.map(p => [p.id, p]));
    }
  }

  // Human-friendly narrative generator
  const getHumanNarrative = (action: string, entityType: string, oldVal: any, newVal: any, actorName: string) => {
    const actClean = action.replace(/_/g, " ").toUpperCase();
    const entClean = entityType.replace(/_/g, " ").toUpperCase();

    if (action.includes("CREATE") || action.includes("INSERT") || action === "STUDENT_REGISTERED") {
      return `${actorName} recorded/created a new ${entClean.toLowerCase()} entry.`;
    }
    if (action.includes("UPDATE") || action.includes("EDIT")) {
      if (oldVal?.status && newVal?.status && oldVal.status !== newVal.status) {
        return `${actorName} changed ${entClean.toLowerCase()} status from "${oldVal.status}" to "${newVal.status}".`;
      }
      return `${actorName} updated ${entClean.toLowerCase()} details.`;
    }
    if (action.includes("DELETE") || action.includes("REMOVE")) {
      return `${actorName} deleted/removed a ${entClean.toLowerCase()} record.`;
    }
    if (action.includes("PUBLISH")) {
      return `${actorName} published official ${entClean.toLowerCase()} data.`;
    }
    return `${actorName} performed action: ${actClean} on ${entClean}.`;
  };

  // Helper to render clean human-readable diffs
  const renderCleanDiff = (oldVal: any, newVal: any) => {
    if (!oldVal && !newVal) return <span className="text-slate-400 italic text-[11px]">No specific field changes recorded</span>;

    if (typeof oldVal !== "object" && typeof newVal !== "object") {
      return (
        <div className="flex items-center gap-2 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-border/40 w-fit font-mono">
          <span className="text-rose-600 font-bold line-through">{String(oldVal || "none")}</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-emerald-700 font-extrabold">{String(newVal || "none")}</span>
        </div>
      );
    }

    const allKeys = Array.from(new Set([...Object.keys(oldVal || {}), ...Object.keys(newVal || {})]));
    const changes = allKeys.filter(
      k => JSON.stringify(oldVal?.[k]) !== JSON.stringify(newVal?.[k])
    );

    if (changes.length === 0) {
      return <span className="text-slate-400 italic text-[11px]">No value differences found</span>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {changes.map(k => {
          if (k === "updated_at" || k === "created_at" || k === "id") return null;
          const ov = oldVal?.[k];
          const nv = newVal?.[k];
          return (
            <div key={k} className="flex items-center gap-1.5 bg-slate-50/90 hover:bg-slate-100/90 transition-colors px-2.5 py-1 rounded-xl border border-border/30 text-[11px] font-medium shadow-2xs">
              <span className="font-bold text-slate-600 uppercase tracking-tight">{k}:</span>
              <span className="text-rose-600 font-bold line-through max-w-[120px] truncate">
                {ov === undefined || ov === null ? "none" : typeof ov === "object" ? JSON.stringify(ov) : String(ov)}
              </span>
              <span className="text-slate-400">➔</span>
              <span className="text-emerald-700 font-extrabold max-w-[140px] truncate">
                {nv === undefined || nv === null ? "none" : typeof nv === "object" ? JSON.stringify(nv) : String(nv)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const getBadgeStyle = (action: string) => {
    if (action.includes("CREATE") || action.includes("INSERT") || action === "STUDENT_REGISTERED") {
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    }
    if (action.includes("UPDATE") || action.includes("EDIT")) {
      return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    }
    if (action.includes("DELETE") || action.includes("REMOVE")) {
      return "bg-rose-500/10 text-rose-700 border-rose-500/20";
    }
    return "bg-primary/10 text-primary border-primary/20";
  };

  return (
    <div className="space-y-8 text-xs font-bold text-primary max-w-full overflow-hidden">
      <DashboardPageHeader
        title="Security & System Activity Ledger"
        description="Monitor real-time system activities, track student enrollments, exam score updates, and fee ledgers in a clean human-readable audit trail."
        actions={
          <div className="px-3.5 py-1.5 bg-emerald-500/10 text-emerald-700 rounded-xl border border-emerald-500/20 flex items-center gap-1.5 shadow-2xs">
            <ShieldAlert className="h-4 w-4 animate-pulse" />
            <span className="text-[10px] uppercase tracking-wider font-extrabold">Active System Guard</span>
          </div>
        }
      />

      {/* Quick Category Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-border/40 shadow-xs">
        {[
          { id: "ALL", label: "All Activities", icon: Filter },
          { id: "STUDENTS", label: "Students & Enrollments", icon: Users },
          { id: "EXAMS", label: "Exams & Results", icon: GraduationCap },
          { id: "PAYMENTS", label: "Tuition & Fee Ledger", icon: CreditCard },
          { id: "SYSTEM", label: "Portal & Settings", icon: Settings },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/teacher/audit-logs?category=${tab.id}&action=${filterAction}&entityType=${filterEntityType}&startDate=${filterStartDate}&endDate=${filterEndDate}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                isActive
                  ? "bg-primary text-white font-black shadow-sm"
                  : "bg-slate-50/80 hover:bg-slate-100 text-slate-700 font-bold"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Compact Advanced Filter Box */}
      <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end">
          <input type="hidden" name="category" value={activeCategory} />
          
          <div>
            <label className="block text-[10px] text-muted uppercase font-bold mb-1">Action Event</label>
            <select
              name="action"
              defaultValue={filterAction}
              className="w-full px-3 py-2 border border-border/60 rounded-xl bg-slate-50/50 focus:border-primary focus:outline-none"
            >
              <option value="">All Actions</option>
              {actionsList.map(a => (
                <option key={a} value={a}>{a.replace(/_/g, " ").toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-muted uppercase font-bold mb-1">Entity Type</label>
            <select
              name="entityType"
              defaultValue={filterEntityType}
              className="w-full px-3 py-2 border border-border/60 rounded-xl bg-slate-50/50 focus:border-primary focus:outline-none"
            >
              <option value="">All Entities</option>
              {entitiesList.map(e => (
                <option key={e} value={e}>{e.replace(/_/g, " ").toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-muted uppercase font-bold mb-1">From Date</label>
            <input
              type="date"
              name="startDate"
              defaultValue={filterStartDate}
              className="w-full px-3 py-2 border border-border/60 rounded-xl bg-slate-50/50 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] text-muted uppercase font-bold mb-1">To Date</label>
            <input
              type="date"
              name="endDate"
              defaultValue={filterEndDate}
              className="w-full px-3 py-2 border border-border/60 rounded-xl bg-slate-50/50 focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl font-extrabold shadow-sm transition-all"
            >
              Filter
            </button>
            <Link
              href="/teacher/audit-logs"
              className="px-3 py-2 border border-border bg-white hover:bg-slate-50 text-primary rounded-xl font-bold flex items-center justify-center transition-all"
              title="Reset"
            >
              Reset
            </Link>
          </div>
        </form>
      </div>

      {/* Human-Readable Activity Feed Table */}
      <div className="bg-white rounded-2xl border border-border/40 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border/20 flex justify-between items-center bg-slate-50/50">
          <div className="space-y-0.5">
            <h3 className="text-sm font-extrabold font-display text-slate-800">System Activity Stream</h3>
            <p className="text-[11px] text-slate-500 font-medium">All administrative actions are append-only and permanently verifiable.</p>
          </div>
          <span className="px-3 py-1 bg-white border border-border/40 rounded-full text-[11px] font-extrabold text-slate-700 shadow-2xs">
            {count || 0} Total Events
          </span>
        </div>

        {rawLogs && rawLogs.length > 0 ? (
          <div className="divide-y divide-border/20 font-sans">
            {rawLogs.map((log) => {
              const actorProfile = log.actor_user_id ? profileMap.get(log.actor_user_id) : null;
              const actorName = actorProfile?.full_name || "System Process";
              const actorEmail = actorProfile?.email || "Automated Worker";
              const narrative = getHumanNarrative(log.action, log.entity_type, log.old_value, log.new_value, actorName);

              return (
                <div key={log.id} className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left Column: Actor & Narrative */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0 border border-primary/15 shadow-2xs">
                      {actorName.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase border ${getBadgeStyle(log.action)}`}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-[11px] font-extrabold text-slate-800 truncate">{narrative}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                        <span className="flex items-center gap-1 font-bold text-slate-700">
                          <User className="h-3 w-3 text-primary" /> {actorName} ({actorEmail})
                        </span>
                        <span className="font-mono text-slate-400 text-[10px]">
                          Target ID: {log.entity_id.slice(0, 8)}...
                        </span>
                        {log.ip_address && (
                          <span className="font-mono text-slate-400 text-[10px]">
                            IP: {log.ip_address}
                          </span>
                        )}
                      </div>

                      {/* Visual Diff Box */}
                      <div className="pt-1">
                        {renderCleanDiff(log.old_value, log.new_value)}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Timestamp */}
                  <div className="text-right shrink-0 md:pl-4 border-t md:border-t-0 pt-2 md:pt-0 border-border/10 flex md:flex-col justify-between items-center md:items-end">
                    <span className="text-[11px] font-extrabold text-slate-700">
                      {new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-muted">
            <Clock className="h-12 w-12 text-slate-300 stroke-1 mx-auto mb-3" />
            <h4 className="text-base font-extrabold text-slate-700">No Activity Logs Found</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mx-auto leading-relaxed font-medium">
              No audit events match your selected category or active filters. Try resetting the filters above.
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-border/20 bg-slate-50/50">
            <span className="text-[11px] text-slate-500 font-bold">
              Showing Page <span className="text-primary font-black">{currentPage}</span> of {totalPages}
            </span>
            <div className="flex gap-2">
              <Link
                href={`/teacher/audit-logs?category=${activeCategory}&action=${filterAction}&entityType=${filterEntityType}&startDate=${filterStartDate}&endDate=${filterEndDate}&page=${currentPage - 1}`}
                className={`px-3 py-1.5 border border-border/80 rounded-xl bg-white hover:bg-slate-50 font-bold text-xs flex items-center gap-1 ${currentPage <= 1 ? "opacity-50 pointer-events-none" : ""}`}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Link>
              <Link
                href={`/teacher/audit-logs?category=${activeCategory}&action=${filterAction}&entityType=${filterEntityType}&startDate=${filterStartDate}&endDate=${filterEndDate}&page=${currentPage + 1}`}
                className={`px-3 py-1.5 border border-border/80 rounded-xl bg-white hover:bg-slate-50 font-bold text-xs flex items-center gap-1 ${currentPage >= totalPages ? "opacity-50 pointer-events-none" : ""}`}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
