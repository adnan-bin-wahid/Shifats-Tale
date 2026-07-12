"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { saveDraftResultsAction, publishResultsAction, unpublishResultsAction } from "@/app/actions/exams";
import { 
  Loader2, 
  Search, 
  Filter, 
  Check, 
  AlertTriangle, 
  Undo2, 
  UserCheck, 
  BookOpen, 
  FileText,
  XCircle,
  Download,
  Printer,
  Edit,
  Eye,
  BarChart2,
  TrendingUp,
  Award,
  Calendar,
  Send
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { calculateGrade, calculatePassFailStatus } from "@/lib/exams/grading";
import { MarksDistributionChart, StudentScoresChart, StatusDonutChart } from "./charts";

interface Student {
  enrollmentId: string;
  studentId: string;
  studentCode: string;
  fullName: string;
  enrollmentStatus: string;
}

interface ResultRecord {
  studentId: string;
  enrollmentId: string;
  attendanceStatus: "PRESENT" | "ABSENT";
  obtainedMarks: number | null;
  remarks: string;
}

interface Props {
  examId: string;
  exam: {
    id: string;
    name: string;
    total_marks: number;
    pass_marks: number;
    status: string;
    batch_id: string;
    exam_type: string;
    exam_date: string;
    start_time: string | null;
    duration: number | null;
    description: string | null;
    batches?: { name: string; code: string } | null;
  };
  students: Student[];
  initialResults: ResultRecord[];
}

export function ResultsManager({ examId, exam, students, initialResults }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<"VIEW" | "EDIT">(exam.status === "RESULT_PUBLISHED" ? "VIEW" : "EDIT");

  // In-memory state of results
  const [results, setResults] = useState<Record<string, ResultRecord>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Filter and Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "PASSED" | "FAILED" | "ABSENT" | "TOP">("ALL");

  // Confirmation modals
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [publishNote, setPublishNote] = useState("");

  useEffect(() => {
    const initialMap: Record<string, ResultRecord> = {};
    students.forEach((student) => {
      const match = initialResults.find((r) => r.studentId === student.studentId);
      if (match) {
        initialMap[student.studentId] = {
          studentId: student.studentId,
          enrollmentId: student.enrollmentId,
          attendanceStatus: match.attendanceStatus,
          obtainedMarks: match.obtainedMarks !== null ? Number(match.obtainedMarks) : null,
          remarks: match.remarks || "",
        };
      } else {
        initialMap[student.studentId] = {
          studentId: student.studentId,
          enrollmentId: student.enrollmentId,
          attendanceStatus: "PRESENT",
          obtainedMarks: null,
          remarks: "",
        };
      }
    });
    setResults(initialMap);
    setIsDirty(false);
  }, [students, initialResults]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "You have unsaved marks changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Analytics Computation
  const analytics = useMemo(() => {
    const records = Object.values(results);
    const totalEnrolled = students.length;
    let graded = 0;
    let passed = 0;
    let failed = 0;
    let absent = 0;
    let totalMarks = 0;
    let highestScore = -1;
    let lowestScore = exam.total_marks + 1;
    let topPerformer: { name: string; marks: number } | null = null;
    let lowestPerformer: { name: string; marks: number } | null = null;

    const studentMetrics = students.map(student => {
      const r = results[student.studentId];
      const isAbsent = r?.attendanceStatus === "ABSENT";
      const hasMarks = r?.obtainedMarks !== null && r?.obtainedMarks !== undefined;
      const marks = r?.obtainedMarks || 0;
      const status = isAbsent ? "Absent" : (marks >= exam.pass_marks ? "Passed" : "Failed");
      const percentage = hasMarks ? (marks / exam.total_marks) * 100 : 0;
      const grade = hasMarks ? calculateGrade(percentage) : "-";

      if (isAbsent) absent++;
      else if (hasMarks) {
        graded++;
        totalMarks += marks;
        if (marks >= exam.pass_marks) passed++;
        else failed++;
        if (marks > highestScore) { highestScore = marks; topPerformer = { name: student.fullName, marks }; }
        if (marks < lowestScore) { lowestScore = marks; lowestPerformer = { name: student.fullName, marks }; }
      }

      return {
        ...student,
        record: r,
        marks,
        percentage,
        grade,
        status,
        hasMarks,
        isAbsent
      };
    });

    // Ranking Logic
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

    studentMetrics.forEach(s => {
      (s as any).rank = rankMap.has(s.studentId) ? rankMap.get(s.studentId) : null;
    });

    // Chart Data prep
    let dist90 = 0, dist80 = 0, dist70 = 0, dist60 = 0, distBelow = 0;
    studentMetrics.forEach(s => {
      if (s.hasMarks && !s.isAbsent) {
        if (s.percentage >= 90) dist90++;
        else if (s.percentage >= 80) dist80++;
        else if (s.percentage >= 70) dist70++;
        else if (s.percentage >= 60) dist60++;
        else distBelow++;
      }
    });

    const distChartData = [
      { range: "90-100%", count: dist90 },
      { range: "80-89%", count: dist80 },
      { range: "70-79%", count: dist70 },
      { range: "60-69%", count: dist60 },
      { range: "Below 60%", count: distBelow },
    ];

    const scoreChartData = studentMetrics
      .filter(s => s.hasMarks && !s.isAbsent)
      .map(s => ({ name: s.fullName.split(' ')[0], marks: s.marks }));

    const donutData = [
      { name: "Passed", value: passed },
      { name: "Failed", value: failed },
      { name: "Absent", value: absent }
    ];

    return {
      totalEnrolled, graded, passed, failed, absent,
      avgMarks: graded > 0 ? (totalMarks / graded).toFixed(1) : "-",
      highestScore: highestScore >= 0 ? highestScore : "-",
      lowestScore: lowestScore <= exam.total_marks ? lowestScore : "-",
      topPerformer, lowestPerformer,
      passRate: graded > 0 ? ((passed / graded) * 100).toFixed(0) : "0",
      attendanceRate: totalEnrolled > 0 ? (((totalEnrolled - absent) / totalEnrolled) * 100).toFixed(0) : "0",
      studentMetrics,
      distChartData, scoreChartData, donutData
    };
  }, [results, students, exam.pass_marks, exam.total_marks]);

  const handleUpdateResult = (studentId: string, updates: Partial<Omit<ResultRecord, "studentId" | "enrollmentId">>) => {
    setResults((prev) => {
      const updated = { ...prev, [studentId]: { ...prev[studentId], ...updates } };
      if (updates.obtainedMarks !== undefined && updates.obtainedMarks !== null) {
        if (updates.obtainedMarks > exam.total_marks) setErrorMsg(`Obtained marks cannot exceed ${exam.total_marks}`);
        else if (updates.obtainedMarks < 0) setErrorMsg("Obtained marks cannot be negative.");
        else setErrorMsg(null);
      }
      setIsDirty(true);
      return updated;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, studentId: string, field: "marks" | "remarks", index: number, filteredList: any[]) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
      e.preventDefault();
      const nextIndex = (e.key === "ArrowDown" || e.key === "Enter") ? index + 1 : index - 1;
      if (nextIndex >= 0 && nextIndex < filteredList.length) {
        const targetElement = document.getElementById(`${field}-${filteredList[nextIndex].studentId}`);
        if (targetElement) { (targetElement as HTMLInputElement).focus(); (targetElement as HTMLInputElement).select(); }
      }
    }
  };

  const handleSaveDraft = () => {
    startTransition(async () => {
      setErrorMsg(null);
      const res = await saveDraftResultsAction(examId, Object.values(results));
      if (!res.success) {
        toast.error(res.message || "Failed to save drafted results.");
        setErrorMsg(res.message || "Failed to save.");
      } else {
        toast.success("Results drafted successfully!");
        setSuccessMsg("Results drafted successfully.");
        setIsDirty(false);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    });
  };

  const handlePublish = () => {
    startTransition(async () => {
      setErrorMsg(null);
      // First save current draft before publishing to make sure latest changes are persisted
      if (isDirty) {
        const saveRes = await saveDraftResultsAction(examId, Object.values(results));
        if (!saveRes.success) {
          toast.error(saveRes.message || "Failed to save marks before publishing.");
          setErrorMsg(saveRes.message || "Failed to save marks before publishing.");
          return;
        }
        setIsDirty(false);
      }

      const res = await publishResultsAction(examId, publishNote || "Published from grading dashboard");
      if (!res.success) {
        toast.error(res.message || "Failed to publish results.");
        setErrorMsg(res.message || "Failed to publish results.");
      } else {
        toast.success("Examination results published successfully!");
        setMode("VIEW");
        setShowPublishConfirm(false);
        setPublishNote("");
        setSuccessMsg("Results published! Students can now view their grades.");
        setTimeout(() => setSuccessMsg(null), 3000);
        router.refresh();
      }
    });
  };

  const handleUnpublish = () => {
    startTransition(async () => {
      setErrorMsg(null);
      const res = await unpublishResultsAction(examId, "Admin requested unpublish from grading sheet");
      if (!res.success) {
        toast.error(res.message || "Failed to withdraw results.");
        setErrorMsg(res.message || "Failed to unpublish.");
      } else {
        toast.success("Results withdrawn and unpublished successfully.");
        setMode("EDIT");
        setShowUnpublishConfirm(false);
        setSuccessMsg("Results unpublished. You can now edit.");
        setTimeout(() => setSuccessMsg(null), 3000);
        router.refresh();
      }
    });
  };

  const exportCSV = () => {
    const headers = ["SL", "Rank", "Student Name", "Student ID", "Attendance", "Obtained Marks", "Total Marks", "Percentage", "Grade", "Status"];
    
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return "";
      let str = String(val);
      if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
      if (str.includes(",") || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const rows = analytics.studentMetrics.map((s, i) => [
      i + 1,
      (s as any).rank || "-",
      s.fullName,
      s.studentCode,
      s.isAbsent ? "Absent" : "Present",
      s.hasMarks ? s.marks : (s.isAbsent ? "Absent" : "-"),
      exam.total_marks,
      s.hasMarks ? `${s.percentage.toFixed(1)}%` : "-",
      s.grade,
      s.status
    ]);
    
    const BOM = "\uFEFF";
    const csvContent = BOM + [
      headers.map(escapeCSV).join(","), 
      ...rows.map(r => r.map(escapeCSV).join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${exam.name.replace(/\s+/g, '_')}_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  let filteredStudents = analytics.studentMetrics.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.studentCode.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterType === "PASSED") return s.status === "Passed";
    if (filterType === "FAILED") return s.status === "Failed";
    if (filterType === "ABSENT") return s.isAbsent;
    if (filterType === "TOP") return (s as any).rank && (s as any).rank <= 10;
    return true;
  });

  // Sort: Rank ASC, then unranked (has marks but rank undefined?), then absent
  filteredStudents.sort((a, b) => {
    if (a.isAbsent && !b.isAbsent) return 1;
    if (!a.isAbsent && b.isAbsent) return -1;
    const rankA = (a as any).rank || 9999;
    const rankB = (b as any).rank || 9999;
    return rankA - rankB;
  });

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{exam.name} - Results</h2>
          <p className="text-sm text-gray-500">
            {exam.status === "RESULT_PUBLISHED" ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium"><Check size={14}/> Published · Students can view</span>
            ) : "Draft Mode · Not visible to students"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === "VIEW" ? (
            <button onClick={() => setMode("EDIT")} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
              <Edit size={16} /> Edit Results
            </button>
          ) : (
            <button onClick={() => setMode("VIEW")} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
              <Eye size={16} /> View Dashboard
            </button>
          )}
          <button onClick={exportCSV} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
            <FileText size={16} /> Export CSV
          </button>
          <Link href={`/teacher/exams/${examId}/results/print`} target="_blank" className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
            <Printer size={16} /> Print PDF
          </Link>
          {exam.status === "RESULT_PUBLISHED" ? (
            <button onClick={() => setShowUnpublishConfirm(true)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg border border-red-200 hover:bg-red-100 text-sm font-medium transition-colors">
              Withdraw Results
            </button>
          ) : (
            <button onClick={() => setShowPublishConfirm(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-xs flex items-center gap-1.5 transition-colors">
              <Send size={15} /> Publish Results
            </button>
          )}
        </div>
      </div>

      {showUnpublishConfirm && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 space-y-3 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">Confirm Withdrawal (Double Confirmation)</h4>
              <p className="text-sm opacity-90">Are you sure you want to unpublish? This will hide results from students but keep your grading records saved. You can edit and republish later.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowUnpublishConfirm(false)} className="btn-secondary px-4 py-2 text-sm bg-white">Cancel</button>
            <button onClick={handleUnpublish} disabled={isPending} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
              {isPending ? "Withdrawing..." : "Confirm Withdraw"}
            </button>
          </div>
        </div>
      )}

      {showPublishConfirm && (
        <div className="p-5 bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl text-emerald-950 space-y-4 shadow-md animate-in zoom-in-95 duration-200">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
              <Send className="h-5 w-5" />
            </div>
            <div className="space-y-1 w-full">
              <h4 className="font-extrabold text-base text-primary">Confirm Publish Results (Double Confirmation)</h4>
              <p className="text-xs text-muted leading-relaxed font-semibold">
                You are about to publish the examination results for <strong className="text-primary">{exam.name}</strong>. Once published, all enrolled students will immediately be able to view their marks, rankings, and feedback on their portal.
              </p>
              <div className="pt-2">
                <label htmlFor="publish-note" className="block text-xs font-bold text-primary mb-1">
                  Optional Publication Notice / Announcement Note for Students:
                </label>
                <input
                  id="publish-note"
                  type="text"
                  value={publishNote}
                  onChange={(e) => setPublishNote(e.target.value)}
                  placeholder="e.g. Congratulations to all students for completing the exam!"
                  className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-xl bg-white text-primary focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-emerald-200">
            <button onClick={() => setShowPublishConfirm(false)} disabled={isPending} className="btn-secondary px-4 py-2 text-xs font-bold bg-white">
              Cancel
            </button>
            <button onClick={handlePublish} disabled={isPending} className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-extrabold hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-all">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Confirm & Publish</span>
            </button>
          </div>
        </div>
      )}

      {errorMsg && <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">{errorMsg}</div>}
      {successMsg && <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm">{successMsg}</div>}

      {mode === "VIEW" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Exam Configuration */}
          <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-primary" /> Exam Configuration
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-xs font-semibold pt-2 text-primary">
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Subject Batch</span>
                <span className="font-extrabold mt-0.5 block">{exam.batches?.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Exam Type</span>
                <span className="font-extrabold mt-0.5 block">{exam.exam_type?.replace("_", " ")}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Total Marks</span>
                <span className="font-extrabold mt-0.5 block text-slate-800">{Number(exam.total_marks)}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Pass Marks</span>
                <span className="font-extrabold mt-0.5 block text-rose-700">{Number(exam.pass_marks)}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Exam Date</span>
                <span className="font-extrabold mt-0.5 block">{exam.exam_date}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">Start & Duration</span>
                <span className="font-extrabold mt-0.5 block">
                  {exam.start_time || "N/A"} &bull; {exam.duration ? `${exam.duration} mins` : "N/A"}
                </span>
              </div>
            </div>
            {exam.description && (
              <div className="border-t border-border/20 pt-3 mt-3 text-xs text-muted leading-relaxed font-medium">
                <span className="text-[10px] text-muted uppercase font-bold block mb-1">Syllabus / Notes</span>
                {exam.description}
              </div>
            )}
          </div>

          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Graded Students", value: `${analytics.graded} / ${analytics.totalEnrolled}` },
              { label: "Class Average", value: `${analytics.avgMarks} / ${exam.total_marks}` },
              { label: "Highest Score", value: analytics.highestScore },
              { label: "Lowest Score", value: analytics.lowestScore },
              { label: "Pass Rate", value: `${analytics.passRate}% of graded` },
              { label: "Attendance", value: `${analytics.attendanceRate}%` }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col justify-center">
                <p className="text-xs text-gray-500 uppercase font-semibold">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Marks Distribution</h3>
                <MarksDistributionChart data={analytics.distChartData} />
              </div>
              <div className="bg-white p-5 rounded-xl border border-border shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Status Breakdown</h3>
                <StatusDonutChart data={analytics.donutData} />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-border shadow-sm flex flex-col gap-4">
              <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Teacher Insights</h3>
              
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <p className="text-xs font-semibold text-emerald-700 uppercase">Top Performer</p>
                <p className="text-sm font-bold text-gray-900">{analytics.topPerformer ? `${(analytics.topPerformer as any).name} — ${(analytics.topPerformer as any).marks}/${exam.total_marks}` : "N/A"}</p>
              </div>

              <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-xs font-semibold text-red-700 uppercase">Lowest Score</p>
                <p className="text-sm font-bold text-gray-900">{analytics.lowestPerformer ? `${(analytics.lowestPerformer as any).name} — ${(analytics.lowestPerformer as any).marks}/${exam.total_marks}` : "N/A"}</p>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                <p className="text-xs font-semibold text-orange-700 uppercase">Needs Attention</p>
                <p className="text-sm font-bold text-gray-900">{analytics.absent} absent student{analytics.absent !== 1 && 's'}</p>
                {analytics.failed > 0 && <p className="text-sm text-gray-700 mt-1">{analytics.failed} student{analytics.failed !== 1 && 's'} failed</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-gray-50 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Search student name or ID..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
            {["ALL", "PASSED", "FAILED", "ABSENT", "TOP"].map(f => (
              <button 
                key={f} onClick={() => setFilterType(f as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filterType === f ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-gray-500 uppercase bg-white border-b border-border sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-semibold w-16">Rank</th>
                <th className="px-4 py-3 font-semibold">Student Name</th>
                <th className="px-4 py-3 font-semibold">Attendance</th>
                <th className="px-4 py-3 font-semibold w-32">Obtained Marks</th>
                {mode === "VIEW" && <th className="px-4 py-3 font-semibold">Percentage</th>}
                {mode === "VIEW" && <th className="px-4 py-3 font-semibold">Grade</th>}
                <th className="px-4 py-3 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No students found matching criteria.</td>
                </tr>
              ) : filteredStudents.map((student, idx) => {
                const isAbsent = student.isAbsent;
                return (
                  <tr key={student.studentId} className={`hover:bg-gray-50 transition-colors ${(student as any).status === 'Failed' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      {(student as any).rank ? (
                        <span className={`font-bold ${(student as any).rank <= 3 ? 'text-accent' : 'text-gray-600'}`}>#{(student as any).rank}</span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{student.fullName}</p>
                      <p className="text-xs text-gray-500">{student.studentCode}</p>
                    </td>
                    <td className="px-4 py-3">
                      {mode === "EDIT" ? (
                        <select
                          value={student.record?.attendanceStatus || "PRESENT"}
                          onChange={(e) => handleUpdateResult(student.studentId, { attendanceStatus: e.target.value as "PRESENT" | "ABSENT", obtainedMarks: e.target.value === "ABSENT" ? null : student.record?.obtainedMarks })}
                          className={`text-xs rounded-md border-gray-200 py-1.5 focus:ring-accent ${student.record?.attendanceStatus === "ABSENT" ? 'bg-red-50 text-red-700 font-medium' : 'bg-emerald-50 text-emerald-700 font-medium'}`}
                        >
                          <option value="PRESENT">Present</option>
                          <option value="ABSENT">Absent</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${isAbsent ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {isAbsent ? "Absent" : "Present"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {mode === "EDIT" ? (
                        <div className="flex items-center gap-2">
                          <input
                            id={`marks-${student.studentId}`}
                            type="number"
                            min="0" max={exam.total_marks}
                            value={student.record?.obtainedMarks ?? ""}
                            onChange={(e) => handleUpdateResult(student.studentId, { obtainedMarks: e.target.value ? Number(e.target.value) : null })}
                            onKeyDown={(e) => handleKeyDown(e, student.studentId, "marks", idx, filteredStudents)}
                            disabled={student.record?.attendanceStatus === "ABSENT"}
                            placeholder="-"
                            className="w-20 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-accent focus:border-accent disabled:bg-gray-100 disabled:text-gray-400 font-medium"
                          />
                          <span className="text-gray-400 text-xs">/ {exam.total_marks}</span>
                        </div>
                      ) : (
                        <span className="font-semibold text-gray-900">
                          {isAbsent ? "-" : `${student.marks} / ${exam.total_marks}`}
                        </span>
                      )}
                    </td>
                    {mode === "VIEW" && (
                      <td className="px-4 py-3 font-medium text-gray-600">
                        {isAbsent ? "-" : `${(student as any).percentage.toFixed(1)}%`}
                      </td>
                    )}
                    {mode === "VIEW" && (
                      <td className="px-4 py-3">
                        <span className={`font-bold ${(student as any).grade === 'F' ? 'text-red-600' : 'text-emerald-600'}`}>
                          {isAbsent ? "-" : (student as any).grade}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {mode === "EDIT" ? (
                        <input
                          id={`remarks-${student.studentId}`}
                          type="text"
                          value={student.record?.remarks || ""}
                          onChange={(e) => handleUpdateResult(student.studentId, { remarks: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, student.studentId, "remarks", idx, filteredStudents)}
                          placeholder="Optional notes..."
                          className="w-full sm:w-48 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-accent"
                        />
                      ) : (
                        <span className="text-gray-600 text-xs">{student.record?.remarks || "-"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {mode === "EDIT" && exam.status !== "RESULT_PUBLISHED" && (
          <div className="p-4 border-t border-border bg-gray-50 flex flex-wrap justify-between items-center gap-3 sticky bottom-0 rounded-b-xl shadow-lg z-20">
            <div className="flex items-center gap-2">
              {isDirty ? (
                <span className="text-xs text-amber-600 font-extrabold flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle size={15} className="text-amber-600 animate-pulse" />
                  Unsaved draft marks
                </span>
              ) : (
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <Check size={15} className="text-emerald-600" />
                  All marks saved
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isPending || !isDirty}
                className="btn-secondary px-5 py-2 flex items-center gap-2 font-bold text-xs bg-white hover:bg-slate-100 disabled:opacity-50 border border-slate-300 shadow-xs"
              >
                {isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                <span>Save Draft Marks</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPublishConfirm(true)}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all"
              >
                <Send size={15} />
                <span>Publish Results to Students</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
