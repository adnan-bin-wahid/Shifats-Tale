import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Layers3,
  Plus,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";

function clamp(value: number | null | undefined) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

export default async function TeacherAcademicOverviewPage() {
  const supabase = await createClient();
  const [{ data: batches }, { data: progressRows }] = await Promise.all([
    supabase
      .from("batches")
      .select("id, name, code, academic_level, status, start_date, end_date")
      .order("created_at", { ascending: false }),
    supabase.from("batch_academic_progress").select("*"),
  ]);

  const progressByBatch = new Map(
    (progressRows || []).map((row) => [row.batch_id, row])
  );
  const academicBatches = (batches || []).map((batch) => ({
    ...batch,
    progress: progressByBatch.get(batch.id),
  }));

  const totalSubjects = academicBatches.reduce(
    (sum, batch) => sum + Number(batch.progress?.total_subjects || 0),
    0
  );
  const runningSubjects = academicBatches.reduce(
    (sum, batch) => sum + Number(batch.progress?.running_subjects || 0),
    0
  );
  const completedUnits = academicBatches.reduce(
    (sum, batch) => sum + Number(batch.progress?.completed_units || 0),
    0
  );
  const totalUnits = academicBatches.reduce(
    (sum, batch) => sum + Number(batch.progress?.total_units || 0),
    0
  );
  const publishedResults = academicBatches.reduce(
    (sum, batch) => sum + Number(batch.progress?.published_results || 0),
    0
  );

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        title="Academic Control Center"
        description="Plan every batch from subject roadmap to syllabus completion, examinations, and published results."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/teacher/assignments"
              className="inline-flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-4 py-2.5 text-xs font-extrabold text-violet-700 transition hover:bg-violet-100"
            >
              <ClipboardList className="h-4 w-4" />
              Assignments
            </Link>
            <Link
              href="/teacher/reports/academic"
              className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-extrabold text-blue-700 transition hover:bg-blue-100"
            >
              <BarChart3 className="h-4 w-4" />
              Academic Reports
            </Link>
            <Link
              href="/teacher/batches/new"
              className="primary-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold shadow-lg shadow-primary/10"
            >
              <Plus className="h-4 w-4" />
              Create Batch
            </Link>
          </div>
        }
      />

      <section className="relative overflow-hidden rounded-[28px] border border-[#DCE5F5] bg-[linear-gradient(135deg,#071A3D_0%,#102A66_58%,#214A9A_100%)] p-6 text-white shadow-xl shadow-[#071A3D]/10 sm:p-8">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-violet-300/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Live academic operations
            </div>
            <div>
              <h2 className="max-w-2xl font-display text-2xl font-black leading-tight sm:text-3xl">
                One clear command view for every learning journey.
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-blue-100/85">
                Organize subjects, break the syllabus into measurable units, link every exam, and know exactly where each batch stands.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              [String(academicBatches.length), "Batches", Layers3],
              [String(totalSubjects), "Subjects", BookOpenCheck],
              [`${completedUnits}/${totalUnits}`, "Units done", CheckCircle2],
              [String(publishedResults), "Results live", ClipboardCheck],
            ].map(([value, label, Icon]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-white/12 bg-white/[0.08] p-4 backdrop-blur-sm"
              >
                <Icon className="mb-3 h-4 w-4 text-cyan-200" />
                <p className="font-display text-2xl font-black">{String(value)}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-100/70">
                  {String(label)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Curriculum scale</p>
          <p className="mt-2 font-display text-2xl font-black text-[#102A66]">{totalSubjects}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Subjects across all batches</p>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">Currently teaching</p>
          <p className="mt-2 font-display text-2xl font-black text-violet-800">{runningSubjects}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Subjects in running state</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Syllabus delivery</p>
          <p className="mt-2 font-display text-2xl font-black text-emerald-800">{completedUnits}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Completed chapters and topics</p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-black text-primary">Batch workspaces</h2>
            <p className="mt-1 text-xs font-semibold text-muted">Open a batch to manage its complete academic plan.</p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-muted">
            {academicBatches.length} total
          </span>
        </div>

        {academicBatches.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Layers3 className="mx-auto h-9 w-9 text-slate-300" />
            <h3 className="mt-4 font-display text-lg font-black text-primary">No batches yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium text-muted">
              Create your first batch. Its default subject will be prepared automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {academicBatches.map((batch) => {
              const academicProgress = clamp(batch.progress?.academic_progress_percentage);
              const examProgress = clamp(batch.progress?.exam_plan_progress_percentage);
              return (
                <Link
                  key={batch.id}
                  href={`/teacher/academic/${batch.id}`}
                  className="group rounded-3xl border border-border/60 bg-white p-5 shadow-sm shadow-primary/5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-primary/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <StatusBadge status={batch.status} />
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-slate-500">
                          {batch.code}
                        </span>
                      </div>
                      <h3 className="truncate font-display text-lg font-black text-primary transition-colors group-hover:text-blue-700">
                        {batch.name}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-muted">{batch.academic_level}</p>
                    </div>
                    <span className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-primary transition-all group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wide">
                        <span className="text-slate-500">Syllabus progress</span>
                        <span className="text-primary">{academicProgress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#175CD3,#4F8EF7)] transition-all"
                          style={{ width: `${academicProgress}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wide">
                        <span className="text-slate-500">Exam journey</span>
                        <span className="text-primary">{examProgress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#7C3AED,#A78BFA)] transition-all"
                          style={{ width: `${examProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                    <div>
                      <p className="font-display text-lg font-black text-primary">{Number(batch.progress?.total_subjects || 0)}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-muted">Subjects</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-black text-primary">{Number(batch.progress?.completed_units || 0)}/{Number(batch.progress?.total_units || 0)}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-muted">Units</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-black text-primary">{Number(batch.progress?.conducted_exams || 0)}/{Number(batch.progress?.planned_exams || 0)}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wide text-muted">Exams</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
