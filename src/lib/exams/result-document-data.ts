if (process.env.NODE_ENV !== "test" && !process.env.NODE_TEST_CONTEXT) {
  require("server-only");
}
import { createClient } from "@/lib/supabase/server";
import { calculateGrade } from "./grading";

export interface ResultRow {
  serial: number;
  rank: number | string;
  studentId: string;
  studentName: string;
  studentCode: string;
  attendance: "PRESENT" | "ABSENT";
  marks: number | null;
  percentage: string;
  grade: string;
  status: "PASSED" | "FAILED" | "ABSENT";
}

export interface ResultDocumentData {
  exam: {
    id: string;
    title: string;
    exam_date: string | null;
    total_marks: number;
    pass_marks: number | null;
    batch_name: string;
    batch_code: string;
    created_at: string;
  };
  branding: {
    title: string;
    subtitle: string;
    phone: string;
    email: string;
    address: string;
    teacherName: string;
  };
  summary: {
    enrolled: number;
    present: number;
    absent: number;
    passed: number;
    failed: number;
    averageMark: string;
    highestMark: number;
    lowestMark: number;
  };
  results: ResultRow[];
  generatedAt: string;
}

/**
 * Shared single-source-of-truth service for Exam Results Document generation.
 * Used by official React-PDF Route Handlers, CSV exports, and Dashboard summaries.
 */
export async function getExamResultDocumentData(examId: string): Promise<ResultDocumentData | null> {
  const supabase = await createClient();

  // 1. Fetch exam with batch details
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("*, batches(name, code)")
    .eq("id", examId)
    .single();

  if (examError || !exam) {
    console.error("Exam not found inside getExamResultDocumentData:", examError);
    return null;
  }

  // 2. Fetch site settings / institution branding
  const { data: settingsData } = await supabase
    .from("site_settings")
    .select("content")
    .eq("section_key", "SITE_INFO")
    .single();

  const settings = settingsData?.content || {};
  const branding = {
    title: settings.coachingName || settings.coachingCenterName || "SHIFAT'S TALES",
    subtitle: settings.tagline || settings.heroDescription || "Academic & Admission Care",
    phone: settings.phone || settings.contactNumber || "+880 1700-000000",
    email: settings.email || "support@shifatstales.com",
    address: settings.address || "Chittagong, Bangladesh",
    teacherName: settings.teacherName || "Md. Zia Uddin Azad Sifat",
  };

  // 3. Fetch active enrollments in the batch
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      id, status,
      student:student_profiles (
        id, student_code,
        profile:profiles ( full_name )
      )
    `)
    .eq("batch_id", exam.batch_id)
    .in("status", ["ACTIVE", "COMPLETED"]);

  // 4. Fetch all results submitted for this exam
  const { data: rawResults } = await supabase
    .from("exam_results")
    .select("*")
    .eq("exam_id", examId);

  const studentsList = (enrollments || []).map((enr: any) => {
    const student = enr.student;
    return {
      enrollmentId: enr.id,
      studentId: student.id,
      studentCode: student.student_code || "N/A",
      fullName: student?.profile?.full_name || "Unknown Student",
    };
  }).filter(Boolean);

  const resultMap = new Map((rawResults || []).map(r => [r.student_id, r]));

  const totalMarks = Number(exam.total_marks) || 100;
  const passMarks = exam.pass_marks ? Number(exam.pass_marks) : Math.round(totalMarks * 0.4);

  // Build rows before ranking sorting
  const rowsBeforeRanking: Array<{
    studentId: string;
    studentName: string;
    studentCode: string;
    attendance: "PRESENT" | "ABSENT";
    marks: number | null;
    percentageNum: number;
    grade: string;
    status: "PASSED" | "FAILED" | "ABSENT";
  }> = studentsList.map(st => {
    const res = resultMap.get(st.studentId);
    if (!res || res.attendance_status === "ABSENT") {
      return {
        studentId: st.studentId,
        studentName: st.fullName,
        studentCode: st.studentCode,
        attendance: "ABSENT",
        marks: null,
        percentageNum: 0,
        grade: "N/A",
        status: "ABSENT",
      };
    }

    const marksObtained = Number(res.obtained_marks) || 0;
    const pct = (marksObtained / totalMarks) * 100;
    const grade = calculateGrade(pct);
    const status = marksObtained >= passMarks ? "PASSED" : "FAILED";

    return {
      studentId: st.studentId,
      studentName: st.fullName,
      studentCode: st.studentCode,
      attendance: "PRESENT",
      marks: marksObtained,
      percentageNum: pct,
      grade,
      status,
    };
  });

  // Sort: Present (highest marks first), then Absent (by student code)
  rowsBeforeRanking.sort((a, b) => {
    if (a.attendance === "PRESENT" && b.attendance === "ABSENT") return -1;
    if (a.attendance === "ABSENT" && b.attendance === "PRESENT") return 1;
    if (a.attendance === "PRESENT" && b.attendance === "PRESENT") {
      return (b.marks || 0) - (a.marks || 0);
    }
    return a.studentCode.localeCompare(b.studentCode);
  });

  // Calculate summary & assign ranks
  let presentCount = 0;
  let absentCount = 0;
  let passedCount = 0;
  let failedCount = 0;
  let totalMarksSum = 0;
  let highestMark = -1;
  let lowestMark = totalMarks + 1;

  let currentRank = 1;
  let lastMark: number | null = null;
  let studentsAtCurrentMark = 0;

  const results: ResultRow[] = rowsBeforeRanking.map((row, idx) => {
    let assignedRank: number | string = "-";

    if (row.attendance === "PRESENT" && row.marks !== null) {
      presentCount++;
      totalMarksSum += row.marks;
      if (row.marks > highestMark) highestMark = row.marks;
      if (row.marks < lowestMark) lowestMark = row.marks;

      if (row.status === "PASSED") passedCount++;
      else failedCount++;

      if (lastMark === null || row.marks < lastMark) {
        currentRank = presentCount;
        assignedRank = currentRank;
      } else {
        // Equal marks => equal rank
        assignedRank = currentRank;
      }
      lastMark = row.marks;
    } else {
      absentCount++;
    }

    return {
      serial: idx + 1,
      rank: assignedRank,
      studentId: row.studentId,
      studentName: row.studentName,
      studentCode: row.studentCode,
      attendance: row.attendance,
      marks: row.marks,
      percentage: row.attendance === "PRESENT" ? `${row.percentageNum.toFixed(1)}%` : "-",
      grade: row.grade,
      status: row.status,
    };
  });

  if (presentCount === 0) {
    highestMark = 0;
    lowestMark = 0;
  }

  const averageMark = presentCount > 0 ? (totalMarksSum / presentCount).toFixed(1) : "0.0";

  return {
    exam: {
      id: exam.id,
      title: exam.title || "Examination",
      exam_date: exam.exam_date || null,
      total_marks: totalMarks,
      pass_marks: passMarks,
      batch_name: exam.batches?.name || "General Batch",
      batch_code: exam.batches?.code || "",
      created_at: exam.created_at || new Date().toISOString(),
    },
    branding,
    summary: {
      enrolled: studentsList.length,
      present: presentCount,
      absent: absentCount,
      passed: passedCount,
      failed: failedCount,
      averageMark,
      highestMark,
      lowestMark,
    },
    results,
    generatedAt: new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}
