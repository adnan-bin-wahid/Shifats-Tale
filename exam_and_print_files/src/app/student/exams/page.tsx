import React from "react";
import { redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { GraduationCap } from "lucide-react";
import { StudentAnalyticsDashboard } from "./StudentAnalyticsDashboard";

export default async function StudentExamsPage() {
  const { destination, studentProfile } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") {
    redirect("/login");
  }
  if (!studentProfile) {
    redirect("/");
  }

  const supabase = await createClient();

  // Query active enrollments for student
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      batch_id,
      batches(id, name, code)
    `)
    .eq("student_id", studentProfile.id)
    .eq("status", "ACTIVE");

  const activeBatchIds = enrollments?.map((e) => e.batch_id) || [];
  const activeBatches = enrollments?.map((e: any) => e.batches) || [];

  if (activeBatchIds.length === 0) {
    return (
      <div className="space-y-8 text-xs font-bold text-primary">
        <DashboardPageHeader
          title="My Examinations"
          description="Track your academic progress, analyze performance, and set goals."
        />
        <div className="p-8 bg-white border border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-center">
          <GraduationCap className="h-10 w-10 text-muted stroke-1 mb-4" />
          <h3 className="text-sm font-extrabold text-primary">No Active Enrollments</h3>
          <p className="text-xs text-muted max-w-sm font-medium mt-1 leading-relaxed">
            You must be enrolled actively in at least one batch to view scheduled examinations.
          </p>
        </div>
      </div>
    );
  }

  // Fetch exams for these active batches, excluding DRAFT status
  const { data: exams, error } = await supabase
    .from("exams")
    .select("*, batches(id, name, code)")
    .in("batch_id", activeBatchIds)
    .neq("status", "DRAFT")
    .order("exam_date", { ascending: false });

  if (error) {
    console.error("Failed to query exams for student:", error);
  }
  
  const examIds = exams?.map(e => e.id) || [];

  // Fetch results for these exams
  let results: any[] = [];
  if (examIds.length > 0) {
    const { data: resultsData } = await supabase
      .from("exam_results")
      .select("*")
      .eq("student_id", studentProfile.id)
      .in("exam_id", examIds);
    results = resultsData || [];
  }

  // Merge results into exams
  const enrichedExams = (exams || []).map(exam => ({
    ...exam,
    result: results.find(r => r.exam_id === exam.id) || null
  }));

  return (
    <div className="space-y-8 text-xs font-bold text-primary">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <DashboardPageHeader
          title="My Examinations"
          description="Track your academic progress, analyze performance, and set goals."
        />
      </div>
      
      <StudentAnalyticsDashboard exams={enrichedExams} activeBatches={activeBatches} />
    </div>
  );
}
