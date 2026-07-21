"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  ClipboardList,
  Edit3,
  FileCheck2,
  FileText,
  FolderOpen,
  GraduationCap,
  Layers3,
  Loader2,
  MoreHorizontal,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  createBatchSubjectAction,
  createSubjectUnitAction,
  deleteEmptyBatchSubjectAction,
  deleteSubjectUnitAction,
  updateBatchSubjectAction,
  updateBatchSubjectStatusAction,
  updateSubjectUnitAction,
  updateSubjectUnitStatusAction,
  type AcademicActionResult,
} from "@/app/actions/academic-management";
import {
  subjectStatuses,
  subjectThemeKeys,
  subjectUnitStatuses,
  subjectUnitTypes,
  type SubjectStatus,
  type SubjectThemeKey,
  type SubjectUnitStatus,
  type SubjectUnitType,
} from "@/lib/validations/academic";

type AcademicBatch = {
  id: string;
  name: string;
  code: string;
  academic_level: string;
  status: string;
  start_date: string;
  end_date: string | null;
};

type AcademicUnit = {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  unit_type: SubjectUnitType;
  status: SubjectUnitStatus;
  sequence_no: number;
  weight: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
  completed_at: string | null;
};

type AcademicExam = {
  id: string;
  subject_id: string;
  name: string;
  exam_type: string;
  exam_date: string;
  start_time: string | null;
  total_marks: number;
  status: string;
  published_at: string | null;
};

type SubjectProgress = {
  total_units: number | null;
  completed_units: number | null;
  running_units: number | null;
  planned_units: number | null;
  syllabus_progress_percentage: number | null;
  planned_exams: number | null;
  conducted_exams: number | null;
  scheduled_exams: number | null;
  published_results: number | null;
  exam_plan_progress_percentage: number | null;
};

type AcademicSubject = {
  id: string;
  batch_id: string;
  name: string;
  code: string;
  description: string | null;
  status: SubjectStatus;
  start_date: string | null;
  end_date: string | null;
  theme_key: SubjectThemeKey;
  display_order: number;
  weight: number;
  is_default: boolean;
  completed_at: string | null;
  units: AcademicUnit[];
  exams: AcademicExam[];
  progress: SubjectProgress | null;
  materialCount: number;
  publishedMaterialCount: number;
};

type BatchProgress = {
  total_subjects: number | null;
  running_subjects: number | null;
  completed_subjects: number | null;
  total_units: number | null;
  completed_units: number | null;
  academic_progress_percentage: number | null;
  planned_exams: number | null;
  conducted_exams: number | null;
  published_results: number | null;
  exam_plan_progress_percentage: number | null;
  result_publication_progress_percentage: number | null;
};

type ModalState =
  | { type: "create-subject" }
  | { type: "edit-subject"; subject: AcademicSubject }
  | { type: "create-unit"; subject: AcademicSubject }
  | { type: "edit-unit"; subject: AcademicSubject; unit: AcademicUnit }
  | null;

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70";
const labelClass =
  "mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500";

const themeStyles: Record<
  SubjectThemeKey,
  { accent: string; soft: string; border: string; bar: string }
> = {
  NAVY: {
    accent: "text-[#102A66]",
    soft: "bg-slate-50",
    border: "border-slate-200",
    bar: "bg-[#102A66]",
  },
  BLUE: {
    accent: "text-blue-700",
    soft: "bg-blue-50",
    border: "border-blue-200",
    bar: "bg-blue-600",
  },
  VIOLET: {
    accent: "text-violet-700",
    soft: "bg-violet-50",
    border: "border-violet-200",
    bar: "bg-violet-600",
  },
  EMERALD: {
    accent: "text-emerald-700",
    soft: "bg-emerald-50",
    border: "border-emerald-200",
    bar: "bg-emerald-600",
  },
  AMBER: {
    accent: "text-amber-700",
    soft: "bg-amber-50",
    border: "border-amber-200",
    bar: "bg-amber-500",
  },
  ROSE: {
    accent: "text-rose-700",
    soft: "bg-rose-50",
    border: "border-rose-200",
    bar: "bg-rose-500",
  },
};

function clamp(value: number | null | undefined) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ProgressBar({ value, color = "bg-blue-600" }: { value: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${value}% complete`}>
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-lg bg-white/10 p-2 text-cyan-200">{icon}</span>
        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-100/60">{label}</span>
      </div>
      <p className="font-display text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[10px] font-semibold text-blue-100/65">{note}</p>
    </div>
  );
}

function Modal({
  eyebrow,
  title,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} aria-label="Close dialog" />
      <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] border border-white/40 bg-[#F8FAFC] shadow-2xl sm:max-w-3xl sm:rounded-[28px]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
            <h2 className="mt-1 font-display text-xl font-black text-primary">{title}</h2>
          </div>
          <button onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-primary" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 sm:p-7">{children}</div>
      </div>
    </div>
  );
}

function FormActions({
  onCancel,
  pending,
  submitLabel,
}: {
  onCancel: () => void;
  pending: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
      <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50">
        Cancel
      </button>
      <button type="submit" disabled={pending} className="primary-btn inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-black disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}
        {pending ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}

function SubjectForm({
  batchId,
  subject,
  nextOrder,
  pending,
  onCancel,
  onSubmit,
}: {
  batchId: string;
  subject?: AcademicSubject;
  nextOrder: number;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="batchId" value={batchId} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Subject name *</label>
          <input className={fieldClass} name="name" required maxLength={120} defaultValue={subject?.name || ""} placeholder="e.g. Higher Mathematics" />
        </div>
        <div>
          <label className={labelClass}>Short code *</label>
          <input className={`${fieldClass} uppercase`} name="code" required maxLength={30} pattern="[A-Za-z0-9][A-Za-z0-9_-]{0,29}" defaultValue={subject?.code || ""} placeholder="e.g. HMATH" />
        </div>
        <div>
          <label className={labelClass}>Initial status</label>
          <select className={fieldClass} name="status" defaultValue={subject?.status || "DRAFT"}>
            {subjectStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Visual theme</label>
          <select className={fieldClass} name="themeKey" defaultValue={subject?.theme_key || "NAVY"}>
            {subjectThemeKeys.map((theme) => <option key={theme} value={theme}>{humanize(theme)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Start date</label>
          <input className={fieldClass} type="date" name="startDate" defaultValue={subject?.start_date || ""} />
        </div>
        <div>
          <label className={labelClass}>End date</label>
          <input className={fieldClass} type="date" name="endDate" defaultValue={subject?.end_date || ""} />
        </div>
        <div>
          <label className={labelClass}>Display order</label>
          <input className={fieldClass} type="number" min={0} name="displayOrder" defaultValue={subject?.display_order ?? nextOrder} />
        </div>
        <div>
          <label className={labelClass}>Progress weight</label>
          <input className={fieldClass} type="number" min="0.01" max="100" step="0.01" name="weight" defaultValue={subject?.weight ?? 1} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Description</label>
        <textarea className={`${fieldClass} min-h-24 resize-y`} name="description" maxLength={2000} defaultValue={subject?.description || ""} placeholder="What students will learn and the goal of this subject..." />
      </div>
      <FormActions onCancel={onCancel} pending={pending} submitLabel={subject ? "Save subject" : "Create subject"} />
    </form>
  );
}

function UnitForm({
  subject,
  unit,
  nextSequence,
  pending,
  onCancel,
  onSubmit,
}: {
  subject: AcademicSubject;
  unit?: AcademicUnit;
  nextSequence: number;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="subjectId" value={subject.id} />
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-600">Adding to</p>
        <p className="mt-1 text-sm font-black text-primary">{subject.name} <span className="text-xs text-slate-400">({subject.code})</span></p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass}>Chapter / topic title *</label>
          <input className={fieldClass} name="title" required maxLength={180} defaultValue={unit?.title || ""} placeholder="e.g. Chapter 03 — Vector Algebra" />
        </div>
        <div>
          <label className={labelClass}>Unit type</label>
          <select className={fieldClass} name="unitType" defaultValue={unit?.unit_type || "CHAPTER"}>
            {subjectUnitTypes.map((type) => <option key={type} value={type}>{humanize(type)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <select className={fieldClass} name="status" defaultValue={unit?.status || "PLANNED"}>
            {subjectUnitStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Sequence number *</label>
          <input className={fieldClass} type="number" min={1} name="sequenceNo" required defaultValue={unit?.sequence_no ?? nextSequence} />
        </div>
        <div>
          <label className={labelClass}>Progress weight</label>
          <input className={fieldClass} type="number" min="0.01" max="100" step="0.01" name="weight" defaultValue={unit?.weight ?? 1} />
        </div>
        <div>
          <label className={labelClass}>Planned start</label>
          <input className={fieldClass} type="date" name="plannedStartDate" defaultValue={unit?.planned_start_date || ""} />
        </div>
        <div>
          <label className={labelClass}>Planned end</label>
          <input className={fieldClass} type="date" name="plannedEndDate" defaultValue={unit?.planned_end_date || ""} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Teaching notes</label>
        <textarea className={`${fieldClass} min-h-24 resize-y`} name="description" maxLength={2000} defaultValue={unit?.description || ""} placeholder="Coverage, important concepts, or teacher notes..." />
      </div>
      <FormActions onCancel={onCancel} pending={pending} submitLabel={unit ? "Save unit" : "Add syllabus unit"} />
    </form>
  );
}

export function AcademicBatchWorkspace({
  batch,
  subjects,
  batchProgress,
}: {
  batch: AcademicBatch;
  subjects: AcademicSubject[];
  batchProgress: BatchProgress | null;
}) {
  const router = useRouter();
  const [requestedSubjectId, setRequestedSubjectId] = useState(subjects[0]?.id || "");
  const [modal, setModal] = useState<ModalState>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const selectedSubjectId = subjects.some((subject) => subject.id === requestedSubjectId)
    ? requestedSubjectId
    : subjects[0]?.id || "";
  const selectedSubject =
    subjects.find((subject) => subject.id === selectedSubjectId) || subjects[0] || null;
  const syllabusProgress = clamp(batchProgress?.academic_progress_percentage);
  const examProgress = clamp(batchProgress?.exam_plan_progress_percentage);
  const publicationProgress = clamp(batchProgress?.result_publication_progress_percentage);
  const nextSubjectOrder = Math.max(-1, ...subjects.map((subject) => subject.display_order)) + 1;
  const nextUnitSequence = selectedSubject
    ? Math.max(0, ...selectedSubject.units.map((unit) => unit.sequence_no)) + 1
    : 1;

  const timeline = useMemo(() => {
    if (!selectedSubject) return [];
    return [...selectedSubject.units].sort((a, b) => a.sequence_no - b.sequence_no);
  }, [selectedSubject]);

  async function execute(
    key: string,
    operation: () => Promise<AcademicActionResult>,
    options: { closeModal?: boolean } = {}
  ) {
    setBusyKey(key);
    setNotice(null);
    try {
      const result = await operation();
      setNotice({ type: result.success ? "success" : "error", message: result.message });
      if (result.success) {
        if (result.entityId && key === "create-subject") setRequestedSubjectId(result.entityId);
        if (options.closeModal !== false) setModal(null);
        router.refresh();
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The request could not be completed.";
      setNotice({ type: "error", message });
      return { success: false, message } as AcademicActionResult;
    } finally {
      setBusyKey(null);
    }
  }

  function submitSubject(event: FormEvent<HTMLFormElement>, subject?: AcademicSubject) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    void execute(
      subject ? `edit-subject-${subject.id}` : "create-subject",
      () => subject ? updateBatchSubjectAction(subject.id, formData) : createBatchSubjectAction(formData)
    );
  }

  function submitUnit(event: FormEvent<HTMLFormElement>, unit?: AcademicUnit) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    void execute(
      unit ? `edit-unit-${unit.id}` : "create-unit",
      () => unit ? updateSubjectUnitAction(unit.id, formData) : createSubjectUnitAction(formData)
    );
  }

  function changeSubjectStatus(subject: AcademicSubject, status: string) {
    void execute(
      `subject-status-${subject.id}`,
      () => updateBatchSubjectStatusAction(subject.id, status),
      { closeModal: false }
    );
  }

  function changeUnitStatus(unit: AcademicUnit, status: string) {
    void execute(
      `unit-status-${unit.id}`,
      () => updateSubjectUnitStatusAction(unit.id, status),
      { closeModal: false }
    );
  }

  function deleteSubject(subject: AcademicSubject) {
    if (!window.confirm(`Delete ${subject.name}? Only an empty non-default subject can be deleted.`)) return;
    void execute(`delete-subject-${subject.id}`, () => deleteEmptyBatchSubjectAction(subject.id), { closeModal: false });
  }

  function deleteUnit(unit: AcademicUnit) {
    if (!window.confirm(`Remove "${unit.title}" from this syllabus?`)) return;
    void execute(`delete-unit-${unit.id}`, () => deleteSubjectUnitAction(unit.id), { closeModal: false });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/teacher/academic" className="inline-flex items-center gap-2 text-xs font-black text-slate-500 transition hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Academic Control Center
        </Link>
        <Link href={`/teacher/batches/${batch.id}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-black uppercase tracking-wide text-slate-600 transition hover:border-blue-200 hover:text-blue-700">
          Batch operations <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {notice && (
        <div aria-live="polite" className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-xs font-bold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss message"><X className="h-4 w-4" /></button>
        </div>
      )}

      <section className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#071A3D_0%,#102A66_60%,#2456B3_100%)] p-6 text-white shadow-xl shadow-[#071A3D]/15 sm:p-8">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative space-y-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={batch.status} className="border-white/10 bg-white/10 text-white" />
                <span className="rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-blue-100">{batch.code}</span>
                <span className="rounded-full border border-cyan-200/15 bg-cyan-200/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-cyan-100">{batch.academic_level}</span>
              </div>
              <h1 className="font-display text-2xl font-black leading-tight sm:text-4xl">{batch.name}</h1>
              <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-blue-100/75">Build the curriculum, track teaching progress, and coordinate every examination from one workspace.</p>
            </div>
            <button onClick={() => setModal({ type: "create-subject" })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#102A66] shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-50">
              <Plus className="h-4 w-4" />
              Add subject
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<BookOpenCheck className="h-4 w-4" />} label="Subjects" value={String(batchProgress?.total_subjects || subjects.length)} note={`${batchProgress?.running_subjects || 0} currently running`} />
            <MetricCard icon={<CheckCircle2 className="h-4 w-4" />} label="Syllabus" value={`${syllabusProgress}%`} note={`${batchProgress?.completed_units || 0}/${batchProgress?.total_units || 0} units complete`} />
            <MetricCard icon={<GraduationCap className="h-4 w-4" />} label="Exam journey" value={`${examProgress}%`} note={`${batchProgress?.conducted_exams || 0}/${batchProgress?.planned_exams || 0} conducted`} />
            <MetricCard icon={<Rocket className="h-4 w-4" />} label="Results" value={`${publicationProgress}%`} note={`${batchProgress?.published_results || 0} results published`} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[330px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-black text-primary">Subjects</h2>
              <p className="text-[10px] font-bold text-muted">Select a subject workspace</p>
            </div>
            <button onClick={() => setModal({ type: "create-subject" })} className="rounded-xl border border-blue-100 bg-blue-50 p-2.5 text-blue-700 transition hover:bg-blue-100" aria-label="Add subject"><Plus className="h-4 w-4" /></button>
          </div>

          {subjects.length === 0 ? (
            <button onClick={() => setModal({ type: "create-subject" })} className="w-full rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center transition hover:border-blue-300 hover:bg-blue-50/30">
              <Layers3 className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-black text-primary">Create the first subject</p>
              <p className="mt-1 text-[10px] font-semibold text-muted">Start building this batch curriculum.</p>
            </button>
          ) : (
            <div className="space-y-3">
              {subjects.map((subject) => {
                const active = selectedSubject?.id === subject.id;
                const theme = themeStyles[subject.theme_key];
                const progress = clamp(subject.progress?.syllabus_progress_percentage);
                return (
                  <button key={subject.id} onClick={() => setRequestedSubjectId(subject.id)} className={`w-full rounded-2xl border p-4 text-left transition-all ${active ? `${theme.border} ${theme.soft} shadow-md shadow-primary/5` : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${theme.bar}`} />
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{subject.code}</span>
                          {subject.is_default && <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[8px] font-black uppercase text-slate-500">Default</span>}
                        </div>
                        <p className={`truncate font-display text-sm font-black ${active ? theme.accent : "text-primary"}`}>{subject.name}</p>
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 transition ${active ? theme.accent : "text-slate-300"}`} />
                    </div>
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-[9px] font-black uppercase tracking-wide">
                        <span className="text-slate-400">Progress</span><span className={theme.accent}>{progress}%</span>
                      </div>
                      <ProgressBar value={progress} color={theme.bar} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <StatusBadge status={subject.status} />
                      <span className="text-[9px] font-bold text-slate-400">{subject.units.length} units · {subject.exams.length} exams</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <main className="min-w-0">
          {!selectedSubject ? (
            <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <div>
                <Sparkles className="mx-auto h-9 w-9 text-slate-300" />
                <h2 className="mt-4 font-display text-xl font-black text-primary">Your curriculum starts here</h2>
                <p className="mx-auto mt-2 max-w-md text-sm font-medium text-muted">Add a subject, then organize its chapters, topics, and examinations.</p>
                <button onClick={() => setModal({ type: "create-subject" })} className="primary-btn mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black"><Plus className="h-4 w-4" /> Add subject</button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <section className={`rounded-3xl border bg-white p-5 shadow-sm sm:p-6 ${themeStyles[selectedSubject.theme_key].border}`}>
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={selectedSubject.status} />
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">{selectedSubject.code}</span>
                      {selectedSubject.is_default && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-blue-700">Legacy default</span>}
                    </div>
                    <h2 className="mt-3 font-display text-2xl font-black text-primary">{selectedSubject.name}</h2>
                    <p className="mt-2 text-xs font-medium leading-5 text-muted">{selectedSubject.description || "No subject description has been added yet."}</p>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(selectedSubject.start_date)} — {formatDate(selectedSubject.end_date)}</span>
                      <span className="inline-flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Weight {selectedSubject.weight}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={selectedSubject.status} disabled={busyKey === `subject-status-${selectedSubject.id}`} onChange={(event) => changeSubjectStatus(selectedSubject, event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-600 outline-none focus:border-blue-400">
                      {subjectStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
                    </select>
                    <button onClick={() => setModal({ type: "edit-subject", subject: selectedSubject })} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-black uppercase tracking-wide text-slate-600 transition hover:border-blue-200 hover:text-blue-700"><Edit3 className="h-3.5 w-3.5" /> Edit</button>
                    {!selectedSubject.is_default && <button onClick={() => deleteSubject(selectedSubject)} disabled={busyKey === `delete-subject-${selectedSubject.id}`} className="rounded-xl border border-rose-100 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100" aria-label="Delete empty subject">{busyKey === `delete-subject-${selectedSubject.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>}
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Syllabus</p>
                    <div className="mt-2 flex items-end justify-between gap-3"><p className="font-display text-2xl font-black text-primary">{clamp(selectedSubject.progress?.syllabus_progress_percentage)}%</p><span className="text-[9px] font-bold text-slate-400">{selectedSubject.progress?.completed_units || 0}/{selectedSubject.progress?.total_units || 0} units</span></div>
                    <div className="mt-3"><ProgressBar value={clamp(selectedSubject.progress?.syllabus_progress_percentage)} color={themeStyles[selectedSubject.theme_key].bar} /></div>
                  </div>
                  <div className="rounded-2xl bg-violet-50/70 p-4">
                    <p className="text-[9px] font-black uppercase tracking-wider text-violet-500">Exam plan</p>
                    <div className="mt-2 flex items-end justify-between gap-3"><p className="font-display text-2xl font-black text-violet-800">{clamp(selectedSubject.progress?.exam_plan_progress_percentage)}%</p><span className="text-[9px] font-bold text-violet-400">{selectedSubject.progress?.conducted_exams || 0}/{selectedSubject.progress?.planned_exams || 0} done</span></div>
                    <div className="mt-3"><ProgressBar value={clamp(selectedSubject.progress?.exam_plan_progress_percentage)} color="bg-violet-600" /></div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50/70 p-4">
                    <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">Results published</p>
                    <p className="mt-2 font-display text-2xl font-black text-emerald-800">{selectedSubject.progress?.published_results || 0}</p>
                    <p className="mt-1 text-[9px] font-bold text-emerald-600/70">From {selectedSubject.progress?.conducted_exams || 0} conducted exams</p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5 text-amber-600" />
                      <h3 className="font-display text-lg font-black text-primary">Subject resources</h3>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-muted">
                      Keep learning files and performance insight attached to this subject.
                    </p>
                  </div>
                  <Link
                    href={`/teacher/reports/academic?batchId=${batch.id}&subjectId=${selectedSubject.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <TrendingUp className="h-4 w-4" /> Performance report
                  </Link>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/55 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-600">Study materials</p>
                        <p className="mt-2 font-display text-2xl font-black text-primary">{selectedSubject.materialCount}</p>
                        <p className="mt-1 text-[10px] font-bold text-slate-500">{selectedSubject.publishedMaterialCount} published for students</p>
                      </div>
                      <span className="rounded-xl bg-white p-2.5 text-amber-600 shadow-sm"><FileText className="h-5 w-5" /></span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/teacher/batches/${batch.id}/materials?subjectId=${selectedSubject.id}`} className="rounded-lg bg-white px-3 py-2 text-[10px] font-black text-amber-700 shadow-sm transition hover:bg-amber-100">Manage resources</Link>
                      <Link href={`/teacher/materials/new?batchId=${batch.id}&subjectId=${selectedSubject.id}`} className="rounded-lg border border-amber-200 px-3 py-2 text-[10px] font-black text-amber-700 transition hover:bg-amber-100">Add material</Link>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/55 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">Assignments & homework</p>
                        <p className="mt-2 text-xs font-bold leading-5 text-slate-600">Create tasks, collect student work, and publish feedback.</p>
                      </div>
                      <span className="rounded-xl bg-white p-2.5 text-blue-600 shadow-sm"><ClipboardList className="h-5 w-5" /></span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link href={`/teacher/assignments?batchId=${batch.id}&subjectId=${selectedSubject.id}`} className="rounded-lg bg-white px-3 py-2 text-[10px] font-black text-blue-700 shadow-sm transition hover:bg-blue-100">View assignments</Link>
                      <Link href={`/teacher/assignments/new?batchId=${batch.id}&subjectId=${selectedSubject.id}`} className="rounded-lg border border-blue-200 px-3 py-2 text-[10px] font-black text-blue-700 transition hover:bg-blue-100">Create assignment</Link>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2"><BookOpenCheck className="h-5 w-5 text-blue-700" /><h3 className="font-display text-lg font-black text-primary">Syllabus roadmap</h3></div>
                    <p className="mt-1 text-xs font-semibold text-muted">Ordered chapters, topics, and live teaching status.</p>
                  </div>
                  <button onClick={() => setModal({ type: "create-unit", subject: selectedSubject })} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700 transition hover:bg-blue-100"><Plus className="h-4 w-4" /> Add unit</button>
                </div>

                {timeline.length === 0 ? (
                  <button onClick={() => setModal({ type: "create-unit", subject: selectedSubject })} className="mt-6 w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-9 text-center transition hover:border-blue-300 hover:bg-blue-50/40">
                    <CircleDashed className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-black text-primary">No syllabus units yet</p>
                    <p className="mt-1 text-[10px] font-semibold text-muted">Break this subject into measurable chapters or topics.</p>
                  </button>
                ) : (
                  <div className="mt-6 space-y-3">
                    {timeline.map((unit, index) => {
                      const completed = unit.status === "COMPLETED";
                      const running = unit.status === "RUNNING";
                      return (
                        <div key={unit.id} className={`group grid gap-4 rounded-2xl border p-4 transition sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center ${completed ? "border-emerald-100 bg-emerald-50/45" : running ? "border-blue-200 bg-blue-50/45" : "border-slate-200 bg-white hover:border-blue-200"}`}>
                          <div className={`flex h-11 w-11 items-center justify-center rounded-xl font-display text-sm font-black ${completed ? "bg-emerald-100 text-emerald-700" : running ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{String(index + 1).padStart(2, "0")}</div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{humanize(unit.unit_type)} · Seq {unit.sequence_no}</span>
                              {unit.weight !== 1 && <span className="rounded-full bg-white/80 px-2 py-0.5 text-[8px] font-black text-slate-400">Weight {unit.weight}</span>}
                            </div>
                            <p className="mt-1 truncate text-sm font-black text-primary">{unit.title}</p>
                            <p className="mt-1 text-[10px] font-semibold text-muted">{unit.description || `${formatDate(unit.planned_start_date)} — ${formatDate(unit.planned_end_date)}`}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <select value={unit.status} disabled={busyKey === `unit-status-${unit.id}`} onChange={(event) => changeUnitStatus(unit, event.target.value)} className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[9px] font-black uppercase tracking-wide text-slate-600 outline-none focus:border-blue-400">
                              {subjectUnitStatuses.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
                            </select>
                            <button onClick={() => setModal({ type: "edit-unit", subject: selectedSubject, unit })} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-blue-700" aria-label={`Edit ${unit.title}`}><Edit3 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => deleteUnit(unit)} disabled={busyKey === `delete-unit-${unit.id}`} className="rounded-xl border border-rose-100 bg-rose-50 p-2 text-rose-500 transition hover:bg-rose-100" aria-label={`Delete ${unit.title}`}>{busyKey === `delete-unit-${unit.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-violet-700" /><h3 className="font-display text-lg font-black text-primary">Linked examinations</h3></div>
                    <p className="mt-1 text-xs font-semibold text-muted">Every exam stays connected to this subject and its progress.</p>
                  </div>
                  <Link href={`/teacher/exams/new?batchId=${batch.id}&subjectId=${selectedSubject.id}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-4 py-2.5 text-xs font-black text-violet-700 transition hover:bg-violet-100"><Plus className="h-4 w-4" /> Schedule exam</Link>
                </div>

                {selectedSubject.exams.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-9 text-center">
                    <FileText className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-3 text-sm font-black text-primary">No exams linked yet</p>
                    <p className="mt-1 text-[10px] font-semibold text-muted">Schedule the first assessment for this subject.</p>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {selectedSubject.exams.map((exam) => (
                      <Link key={exam.id} href={`/teacher/exams/${exam.id}`} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-violet-200 hover:bg-violet-50/35 hover:shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wider text-violet-500">{humanize(exam.exam_type)}</p><h4 className="mt-1 truncate text-sm font-black text-primary group-hover:text-violet-800">{exam.name}</h4></div>
                          <MoreHorizontal className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-violet-500" />
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-3 text-[9px] font-bold text-slate-500">
                          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(exam.exam_date)}</span>
                          {exam.start_time && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {exam.start_time.slice(0, 5)}</span>}
                          <span>{exam.total_marks} marks</span>
                        </div>
                        <div className="mt-4"><StatusBadge status={exam.status} /></div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>

      {modal?.type === "create-subject" && (
        <Modal eyebrow="Curriculum builder" title="Create a new subject" onClose={() => setModal(null)}>
          <SubjectForm batchId={batch.id} nextOrder={nextSubjectOrder} pending={busyKey === "create-subject"} onCancel={() => setModal(null)} onSubmit={(event) => submitSubject(event)} />
        </Modal>
      )}
      {modal?.type === "edit-subject" && (
        <Modal eyebrow="Subject settings" title={`Edit ${modal.subject.name}`} onClose={() => setModal(null)}>
          <SubjectForm batchId={batch.id} subject={modal.subject} nextOrder={nextSubjectOrder} pending={busyKey === `edit-subject-${modal.subject.id}`} onCancel={() => setModal(null)} onSubmit={(event) => submitSubject(event, modal.subject)} />
        </Modal>
      )}
      {modal?.type === "create-unit" && (
        <Modal eyebrow="Syllabus roadmap" title="Add chapter or topic" onClose={() => setModal(null)}>
          <UnitForm subject={modal.subject} nextSequence={nextUnitSequence} pending={busyKey === "create-unit"} onCancel={() => setModal(null)} onSubmit={(event) => submitUnit(event)} />
        </Modal>
      )}
      {modal?.type === "edit-unit" && (
        <Modal eyebrow="Syllabus roadmap" title={`Edit ${modal.unit.title}`} onClose={() => setModal(null)}>
          <UnitForm subject={modal.subject} unit={modal.unit} nextSequence={nextUnitSequence} pending={busyKey === `edit-unit-${modal.unit.id}`} onCancel={() => setModal(null)} onSubmit={(event) => submitUnit(event, modal.unit)} />
        </Modal>
      )}
    </div>
  );
}
