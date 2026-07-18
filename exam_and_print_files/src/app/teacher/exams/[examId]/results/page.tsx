import React from "react";
import { notFound, redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { ResultsManager } from "./results-manager";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    examId: string;
  }>;
}

export default async function ExamResultsEntryPage({ params }: PageProps) {
  const { examId } = await params;
  const { destination } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") {
    redirect("/login");
  }
  if (destination !== "TEACHER_DASHBOARD") {
    redirect("/");
  }

  const supabase = await createClient();

  // Query exam details
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("*, batches(name, code)")
    .eq("id", examId)
    .single();

  if (examError || !exam) {
    notFound();
  }

  // Allow viewing results even if published, but we will handle edit restrictions on the client


  // Query all eligible students (ACTIVE and COMPLETED enrollments)
  const { data: enrollments, error: enrollError } = await supabase
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

  if (enrollError) {
    console.error("Failed to fetch enrollments for results sheet:", enrollError);
  }

  // Query existing results recorded so far
  const { data: results, error: resultsError } = await supabase
    .from("exam_results")
    .select("*")
    .eq("exam_id", examId);

  if (resultsError) {
    console.error("Failed to fetch existing results for sheet:", resultsError);
  }

  // Map to flat types
  const studentsList = (enrollments || [])
    .map((enr: any) => {
      const student = enr.student;
      const profile = student?.profile;
      if (!student || !profile) return null;
      return {
        enrollmentId: enr.id,
        studentId: student.id,
        studentCode: student.student_code,
        fullName: profile.full_name,
        enrollmentStatus: enr.status,
      };
    })
    .filter(Boolean) as any[];

  const initialResultsList = (results || []).map((r) => ({
    studentId: r.student_id,
    enrollmentId: r.enrollment_id,
    attendanceStatus: r.attendance_status as any,
    obtainedMarks: r.obtained_marks !== null ? Number(r.obtained_marks) : null,
    remarks: r.remarks || "",
  }));

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href="/teacher/exams"
          className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors font-bold text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Examinations
        </Link>
        <DashboardPageHeader
          title={`Results Sheet: ${exam.name}`}
          description={`Record obtained marks, grades, and remarks for student batch: ${exam.batches?.name} (${exam.batches?.code}).`}
        />
      </div>
      
      <ResultsManager
        examId={examId}
        exam={exam as any}
        students={studentsList}
        initialResults={initialResultsList}
        initialMode="EDIT"
      />
    </div>
  );
}
