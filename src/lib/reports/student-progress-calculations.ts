export interface ExamMetricInput {
  attendanceStatus: "PRESENT" | "ABSENT" | "NOT_RECORDED";
  obtainedMarks: number | null;
  totalMarks: number;
  passMarks: number;
}

export interface AssignmentMetricInput {
  status: "NOT_SUBMITTED" | "SUBMITTED" | "LATE" | "REVIEWED" | "RETURNED";
  marksObtained: number | null;
  totalMarks: number;
}

function roundedPercentage(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

export function gradeFromPercentage(percentage: number) {
  if (percentage >= 80) return "A+";
  if (percentage >= 70) return "A";
  if (percentage >= 60) return "A-";
  if (percentage >= 50) return "B";
  if (percentage >= 40) return "C";
  if (percentage >= 33) return "D";
  return "F";
}

export function performanceBand(percentage: number, recordedCount: number) {
  if (recordedCount === 0) return "Not enough published results";
  if (percentage >= 80) return "Outstanding";
  if (percentage >= 70) return "Very good";
  if (percentage >= 60) return "Good progress";
  if (percentage >= 50) return "Satisfactory";
  if (percentage >= 40) return "Developing";
  return "Needs improvement";
}

export function calculateExamReportSummary(exams: readonly ExamMetricInput[]) {
  let recorded = 0;
  let attended = 0;
  let absent = 0;
  let passed = 0;
  let failed = 0;
  let obtainedMarks = 0;
  let availableMarks = 0;

  for (const exam of exams) {
    if (exam.attendanceStatus === "NOT_RECORDED") continue;
    recorded += 1;

    if (exam.attendanceStatus === "ABSENT") {
      absent += 1;
      continue;
    }

    attended += 1;
    const totalMarks = Math.max(0, Number(exam.totalMarks) || 0);
    const marks = Math.max(0, Math.min(Number(exam.obtainedMarks) || 0, totalMarks));
    obtainedMarks += marks;
    availableMarks += totalMarks;

    if (marks >= Math.max(0, Number(exam.passMarks) || 0)) passed += 1;
    else failed += 1;
  }

  const averagePercentage = roundedPercentage(obtainedMarks, availableMarks);

  return {
    published: exams.length,
    recorded,
    attended,
    absent,
    notRecorded: exams.length - recorded,
    passed,
    failed,
    averagePercentage,
    participationPercentage: roundedPercentage(attended, exams.length),
    passRate: roundedPercentage(passed, attended),
    grade: recorded > 0 && attended > 0 ? gradeFromPercentage(averagePercentage) : "—",
    performanceBand: performanceBand(averagePercentage, attended),
  };
}

export function calculateAssignmentReportSummary(
  assignments: readonly AssignmentMetricInput[]
) {
  let submitted = 0;
  let late = 0;
  let reviewed = 0;
  let returned = 0;
  let obtainedMarks = 0;
  let availableMarks = 0;

  for (const assignment of assignments) {
    if (assignment.status !== "NOT_SUBMITTED") submitted += 1;
    if (assignment.status === "LATE") late += 1;
    if (assignment.status === "RETURNED") returned += 1;

    if (assignment.status === "REVIEWED" && assignment.marksObtained !== null) {
      reviewed += 1;
      const totalMarks = Math.max(0, Number(assignment.totalMarks) || 0);
      const marks = Math.max(
        0,
        Math.min(Number(assignment.marksObtained) || 0, totalMarks)
      );
      obtainedMarks += marks;
      availableMarks += totalMarks;
    }
  }

  return {
    assigned: assignments.length,
    submitted,
    pending: assignments.length - submitted,
    late,
    reviewed,
    returned,
    submissionRate: roundedPercentage(submitted, assignments.length),
    averagePercentage: roundedPercentage(obtainedMarks, availableMarks),
  };
}
