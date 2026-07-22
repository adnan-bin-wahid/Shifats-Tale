import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  FileDown,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { StudentProgressReportFilters } from "@/components/reports/student-progress-report-filters";
import { getStudentProgressReportDirectory } from "@/lib/reports/student-progress-report-directory";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";

interface PageProps {
  searchParams: Promise<{ batchId?: string; studentId?: string }>;
}

export default async function StudentProgressReportBuilderPage({
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

  const { batches, students: studentOptions } =
    await getStudentProgressReportDirectory();

  const { batchId = "", studentId = "" } = await searchParams;
  const validBatchId = batches.some((batch) => batch.id === batchId)
    ? batchId
    : "";
  const validStudentId = studentOptions.some(
    (student) =>
      student.id === studentId && student.batchId === validBatchId
  )
    ? studentId
    : "";

  return (
    <div className="space-y-7">
      <Link
        href="/teacher/reports"
        className="inline-flex items-center gap-2 text-xs font-black text-slate-500 transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Reports center
      </Link>

      <section className="overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#071A3D_0%,#102A66_58%,#2456B3_100%)] p-6 text-white shadow-xl shadow-[#071A3D]/15 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.17em] text-cyan-100">
              <FileText className="h-3.5 w-3.5" /> Parent-ready document
            </span>
            <h1 className="mt-4 font-display text-2xl font-black sm:text-4xl">
              Student progress report
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-blue-100/80">
              Build a professional batch-specific report from published exam results,
              syllabus delivery, and reviewed assignment records.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              [BookOpenCheck, "Subject progress"],
              [FileDown, "PDF & print"],
              [ShieldCheck, "Read-only data"],
            ].map(([Icon, label]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-center backdrop-blur-sm"
              >
                <Icon className="mx-auto h-4 w-4 text-amber-300" />
                <p className="mt-2 text-[8px] font-black uppercase tracking-wide text-blue-100/80">
                  {String(label)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <StudentProgressReportFilters
        batches={batches}
        students={studentOptions}
        initialBatchId={validBatchId}
        initialStudentId={validStudentId}
      />

      <section className="grid gap-3 md:grid-cols-3">
        {[
          ["1", "Choose scope", "Select the exact batch and enrolled student."],
          ["2", "Review preview", "Verify academic records before sharing."],
          ["3", "Print or download", "Use the A4 print view or official PDF."],
        ].map(([number, title, description]) => (
          <div key={number} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700">
              {number}
            </span>
            <p className="mt-3 text-xs font-black text-slate-900">{title}</p>
            <p className="mt-1 text-[10px] font-semibold leading-5 text-slate-400">
              {description}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
