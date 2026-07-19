import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AcademicBatchWorkspace } from "./academic-batch-workspace";

interface PageProps {
  params: Promise<{ batchId: string }>;
}

export default async function AcademicBatchWorkspacePage({ params }: PageProps) {
  const { batchId } = await params;
  const supabase = await createClient();

  const [batchResult, subjectsResult, examsResult, progressResult, batchProgressResult] =
    await Promise.all([
      supabase
        .from("batches")
        .select("id, name, code, academic_level, status, start_date, end_date")
        .eq("id", batchId)
        .single(),
      supabase
        .from("batch_subjects")
        .select("*")
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
        .select("*")
        .eq("batch_id", batchId),
      supabase
        .from("batch_academic_progress")
        .select("*")
        .eq("batch_id", batchId)
        .maybeSingle(),
    ]);

  if (batchResult.error || !batchResult.data) {
    notFound();
  }

  const subjectRows = subjectsResult.data || [];
  const subjectIds = subjectRows.map((subject) => subject.id);
  const unitsResult = subjectIds.length
    ? await supabase
        .from("subject_units")
        .select("*")
        .in("subject_id", subjectIds)
        .order("sequence_no", { ascending: true })
    : { data: [], error: null };

  const unitRows = unitsResult.data || [];
  const examRows = examsResult.data || [];
  const progressRows = progressResult.data || [];

  const subjects = subjectRows.map((subject) => ({
    ...subject,
    units: unitRows.filter((unit) => unit.subject_id === subject.id),
    exams: examRows.filter((exam) => exam.subject_id === subject.id),
    progress:
      progressRows.find((progress) => progress.subject_id === subject.id) || null,
  }));

  return (
    <AcademicBatchWorkspace
      batch={batchResult.data}
      subjects={subjects}
      batchProgress={batchProgressResult.data || null}
    />
  );
}
