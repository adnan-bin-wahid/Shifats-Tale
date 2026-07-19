import React from "react";
import { notFound, redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { EditExamForm } from "./edit-exam-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    examId: string;
  }>;
}

export default async function EditExamPage({ params }: PageProps) {
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
    .select("*")
    .eq("id", examId)
    .single();

  if (examError || !exam) {
    notFound();
  }

  // Published exams cannot be edited directly without first unpublishing
  if (exam.status === "RESULT_PUBLISHED") {
    redirect(`/teacher/exams?error=cannot_edit_published`);
  }

  // Query all active batches
  const { data: batches } = await supabase
    .from("batches")
    .select("id, name, code")
    .not("status", "in", '("ARCHIVED","CANCELLED")')
    .order("name", { ascending: true });

  const { data: subjects } = await supabase
    .from("batch_subjects")
    .select("id, batch_id, name, code, status")
    .eq("batch_id", exam.batch_id)
    .neq("status", "ARCHIVED")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  // Query if this exam has entered results
  const { count: resultsCount } = await supabase
    .from("exam_results")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId);

  const hasResults = (resultsCount || 0) > 0;

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
          title={`Edit: ${exam.name}`}
          description={`Update details, description, schedule, and mark criteria for this examination.`}
        />
      </div>
      <div className="flex justify-center md:justify-start">
        <EditExamForm
          exam={exam}
          batches={batches || []}
          subjects={subjects || []}
          hasResults={hasResults}
        />
      </div>
    </div>
  );
}
