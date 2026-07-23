"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flag,
  FolderOpen,
  GraduationCap,
  Layers3,
  Medal,
  PlayCircle,
  Rocket,
  Sparkles,
  Target,
  TimerReset,
  Trophy,
} from "lucide-react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type {
  SubjectStatus,
  SubjectThemeKey,
  SubjectUnitStatus,
  SubjectUnitType,
} from "@/lib/validations/academic";

type AcademicBatch = {
  id: string;
  name: string;
  code: string;
  academic_level: string;
  status: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
};

type AcademicUnit = {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  unit_type: SubjectUnitType;
  status: SubjectUnitStatus;
  sequence_no: number;
  weight: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
  completed_at: string | null;
};

type StudentExamResult = {
  id: string;
  exam_id: string;
  attendance_status: "PRESENT" | "ABSENT";
  obtained_marks: number | null;
  grade: string | null;
  rank: number | null;
  remarks: string | null;
};

type AcademicExam = {
  id: string;
  batch_id: string;
  subject_id: string;
  name: string;
  description: string | null;
  exam_type: string;
  exam_date: string;
  start_time: string | null;
  duration: number | null;
  total_marks: number;
  pass_marks: number;
  status: string;
  published_at: string | null;
  result: StudentExamResult | null;
};

type SubjectProgress = {
  total_units: number | null;
  completed_units: number | null;
  running_units: number | null;
  planned_units: number | null;
  syllabus_progress_percentage: number | null;
  planned_exams: number | null;
  conducted_exams: number | null;
  scheduled_exams: number | null;
  published_results: number | null;
  exam_plan_progress_percentage: number | null;
};

type SubjectPerformance = {
  published_exam_count: number | null;
  attended_exam_count: number | null;
  missed_exam_count: number | null;
  passed_exam_count: number | null;
  average_percentage: number | null;
};

type AcademicSubject = {
  id: string;
  batch_id: string;
  name: string;
  code: string;
  description: string | null;
  status: SubjectStatus;
  start_date: string | null;
  end_date: string | null;
  theme_key: SubjectThemeKey;
  display_order: number;
  weight: number;
  is_default: boolean;
  completed_at: string | null;
  units: AcademicUnit[];
  exams: AcademicExam[];
  progress: SubjectProgress | null;
  performance: SubjectPerformance | null;
  materialCount: number;
};

type BatchProgress = {
  total_subjects: number | null;
  running_subjects: number | null;
  completed_subjects: number | null;
  total_units: number | null;
  completed_units: number | null;
  academic_progress_percentage: number | null;
  planned_exams: number | null;
  conducted_exams: number | null;
  published_results: number | null;
  exam_plan_progress_percentage: number | null;
  result_publication_progress_percentage: number | null;
};

type JourneyTab = "overview" | "syllabus" | "exams";

const themeStyles: Record<
  SubjectThemeKey,
  {
    soft: string;
    border: string;
    text: string;
    bar: string;
    dot: string;
  }
> = {
  NAVY: {
    soft: "bg-slate-50",
    border: "border-slate-200",
    text: "text-[#102A66]",
    bar: "bg-[#102A66]",
    dot: "bg-[#102A66]",
  },
  BLUE: {
    soft: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    bar: "bg-blue-600",
    dot: "bg-blue-600",
  },
  VIOLET: {
    soft: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    bar: "bg-violet-600",
    dot: "bg-violet-600",
  },
  EMERALD: {
    soft: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    bar: "bg-emerald-600",
    dot: "bg-emerald-600",
  },
  AMBER: {
    soft: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
  },
  ROSE: {
    soft: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
  },
};

function clamp(value: number | null | undefined) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null | undefined, short = false) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: short ? "short" : "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value: string | null) {
  if (!value) return "Time TBA";
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2026, 0, 1, hours, minutes));
}

function countdown(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1) return `In ${days} days`;
  if (days === -1) return "Yesterday";
  return `${Math.abs(days)} days ago`;
}

function examStage(exam: AcademicExam) {
  if (exam.status === "RESULT_PUBLISHED") {
    return { label: "Result published", color: "emerald" } as const;
  }
  if (exam.status === "RESULT_DRAFT") {
    return { label: "Being graded", color: "violet" } as const;
  }
  if (exam.status === "COMPLETED") {
    return { label: "Completed", color: "blue" } as const;
  }

  const dateLabel = countdown(exam.exam_date);
  if (dateLabel === "Today") {
    return { label: "Happening today", color: "rose" } as const;
  }
  return { label: dateLabel, color: "amber" } as const;
}

function StageBadge({ exam }: { exam: AcademicExam }) {
  const stage = examStage(exam);
  const colors = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${colors[stage.color]}`}
    >
      {stage.label}
    </span>
  );
}

function ProgressBar({
  value,
  color = "bg-blue-600",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-slate-100"
      aria-label={`${value}% complete`}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function RadialProgress({
  value,
  label,
  color = "text-cyan-300",
}: {
  value: number;
  label: string;
  color?: string;
}) {
  return (
    <div className="relative h-28 w-28 shrink-0" aria-label={`${label}: ${value}%`}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
        <path
          className="text-white/10"
          stroke="currentColor"
          strokeWidth="3.2"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          className={color}
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeDasharray={`${value}, 100`}
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-2xl font-black text-white">{value}%</span>
        <span className="mt-1 text-[8px] font-black uppercase tracking-wider text-blue-100/65">
          {label}
        </span>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-primary/5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-xl bg-slate-50 p-2.5 text-blue-700">{icon}</span>
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
          {label}
        </span>
      </div>
      <p className="mt-4 font-display text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">{note}</p>
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-300 shadow-sm">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-base font-black text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-xs font-semibold leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SubjectComparison({ subjects }: { subjects: AcademicSubject[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-600">
            Visual comparison
          </p>
          <h3 className="mt-1 font-display text-lg font-black text-slate-900">
            Subject progress map
          </h3>
        </div>
        <BarChart3 className="h-5 w-5 text-slate-300" />
      </div>
      <div className="space-y-5">
        {subjects.map((subject) => {
          const syllabus = clamp(subject.progress?.syllabus_progress_percentage);
          const average = clamp(subject.performance?.average_percentage);
          const theme = themeStyles[subject.theme_key];
          return (
            <div key={subject.id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${theme.dot}`} />
                  <span className="truncate text-xs font-black text-slate-800">
                    {subject.name}
                  </span>
                </div>
                <span className="shrink-0 text-[10px] font-black text-slate-500">
                  {syllabus}% covered
                </span>
              </div>
              <div className="space-y-1.5">
                <ProgressBar value={syllabus} color={theme.bar} />
                <div className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[8px] font-black uppercase tracking-wide text-slate-400">
                    My score
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${average}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-[9px] font-black text-emerald-700">
                    {subject.performance ? `${average}%` : "—"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OverviewPanel({
  subject,
  subjects,
  batchId,
}: {
  subject: AcademicSubject;
  subjects: AcademicSubject[];
  batchId: string;
}) {
  const syllabus = clamp(subject.progress?.syllabus_progress_percentage);
  const exams = clamp(subject.progress?.exam_plan_progress_percentage);
  const average = clamp(subject.performance?.average_percentage);
  const currentUnit =
    subject.units.find((unit) => unit.status === "RUNNING") ||
    subject.units.find((unit) => unit.status === "PLANNED") ||
    null;
  const today = new Date().toISOString().slice(0, 10);
  const nextExam =
    subject.exams.find(
      (exam) => exam.status === "SCHEDULED" && exam.exam_date >= today
    ) || null;
  const attended = Number(subject.performance?.attended_exam_count || 0);
  const passed = Number(subject.performance?.passed_exam_count || 0);
  const passRate = attended > 0 ? Math.round((passed / attended) * 100) : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-blue-100 bg-[linear-gradient(145deg,#EFF6FF_0%,#FFFFFF_72%)] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-600">
                Learning pulse
              </p>
              <h3 className="mt-1 font-display text-lg font-black text-slate-900">
                Where this subject stands
              </h3>
            </div>
            <Target className="h-5 w-5 text-blue-300" />
          </div>
          <div className="mt-6 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wide">
                <span className="text-slate-500">Syllabus completion</span>
                <span className="text-blue-800">{syllabus}%</span>
              </div>
              <ProgressBar value={syllabus} color="bg-blue-600" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wide">
                <span className="text-slate-500">Exam journey</span>
                <span className="text-violet-800">{exams}%</span>
              </div>
              <ProgressBar value={exams} color="bg-violet-600" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wide">
                <span className="text-slate-500">My published-result average</span>
                <span className="text-emerald-800">
                  {subject.performance ? `${average}%` : "No result yet"}
                </span>
              </div>
              <ProgressBar value={average} color="bg-emerald-500" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/65 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-700">
                  Current learning focus
                </p>
                <p className="mt-2 truncate font-display text-base font-black text-slate-900">
                  {currentUnit?.title || "No active unit"}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  {currentUnit
                    ? `${humanize(currentUnit.unit_type)} · ${humanize(currentUnit.status)}`
                    : "Your teacher has not started the next unit yet."}
                </p>
              </div>
              <BookOpenCheck className="h-5 w-5 shrink-0 text-amber-600" />
            </div>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50/65 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-violet-700">
                  Next assessment
                </p>
                <p className="mt-2 truncate font-display text-base font-black text-slate-900">
                  {nextExam?.name || "Nothing scheduled"}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                  {nextExam
                    ? `${formatDate(nextExam.exam_date, true)} · ${formatTime(nextExam.start_time)}`
                    : "You are all clear for now."}
                </p>
              </div>
              <CalendarDays className="h-5 w-5 shrink-0 text-violet-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <SubjectComparison subjects={subjects} />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-600">
                Personal performance
              </p>
              <h3 className="mt-1 font-display text-lg font-black text-slate-900">
                Published result snapshot
              </h3>
            </div>
            <Trophy className="h-5 w-5 text-emerald-300" />
          </div>
          {subject.performance ? (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  {
                    value: `${average}%`,
                    label: "Average score",
                    color: "text-emerald-700",
                  },
                  {
                    value: passRate === null ? "—" : `${passRate}%`,
                    label: "Pass rate",
                    color: "text-blue-700",
                  },
                  {
                    value: String(subject.performance.attended_exam_count || 0),
                    label: "Attended",
                    color: "text-violet-700",
                  },
                  {
                    value: String(subject.performance.missed_exam_count || 0),
                    label: "Missed",
                    color: "text-rose-700",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-50 p-4">
                    <p className={`font-display text-xl font-black ${item.color}`}>
                      {item.value}
                    </p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-slate-400">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
              <Link
                href={`/student/batches/${batchId}/results`}
                className="mt-5 inline-flex items-center gap-2 text-xs font-black text-blue-700 transition hover:text-blue-900"
              >
                Open full result ledger <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <Medal className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-xs font-black text-slate-700">
                Your performance will appear after the first result is published.
              </p>
            </div>
          )}
        </div>
      </div>

      <div>
        <Link
          href={`/student/batches/${batchId}/materials?subjectId=${subject.id}`}
          className="group block max-w-2xl rounded-2xl border border-amber-100 bg-amber-50/60 p-5 transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-700">Learning library</p>
              <p className="mt-2 font-display text-2xl font-black text-slate-900">{subject.materialCount}</p>
              <p className="mt-1 text-[10px] font-semibold text-slate-500">Published resources for {subject.name}</p>
            </div>
            <span className="rounded-xl bg-white p-2.5 text-amber-600 shadow-sm"><FolderOpen className="h-5 w-5" /></span>
          </div>
          <span className="mt-4 inline-flex items-center gap-2 text-xs font-black text-amber-800">Open subject materials <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span>
        </Link>
      </div>
    </div>
  );
}

function SyllabusPanel({ subject }: { subject: AcademicSubject }) {
  const theme = themeStyles[subject.theme_key];
  if (subject.units.length === 0) {
    return (
      <EmptyPanel
        icon={<BookOpenCheck className="h-5 w-5" />}
        title="Syllabus roadmap is being prepared"
        description="Your teacher has not published chapters or topics for this subject yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-600">
            Ordered learning path
          </p>
          <h3 className="mt-1 font-display text-lg font-black text-slate-900">
            {subject.progress?.completed_units || 0} of {subject.progress?.total_units || 0} units complete
          </h3>
        </div>
        <div className="w-full sm:w-56">
          <div className="mb-2 flex justify-between text-[9px] font-black uppercase tracking-wide text-slate-400">
            <span>Progress</span>
            <span>{clamp(subject.progress?.syllabus_progress_percentage)}%</span>
          </div>
          <ProgressBar
            value={clamp(subject.progress?.syllabus_progress_percentage)}
            color={theme.bar}
          />
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-6">
        {subject.units.map((unit, index) => {
          const completed = unit.status === "COMPLETED";
          const running = unit.status === "RUNNING";
          const skipped = unit.status === "SKIPPED";

          return (
            <div key={unit.id} className="relative grid grid-cols-[42px_1fr] gap-3 sm:grid-cols-[52px_1fr] sm:gap-4">
              {index < subject.units.length - 1 && (
                <span className="absolute bottom-0 left-[20px] top-11 w-px bg-slate-200 sm:left-[25px] sm:top-13" />
              )}
              <div
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-xl border sm:h-12 sm:w-12 ${
                  completed
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : running
                      ? `${theme.border} ${theme.soft} ${theme.text}`
                      : skipped
                        ? "border-slate-200 bg-slate-100 text-slate-400"
                        : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {completed ? (
                  <Check className="h-5 w-5" />
                ) : running ? (
                  <PlayCircle className="h-5 w-5" />
                ) : skipped ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <span className="font-display text-sm font-black">{unit.sequence_no}</span>
                )}
              </div>
              <div className={`mb-4 rounded-2xl border p-4 sm:mb-5 sm:p-5 ${
                running ? `${theme.border} ${theme.soft}` : "border-slate-200 bg-slate-50/45"
              }`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                        {humanize(unit.unit_type)} {unit.sequence_no}
                      </span>
                      <StatusBadge status={unit.status} />
                    </div>
                    <h4 className="mt-2 font-display text-base font-black text-slate-900">
                      {unit.title}
                    </h4>
                    {unit.description && (
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                        {unit.description}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-left text-[9px] font-bold leading-5 text-slate-400 sm:text-right">
                    <p>{formatDate(unit.planned_start_date, true)}</p>
                    {unit.planned_end_date && <p>to {formatDate(unit.planned_end_date, true)}</p>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExamsPanel({
  subject,
  batchId,
}: {
  subject: AcademicSubject;
  batchId: string;
}) {
  if (subject.exams.length === 0) {
    return (
      <EmptyPanel
        icon={<GraduationCap className="h-5 w-5" />}
        title="No examination announced yet"
        description="Scheduled assessments and result updates for this subject will appear here."
      />
    );
  }

  const orderedExams = [...subject.exams].sort(
    (a, b) =>
      new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-100 bg-amber-50/65 p-4">
          <p className="text-[9px] font-black uppercase tracking-wide text-amber-700">Scheduled</p>
          <p className="mt-2 font-display text-2xl font-black text-amber-950">
            {subject.progress?.scheduled_exams || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50/65 p-4">
          <p className="text-[9px] font-black uppercase tracking-wide text-blue-700">Conducted</p>
          <p className="mt-2 font-display text-2xl font-black text-blue-950">
            {subject.progress?.conducted_exams || 0}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/65 p-4">
          <p className="text-[9px] font-black uppercase tracking-wide text-emerald-700">Results live</p>
          <p className="mt-2 font-display text-2xl font-black text-emerald-950">
            {subject.progress?.published_results || 0}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {orderedExams.map((exam) => {
          const date = new Date(`${exam.exam_date}T00:00:00`);
          const month = date
            .toLocaleDateString("en-US", { month: "short" })
            .toUpperCase();
          const result = exam.result;
          const absent = result?.attendance_status === "ABSENT";
          const obtained = Number(result?.obtained_marks || 0);
          const scorePercentage =
            result && !absent && Number(exam.total_marks) > 0
              ? Math.round((obtained / Number(exam.total_marks)) * 100)
              : null;

          return (
            <div
              key={exam.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-md hover:shadow-primary/5 sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-4 sm:flex-1">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-center">
                    <span className="text-[8px] font-black uppercase tracking-wide text-blue-700">
                      {month}
                    </span>
                    <span className="font-display text-xl font-black leading-none text-slate-900">
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StageBadge exam={exam} />
                      <span className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                        {humanize(exam.exam_type)}
                      </span>
                    </div>
                    <h4 className="mt-2 font-display text-base font-black text-slate-900">
                      {exam.name}
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold text-slate-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" /> {formatTime(exam.start_time)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <TimerReset className="h-3.5 w-3.5" /> {exam.duration ? `${exam.duration} min` : "Duration TBA"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Flag className="h-3.5 w-3.5" /> {exam.total_marks} marks
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 sm:w-44 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  {result ? (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                        My result
                      </p>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <div>
                          <p className={`font-display text-xl font-black ${absent ? "text-rose-700" : "text-emerald-700"}`}>
                            {absent ? "Absent" : `${obtained}/${exam.total_marks}`}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400">
                            {absent ? "No score" : `${scorePercentage}% · Grade ${result.grade || "—"}`}
                          </p>
                        </div>
                        {!absent && result.rank && (
                          <span className="rounded-lg bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-700">
                            #{result.rank}
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/student/batches/${batchId}/exams/${exam.id}`}
                        className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black text-blue-700 hover:text-blue-900"
                      >
                        View details <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                        Result
                      </p>
                      <p className="mt-2 text-xs font-black text-slate-600">
                        {exam.status === "RESULT_PUBLISHED"
                          ? "Record unavailable"
                          : "Not published yet"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StudentAcademicJourney({
  batch,
  enrolledAt,
  subjects,
  batchProgress,
}: {
  batch: AcademicBatch;
  enrolledAt: string;
  subjects: AcademicSubject[];
  batchProgress: BatchProgress | null;
}) {
  const [requestedSubjectId, setRequestedSubjectId] = useState(
    subjects.find((subject) => subject.status === "RUNNING")?.id ||
      subjects[0]?.id ||
      ""
  );
  const [activeTab, setActiveTab] = useState<JourneyTab>("overview");

  const selectedSubjectId = subjects.some(
    (subject) => subject.id === requestedSubjectId
  )
    ? requestedSubjectId
    : subjects[0]?.id || "";
  const selectedSubject =
    subjects.find((subject) => subject.id === selectedSubjectId) || null;
  const syllabusProgress = clamp(batchProgress?.academic_progress_percentage);
  const examProgress = clamp(batchProgress?.exam_plan_progress_percentage);
  const publicationProgress = clamp(
    batchProgress?.result_publication_progress_percentage
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 pb-12 text-xs font-bold text-primary">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
        <Link href="/student/academics" className="transition hover:text-blue-700">
          Academic Journey
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link
          href={`/student/batches/${batch.id}`}
          className="transition hover:text-blue-700"
        >
          {batch.code}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-700">Learning Map</span>
      </div>

      <section className="relative overflow-hidden rounded-[30px] border border-blue-900/20 bg-[radial-gradient(circle_at_88%_0%,rgba(103,232,249,0.2),transparent_30%),linear-gradient(135deg,#061633_0%,#102A66_58%,#214A9A_100%)] p-6 text-white shadow-2xl shadow-blue-950/15 sm:p-8">
        <div className="relative grid gap-8 xl:grid-cols-[1.1fr_auto] xl:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={batch.status} />
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-blue-100">
                {batch.code}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-blue-100">
                {batch.academic_level}
              </span>
            </div>
            <h1 className="mt-5 font-display text-2xl font-black leading-tight text-white sm:text-4xl">
              {batch.name}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-blue-100/80">
              {batch.description ||
                "Your subject-by-subject roadmap, syllabus coverage, exam journey, and personal performance."}
            </p>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold text-blue-100/65">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Started {formatDate(batch.start_date, true)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Rocket className="h-3.5 w-3.5" /> Enrolled {formatDate(enrolledAt.slice(0, 10), true)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:flex-nowrap xl:justify-end">
            <RadialProgress value={syllabusProgress} label="Syllabus" />
            <RadialProgress value={examProgress} label="Exams" color="text-violet-300" />
            <RadialProgress
              value={publicationProgress}
              label="Results"
              color="text-emerald-300"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Layers3 className="h-4 w-4" />}
          label="Subjects"
          value={String(batchProgress?.total_subjects || subjects.length)}
          note={`${batchProgress?.running_subjects || 0} currently running`}
        />
        <MetricCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Syllabus"
          value={`${batchProgress?.completed_units || 0}/${batchProgress?.total_units || 0}`}
          note="Chapters and topics completed"
        />
        <MetricCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Assessments"
          value={`${batchProgress?.conducted_exams || 0}/${batchProgress?.planned_exams || 0}`}
          note="Planned examinations conducted"
        />
        <MetricCard
          icon={<Award className="h-4 w-4" />}
          label="Results"
          value={String(batchProgress?.published_results || 0)}
          note="Published and ready to review"
        />
      </section>

      {subjects.length === 0 ? (
        <EmptyPanel
          icon={<BookOpenCheck className="h-5 w-5" />}
          title="Your academic plan is being prepared"
          description="Visible subjects will appear here after your teacher publishes them for this batch."
        />
      ) : (
        <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="self-start rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-6">
            <div className="border-b border-slate-100 px-1 pb-4">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-600">
                Learning portfolio
              </p>
              <h2 className="mt-1 font-display text-lg font-black text-slate-900">
                My subjects
              </h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {subjects.map((subject) => {
                const active = subject.id === selectedSubjectId;
                const theme = themeStyles[subject.theme_key];
                const progress = clamp(
                  subject.progress?.syllabus_progress_percentage
                );
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => {
                      setRequestedSubjectId(subject.id);
                      setActiveTab("overview");
                    }}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? `${theme.border} ${theme.soft} shadow-md shadow-primary/5`
                        : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`truncate font-display text-sm font-black ${active ? theme.text : "text-slate-900"}`}>
                          {subject.name}
                        </p>
                        <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-slate-400">
                          {subject.code} · {humanize(subject.status)}
                        </p>
                      </div>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${theme.dot}`} />
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 flex justify-between text-[9px] font-black uppercase tracking-wide text-slate-400">
                        <span>Syllabus</span>
                        <span>{progress}%</span>
                      </div>
                      <ProgressBar value={progress} color={theme.bar} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[9px] font-bold text-slate-400">
                      <span>{subject.progress?.completed_units || 0}/{subject.progress?.total_units || 0} units</span>
                      <span>{subject.progress?.published_results || 0} results</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {selectedSubject && (
            <main className="min-w-0 space-y-5">
              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={selectedSubject.status} />
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-slate-500">
                        {selectedSubject.code}
                      </span>
                    </div>
                    <h2 className="mt-3 font-display text-2xl font-black text-slate-900">
                      {selectedSubject.name}
                    </h2>
                    <p className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-slate-500">
                      {selectedSubject.description ||
                        "Follow the complete learning path and assessment journey for this subject."}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 lg:w-[330px]">
                    {[
                      {
                        value: `${clamp(selectedSubject.progress?.syllabus_progress_percentage)}%`,
                        label: "Covered",
                      },
                      {
                        value: String(selectedSubject.progress?.planned_exams || 0),
                        label: "Exams",
                      },
                      {
                        value: selectedSubject.performance
                          ? `${clamp(selectedSubject.performance.average_percentage)}%`
                          : "—",
                        label: "Average",
                      },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-slate-50 p-3 text-center">
                        <p className="font-display text-base font-black text-slate-900">
                          {item.value}
                        </p>
                        <p className="mt-1 text-[8px] font-black uppercase tracking-wide text-slate-400">
                          {item.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 rounded-xl bg-slate-100 p-1">
                  {[
                    { id: "overview", label: "Overview", Icon: Sparkles },
                    { id: "syllabus", label: "Syllabus", Icon: BookOpenCheck },
                    { id: "exams", label: "Exams", Icon: GraduationCap },
                  ].map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setActiveTab(id as JourneyTab)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[10px] font-black transition sm:text-xs ${
                        activeTab === id
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTab === "overview" && (
                <OverviewPanel
                  subject={selectedSubject}
                  subjects={subjects}
                  batchId={batch.id}
                />
              )}
              {activeTab === "syllabus" && (
                <SyllabusPanel subject={selectedSubject} />
              )}
              {activeTab === "exams" && (
                <ExamsPanel subject={selectedSubject} batchId={batch.id} />
              )}
            </main>
          )}
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Link
          href={`/student/batches/${batch.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back to batch console
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/student/routine"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-black text-violet-700 transition hover:bg-violet-100"
          >
            <CalendarDays className="h-4 w-4" /> Open class routine
          </Link>
          <Link
            href={`/student/batches/${batch.id}/exams`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A192F] px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-900"
          >
            Open examination schedule <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
