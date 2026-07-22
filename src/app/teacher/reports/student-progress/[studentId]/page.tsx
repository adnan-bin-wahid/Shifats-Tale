import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { StudentProgressReportCard } from "@/components/reports/student-progress-report-card";
import { getStudentProgressReportData } from "@/lib/reports/student-progress-report-data";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";

interface PageProps {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ batchId?: string }>;
}

export default async function StudentProgressReportPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const { destination, profile } = await resolveAuthenticatedDestination();
  if (
    destination !== "TEACHER_DASHBOARD" ||
    !profile ||
    profile.role !== "TEACHER"
  ) {
    redirect("/login");
  }

  const [{ studentId }, { batchId = "" }] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!batchId) notFound();

  const data = await getStudentProgressReportData(studentId, batchId);
  if (!data) notFound();
  const query = `batchId=${encodeURIComponent(batchId)}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/teacher/reports/student-progress?${query}&studentId=${encodeURIComponent(studentId)}`}
          className="inline-flex items-center gap-2 text-xs font-black text-slate-500 transition hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Choose another student
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/teacher/reports/student-progress/${studentId}/print?${query}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
          >
            <Printer className="h-4 w-4" /> Print A4
          </Link>
          <Link
            href={`/api/teacher/reports/student-progress/${studentId}/pdf?${query}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B1E4B] px-4 py-2.5 text-[10px] font-black uppercase tracking-wide text-white shadow-lg shadow-blue-950/15 transition hover:bg-[#12306F]"
          >
            <Download className="h-4 w-4" /> Download PDF
          </Link>
        </div>
      </div>

      <StudentProgressReportCard data={data} />
    </div>
  );
}
