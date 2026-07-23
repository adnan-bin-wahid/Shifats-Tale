import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { StudentProgressReportFilters } from "@/components/reports/student-progress-report-filters";
import { getStudentProgressReportDirectory } from "@/lib/reports/student-progress-report-directory";
import { AcademicReportFilters } from "./academic-report-filters";

interface PageProps {
  searchParams: Promise<{ batchId?: string; subjectId?: string }>;
}

type StudentDirectoryRow = {
  id: string;
  student_code: string;
  profile: { full_name: string } | null;
};

function clamp(value: number | null | undefined) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".0", "")}%`;
}

export default async function AcademicPerformanceReportPage({ searchParams }: PageProps) {
  const { destination, profile } = await resolveAuthenticatedDestination();
  if (destination !== "TEACHER_DASHBOARD" || !profile || profile.role !== "TEACHER") {
    redirect("/login");
  }

  const { batchId = "", subjectId = "" } = await searchParams;
  const supabase = await createClient();

  const [batchResult, subjectResult, progressReportDirectory] = await Promise.all([
    supabase
      .from("batches")
      .select("id,name,code,status")
      .order("created_at", { ascending: false }),
    supabase
      .from("batch_subjects")
      .select("id,batch_id,name,code,status,theme_key,display_order")
      .neq("status", "ARCHIVED")
      .order("display_order", { ascending: true }),
    getStudentProgressReportDirectory(),
  ]);

  if (batchResult.error) throw batchResult.error;
  if (subjectResult.error) throw subjectResult.error;

  const batches = batchResult.data || [];
  const allSubjects = subjectResult.data || [];
  const selectedBatchId = batches.some((batch) => batch.id === batchId) ? batchId : "";
  const visibleSubjects = selectedBatchId
    ? allSubjects.filter((subject) => subject.batch_id === selectedBatchId)
    : allSubjects;
  const selectedSubjectId = visibleSubjects.some((subject) => subject.id === subjectId)
    ? subjectId
    : "";

  let progressQuery = supabase.from("subject_progress_summary").select("*");
  let performanceQuery = supabase.from("student_subject_performance").select("*");
  if (selectedBatchId) {
    progressQuery = progressQuery.eq("batch_id", selectedBatchId);
    performanceQuery = performanceQuery.eq("batch_id", selectedBatchId);
  }
  if (selectedSubjectId) {
    progressQuery = progressQuery.eq("subject_id", selectedSubjectId);
    performanceQuery = performanceQuery.eq("subject_id", selectedSubjectId);
  }

  const [progressResult, performanceResult] = await Promise.all([
    progressQuery.order("display_order", { ascending: true }),
    performanceQuery,
  ]);
  if (progressResult.error) throw progressResult.error;
  if (performanceResult.error) throw performanceResult.error;

  const progressRows = progressResult.data || [];
  const performanceRows = performanceResult.data || [];
  const studentIds = Array.from(
    new Set(performanceRows.map((row) => row.student_id).filter((id): id is string => Boolean(id)))
  );
  const studentDirectoryResult = studentIds.length
    ? await supabase
        .from("student_profiles")
        .select("id,student_code,profile:profiles(full_name)")
        .in("id", studentIds)
    : { data: [], error: null };
  if (studentDirectoryResult.error) throw studentDirectoryResult.error;

  const studentDirectory = new Map(
    ((studentDirectoryResult.data || []) as unknown as StudentDirectoryRow[]).map((student) => [
      student.id,
      student,
    ])
  );
  const subjectDirectory = new Map(allSubjects.map((subject) => [subject.id, subject]));

  const totalPublishedExams = performanceRows.reduce(
    (sum, row) => sum + Number(row.published_exam_count || 0),
    0
  );
  const totalAttended = performanceRows.reduce(
    (sum, row) => sum + Number(row.attended_exam_count || 0),
    0
  );
  const totalPassed = performanceRows.reduce(
    (sum, row) => sum + Number(row.passed_exam_count || 0),
    0
  );
  const weightedScoreTotal = performanceRows.reduce(
    (sum, row) =>
      sum + Number(row.average_percentage || 0) * Number(row.published_exam_count || 0),
    0
  );
  const cohortAverage = totalPublishedExams > 0 ? weightedScoreTotal / totalPublishedExams : 0;
  const passRate = totalAttended > 0 ? (totalPassed / totalAttended) * 100 : 0;

  const subjectComparisons = progressRows.map((progress) => {
    const rows = performanceRows.filter((row) => row.subject_id === progress.subject_id);
    const published = rows.reduce((sum, row) => sum + Number(row.published_exam_count || 0), 0);
    const weightedAverage = rows.reduce(
      (sum, row) => sum + Number(row.average_percentage || 0) * Number(row.published_exam_count || 0),
      0
    );
    return {
      ...progress,
      studentCount: new Set(rows.map((row) => row.student_id).filter(Boolean)).size,
      cohortAverage: published > 0 ? weightedAverage / published : 0,
    };
  });

  const studentRows = performanceRows
    .map((performance) => ({
      ...performance,
      student: performance.student_id ? studentDirectory.get(performance.student_id) : undefined,
      subject: performance.subject_id ? subjectDirectory.get(performance.subject_id) : undefined,
    }))
    .sort((a, b) => Number(b.average_percentage || 0) - Number(a.average_percentage || 0));

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/teacher/reports" className="inline-flex items-center gap-2 text-xs font-black text-slate-500 transition hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Reports center
        </Link>
        {selectedBatchId && (
          <Link href={`/teacher/academic/${selectedBatchId}`} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-black uppercase tracking-wide text-blue-700 transition hover:border-blue-200">
            Open academic workspace
          </Link>
        )}
      </div>

      <section className="overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#071A3D_0%,#102A66_58%,#2456B3_100%)] p-6 text-white shadow-xl shadow-[#071A3D]/15 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-cyan-100">
              <TrendingUp className="h-3.5 w-3.5" /> Academic intelligence
            </span>
            <h1 className="text-white mt-4 font-display text-2xl font-black sm:text-4xl">Subject performance report</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-blue-100/80">
              Compare syllabus delivery, examination progress, and published student outcomes without changing any grade, mark, or rank.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/65">Current scope</p>
            <p className="mt-2 text-sm font-black">
              {selectedBatchId ? batches.find((batch) => batch.id === selectedBatchId)?.name : "All academic batches"}
            </p>
            <p className="mt-1 text-[10px] font-semibold text-blue-100/70">
              {selectedSubjectId ? subjectDirectory.get(selectedSubjectId)?.name : "All visible subjects"}
            </p>
          </div>
        </div>
      </section>

      <AcademicReportFilters
        key={`${selectedBatchId}:${selectedSubjectId}`}
        batches={batches}
        subjects={allSubjects}
        selectedBatchId={selectedBatchId}
        selectedSubjectId={selectedSubjectId}
      />

      <section className="space-y-4 rounded-3xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-600">
            Individual report
          </p>
          <h2 className="mt-1 font-display text-lg font-black text-slate-900">
            Build a student progress report
          </h2>
          <p className="mt-1 text-[10px] font-semibold leading-5 text-slate-500">
            Select a batch and one enrolled student to open the printable report.
          </p>
        </div>
        <StudentProgressReportFilters
          batches={progressReportDirectory.batches}
          students={progressReportDirectory.students}
          initialBatchId={selectedBatchId}
        />
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [String(subjectComparisons.length), "Subjects tracked", "Curriculum scope", BookOpenCheck, "text-blue-700", "bg-blue-50"],
          [String(studentDirectory.size), "Students measured", "Published results only", Users, "text-violet-700", "bg-violet-50"],
          [formatPercent(cohortAverage), "Cohort average", `${totalPublishedExams} result records`, BarChart3, "text-emerald-700", "bg-emerald-50"],
          [formatPercent(passRate), "Pass rate", `${totalPassed}/${totalAttended} attended passes`, CheckCircle2, "text-amber-700", "bg-amber-50"],
        ].map(([value, label, note, Icon, color, background]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className={`inline-flex rounded-xl p-2.5 ${String(color)} ${String(background)}`}><Icon className="h-4 w-4" /></span>
            <p className="mt-4 font-display text-2xl font-black text-slate-900">{String(value)}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-500">{String(label)}</p>
            <p className="mt-1 text-[9px] font-semibold text-slate-400">{String(note)}</p>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-600">Delivery comparison</p>
            <h2 className="mt-1 font-display text-lg font-black text-slate-900">Subject health map</h2>
          </div>
          <GraduationCap className="h-5 w-5 text-slate-300" />
        </div>
        {subjectComparisons.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <BookOpenCheck className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-700">No subject progress is available for this filter.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {subjectComparisons.map((subject) => {
              const syllabus = clamp(subject.syllabus_progress_percentage);
              const exams = clamp(subject.exam_plan_progress_percentage);
              const average = clamp(subject.cohortAverage);
              return (
                <div key={subject.subject_id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div><p className="text-sm font-black text-slate-900">{subject.name}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wide text-slate-400">{subject.code} · {subject.studentCount} students</p></div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase text-slate-500 shadow-sm">{subject.status}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {[
                      ["Syllabus", syllabus, "bg-blue-600"],
                      ["Exam plan", exams, "bg-violet-600"],
                      ["Cohort score", average, "bg-emerald-500"],
                    ].map(([label, value, color]) => (
                      <div key={String(label)}>
                        <div className="mb-2 flex justify-between text-[9px] font-black uppercase tracking-wide text-slate-500"><span>{String(label)}</span><span>{Number(value)}%</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${String(color)}`} style={{ width: `${Number(value)}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-600">Student breakdown</p>
          <h2 className="mt-1 font-display text-lg font-black text-slate-900">Published-result performance</h2>
        </div>
        {studentRows.length === 0 ? (
          <div className="p-12 text-center"><Users className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">No published student performance yet.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Subject</th><th className="px-5 py-3">Average</th><th className="px-5 py-3">Published</th><th className="px-5 py-3">Attended</th><th className="px-5 py-3">Passed</th><th className="px-5 py-3">Missed</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {studentRows.map((row, index) => (
                  <tr key={`${row.student_id}-${row.subject_id}-${index}`} className="font-semibold text-slate-600 hover:bg-slate-50/70">
                    <td className="px-5 py-4"><p className="font-black text-slate-900">{row.student?.profile?.full_name || "Student"}</p><p className="mt-1 text-[9px] text-slate-400">{row.student?.student_code || "—"}</p></td>
                    <td className="px-5 py-4"><p className="font-black text-slate-800">{row.subject?.name || "Subject"}</p><p className="mt-1 text-[9px] text-slate-400">{row.subject?.code || "—"}</p></td>
                    <td className="px-5 py-4 font-black text-emerald-700">{formatPercent(Number(row.average_percentage || 0))}</td>
                    <td className="px-5 py-4">{row.published_exam_count || 0}</td><td className="px-5 py-4">{row.attended_exam_count || 0}</td><td className="px-5 py-4">{row.passed_exam_count || 0}</td><td className="px-5 py-4">{row.missed_exam_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
