import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { AutoPrintReport } from "@/components/reports/auto-print-report";
import { StudentProgressReportCard } from "@/components/reports/student-progress-report-card";
import { getStudentProgressReportData } from "@/lib/reports/student-progress-report-data";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";

interface PageProps {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ batchId?: string }>;
}

export default async function StudentProgressReportPrintPage({
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

  return (
    <>
      <style>{`
        header, nav, aside, .sidebar, .topbar, .navbar { display: none !important; }
        main { padding: 0 !important; margin: 0 !important; background: white !important; min-height: 0 !important; }
        body { background: #eef2f7 !important; }
        @media print {
          @page { size: A4; margin: 10mm; }
          html, body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .report-print-actions { display: none !important; }
          .student-progress-report { width: 100% !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
      `}</style>
      <div className="mx-auto min-h-screen max-w-[230mm] p-4 sm:p-6 print:max-w-none print:p-0">
        <div className="report-print-actions mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <Link
            href={`/teacher/reports/student-progress/${studentId}?batchId=${encodeURIComponent(batchId)}`}
            className="inline-flex items-center gap-2 px-2 text-xs font-black text-slate-500 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to preview
          </Link>
          <div className="flex gap-2">
            <a
              href={`/api/teacher/reports/student-progress/${studentId}/pdf?batchId=${encodeURIComponent(batchId)}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-[10px] font-black uppercase text-slate-700"
            >
              <Download className="h-4 w-4" /> PDF
            </a>
            <span className="inline-flex items-center gap-2 rounded-xl bg-[#0B1E4B] px-4 py-2 text-[10px] font-black uppercase text-white">
              <Printer className="h-4 w-4" /> Print dialog opens automatically
            </span>
          </div>
        </div>
        <StudentProgressReportCard data={data} />
        <AutoPrintReport />
      </div>
    </>
  );
}
