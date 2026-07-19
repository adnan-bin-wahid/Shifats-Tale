import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  Layers3,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";

type AcademicBatchSummary = {
  id: string;
  name: string;
  code: string;
  academic_level: string;
  status: string;
  start_date: string;
  end_date: string | null;
};

function clamp(value: number | null | undefined) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function getWeightedAverage(
  rows: Array<{
    average_percentage: number | null;
    published_exam_count: number | null;
  }>
) {
  const examCount = rows.reduce(
    (sum, row) => sum + Number(row.published_exam_count || 0),
    0
  );
  if (examCount === 0) return null;

  const weightedScore = rows.reduce(
    (sum, row) =>
      sum +
      Number(row.average_percentage || 0) *
        Number(row.published_exam_count || 0),
    0
  );
  return Math.round((weightedScore / examCount) * 100) / 100;
}

function ProgressRail({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.12em]">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-800">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default async function StudentAcademicsPage() {
  const { destination, profile, studentProfile } =
    await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") redirect("/login");
  if (destination === "PENDING_APPROVAL") redirect("/pending-approval");
  if (destination === "ACCOUNT_DISABLED") redirect("/account-disabled");
  if (destination !== "STUDENT_DASHBOARD" || !profile || !studentProfile) {
    redirect("/login?error=invalid_profile");
  }

  const supabase = await createClient();
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      "id, batch_id, enrolled_at, batch:batches(id, name, code, academic_level, status, start_date, end_date)"
    )
    .eq("student_id", studentProfile.id)
    .eq("status", "ACTIVE")
    .order("enrolled_at", { ascending: false });

  const activeEnrollments = enrollments || [];
  const batchIds = activeEnrollments.map((enrollment) => enrollment.batch_id);

  const [batchProgressResult, subjectProgressResult, performanceResult, examsResult] =
    batchIds.length
      ? await Promise.all([
          supabase
            .from("batch_academic_progress")
            .select("*")
            .in("batch_id", batchIds),
          supabase
            .from("subject_progress_summary")
            .select("*")
            .in("batch_id", batchIds),
          supabase
            .from("student_subject_performance")
            .select("*")
            .eq("student_id", studentProfile.id)
            .in("batch_id", batchIds),
          supabase
            .from("exams")
            .select(
              "id, batch_id, subject_id, name, exam_type, exam_date, start_time, status"
            )
            .in("batch_id", batchIds)
            .eq("status", "SCHEDULED")
            .order("exam_date", { ascending: true }),
        ])
      : [
          { data: [] },
          { data: [] },
          { data: [] },
          { data: [] },
        ];

  const progressRows = batchProgressResult.data || [];
  const subjectRows = subjectProgressResult.data || [];
  const performanceRows = performanceResult.data || [];
  const today = new Date().toISOString().slice(0, 10);
  const upcomingExams = (examsResult.data || []).filter(
    (exam) => exam.exam_date >= today
  );

  const progressByBatch = new Map(
    progressRows.map((row) => [row.batch_id, row])
  );
  const batches = activeEnrollments.flatMap((enrollment) => {
    const rawBatch = enrollment.batch as unknown as
      | AcademicBatchSummary
      | AcademicBatchSummary[]
      | null;
    const batch = Array.isArray(rawBatch) ? rawBatch[0] : rawBatch;
    if (!batch) return [];
    const subjects = subjectRows.filter((row) => row.batch_id === batch.id);
    const performance = performanceRows.filter(
      (row) => row.batch_id === batch.id
    );
    const nextExam = upcomingExams.find((exam) => exam.batch_id === batch.id);

    return [{
      ...batch,
      progress: progressByBatch.get(batch.id) || null,
      subjectCount: subjects.length,
      average: getWeightedAverage(performance),
      publishedExamCount: performance.reduce(
        (sum, row) => sum + Number(row.published_exam_count || 0),
        0
      ),
      nextExam,
    }];
  });

  const totalSubjects = batches.reduce(
    (sum, batch) => sum + Number(batch.progress?.total_subjects || 0),
    0
  );
  const completedUnits = batches.reduce(
    (sum, batch) => sum + Number(batch.progress?.completed_units || 0),
    0
  );
  const totalUnits = batches.reduce(
    (sum, batch) => sum + Number(batch.progress?.total_units || 0),
    0
  );
  const publishedResults = batches.reduce(
    (sum, batch) => sum + Number(batch.progress?.published_results || 0),
    0
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 pb-12 text-xs font-bold text-primary">
      <DashboardPageHeader
        title="My Academic Journey"
        description="See exactly what you are learning, what comes next, and how your examination journey is progressing."
      />

      <section className="relative overflow-hidden rounded-[30px] border border-blue-900/20 bg-[radial-gradient(circle_at_85%_10%,rgba(103,232,249,0.18),transparent_28%),linear-gradient(135deg,#061633_0%,#102A66_58%,#214A9A_100%)] p-6 text-white shadow-2xl shadow-blue-950/15 sm:p-8">
        <div className="relative grid gap-8 xl:grid-cols-[1.2fr_1fr] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Personalized learning map
            </div>
            <h1 className="mt-5 max-w-2xl font-display text-2xl font-black leading-tight sm:text-4xl">
              Your complete learning story, made easy to understand.
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-blue-100/80">
              Follow every subject, chapter, assessment, and published result across your active batches.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { value: batches.length, label: "Active batches", Icon: Layers3 },
              { value: totalSubjects, label: "Subjects", Icon: BookOpenCheck },
              {
                value: `${completedUnits}/${totalUnits}`,
                label: "Units complete",
                Icon: CheckCircle2,
              },
              {
                value: publishedResults,
                label: "Results live",
                Icon: Trophy,
              },
            ].map(({ value, label, Icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm"
              >
                <Icon className="mb-3 h-4 w-4 text-cyan-200" />
                <p className="font-display text-2xl font-black text-white">
                  {value}
                </p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-blue-100/65">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {batches.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <GraduationCap className="mx-auto h-11 w-11 text-slate-300" />
          <h2 className="mt-4 font-display text-xl font-black text-slate-900">
            No active academic journey yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
            Your active batches will appear here as soon as your enrollment is approved.
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
              <Target className="h-5 w-5 text-blue-700" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">
                Syllabus coverage
              </p>
              <p className="mt-1 font-display text-2xl font-black text-blue-950">
                {completedUnits}/{totalUnits}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Chapters and topics completed
              </p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-5">
              <BarChart3 className="h-5 w-5 text-violet-700" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-violet-600">
                Published assessments
              </p>
              <p className="mt-1 font-display text-2xl font-black text-violet-950">
                {publishedResults}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Results ready for review
              </p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
              <CalendarClock className="h-5 w-5 text-amber-700" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                Next scheduled exam
              </p>
              <p className="mt-1 truncate font-display text-lg font-black text-amber-950">
                {upcomingExams[0]?.name || "Nothing scheduled"}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {formatDate(upcomingExams[0]?.exam_date)}
              </p>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-black text-slate-900">
                  Batch learning maps
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Open a batch for its subject roadmap, exam timeline, and personal performance.
                </p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                {batches.length} active
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {batches.map((batch) => {
                const syllabus = clamp(
                  batch.progress?.academic_progress_percentage
                );
                const exams = clamp(
                  batch.progress?.exam_plan_progress_percentage
                );
                const results = clamp(
                  batch.progress?.result_publication_progress_percentage
                );

                return (
                  <Link
                    key={batch.id}
                    href={`/student/batches/${batch.id}/academics`}
                    className="group rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm shadow-primary/5 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/10 sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <StatusBadge status={batch.status} />
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-slate-500">
                            {batch.code}
                          </span>
                        </div>
                        <h3 className="truncate font-display text-xl font-black text-slate-900 transition-colors group-hover:text-blue-700">
                          {batch.name}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {batch.academic_level} · {batch.subjectCount} subjects
                        </p>
                      </div>
                      <span className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700 transition group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>

                    <div className="mt-6 space-y-4">
                      <ProgressRail
                        label="Syllabus completed"
                        value={syllabus}
                        color="bg-[linear-gradient(90deg,#175CD3,#60A5FA)]"
                      />
                      <ProgressRail
                        label="Exam journey"
                        value={exams}
                        color="bg-[linear-gradient(90deg,#7C3AED,#C084FC)]"
                      />
                      <ProgressRail
                        label="Results published"
                        value={results}
                        color="bg-[linear-gradient(90deg,#059669,#34D399)]"
                      />
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
                      <div>
                        <p className="font-display text-lg font-black text-slate-900">
                          {batch.progress?.completed_units || 0}/
                          {batch.progress?.total_units || 0}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                          Units
                        </p>
                      </div>
                      <div>
                        <p className="font-display text-lg font-black text-slate-900">
                          {batch.progress?.conducted_exams || 0}/
                          {batch.progress?.planned_exams || 0}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                          Exams
                        </p>
                      </div>
                      <div>
                        <p className="font-display text-lg font-black text-slate-900">
                          {batch.average === null ? "—" : `${batch.average}%`}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                          My average
                        </p>
                      </div>
                      <div>
                        <p className="truncate font-display text-sm font-black text-slate-900">
                          {batch.nextExam?.name || "No exam"}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                          {batch.nextExam
                            ? formatDate(batch.nextExam.exam_date)
                            : "Scheduled"}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
