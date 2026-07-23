import "server-only";
import { calculateSyllabusProgress } from "@/lib/academic/progress";
import { createClient } from "@/lib/supabase/server";
import {
  calculateAssignmentReportSummary,
  calculateExamReportSummary,
  gradeFromPercentage,
  performanceBand,
} from "./student-progress-calculations";

export type ReportExamStatus =
  | "PASSED"
  | "FAILED"
  | "ABSENT"
  | "NOT_RECORDED";

export interface StudentProgressReportExam {
  id: string;
  subjectId: string;
  name: string;
  examType: string;
  examDate: string;
  totalMarks: number;
  passMarks: number;
  attendanceStatus: "PRESENT" | "ABSENT" | "NOT_RECORDED";
  obtainedMarks: number | null;
  percentage: number | null;
  grade: string;
  rank: number | null;
  status: ReportExamStatus;
  remarks: string | null;
}

export interface StudentProgressReportAssignment {
  id: string;
  subjectId: string;
  title: string;
  assignmentType: string;
  dueAt: string;
  totalMarks: number;
  status: "NOT_SUBMITTED" | "SUBMITTED" | "LATE" | "REVIEWED" | "RETURNED";
  marksObtained: number | null;
  percentage: number | null;
  feedback: string | null;
}

export interface StudentProgressReportSubject {
  id: string;
  name: string;
  code: string;
  status: string;
  syllabus: {
    totalUnits: number;
    completedUnits: number;
    runningUnits: number;
    remainingUnits: number;
    skippedUnits: number;
    percentage: number;
    completedTitles: string[];
    remainingTitles: string[];
  };
  exam: ReturnType<typeof calculateExamReportSummary>;
  assignment: ReturnType<typeof calculateAssignmentReportSummary>;
}

export interface StudentProgressReportData {
  reportId: string;
  generatedAt: string;
  branding: {
    title: string;
    subtitle: string;
    phone: string;
    email: string;
    address: string;
    teacherName: string;
  };
  student: {
    id: string;
    fullName: string;
    studentCode: string;
    academicLevel: string;
    institution: string;
    guardianName: string;
    guardianPhone: string;
  };
  enrollment: {
    id: string;
    status: string;
    approvedAt: string | null;
    completedAt: string | null;
  };
  batch: {
    id: string;
    name: string;
    code: string;
    academicLevel: string;
    startDate: string;
    endDate: string | null;
  };
  summary: {
    syllabusPercentage: number;
    completedUnits: number;
    totalUnits: number;
    exam: ReturnType<typeof calculateExamReportSummary>;
    assignment: ReturnType<typeof calculateAssignmentReportSummary>;
    overallGrade: string;
    performanceBand: string;
  };
  subjects: StudentProgressReportSubject[];
  exams: StudentProgressReportExam[];
  assignments: StudentProgressReportAssignment[];
  teacherObservations: string[];
}

interface EnrollmentReportRow {
  id: string;
  status: string;
  approved_at: string | null;
  completed_at: string | null;
  batch: {
    id: string;
    name: string;
    code: string;
    academic_level: string;
    start_date: string;
    end_date: string | null;
  } | null;
  student: {
    id: string;
    student_code: string;
    academic_level: string;
    institution: string;
    guardian_name: string;
    guardian_phone: string;
    profile: { full_name: string } | null;
  } | null;
}

interface ReportUnitRow {
  id: string;
  subject_id: string;
  title: string;
  status: "PLANNED" | "RUNNING" | "COMPLETED" | "SKIPPED";
  sequence_no: number;
  weight: number;
}

interface ReportResultRow {
  exam_id: string;
  attendance_status: "PRESENT" | "ABSENT";
  obtained_marks: number | null;
  grade: string | null;
  rank: number | null;
  remarks: string | null;
}

interface ReportSubmissionRow {
  assignment_id: string;
  status: "SUBMITTED" | "LATE" | "REVIEWED" | "RETURNED";
  submitted_at: string;
  marks_obtained: number | null;
  feedback: string | null;
  reviewed_at: string | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function joinedAddress(settings: Record<string, unknown>) {
  return [settings.address_line, settings.city, settings.country]
    .map((value) => textValue(value))
    .filter(Boolean)
    .join(", ");
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safePercentage(obtained: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((Math.max(0, obtained) / total) * 10_000) / 100;
}

function reportIdentifier(studentCode: string, batchCode: string) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const clean = `${studentCode}-${batchCode}`.replace(/[^a-zA-Z0-9-]/g, "");
  return `SPR-${clean || "STUDENT"}-${date}`;
}

export async function getStudentProgressReportData(
  studentId: string,
  batchId: string
): Promise<StudentProgressReportData | null> {
  const supabase = await createClient();

  const { data: enrollmentData, error: enrollmentError } = await supabase
    .from("enrollments")
    .select(`
      id,
      status,
      approved_at,
      completed_at,
      batch:batches(id,name,code,academic_level,start_date,end_date),
      student:student_profiles(
        id,
        student_code,
        academic_level,
        institution,
        guardian_name,
        guardian_phone,
        profile:profiles(full_name)
      )
    `)
    .eq("student_id", studentId)
    .eq("batch_id", batchId)
    .in("status", ["ACTIVE", "COMPLETED"])
    .maybeSingle();

  if (enrollmentError) throw enrollmentError;
  if (!enrollmentData) return null;

  const enrollment = enrollmentData as unknown as EnrollmentReportRow;
  const batch = enrollment.batch;
  const student = enrollment.student;
  const studentProfile = student?.profile;
  if (!batch || !student) return null;

  const [subjectsResult, examsResult, assignmentsResult, settingsResult] =
    await Promise.all([
      supabase
        .from("batch_subjects")
        .select("id,name,code,status,display_order")
        .eq("batch_id", batchId)
        .neq("status", "DRAFT")
        .neq("status", "ARCHIVED")
        .order("display_order", { ascending: true }),
      supabase
        .from("exams")
        .select(
          "id,subject_id,name,exam_type,exam_date,total_marks,pass_marks,status,published_at"
        )
        .eq("batch_id", batchId)
        .eq("status", "RESULT_PUBLISHED")
        .order("exam_date", { ascending: true }),
      supabase
        .from("academic_assignments")
        .select(
          "id,subject_id,title,assignment_type,due_at,total_marks,status,published_at"
        )
        .eq("batch_id", batchId)
        .in("status", ["PUBLISHED", "CLOSED"])
        .order("due_at", { ascending: true }),
      supabase
        .from("site_settings")
        .select(`
          site_name,
          site_short_name,
          tagline,
          site_description,
          primary_phone,
          secondary_phone,
          whatsapp_number,
          email,
          address_line,
          city,
          country
        `)
        .eq("id", 1)
        .maybeSingle(),
    ]);

  if (subjectsResult.error) throw subjectsResult.error;
  if (examsResult.error) throw examsResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;
  if (settingsResult.error) throw settingsResult.error;

  const subjects = subjectsResult.data || [];
  const exams = examsResult.data || [];
  const assignments = assignmentsResult.data || [];
  const subjectIds = subjects.map((subject) => subject.id);
  const examIds = exams.map((exam) => exam.id);
  const assignmentIds = assignments.map((assignment) => assignment.id);

  const [unitsResult, resultsResult, submissionsResult] = await Promise.all([
    subjectIds.length
      ? supabase
          .from("subject_units")
          .select("id,subject_id,title,status,sequence_no,weight")
          .in("subject_id", subjectIds)
          .order("sequence_no", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    examIds.length
      ? supabase
          .from("exam_results")
          .select(
            "exam_id,attendance_status,obtained_marks,grade,rank,remarks"
          )
          .eq("student_id", studentId)
          .in("exam_id", examIds)
      : Promise.resolve({ data: [], error: null }),
    assignmentIds.length
      ? supabase
          .from("academic_assignment_submissions")
          .select(
            "assignment_id,status,submitted_at,marks_obtained,feedback,reviewed_at"
          )
          .eq("student_id", studentId)
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (unitsResult.error) throw unitsResult.error;
  if (resultsResult.error) throw resultsResult.error;
  if (submissionsResult.error) throw submissionsResult.error;

  const units = (unitsResult.data || []) as unknown as ReportUnitRow[];
  const resultMap = new Map(
    ((resultsResult.data || []) as unknown as ReportResultRow[]).map((result) => [
      result.exam_id,
      result,
    ])
  );
  const submissionMap = new Map(
    ((submissionsResult.data || []) as unknown as ReportSubmissionRow[]).map((submission) => [
      submission.assignment_id,
      submission,
    ])
  );

  const reportExams: StudentProgressReportExam[] = exams.map((exam) => {
    const result = resultMap.get(exam.id);
    const totalMarks = Math.max(0, Number(exam.total_marks) || 0);
    const passMarks = Math.max(0, Number(exam.pass_marks) || 0);

    if (!result) {
      return {
        id: exam.id,
        subjectId: exam.subject_id,
        name: exam.name,
        examType: exam.exam_type,
        examDate: exam.exam_date,
        totalMarks,
        passMarks,
        attendanceStatus: "NOT_RECORDED",
        obtainedMarks: null,
        percentage: null,
        grade: "—",
        rank: null,
        status: "NOT_RECORDED",
        remarks: null,
      };
    }

    if (result.attendance_status === "ABSENT") {
      return {
        id: exam.id,
        subjectId: exam.subject_id,
        name: exam.name,
        examType: exam.exam_type,
        examDate: exam.exam_date,
        totalMarks,
        passMarks,
        attendanceStatus: "ABSENT",
        obtainedMarks: null,
        percentage: null,
        grade: "—",
        rank: null,
        status: "ABSENT",
        remarks: textValue(result.remarks) || null,
      };
    }

    const obtainedMarks = Math.max(0, Number(result.obtained_marks) || 0);
    const percentage = safePercentage(obtainedMarks, totalMarks);
    return {
      id: exam.id,
      subjectId: exam.subject_id,
      name: exam.name,
      examType: exam.exam_type,
      examDate: exam.exam_date,
      totalMarks,
      passMarks,
      attendanceStatus: "PRESENT",
      obtainedMarks,
      percentage,
      grade: textValue(result.grade, gradeFromPercentage(percentage)),
      rank: typeof result.rank === "number" ? result.rank : null,
      status: obtainedMarks >= passMarks ? "PASSED" : "FAILED",
      remarks: textValue(result.remarks) || null,
    };
  });

  const now = Date.now();
  const reportAssignments: StudentProgressReportAssignment[] = assignments.map(
    (assignment) => {
      const submission = submissionMap.get(assignment.id);
      const totalMarks = Math.max(0, Number(assignment.total_marks) || 0);
      if (!submission) {
        return {
          id: assignment.id,
          subjectId: assignment.subject_id,
          title: assignment.title,
          assignmentType: assignment.assignment_type,
          dueAt: assignment.due_at,
          totalMarks,
          status: "NOT_SUBMITTED",
          marksObtained: null,
          percentage: null,
          feedback: Date.parse(assignment.due_at) < now ? "Deadline passed" : null,
        };
      }

      const marksObtained =
        submission.marks_obtained === null
          ? null
          : Math.max(0, Number(submission.marks_obtained) || 0);
      return {
        id: assignment.id,
        subjectId: assignment.subject_id,
        title: assignment.title,
        assignmentType: assignment.assignment_type,
        dueAt: assignment.due_at,
        totalMarks,
        status: submission.status,
        marksObtained,
        percentage:
          marksObtained === null
            ? null
            : safePercentage(marksObtained, totalMarks),
        feedback: textValue(submission.feedback) || null,
      };
    }
  );

  const reportSubjects: StudentProgressReportSubject[] = subjects.map(
    (subject) => {
      const subjectUnits = units.filter((unit) => unit.subject_id === subject.id);
      const progress = calculateSyllabusProgress(subjectUnits);
      const subjectExams = reportExams.filter(
        (exam) => exam.subjectId === subject.id
      );
      const subjectAssignments = reportAssignments.filter(
        (assignment) => assignment.subjectId === subject.id
      );
      const remainingUnits = subjectUnits.filter(
        (unit) => unit.status !== "COMPLETED" && unit.status !== "SKIPPED"
      );

      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        status: subject.status,
        syllabus: {
          totalUnits: progress.totalUnits,
          completedUnits: progress.completedUnits,
          runningUnits: progress.runningUnits,
          remainingUnits: remainingUnits.length,
          skippedUnits: progress.skippedUnits,
          percentage: progress.percentage,
          completedTitles: subjectUnits
            .filter((unit) => unit.status === "COMPLETED")
            .map((unit) => unit.title),
          remainingTitles: remainingUnits.map((unit) => unit.title),
        },
        exam: calculateExamReportSummary(subjectExams),
        assignment: calculateAssignmentReportSummary(subjectAssignments),
      };
    }
  );

  const overallSyllabusProgress = calculateSyllabusProgress(units);
  const allUnits = overallSyllabusProgress.totalUnits;
  const completedUnits = overallSyllabusProgress.completedUnits;
  const syllabusPercentage = overallSyllabusProgress.percentage;
  const examSummary = calculateExamReportSummary(reportExams);
  const assignmentSummary = calculateAssignmentReportSummary(reportAssignments);
  const settings = asRecord(settingsResult.data);
  const teacherObservations = Array.from(
    new Set(
      reportExams
        .map((exam) => exam.remarks?.trim())
        .filter((remarks): remarks is string => Boolean(remarks))
    )
  ).slice(0, 8);

  return {
    reportId: reportIdentifier(student.student_code, batch.code),
    generatedAt: new Date().toLocaleString("en-GB", {
      timeZone: "Asia/Dhaka",
      dateStyle: "long",
      timeStyle: "short",
    }),
    branding: {
      title: textValue(
        settings.site_name || settings.site_short_name,
        "SHIFAT'S TALES"
      ),
      subtitle: textValue(
        settings.tagline || settings.site_description,
        "Academic & Admission Care"
      ),
      phone: textValue(
        settings.primary_phone ||
          settings.whatsapp_number ||
          settings.secondary_phone
      ),
      email: textValue(settings.email),
      address: joinedAddress(settings),
      teacherName: "Md. Zia Uddin Azad Sifat",
    },
    student: {
      id: student.id,
      fullName: textValue(studentProfile?.full_name, "Student"),
      studentCode: textValue(student.student_code, "—"),
      academicLevel: textValue(student.academic_level, batch.academic_level),
      institution: textValue(student.institution, "—"),
      guardianName: textValue(student.guardian_name, "—"),
      guardianPhone: textValue(student.guardian_phone, "—"),
    },
    enrollment: {
      id: enrollment.id,
      status: enrollment.status,
      approvedAt: enrollment.approved_at,
      completedAt: enrollment.completed_at,
    },
    batch: {
      id: batch.id,
      name: batch.name,
      code: batch.code,
      academicLevel: batch.academic_level,
      startDate: batch.start_date,
      endDate: batch.end_date,
    },
    summary: {
      syllabusPercentage,
      completedUnits,
      totalUnits: allUnits,
      exam: examSummary,
      assignment: assignmentSummary,
      overallGrade: examSummary.grade,
      performanceBand: performanceBand(
        examSummary.averagePercentage,
        examSummary.attended
      ),
    },
    subjects: reportSubjects,
    exams: reportExams,
    assignments: reportAssignments,
    teacherObservations,
  };
}
