import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BookOpenCheck,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Link2,
  MapPin,
  Sparkles,
  XCircle,
} from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

function one<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] || null : value;
}

function dhakaDateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

export default async function StudentRoutinePage() {
  const { destination, studentProfile } = await resolveAuthenticatedDestination();
  if (destination === "UNAUTHENTICATED") redirect("/login");
  if (destination === "PENDING_APPROVAL") redirect("/pending-approval");
  if (destination === "ACCOUNT_DISABLED") redirect("/account-disabled");
  if (destination !== "STUDENT_DASHBOARD" || !studentProfile) redirect("/login?error=invalid_profile");

  const supabase = await createClient();
  const { data: enrollments, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("batch_id")
    .eq("student_id", studentProfile.id)
    .eq("status", "ACTIVE");
  if (enrollmentError) throw enrollmentError;
  const batchIds = (enrollments || []).map((row) => row.batch_id);

  // Keep recent completed history while prioritizing the live upcoming routine.
  // eslint-disable-next-line react-hooks/purity
  const historyStart = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
  const { data: sessions, error: sessionsError } = batchIds.length
    ? await supabase
        .from("academic_class_sessions")
        .select("*,batch:batches(id,name,code),subject:batch_subjects(id,name,code),unit:subject_units(id,title)")
        .in("batch_id", batchIds)
        .gte("starts_at", historyStart)
        .order("starts_at", { ascending: true })
    : { data: [], error: null };
  if (sessionsError) throw sessionsError;

  const rows = sessions || [];
  const now = new Date();
  const todayKey = dhakaDateKey(now);
  const today = rows.filter((session) => session.status === "SCHEDULED" && dhakaDateKey(session.starts_at) === todayKey);
  const upcoming = rows.filter((session) => session.status === "SCHEDULED" && new Date(session.ends_at) >= now);
  const completed = rows.filter((session) => session.status === "COMPLETED");
  const cancelled = rows.filter((session) => session.status === "CANCELLED");
  const visibleSessions = [
    ...upcoming,
    ...cancelled.filter((session) => new Date(session.ends_at) >= now),
    ...completed.slice(-12).reverse(),
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 pb-12">
      <DashboardPageHeader title="My Class Routine" description="See every upcoming class, subject, chapter, room, and class link from your active batches." />

      <section className="relative overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_85%_12%,rgba(103,232,249,.18),transparent_28%),linear-gradient(135deg,#061633,#102A66_58%,#214A9A)] p-6 text-white shadow-2xl shadow-blue-950/15 sm:p-8">
        <div className="relative grid gap-8 xl:grid-cols-[1.2fr_1fr] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100"><Sparkles className="h-3.5 w-3.5" /> Personal class timeline</div>
            <h1 className="mt-5 max-w-2xl font-display text-3xl font-black leading-tight sm:text-4xl">Know what you will learn before the class begins.</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-blue-100/80">Your schedule is connected to the exact subject and syllabus chapter—only from batches where you are actively enrolled.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: today.length, label: "Today", Icon: Clock3 },
              { value: upcoming.length, label: "Upcoming", Icon: CalendarClock },
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

      {visibleSessions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <CalendarCheck2 className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 font-display text-lg font-black text-primary">No classes scheduled yet</h2>
          <p className="mx-auto mt-2 max-w-md text-xs font-semibold text-muted">Subject-linked classes from your active batches will appear here.</p>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div><h2 className="font-display text-xl font-black text-primary">Class timeline</h2><p className="mt-1 text-xs font-semibold text-muted">Upcoming classes first, followed by recent completed classes.</p></div>
            <span className="text-[10px] font-black uppercase tracking-wide text-muted">{visibleSessions.length} entries</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleSessions.map((session) => {
              const batch = one(session.batch as unknown as { name: string; code: string } | { name: string; code: string }[] | null);
              const subject = one(session.subject as unknown as { name: string; code: string } | { name: string; code: string }[] | null);
              const unit = one(session.unit as unknown as { title: string } | { title: string }[] | null);
              const isToday = dhakaDateKey(session.starts_at) === todayKey;
              return (
                <article key={session.id} className={`rounded-3xl border bg-white p-5 shadow-sm ${isToday && session.status === "SCHEDULED" ? "border-blue-300 ring-4 ring-blue-50" : "border-border/60"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2"><StatusBadge status={session.status} />{isToday && session.status === "SCHEDULED" && <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white">Today</span>}</div>
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-violet-600">{session.session_type.replaceAll("_", " ")}</span>
                  </div>
                  <h3 className="mt-4 line-clamp-2 font-display text-lg font-black text-primary">{session.title}</h3>
                  <p className="mt-2 text-[10px] font-bold text-blue-600">{batch?.name || "Batch"} · {subject?.name || "Subject"}</p>
                  {unit && <p className="mt-1 truncate text-[10px] font-semibold text-muted">Chapter: {unit.title}</p>}
                  <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start gap-2"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" /><div><p className="text-[10px] font-black text-primary">{formatDate(session.starts_at)}</p><p className="mt-0.5 text-[10px] font-semibold text-muted">{formatTime(session.starts_at)} – {formatTime(session.ends_at)}</p></div></div>
                    {session.location && <div className="flex items-center gap-2 text-[10px] font-semibold text-muted"><MapPin className="h-3.5 w-3.5 shrink-0" /><span>{session.location}</span></div>}
                    {session.student_note && <div className="border-t border-slate-200 pt-3 text-[10px] font-semibold leading-5 text-slate-600">{session.student_note}</div>}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <Link href={`/student/batches/${session.batch_id}/academics`} className="inline-flex items-center gap-1.5 text-[10px] font-black text-blue-700 hover:underline"><BookOpenCheck className="h-3.5 w-3.5" /> Academic journey</Link>
                    {session.class_link && session.status === "SCHEDULED" && <a href={session.class_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[9px] font-black uppercase tracking-wide text-white hover:bg-blue-700"><Link2 className="h-3.5 w-3.5" /> Open class <ArrowUpRight className="h-3 w-3" /></a>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
