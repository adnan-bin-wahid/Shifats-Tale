import React from "react";
import { notFound, redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { ResultsManager } from "./results/results-manager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{
    examId: string;
  }>;
}

export default async function ExamDetailsPage({ params }: PageProps) {
  const { examId } = await params;
  const { destination } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") {
    redirect("/login");
  }
  if (destination !== "TEACHER_DASHBOARD") {
    redirect("/");
  }

  const supabase = await createClient();

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("*, batches(id, name, code)")
    .eq("id", examId)
    .single();

  if (examError || !exam) {
    notFound();
  }

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      id,
      status,
      student:student_profiles (
        id,
        student_code,
        profile:profiles (
          full_name
        )
      )
    `)
    .eq("batch_id", exam.batch_id)
    .in("status", ["ACTIVE", "COMPLETED"]);

  const { data: results } = await supabase
    .from("exam_results")
    .select("*")
    .eq("exam_id", examId);

  const studentsList = (enrollments || []).map((enr: any) => ({
    enrollmentId: enr.id,
    studentId: enr.student.id,
    studentCode: enr.student.student_code,
    fullName: enr.student.profile.full_name,
    enrollmentStatus: enr.status,
  }));

  const initialResults = (results || []).map((r: any) => ({
    studentId: r.student_id,
    enrollmentId: r.enrollment_id,
    attendanceStatus: r.attendance_status,
    obtainedMarks: r.obtained_marks,
    remarks: r.remarks,
  }));

  return (
    <div className="space-y-4">
      <Link
        href="/teacher/exams"
        className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors font-bold text-xs"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Examinations
      </Link>
      
      <ResultsManager 
        examId={examId} 
        exam={exam as any} 
        students={studentsList} 
        initialResults={initialResults} 
        initialMode="VIEW"
      />
    </div>
  );
}
