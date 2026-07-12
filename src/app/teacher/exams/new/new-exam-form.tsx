"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { examSchema } from "@/lib/validations/exams";
import { createExamAction } from "@/app/actions/exams";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

interface Batch {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface NewExamFormProps {
  batches: Batch[];
}

export function NewExamForm({ batches }: NewExamFormProps) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(examSchema),
    defaultValues: {
      batchId: "",
      name: "",
      description: "",
      examType: "CLASS_TEST" as any,
      examDate: new Date().toISOString().split("T")[0],
      totalMarks: 100,
      passMarks: 33,
      startTime: "",
      duration: undefined,
      status: "SCHEDULED",
    },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("batchId", data.batchId);
      formData.append("name", data.name);
      formData.append("description", data.description || "");
      formData.append("examType", data.examType);
      formData.append("examDate", data.examDate);
      formData.append("totalMarks", String(data.totalMarks));
      formData.append("passMarks", String(data.passMarks));
      formData.append("startTime", data.startTime || "");
      if (data.duration) {
        formData.append("duration", String(data.duration));
      }
      formData.append("status", data.status || "SCHEDULED");

      const res = await createExamAction(formData);
      if (!res.success) {
        if (res.errors) {
          const firstErrKey = Object.keys(res.errors)[0];
          const firstErrMsg = (res.errors as any)[firstErrKey][0];
          setErrorMsg(`${firstErrKey}: ${firstErrMsg}`);
        } else {
          setErrorMsg(res.message || "Failed to create examination.");
        }
      } else {
        router.push("/teacher/exams");
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full max-w-4xl bg-white p-6 sm:p-8 rounded-2xl border border-border/40 shadow-sm text-xs font-bold text-primary">
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-150 text-rose-700 rounded-xl text-xs font-extrabold">
          {errorMsg}
        </div>
      )}

      {/* Grid: Core exam fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Batch Select */}
        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-muted mb-2">
            Target Batch <span className="text-red-500">*</span>
          </label>
          <select
            {...register("batchId")}
            className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-bg/25 text-xs font-bold focus:border-primary focus:outline-none"
          >
            <option value="">Select a batch...</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name} ({batch.code}) {batch.status === "COMPLETED" ? "[COMPLETED]" : ""}
              </option>
            ))}
          </select>
          {errors.batchId && (
            <p className="mt-1.5 text-rose-600 text-[10px] font-bold">{errors.batchId.message as string}</p>
          )}
        </div>

        {/* Exam Name */}
        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-muted mb-2">
            Examination Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register("name")}
            placeholder="e.g. Weekly Exam 04: Vector calculus"
            className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-bg/25 text-xs font-bold focus:border-primary focus:outline-none"
          />
          {errors.name && (
            <p className="mt-1.5 text-rose-600 text-[10px] font-bold">{errors.name.message as string}</p>
          )}
        </div>

        {/* Exam Type */}
        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-muted mb-2">
            Examination Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register("examType")}
            className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-bg/25 text-xs font-bold focus:border-primary focus:outline-none"
          >
            <option value="CLASS_TEST">Class Test</option>
            <option value="WEEKLY_EXAM">Weekly Exam</option>
            <option value="MONTHLY_EXAM">Monthly Exam</option>
            <option value="MODEL_TEST">Model Test</option>
            <option value="ASSIGNMENT">Assignment</option>
            <option value="FINAL_EXAM">Final Exam</option>
          </select>
          {errors.examType && (
            <p className="mt-1.5 text-rose-600 text-[10px] font-bold">{errors.examType.message as string}</p>
          )}
        </div>

        {/* Exam Date */}
        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-muted mb-2">
            Examination Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            {...register("examDate")}
            className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-bg/25 text-xs font-bold focus:border-primary focus:outline-none"
          />
          {errors.examDate && (
            <p className="mt-1.5 text-rose-600 text-[10px] font-bold">{errors.examDate.message as string}</p>
          )}
        </div>

        {/* Total Marks */}
        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-muted mb-2">
            Total Marks <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register("totalMarks")}
            placeholder="e.g. 100"
            className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-bg/25 text-xs font-bold focus:border-primary focus:outline-none"
          />
          {errors.totalMarks && (
            <p className="mt-1.5 text-rose-600 text-[10px] font-bold">{errors.totalMarks.message as string}</p>
          )}
        </div>

        {/* Pass Marks */}
        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-muted mb-2">
            Pass Marks <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register("passMarks")}
            placeholder="e.g. 33"
            className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-bg/25 text-xs font-bold focus:border-primary focus:outline-none"
          />
          {errors.passMarks && (
            <p className="mt-1.5 text-rose-600 text-[10px] font-bold">{errors.passMarks.message as string}</p>
          )}
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-muted mb-2">
            Start Time <span className="text-muted-foreground">(Optional)</span>
          </label>
          <input
            type="time"
            {...register("startTime")}
            className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-bg/25 text-xs font-bold focus:border-primary focus:outline-none"
          />
          {errors.startTime && (
            <p className="mt-1.5 text-rose-600 text-[10px] font-bold">{errors.startTime.message as string}</p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="block text-[10px] uppercase font-extrabold tracking-wider text-muted mb-2">
            Duration <span className="text-muted-foreground">(Minutes, Optional)</span>
          </label>
          <input
            type="number"
            {...register("duration")}
            placeholder="e.g. 60"
            className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-bg/25 text-xs font-bold focus:border-primary focus:outline-none"
          />
          {errors.duration && (
            <p className="mt-1.5 text-rose-600 text-[10px] font-bold">{errors.duration.message as string}</p>
          )}
        </div>
      </div>

      {/* Examination Status */}
      <div className="p-4 bg-primary/5 border border-primary/15 rounded-xl space-y-2">
        <label className="block text-[10px] uppercase font-extrabold tracking-wider text-primary">
          Examination Status <span className="text-red-500">*</span>
        </label>
        <select
          {...register("status")}
          className="w-full px-4 py-2.5 rounded-xl border border-primary/30 bg-white text-xs font-bold text-primary focus:border-primary focus:outline-none"
        >
          <option value="SCHEDULED">SCHEDULED - Publish immediately on student portal (Enrolled students notified)</option>
          <option value="DRAFT">DRAFT - Save secretly as hidden draft (Students will not see it until scheduled)</option>
        </select>
        <p className="text-[10px] text-muted font-normal">
          Select <strong className="text-primary font-bold">SCHEDULED</strong> to make this exam live immediately on the batch dashboard under &quot;Upcoming Exams &amp; Tests&quot;.
        </p>
      </div>

      {/* Description textarea */}
      <div>
        <label className="block text-[10px] uppercase font-extrabold tracking-wider text-muted mb-2">
          Syllabus / Details Description <span className="text-muted-foreground">(Optional)</span>
        </label>
        <textarea
          rows={3}
          {...register("description")}
          placeholder="Enter syllabus details or special instructions for students..."
          className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-bg/25 text-xs font-bold focus:border-primary focus:outline-none resize-y"
        />
        {errors.description && (
          <p className="mt-1.5 text-rose-600 text-[10px] font-bold">{errors.description.message as string}</p>
        )}
      </div>

      {/* Form Action Controls */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border/20">
        <Link
          href="/teacher/exams"
          className="px-5 py-2.5 border border-border/80 bg-white hover:bg-slate-50 text-xs font-bold text-muted rounded-xl transition-all"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 primary-btn text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-primary/10 transition-all hover:scale-[1.01] disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Create Examination</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
