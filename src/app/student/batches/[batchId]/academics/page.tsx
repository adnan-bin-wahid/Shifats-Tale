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
      .select("id,batch_id,name,code,description,status,start_date,end_date,theme_key,display_order,weight,is_default,completed_at,created_at")
      .eq("batch_id", batchId)
      .not("status", "in", '("DRAFT","ARCHIVED")')
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("batch_academic_progress")
      .select("batch_id,total_subjects,running_subjects,completed_subjects,total_units,completed_units,academic_progress_percentage,planned_exams,conducted_exams,published_results,exam_plan_progress_percentage,result_publication_progress_percentage")
      .eq("batch_id", batchId)
      .maybeSingle(),
  ]);

  if (batchResult.error || !batchResult.data) notFound();
  if (subjectsResult.error) throw subjectsResult.error;
  if (batchProgressResult.error) throw batchProgressResult.error;

  const subjectRows = subjectsResult.data || [];
  const subjectIds = subjectRows.map((subject) => subject.id);

  const nowStr = new Date().toISOString();
  const [
    unitsResult,
    examsResult,
    progressResult,
    performanceResult,
    materialsResult,
    announcementsResult,
  ] =
    subjectIds.length
      ? await Promise.all([
          supabase
            .from("subject_units")
            .select("id,subject_id,title,description,unit_type,status,sequence_no,weight,planned_start_date,planned_end_date,completed_at")
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
            .select("subject_id,batch_id,total_units,completed_units,running_units,planned_units,syllabus_progress_percentage,planned_exams,conducted_exams,scheduled_exams,published_results,exam_plan_progress_percentage")
            .eq("batch_id", batchId)
            .in("subject_id", subjectIds),
          supabase
            .from("student_subject_performance")
            .select("student_id,batch_id,subject_id,published_exam_count,attended_exam_count,missed_exam_count,passed_exam_count,average_percentage")
            .eq("student_id", studentProfile.id)
            .eq("batch_id", batchId)
            .in("subject_id", subjectIds),
          supabase
            .from("batch_contents")
            .select("id,subject_id")
            .eq("batch_id", batchId)
            .eq("status", "PUBLISHED")
            .in("subject_id", subjectIds)
            .or(`release_at.is.null,release_at.lte.${nowStr}`)
            .or(`expires_at.is.null,expires_at.gt.${nowStr}`),
          supabase
            .from("announcements")
            .select("id,subject_id")
            .eq("batch_id", batchId)
            .eq("status", "PUBLISHED")
            .in("subject_id", subjectIds)
            .or(`release_at.is.null,release_at.lte.${nowStr}`)
            .or(`expires_at.is.null,expires_at.gt.${nowStr}`),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  const academicQueryError =
    unitsResult.error ||
    examsResult.error ||
    progressResult.error ||
    performanceResult.error ||
    materialsResult.error ||
    announcementsResult.error;
  if (academicQueryError) throw academicQueryError;

  const examRows = examsResult.data || [];
  const examIds = examRows.map((exam) => exam.id);
  const { data: resultRows, error: resultError } = examIds.length
    ? await supabase
        .from("exam_results")
        .select(
          "id, exam_id, attendance_status, obtained_marks, grade, rank, remarks"
        )
        .eq("student_id", studentProfile.id)
        .in("exam_id", examIds)
    : { data: [], error: null };
  if (resultError) throw resultError;

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
    materialCount: (materialsResult.data || []).filter(
      (material) => material.subject_id === subject.id
    ).length,
    announcementCount: (announcementsResult.data || []).filter(
      (announcement) => announcement.subject_id === subject.id
    ).length,
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
