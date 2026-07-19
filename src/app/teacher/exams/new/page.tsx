import React from "react";
import { redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { NewExamForm } from "./new-exam-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface NewExamPageProps {
  searchParams: Promise<{
    batchId?: string;
    subjectId?: string;
  }>;
}

export default async function NewExamPage({ searchParams }: NewExamPageProps) {
  const query = await searchParams;
  const { destination } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") {
    redirect("/login");
  }
  if (destination !== "TEACHER_DASHBOARD") {
    redirect("/");
  }

  const supabase = await createClient();

  // Query batches that are not ARCHIVED or CANCELLED
  const [batchesResult, subjectsResult] = await Promise.all([
    supabase
      .from("batches")
      .select("id, name, code, status")
      .not("status", "in", '("ARCHIVED","CANCELLED")')
      .order("name", { ascending: true }),
    supabase
      .from("batch_subjects")
      .select("id, batch_id, name, code, status")
      .neq("status", "ARCHIVED")
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  const backHref = query.batchId ? `/teacher/academic/${query.batchId}` : "/teacher/exams";

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-primary hover:text-primary-dark transition-colors font-bold text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          {query.batchId ? "Back to Academic Workspace" : "Back to Examinations"}
        </Link>
        <DashboardPageHeader
          title="Create New Examination"
          description="Schedule a class test, assignment, or final exam for an active student batch."
        />
      </div>
      <div className="flex justify-center md:justify-start">
        <NewExamForm
          batches={batchesResult.data || []}
          subjects={subjectsResult.data || []}
          initialBatchId={query.batchId}
          initialSubjectId={query.subjectId}
        />
      </div>
    </div>
  );
}
