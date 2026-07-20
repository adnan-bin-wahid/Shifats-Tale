import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AcademicBatchWorkspace } from "./academic-batch-workspace";

interface PageProps {
  params: Promise<{ batchId: string }>;
}

export default async function AcademicBatchWorkspacePage({ params }: PageProps) {
  const { batchId } = await params;
  const supabase = await createClient();

  const [
    batchResult,
    subjectsResult,
    examsResult,
    progressResult,
    batchProgressResult,
    contentResult,
    announcementResult,
  ] =
    await Promise.all([
      supabase
        .from("batches")
        .select("id, name, code, academic_level, status, start_date, end_date")
        .eq("id", batchId)
        .single(),
      supabase
        .from("batch_subjects")
        .select("id,batch_id,name,code,description,status,start_date,end_date,theme_key,display_order,weight,is_default,completed_at,created_at")
        .eq("batch_id", batchId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("exams")
        .select("id, subject_id, name, exam_type, exam_date, start_time, total_marks, status, published_at")
        .eq("batch_id", batchId)
        .order("exam_date", { ascending: false }),
      supabase
        .from("subject_progress_summary")
        .select("subject_id,batch_id,total_units,completed_units,running_units,planned_units,syllabus_progress_percentage,planned_exams,conducted_exams,scheduled_exams,published_results,exam_plan_progress_percentage")
        .eq("batch_id", batchId),
      supabase
        .from("batch_academic_progress")
        .select("batch_id,total_subjects,running_subjects,completed_subjects,total_units,completed_units,academic_progress_percentage,planned_exams,conducted_exams,published_results,exam_plan_progress_percentage,result_publication_progress_percentage")
        .eq("batch_id", batchId)
        .maybeSingle(),
      supabase
        .from("batch_contents")
        .select("id,subject_id,status")
        .eq("batch_id", batchId)
        .neq("status", "ARCHIVED"),
      supabase
        .from("announcements")
        .select("id,subject_id,status")
        .eq("batch_id", batchId)
        .neq("status", "ARCHIVED"),
    ]);

  if (batchResult.error || !batchResult.data) {
    notFound();
  }
  const workspaceError =
    subjectsResult.error ||
    examsResult.error ||
    progressResult.error ||
    batchProgressResult.error ||
    contentResult.error ||
    announcementResult.error;
  if (workspaceError) throw workspaceError;

  const subjectRows = subjectsResult.data || [];
  const subjectIds = subjectRows.map((subject) => subject.id);
  const unitsResult = subjectIds.length
    ? await supabase
        .from("subject_units")
        .select("id,subject_id,title,description,unit_type,status,sequence_no,weight,planned_start_date,planned_end_date,completed_at")
        .in("subject_id", subjectIds)
        .order("sequence_no", { ascending: true })
    : { data: [], error: null };
  if (unitsResult.error) throw unitsResult.error;

  const unitRows = unitsResult.data || [];
  const examRows = examsResult.data || [];
  const progressRows = progressResult.data || [];

  const subjects = subjectRows.map((subject) => ({
    ...subject,
    units: unitRows.filter((unit) => unit.subject_id === subject.id),
    exams: examRows.filter((exam) => exam.subject_id === subject.id),
    progress:
      progressRows.find((progress) => progress.subject_id === subject.id) || null,
    materialCount: (contentResult.data || []).filter(
      (content) => content.subject_id === subject.id
    ).length,
    publishedMaterialCount: (contentResult.data || []).filter(
      (content) => content.subject_id === subject.id && content.status === "PUBLISHED"
    ).length,
    announcementCount: (announcementResult.data || []).filter(
      (announcement) => announcement.subject_id === subject.id
    ).length,
    publishedAnnouncementCount: (announcementResult.data || []).filter(
      (announcement) =>
        announcement.subject_id === subject.id && announcement.status === "PUBLISHED"
    ).length,
  }));

  return (
    <AcademicBatchWorkspace
      batch={batchResult.data}
      subjects={subjects}
      batchProgress={batchProgressResult.data || null}
    />
  );
}
