/* eslint-disable @next/next/no-img-element */
import {
  Award,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
} from "lucide-react";
import type { StudentProgressReportData } from "@/lib/reports/student-progress-report-data";

interface Props {
  data: StudentProgressReportData;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".0", "")}%`;
}

function label(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusColor(status: string) {
  if (["PASSED", "REVIEWED"].includes(status)) return "text-emerald-700";
  if (["FAILED", "ABSENT", "NOT_SUBMITTED"].includes(status)) return "text-rose-700";
  if (["LATE", "RETURNED"].includes(status)) return "text-amber-700";
  return "text-slate-600";
}

export function StudentProgressReportCard({ data }: Props) {
  const { student, batch, summary } = data;

  return (
    <article className="student-progress-report overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-900 shadow-xl shadow-slate-900/5 print:rounded-none print:border-0 print:shadow-none">
      <header className="bg-[linear-gradient(135deg,#071A3D_0%,#102A66_60%,#2456B3_100%)] px-6 py-7 text-white sm:px-8 print:px-5 print:py-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white p-2 shadow-lg">
              <img
                src="/images/alternate_logo_dark.png"
                alt="Shifat's Tales"
                className="h-12 w-24 object-contain sm:w-28"
              />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-300">
                Official academic document
              </p>
              <h1 className="mt-1 font-display text-xl font-black sm:text-2xl">
                Student Progress Report
              </h1>
              <p className="mt-1 text-[10px] font-semibold text-blue-100/80">
                {data.branding.title} · {data.branding.subtitle}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-right">
            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-blue-100/65">
              Report ID
            </p>
            <p className="mt-1 text-xs font-black">{data.reportId}</p>
            <p className="mt-1 text-[8px] font-semibold text-blue-100/70">
              Generated {data.generatedAt}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-6 p-6 sm:p-8 print:space-y-4 print:p-5">
        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:grid-cols-2 print:grid-cols-2 print:p-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-700">Student profile</p>
            <h2 className="mt-2 font-display text-lg font-black text-slate-950">{student.fullName}</h2>
            <dl className="mt-3 grid grid-cols-[105px_1fr] gap-x-3 gap-y-1.5 text-[10px] font-semibold">
              <dt className="text-slate-400">Student ID</dt><dd className="font-black">{student.studentCode}</dd>
              <dt className="text-slate-400">Academic level</dt><dd>{student.academicLevel}</dd>
              <dt className="text-slate-400">Institution</dt><dd>{student.institution}</dd>
              <dt className="text-slate-400">Guardian</dt><dd>{student.guardianName}</dd>
              <dt className="text-slate-400">Guardian phone</dt><dd>{student.guardianPhone}</dd>
            </dl>
          </div>
          <div className="border-t border-slate-200 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 print:border-l print:border-t-0 print:pl-5 print:pt-0">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-violet-700">Batch information</p>
            <h2 className="mt-2 font-display text-lg font-black text-slate-950">{batch.name}</h2>
            <dl className="mt-3 grid grid-cols-[105px_1fr] gap-x-3 gap-y-1.5 text-[10px] font-semibold">
              <dt className="text-slate-400">Batch code</dt><dd className="font-black">{batch.code}</dd>
              <dt className="text-slate-400">Level</dt><dd>{batch.academicLevel}</dd>
              <dt className="text-slate-400">Duration</dt><dd>{formatDate(batch.startDate)} – {formatDate(batch.endDate)}</dd>
              <dt className="text-slate-400">Enrollment</dt><dd>{label(data.enrollment.status)}</dd>
            </dl>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
          {[
            [formatPercent(summary.syllabusPercentage), "Syllabus progress", `${summary.completedUnits}/${summary.totalUnits} units`, BookOpenCheck, "bg-blue-50 text-blue-700"],
            [formatPercent(summary.exam.averagePercentage), "Exam average", `${summary.exam.recorded}/${summary.exam.published} recorded`, GraduationCap, "bg-emerald-50 text-emerald-700"],
            [summary.overallGrade, "Overall grade", summary.performanceBand, Award, "bg-violet-50 text-violet-700"],
            [formatPercent(summary.assignment.submissionRate), "Assignment submission", `${summary.assignment.submitted}/${summary.assignment.assigned} submitted`, ClipboardCheck, "bg-amber-50 text-amber-700"],
          ].map(([value, title, note, Icon, color]) => (
            <div key={String(title)} className="break-inside-avoid rounded-2xl border border-slate-200 p-4 print:p-3">
              <span className={`inline-flex rounded-lg p-2 ${String(color)}`}><Icon className="h-4 w-4" /></span>
              <p className="mt-3 font-display text-xl font-black text-slate-950 print:text-lg">{String(value)}</p>
              <p className="mt-1 text-[8px] font-black uppercase tracking-wide text-slate-500">{String(title)}</p>
              <p className="mt-1 text-[8px] font-semibold text-slate-400">{String(note)}</p>
            </div>
          ))}
        </section>

        <section className="break-inside-avoid overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
            <div><p className="text-[8px] font-black uppercase tracking-[0.15em] text-blue-600">Curriculum delivery</p><h2 className="mt-1 text-sm font-black">Subject-wise academic progress</h2></div>
            <BookOpenCheck className="h-5 w-5 text-slate-300" />
          </div>
          {data.subjects.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left text-[9px] print:min-w-0 print:text-[8px]">
                <thead className="bg-[#0B1E4B] text-white"><tr><th className="px-4 py-2.5">Subject</th><th className="px-4 py-2.5">Syllabus</th><th className="px-4 py-2.5">Units</th><th className="px-4 py-2.5">Exam avg.</th><th className="px-4 py-2.5">Exam record</th><th className="px-4 py-2.5">Assignment</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.subjects.map((subject) => (
                    <tr key={subject.id} className="break-inside-avoid">
                      <td className="px-4 py-3"><p className="font-black text-slate-900">{subject.name}</p><p className="mt-0.5 text-[8px] text-slate-400">{subject.code} · {label(subject.status)}</p></td>
                      <td className="px-4 py-3 font-black text-blue-700">{formatPercent(subject.syllabus.percentage)}</td>
                      <td className="px-4 py-3">{subject.syllabus.completedUnits}/{subject.syllabus.totalUnits}</td>
                      <td className="px-4 py-3 font-black text-emerald-700">{formatPercent(subject.exam.averagePercentage)}</td>
                      <td className="px-4 py-3">{subject.exam.recorded}/{subject.exam.published} published records · {subject.exam.passed} passed</td>
                      <td className="px-4 py-3">{subject.assignment.submitted}/{subject.assignment.assigned} submitted</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="p-8 text-center text-xs font-bold text-slate-400">No visible subjects in this batch.</p>}
        </section>

        {data.subjects.some((subject) => subject.syllabus.totalUnits > 0) && (
          <section className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
            {data.subjects.map((subject) => (
              subject.syllabus.totalUnits > 0 && (
                <div key={subject.id} className="break-inside-avoid rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between"><p className="text-[10px] font-black text-slate-900">{subject.name}</p><span className="text-[9px] font-black text-blue-700">{formatPercent(subject.syllabus.percentage)}</span></div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, subject.syllabus.percentage)}%` }} /></div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-[8px] leading-4">
                    <div><p className="font-black uppercase tracking-wide text-emerald-700">Completed</p><p className="mt-1 text-slate-500">{subject.syllabus.completedTitles.join(", ") || "None yet"}</p></div>
                    <div><p className="font-black uppercase tracking-wide text-amber-700">Remaining</p><p className="mt-1 text-slate-500">{subject.syllabus.remainingTitles.join(", ") || "None"}</p></div>
                  </div>
                </div>
              )
            ))}
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3"><p className="text-[8px] font-black uppercase tracking-[0.15em] text-violet-600">Published results</p><h2 className="mt-1 text-sm font-black">Exam performance history</h2></div>
          {data.exams.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-[9px] print:min-w-0 print:text-[7.5px]">
                <thead className="bg-[#0B1E4B] text-white"><tr><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Exam</th><th className="px-3 py-2.5">Subject</th><th className="px-3 py-2.5">Marks</th><th className="px-3 py-2.5">%</th><th className="px-3 py-2.5">Grade</th><th className="px-3 py-2.5">Rank</th><th className="px-3 py-2.5">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.exams.map((exam) => {
                    const subject = data.subjects.find((item) => item.id === exam.subjectId);
                    return <tr key={exam.id} className="break-inside-avoid"><td className="px-3 py-2.5 text-slate-500">{formatDate(exam.examDate)}</td><td className="px-3 py-2.5"><p className="font-black">{exam.name}</p><p className="text-[7px] text-slate-400">{label(exam.examType)}</p></td><td className="px-3 py-2.5">{subject?.name || "—"}</td><td className="px-3 py-2.5 font-black">{exam.obtainedMarks === null ? "—" : `${exam.obtainedMarks}/${exam.totalMarks}`}</td><td className="px-3 py-2.5">{exam.percentage === null ? "—" : formatPercent(exam.percentage)}</td><td className="px-3 py-2.5 font-black">{exam.grade}</td><td className="px-3 py-2.5">{exam.rank || "—"}</td><td className={`px-3 py-2.5 font-black ${statusColor(exam.status)}`}>{label(exam.status)}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          ) : <p className="p-8 text-center text-xs font-bold text-slate-400">No published exam result is available.</p>}
        </section>

        <section className="break-inside-avoid rounded-2xl border border-slate-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[8px] font-black uppercase tracking-[0.15em] text-amber-600">Homework record</p><h2 className="mt-1 text-sm font-black">Assignment performance</h2></div>
            <div className="text-right text-[8px] font-bold text-slate-500"><p>{summary.assignment.reviewed} reviewed</p><p>{formatPercent(summary.assignment.averagePercentage)} reviewed average</p></div>
          </div>
          {data.assignments.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 print:grid-cols-2">
              {data.assignments.map((assignment) => {
                const subject = data.subjects.find((item) => item.id === assignment.subjectId);
                return <div key={assignment.id} className="break-inside-avoid rounded-xl bg-slate-50 p-3 text-[8px]"><div className="flex justify-between gap-3"><p className="font-black text-slate-900">{assignment.title}</p><span className={`shrink-0 font-black ${statusColor(assignment.status)}`}>{label(assignment.status)}</span></div><p className="mt-1 text-slate-400">{subject?.name || "Subject"} · Due {formatDate(assignment.dueAt)}</p><p className="mt-2 font-bold text-slate-600">Score: {assignment.marksObtained === null ? "—" : `${assignment.marksObtained}/${assignment.totalMarks} (${formatPercent(assignment.percentage || 0)})`}</p></div>;
              })}
            </div>
          ) : <p className="mt-4 text-xs font-bold text-slate-400">No published assignments in this batch.</p>}
        </section>

        <section className="break-inside-avoid grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><h2 className="text-xs font-black">Published teacher observations</h2></div>
            {data.teacherObservations.length ? <ul className="mt-3 space-y-2 text-[9px] font-semibold leading-4 text-slate-600">{data.teacherObservations.map((observation, index) => <li key={`${observation}-${index}`} className="flex gap-2"><span className="text-blue-600">•</span><span>{observation}</span></li>)}</ul> : <p className="mt-3 text-[9px] font-semibold text-slate-400">No published exam remarks are available.</p>}
          </div>
          <div className="rounded-2xl border border-slate-300 p-5">
            <h2 className="text-xs font-black">Teacher&apos;s remarks</h2>
            <div className="mt-4 space-y-4"><div className="border-b border-dashed border-slate-300" /><div className="border-b border-dashed border-slate-300" /><div className="border-b border-dashed border-slate-300" /></div>
          </div>
        </section>

        <footer className="break-inside-avoid border-t border-slate-200 pt-6">
          <div className="grid grid-cols-2 gap-10 text-center text-[9px] font-black uppercase tracking-wide text-slate-600">
            <div><div className="mx-auto mb-2 h-8 max-w-[180px] border-b border-slate-500" />Guardian signature</div>
            <div><div className="mx-auto mb-2 h-8 max-w-[180px] border-b border-slate-500" />Authorized teacher signature</div>
          </div>
          <div className="mt-6 flex flex-wrap justify-between gap-2 text-[8px] font-semibold text-slate-400"><p>{data.branding.address || data.branding.title}</p><p>{[data.branding.phone, data.branding.email].filter(Boolean).join(" · ")}</p></div>
        </footer>
      </div>
    </article>
  );
}
