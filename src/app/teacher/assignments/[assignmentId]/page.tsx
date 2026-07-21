import { notFound, redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeacherAssignmentWorkspace } from "@/components/assignments/teacher-assignment-workspace";

function one<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] || null : value;
}

export default async function TeacherAssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const [{ assignmentId }, { destination }] = await Promise.all([
    params,
    resolveAuthenticatedDestination(),
  ]);
  if (destination === "UNAUTHENTICATED") redirect("/login");
  if (destination !== "TEACHER_DASHBOARD") redirect("/student");

  const admin = createAdminClient();
  const { data: rawAssignment, error: assignmentError } = await admin
    .from("academic_assignments")
    .select("*,batch:batches(id,name,code),subject:batch_subjects(id,name,code),unit:subject_units(id,title)")
    .eq("id", assignmentId)
    .single();
  if (assignmentError || !rawAssignment) notFound();

  const [submissionsResult, enrollmentCountResult] = await Promise.all([
    admin
      .from("academic_assignment_submissions")
      .select("*,student:student_profiles(id,student_code,profile:profiles(full_name))")
      .eq("assignment_id", assignmentId)
      .order("submitted_at", { ascending: false }),
    admin
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", rawAssignment.batch_id)
      .eq("status", "ACTIVE"),
  ]);
  if (submissionsResult.error || enrollmentCountResult.error) {
    throw submissionsResult.error || enrollmentCountResult.error;
  }

  const batch = one(rawAssignment.batch as unknown as { id: string; name: string; code: string } | { id: string; name: string; code: string }[] | null);
  const subject = one(rawAssignment.subject as unknown as { id: string; name: string; code: string } | { id: string; name: string; code: string }[] | null);
  const unit = one(rawAssignment.unit as unknown as { id: string; title: string } | { id: string; title: string }[] | null);
  const assignment = {
    ...rawAssignment,
    batchName: batch?.name || "Unknown batch",
    batchCode: batch?.code || "",
    subjectName: subject?.name || "Unknown subject",
    subjectCode: subject?.code || "",
    unitTitle: unit?.title || null,
  };
  const submissions = (submissionsResult.data || []).map((submission) => {
    const student = one(submission.student as unknown as { id: string; student_code: string; profile: { full_name: string } | { full_name: string }[] | null } | { id: string; student_code: string; profile: { full_name: string } | { full_name: string }[] | null }[] | null);
    const profile = one(student?.profile || null);
    return {
      id: submission.id,
      status: submission.status,
      submitted_at: submission.submitted_at,
      submission_text: submission.submission_text,
      submission_url: submission.submission_url,
      marks_obtained: submission.marks_obtained,
      feedback: submission.feedback,
      studentName: profile?.full_name || "Unknown student",
      studentCode: student?.student_code || "No code",
    };
  });

  return (
    <TeacherAssignmentWorkspace
      assignment={assignment}
      submissions={submissions}
      activeStudentCount={enrollmentCountResult.count || 0}
    />
  );
}
