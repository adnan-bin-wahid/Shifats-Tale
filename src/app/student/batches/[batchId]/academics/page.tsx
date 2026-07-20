import { notFound, redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { StudentAcademicJourney } from "./student-academic-journey";

interface PageProps {
  params: Promise<{ batchId: string }>;
}

export default async function StudentBatchAcademicsPage({ params }: PageProps) {
  const { batchId } = await params;
  const { destination, studentProfile } =
    await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") redirect("/login");
  if (destination === "PENDING_APPROVAL") redirect("/pending-approval");
  if (destination === "ACCOUNT_DISABLED") redirect("/account-disabled");
  if (destination !== "STUDENT_DASHBOARD" || !studentProfile) {
    redirect("/login?error=invalid_profile");
  }

  const supabase = await createClient();

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id, approved_at, created_at")
    .eq("student_id", studentProfile.id)
    .eq("batch_id", batchId)
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (enrollmentError) {
    console.error("Failed to verify academic batch enrollment", {
      code: enrollmentError.code,
      message: enrollmentError.message,
    });
    throw new Error("Unable to verify the academic enrollment right now.");
  }

  if (!enrollment) {
    redirect("/student/academics?error=unauthorized_batch");
  }

  const [batchResult, subjectsResult, batchProgressResult] = await Promise.all([
    supabase
      .from("batches")
      .select(
        "id, name, code, academic_level, status, start_date, end_date, description"
      )
      .eq("id", batchId)
      .single(),
    supabase
      .from("batch_subjects")
      .select("*")
      .eq("batch_id", batchId)
      .not("status", "in", '("DRAFT","ARCHIVED")')
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("batch_academic_progress")
      .select("*")
      .eq("batch_id", batchId)
      .maybeSingle(),
  ]);

  if (batchResult.error || !batchResult.data) notFound();

  const subjectRows = subjectsResult.data || [];
  const subjectIds = subjectRows.map((subject) => subject.id);

  const [unitsResult, examsResult, progressResult, performanceResult] =
    subjectIds.length
      ? await Promise.all([
          supabase
            .from("subject_units")
            .select("*")
            .in("subject_id", subjectIds)
            .order("sequence_no", { ascending: true }),
          supabase
            .from("exams")
            .select(
              "id, batch_id, subject_id, name, description, exam_type, exam_date, start_time, duration, total_marks, pass_marks, status, published_at"
            )
            .eq("batch_id", batchId)
            .in("subject_id", subjectIds)
            .in("status", [
              "SCHEDULED",
              "COMPLETED",
              "RESULT_DRAFT",
              "RESULT_PUBLISHED",
            ])
            .order("exam_date", { ascending: true }),
          supabase
            .from("subject_progress_summary")
            .select("*")
            .eq("batch_id", batchId)
            .in("subject_id", subjectIds),
          supabase
            .from("student_subject_performance")
            .select("*")
            .eq("student_id", studentProfile.id)
            .eq("batch_id", batchId)
            .in("subject_id", subjectIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const examRows = examsResult.data || [];
  const examIds = examRows.map((exam) => exam.id);
  const { data: resultRows } = examIds.length
    ? await supabase
        .from("exam_results")
        .select(
          "id, exam_id, attendance_status, obtained_marks, grade, rank, remarks"
        )
        .eq("student_id", studentProfile.id)
        .in("exam_id", examIds)
    : { data: [] };

  const unitRows = unitsResult.data || [];
  const progressRows = progressResult.data || [];
  const performanceRows = performanceResult.data || [];
  const results = resultRows || [];

  const subjects = subjectRows.map((subject) => ({
    ...subject,
    units: unitRows.filter((unit) => unit.subject_id === subject.id),
    exams: examRows
      .filter((exam) => exam.subject_id === subject.id)
      .map((exam) => ({
        ...exam,
        result: results.find((result) => result.exam_id === exam.id) || null,
      })),
    progress:
      progressRows.find((progress) => progress.subject_id === subject.id) ||
      null,
    performance:
      performanceRows.find(
        (performance) => performance.subject_id === subject.id
      ) || null,
  }));

  return (
    <StudentAcademicJourney
      batch={batchResult.data}
      enrolledAt={enrollment.approved_at || enrollment.created_at}
      subjects={subjects}
      batchProgress={batchProgressResult.data || null}
    />
  );
}
