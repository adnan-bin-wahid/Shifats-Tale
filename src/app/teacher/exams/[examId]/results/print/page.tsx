import React from "react";
import { notFound, redirect } from "next/navigation";
import { resolveAuthenticatedDestination } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { calculateGrade } from "@/lib/exams/grading";

interface PageProps {
  params: Promise<{
    examId: string;
  }>;
}

export default async function PrintResultSheetPage({ params }: PageProps) {
  const { examId } = await params;
  const { destination } = await resolveAuthenticatedDestination();

  if (destination === "UNAUTHENTICATED") redirect("/login");
  if (destination !== "TEACHER_DASHBOARD") redirect("/");

  const supabase = await createClient();

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("*, batches(name, code)")
    .eq("id", examId)
    .single();

  if (examError || !exam) notFound();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      id, status,
      student:student_profiles (
        id, student_code,
        profile:profiles ( full_name )
      )
    `)
    .eq("batch_id", exam.batch_id)
    .in("status", ["ACTIVE", "COMPLETED"]);

  const { data: results } = await supabase
    .from("exam_results")
    .select("*")
    .eq("exam_id", examId);

  const studentsList = (enrollments || []).map((enr: any) => {
    const student = enr.student;
    return {
      enrollmentId: enr.id,
      studentId: student.id,
      studentCode: student.student_code,
      fullName: student.profile.full_name,
    };
  }).filter(Boolean);

  const resultMap = new Map((results || []).map(r => [r.student_id, r]));

  let graded = 0, passed = 0, failed = 0, absent = 0, totalMarks = 0;
  let highestScore = -1, lowestScore = exam.total_marks + 1;

  const studentMetrics = studentsList.map(student => {
    const r = resultMap.get(student.studentId);
    const isAbsent = r?.attendance_status === "ABSENT";
    const hasMarks = r?.obtained_marks !== null && r?.obtained_marks !== undefined;
    const marks = hasMarks ? Number(r.obtained_marks) : 0;
    
    const status = isAbsent ? "Absent" : (marks >= exam.pass_marks ? "Passed" : "Failed");
    const percentage = hasMarks ? (marks / exam.total_marks) * 100 : 0;
    const grade = hasMarks ? calculateGrade(percentage) : "-";

    if (isAbsent) absent++;
    else if (hasMarks) {
      graded++;
      totalMarks += marks;
      if (marks >= exam.pass_marks) passed++;
      else failed++;
      if (marks > highestScore) highestScore = marks;
      if (marks < lowestScore) lowestScore = marks;
    }

    return { ...student, marks, percentage, grade, status, hasMarks, isAbsent };
  });

  // Ranking
  const sortedForRank = [...studentMetrics].filter(s => s.hasMarks && !s.isAbsent).sort((a, b) => b.marks - a.marks);
  const rankMap = new Map();
  let currentRank = 1;
  sortedForRank.forEach((s, idx) => {
    if (idx > 0 && sortedForRank[idx - 1].marks === s.marks) {
      rankMap.set(s.studentId, rankMap.get(sortedForRank[idx - 1].studentId));
    } else {
      rankMap.set(s.studentId, currentRank);
    }
    currentRank++;
  });

  studentMetrics.forEach(s => { (s as any).rank = rankMap.get(s.studentId) || null; });

  // Final Sort
  studentMetrics.sort((a, b) => {
    if (a.isAbsent && !b.isAbsent) return 1;
    if (!a.isAbsent && b.isAbsent) return -1;
    return ((a as any).rank || 9999) - ((b as any).rank || 9999);
  });

  return (
    <>
      <style>{`
        /* Hide app shell */
        header, nav, aside, .sidebar, .topbar, .navbar { display: none !important; }
        main { padding: 0 !important; margin: 0 !important; background: white !important; min-height: 0 !important; }
        body { background: white !important; }
        
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          /* Ensure layout containers don't break flex/grid */
          .grid { display: grid !important; }
        }
      `}</style>
      <div className="bg-white min-h-screen text-black p-8 font-sans">
        <div className="max-w-[210mm] mx-auto bg-white" style={{ minHeight: '297mm' }}>
          
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-4 mb-6 flex flex-col items-center">
            {/* Logo image injection */}
            <img src="/images/logo_transparent.png" alt="Logo" className="h-16 mb-2" />
            <h1 className="text-3xl font-bold tracking-wider mb-1">SHIFAT'S TALES</h1>
            <p className="text-sm font-semibold uppercase tracking-widest text-gray-700">Academic & Coaching Management</p>
            <div className="mt-4 inline-block px-4 py-1 border border-black font-bold uppercase">
              Official Result Sheet
            </div>
          </div>

          {/* Exam Info & Summary (2 Column) */}
          <div className="grid grid-cols-2 gap-8 mb-8 text-sm border border-gray-300 rounded p-4 bg-gray-50/50 print:bg-transparent">
            <div className="space-y-2">
              <p><span className="font-semibold w-24 inline-block">Exam Name:</span> {exam.name}</p>
              <p><span className="font-semibold w-24 inline-block">Batch:</span> {exam.batches?.name}</p>
              <p><span className="font-semibold w-24 inline-block">Exam Type:</span> {exam.exam_type?.replace("_", " ")}</p>
              <p><span className="font-semibold w-24 inline-block">Exam Date:</span> {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "N/A"}</p>
              <p><span className="font-semibold w-24 inline-block">Total Marks:</span> {exam.total_marks}</p>
              <p><span className="font-semibold w-24 inline-block">Pass Marks:</span> {exam.pass_marks}</p>
            </div>
            <div className="space-y-2">
              <p><span className="font-semibold w-28 inline-block">Total Enrolled:</span> {studentsList.length}</p>
              <p><span className="font-semibold w-28 inline-block">Present:</span> {graded}</p>
              <p><span className="font-semibold w-28 inline-block">Absent:</span> {absent}</p>
              <p><span className="font-semibold w-28 inline-block">Passed:</span> {passed}</p>
              <p><span className="font-semibold w-28 inline-block">Class Average:</span> {graded > 0 ? (totalMarks / graded).toFixed(1) : "-"}</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-sm border-collapse border border-gray-800 mb-8">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                <th className="border border-gray-800 px-2 py-2 text-center w-12">Rank</th>
                <th className="border border-gray-800 px-2 py-2 text-left">Student Name</th>
                <th className="border border-gray-800 px-2 py-2 text-left w-28">Student ID</th>
                <th className="border border-gray-800 px-2 py-2 text-center w-20">Marks</th>
                <th className="border border-gray-800 px-2 py-2 text-center w-16">%</th>
                <th className="border border-gray-800 px-2 py-2 text-center w-16">Grade</th>
                <th className="border border-gray-800 px-2 py-2 text-center w-20">Status</th>
              </tr>
            </thead>
            <tbody>
              {studentMetrics.map((s, i) => (
                <tr key={s.studentId}>
                  <td className="border border-gray-800 px-2 py-1 text-center font-bold">{(s as any).rank || "-"}</td>
                  <td className="border border-gray-800 px-2 py-1">{s.fullName}</td>
                  <td className="border border-gray-800 px-2 py-1 font-mono text-xs">{s.studentCode}</td>
                  <td className="border border-gray-800 px-2 py-1 text-center font-bold">
                    {s.isAbsent ? "-" : `${s.marks}/${exam.total_marks}`}
                  </td>
                  <td className="border border-gray-800 px-2 py-1 text-center">
                    {s.isAbsent ? "-" : `${s.percentage.toFixed(1)}%`}
                  </td>
                  <td className="border border-gray-800 px-2 py-1 text-center font-bold">
                    {s.grade}
                  </td>
                  <td className="border border-gray-800 px-2 py-1 text-center">
                    {s.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="mt-16 flex justify-between items-end text-sm">
            <div className="text-left text-gray-500 text-xs">
              <p>Generated by Shifat's Tales Academic Portal</p>
              <p>Date: {new Date().toLocaleString()}</p>
              <p>This is a system-generated result sheet.</p>
            </div>
            <div className="text-center w-48">
              <div className="border-b border-black mb-2 h-10"></div>
              <p className="font-semibold uppercase">Authorized Signature</p>
            </div>
          </div>

        </div>

        {/* Auto-print script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onload = function() {
                window.print();
              }
            `
          }}
        />
      </div>
    </>
  );
}
