import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Plus,
  XCircle,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { RoutineFilters } from "@/components/class-routine/routine-filters";
import { ClassSessionStatusActions } from "@/components/class-routine/class-session-status-actions";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ClassSessionStatus } from "@/lib/validations/class-routine";
import { classSessionStatuses } from "@/lib/validations/class-routine";

type Relation = { id: string; name: string; code?: string };

function one<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] || null : value;
}

function formatDhaka(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

function dhakaDateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function TeacherRoutinePage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string; subjectId?: string; status?: string; q?: string }>;
}) {
  const [{ destination }, filters] = await Promise.all([
    resolveAuthenticatedDestination(),
    searchParams,
  ]);
  if (destination === "UNAUTHENTICATED") redirect("/login");
  if (destination !== "TEACHER_DASHBOARD") redirect("/student");

  const admin = createAdminClient();
  const batchId = filters.batchId && UUID_PATTERN.test(filters.batchId) ? filters.batchId : "";
  const subjectId = filters.subjectId && UUID_PATTERN.test(filters.subjectId) ? filters.subjectId : "";
  const status = classSessionStatuses.includes(filters.status as ClassSessionStatus)
    ? (filters.status as ClassSessionStatus)
    : "";
  const searchQuery = filters.q?.trim().slice(0, 120) || "";
  let query = admin
    .from("academic_class_sessions")
    .select("*,batch:batches(id,name,code),subject:batch_subjects(id,name,code),unit:subject_units(id,title)")
    .order("starts_at", { ascending: true });
  if (batchId) query = query.eq("batch_id", batchId);
  if (subjectId) query = query.eq("subject_id", subjectId);
  if (status) query = query.eq("status", status);
  if (searchQuery) query = query.ilike("title", `%${searchQuery}%`);

  const [sessionsResult, batchesResult, subjectsResult] = await Promise.all([
    query,
    admin.from("batches").select("id,name").order("name"),
    admin.from("batch_subjects").select("id,batch_id,name").order("display_order"),
  ]);
  const error = sessionsResult.error || batchesResult.error || subjectsResult.error;
  if (error) throw error;

  const sessions = sessionsResult.data || [];
  // Server-rendered request snapshot used only for routine summary classification.
  const now = new Date();
  const todayKey = dhakaDateKey(now);
  const scheduled = sessions.filter((session) => session.status === "SCHEDULED");
  const today = scheduled.filter((session) => dhakaDateKey(session.starts_at) === todayKey);
  const completed = sessions.filter((session) => session.status === "COMPLETED");
  const cancelled = sessions.filter((session) => session.status === "CANCELLED");

  return (
    <div className="space-y-7">
      <DashboardPageHeader
        title="Academic Class Routine"
        description="Plan every class by batch, subject, syllabus unit, date, and time. The public routine flyer remains separate."
        actions={
          <Link href="/teacher/routine/new" className="primary-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black">
            <Plus className="h-4 w-4" /> Schedule class
          </Link>
        }
      />

      <section className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_86%_14%,rgba(103,232,249,.18),transparent_28%),linear-gradient(135deg,#061633,#102A66_58%,#254B9B)] p-6 text-white shadow-xl shadow-blue-950/10 sm:p-7">
        <div className="relative grid gap-6 xl:grid-cols-[1.2fr_1fr] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
              <CalendarCheck2 className="h-3.5 w-3.5" /> Subject-connected schedule
            </div>
            <h2 className="text-white mt-4 max-w-xl font-display text-2xl font-black sm:text-3xl">One timeline from classroom plan to completed lesson.</h2>
            <p className="mt-2 max-w-xl text-xs font-semibold leading-6 text-blue-100/80">Students see the right subject, chapter, room, link, and schedule only for their enrolled batches.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: scheduled.length, label: "Scheduled", Icon: CalendarClock },
              { value: today.length, label: "Today", Icon: Clock3 },
              { value: completed.length, label: "Completed", Icon: CheckCircle2 },
              { value: cancelled.length, label: "Cancelled", Icon: XCircle },
            ].map(({ value, label, Icon }) => (
              <div key={label} className="rounded-2xl border border-white/12 bg-white/[0.08] p-4">
                <Icon className="h-4 w-4 text-cyan-200" />
                <p className="mt-3 font-display text-2xl font-black">{value}</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-blue-100/70">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <RoutineFilters
        batches={batchesResult.data || []}
        subjects={subjectsResult.data || []}
        initialBatchId={batchId}
        initialSubjectId={subjectId}
        initialStatus={status}
        initialQuery={searchQuery}
      />

      {sessions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-4 font-display text-lg font-black text-primary">No classes match these filters</h3>
          <p className="mx-auto mt-2 max-w-md text-xs font-semibold text-muted">Reset the filters or schedule the first subject-linked class.</p>
          <Link href="/teacher/routine/new" className="primary-btn mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black"><Plus className="h-4 w-4" /> Schedule class</Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => {
            const batch = one(session.batch as unknown as Relation | Relation[] | null);
            const subject = one(session.subject as unknown as Relation | Relation[] | null);
            const unit = one(session.unit as unknown as { id: string; title: string } | { id: string; title: string }[] | null);
            return (
              <article key={session.id} className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/8">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={session.status} />
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-violet-600">{session.session_type.replaceAll("_", " ")}</span>
                  </div>
                  <Link href={`/teacher/routine/${session.id}/edit`} aria-label={`Edit ${session.title}`} className="rounded-xl bg-slate-50 p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-700"><ArrowRight className="h-4 w-4" /></Link>
                </div>
                <h3 className="mt-4 line-clamp-2 font-display text-lg font-black text-primary">{session.title}</h3>
                <p className="mt-2 text-[10px] font-bold text-blue-600">{batch?.name || "Batch"} · {subject?.name || "Subject"}</p>
                {unit && <p className="mt-1 truncate text-[10px] font-semibold text-muted">Chapter: {unit.title}</p>}
                <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start gap-2 text-[10px] font-bold text-primary"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /><span>{formatDhaka(session.starts_at)}</span></div>
                  {session.location && <div className="flex items-center gap-2 text-[10px] font-semibold text-muted"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{session.location}</span></div>}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <ClassSessionStatusActions sessionId={session.id} status={session.status} />
                  <Link href={`/teacher/routine/${session.id}/edit`} className="text-[10px] font-black text-blue-700 hover:underline">Edit details</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
