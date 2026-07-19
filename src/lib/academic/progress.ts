import type {
  SubjectStatus,
  SubjectUnitStatus,
} from "../validations/academic";

export interface ProgressUnit {
  status: SubjectUnitStatus;
  weight?: number | null;
}

export interface SubjectForBatchProgress {
  status: SubjectStatus;
  units: ProgressUnit[];
}

export interface SyllabusProgress {
  totalUnits: number;
  completedUnits: number;
  runningUnits: number;
  plannedUnits: number;
  skippedUnits: number;
  totalWeight: number;
  completedWeight: number;
  percentage: number;
}

export type AcademicExamStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "COMPLETED"
  | "RESULT_DRAFT"
  | "RESULT_PUBLISHED"
  | "ARCHIVED"
  | "CANCELLED";

export interface ExamForProgress {
  status: AcademicExamStatus;
  publishedAt?: string | null;
}

export interface ExamJourneyProgress {
  plannedExams: number;
  scheduledExams: number;
  conductedExams: number;
  publishedResults: number;
  planPercentage: number;
  publicationPercentage: number;
}

export interface StudentExamResultForProgress {
  attendanceStatus: "PRESENT" | "ABSENT";
  obtainedMarks: number | null;
  totalMarks: number;
  passMarks: number;
}

export interface StudentPerformanceProgress {
  publishedExamCount: number;
  attendedExamCount: number;
  missedExamCount: number;
  passedExamCount: number;
  failedExamCount: number;
  participationPercentage: number;
  averagePercentage: number;
}

function normalizeWeight(weight: number | null | undefined): number {
  return typeof weight === "number" && Number.isFinite(weight) && weight > 0
    ? weight
    : 1;
}

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

export function calculateSyllabusProgress(
  units: readonly ProgressUnit[]
): SyllabusProgress {
  let totalUnits = 0;
  let completedUnits = 0;
  let runningUnits = 0;
  let plannedUnits = 0;
  let skippedUnits = 0;
  let totalWeight = 0;
  let completedWeight = 0;

  for (const unit of units) {
    const unitWeight = normalizeWeight(unit.weight);

    if (unit.status === "SKIPPED") {
      skippedUnits += 1;
      continue;
    }

    totalUnits += 1;
    totalWeight += unitWeight;

    if (unit.status === "COMPLETED") {
      completedUnits += 1;
      completedWeight += unitWeight;
    } else if (unit.status === "RUNNING") {
      runningUnits += 1;
    } else {
      plannedUnits += 1;
    }
  }

  return {
    totalUnits,
    completedUnits,
    runningUnits,
    plannedUnits,
    skippedUnits,
    totalWeight,
    completedWeight,
    percentage: percentage(completedWeight, totalWeight),
  };
}

export function calculateBatchAcademicProgress(
  subjects: readonly SubjectForBatchProgress[]
): SyllabusProgress {
  const visibleUnits = subjects
    .filter(
      (subject) =>
        subject.status !== "DRAFT" && subject.status !== "ARCHIVED"
    )
    .flatMap((subject) => subject.units);

  return calculateSyllabusProgress(visibleUnits);
}

export function calculateExamJourneyProgress(
  exams: readonly ExamForProgress[]
): ExamJourneyProgress {
  const planned = exams.filter(
    (exam) => exam.status !== "DRAFT" && exam.status !== "CANCELLED"
  );
  const scheduledExams = planned.filter(
    (exam) => exam.status === "SCHEDULED"
  ).length;
  const conductedExams = planned.filter((exam) =>
    ["COMPLETED", "RESULT_DRAFT", "RESULT_PUBLISHED", "ARCHIVED"].includes(
      exam.status
    )
  ).length;
  const publishedResults = planned.filter(
    (exam) =>
      exam.status === "RESULT_PUBLISHED" ||
      (exam.status === "ARCHIVED" && Boolean(exam.publishedAt))
  ).length;

  return {
    plannedExams: planned.length,
    scheduledExams,
    conductedExams,
    publishedResults,
    planPercentage: percentage(conductedExams, planned.length),
    publicationPercentage: percentage(publishedResults, conductedExams),
  };
}

export function calculateStudentPerformanceProgress(
  results: readonly StudentExamResultForProgress[]
): StudentPerformanceProgress {
  let attendedExamCount = 0;
  let missedExamCount = 0;
  let passedExamCount = 0;
  let failedExamCount = 0;
  let obtainedMarks = 0;
  let availableMarks = 0;

  for (const result of results) {
    if (result.attendanceStatus === "ABSENT") {
      missedExamCount += 1;
      continue;
    }

    attendedExamCount += 1;
    const marks = Math.max(0, Number(result.obtainedMarks) || 0);
    const totalMarks = Math.max(0, Number(result.totalMarks) || 0);

    obtainedMarks += Math.min(marks, totalMarks);
    availableMarks += totalMarks;

    if (marks >= result.passMarks) passedExamCount += 1;
    else failedExamCount += 1;
  }

  return {
    publishedExamCount: results.length,
    attendedExamCount,
    missedExamCount,
    passedExamCount,
    failedExamCount,
    participationPercentage: percentage(attendedExamCount, results.length),
    averagePercentage: percentage(obtainedMarks, availableMarks),
  };
}
