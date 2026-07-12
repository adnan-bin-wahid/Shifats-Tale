"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentProfileTeacherEditSchema } from "@/lib/validations/profiles";
import { updateStudentProfileByTeacherAction } from "@/app/actions/profiles";
import { 
  Phone, 
  MapPin, 
  Calendar, 
  User, 
  GraduationCap, 
  School, 
  HeartHandshake, 
  ShieldAlert, 
  Save, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Key
} from "lucide-react";

interface StudentEditFormProps {
  studentId: string;
  initialData: {
    fullName: string;
    phone: string;
    academicLevel: string;
    institution: string;
    guardianName: string;
    guardianPhone: string;
    address: string;
    dateOfBirth: string | null;
    registrationStatus: "PENDING" | "APPROVED" | "REJECTED";
    accountStatus: "ACTIVE" | "DISABLED" | "ARCHIVED";
    teacherNote: string | null;
    studentCode: string;
  };
}

export function StudentEditForm({ studentId, initialData }: StudentEditFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(studentProfileTeacherEditSchema),
    defaultValues: {
      fullName: initialData.fullName || "",
      phone: initialData.phone || "",
      academicLevel: initialData.academicLevel || "",
      institution: initialData.institution || "",
      guardianName: initialData.guardianName || "",
      guardianPhone: initialData.guardianPhone || "",
      address: initialData.address || "",
      dateOfBirth: initialData.dateOfBirth || "",
      registrationStatus: initialData.registrationStatus,
      accountStatus: initialData.accountStatus,
      teacherNote: initialData.teacherNote || "",
      studentCode: initialData.studentCode || "",
      correctionReason: "",
      confirmCorrection: false,
    },
  });

  const studentCode = watch("studentCode");
  const confirmCorrection = watch("confirmCorrection");
  const correctionReason = watch("correctionReason");

  const isCodeModified = studentCode !== initialData.studentCode;

  const onSubmit = async (data: any) => {
    // Client-side validations for Student ID Correction
    if (isCodeModified) {
      if (!data.confirmCorrection) {
        setStatusMessage({ type: "error", text: "You must confirm you want to correct the Student ID." });
        return;
      }
      if (!data.correctionReason || !data.correctionReason.trim()) {
        setStatusMessage({ type: "error", text: "A correction reason is required when modifying a Student ID." });
        return;
      }
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await updateStudentProfileByTeacherAction(studentId, data);
      if (res.success) {
        setStatusMessage({ type: "success", text: "Student profile updated successfully." });
        router.refresh();
        setTimeout(() => {
          router.push(`/teacher/students/${studentId}`);
        }, 1500);
      } else {
        setStatusMessage({ type: "error", text: res.message || "Failed to update student profile." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "An unexpected error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-xs font-bold text-primary">
      {/* Alert status banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
            statusMessage.type === "success"
              ? "bg-emerald-50/50 border-emerald-200 text-emerald-800"
              : "bg-rose-50/50 border-rose-200 text-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          )}
          <span className="font-semibold text-xs leading-normal">{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns: Standard Info Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Personal Details */}
          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h4 className="text-sm font-extrabold text-primary font-display border-b border-border/30 pb-2 flex items-center gap-1.5">
              <User className="h-4.5 w-4.5 text-primary" />
              <span>Personal Information</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-muted uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="Student Full Name"
                  {...register("fullName")}
                  className={`w-full bg-slate-50/50 border rounded-xl px-3 py-2.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-primary transition-all ${
                    errors.fullName ? "border-rose-400 focus:border-rose-500" : "border-border/60"
                  }`}
                />
                {errors.fullName && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.fullName.message}</p>}
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+8801XXXXXXXXX"
                  {...register("phone")}
                  className={`w-full bg-slate-50/50 border rounded-xl px-3 py-2.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-primary transition-all ${
                    errors.phone ? "border-rose-400 focus:border-rose-500" : "border-border/60"
                  }`}
                />
                {errors.phone && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase block mb-1">Date of Birth</label>
                <input
                  type="date"
                  {...register("dateOfBirth")}
                  className={`w-full bg-slate-50/50 border rounded-xl px-3 py-2.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-primary transition-all ${
                    errors.dateOfBirth ? "border-rose-400 focus:border-rose-500" : "border-border/60"
                  }`}
                />
                {errors.dateOfBirth && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.dateOfBirth.message}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] text-muted uppercase block mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  placeholder="Current street address, city..."
                  {...register("address")}
                  className={`w-full bg-slate-50/50 border rounded-xl px-3 py-2.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-primary transition-all resize-none ${
                    errors.address ? "border-rose-400 focus:border-rose-500" : "border-border/60"
                  }`}
                />
                {errors.address && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.address.message}</p>}
              </div>
            </div>
          </div>

          {/* Section 2: Academics */}
          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h4 className="text-sm font-extrabold text-primary font-display border-b border-border/30 pb-2 flex items-center gap-1.5">
              <GraduationCap className="h-4.5 w-4.5 text-primary" />
              <span>Academic Details</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-muted uppercase block mb-1">Class Academic Level</label>
                <select
                  {...register("academicLevel")}
                  className={`w-full bg-slate-50/50 border rounded-xl px-3 py-2.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-primary transition-all ${
                    errors.academicLevel ? "border-rose-400 focus:border-rose-500" : "border-border/60"
                  }`}
                >
                  <option value="">Select Academic Level</option>
                  <option value="Class 6">Class 6</option>
                  <option value="Class 7">Class 7</option>
                  <option value="Class 8">Class 8</option>
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10 (SSC)">Class 10 (SSC)</option>
                  <option value="Class 11 (HSC 1st Year)">Class 11 (HSC 1st Year)</option>
                  <option value="Class 12 (HSC 2nd Year)">Class 12 (HSC 2nd Year)</option>
                  <option value="University Admission">University Admission</option>
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Other">Other</option>
                </select>
                {errors.academicLevel && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.academicLevel.message}</p>}
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase block mb-1">Institution</label>
                <input
                  type="text"
                  placeholder="School or College Name"
                  {...register("institution")}
                  className={`w-full bg-slate-50/50 border rounded-xl px-3 py-2.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-primary transition-all ${
                    errors.institution ? "border-rose-400 focus:border-rose-500" : "border-border/60"
                  }`}
                />
                {errors.institution && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.institution.message}</p>}
              </div>
            </div>
          </div>

          {/* Section 3: Guardians */}
          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h4 className="text-sm font-extrabold text-primary font-display border-b border-border/30 pb-2 flex items-center gap-1.5">
              <HeartHandshake className="h-4.5 w-4.5 text-primary" />
              <span>Guardian Details</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-muted uppercase block mb-1">Guardian Name</label>
                <input
                  type="text"
                  placeholder="Father/Mother/Guardian"
                  {...register("guardianName")}
                  className={`w-full bg-slate-50/50 border rounded-xl px-3 py-2.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-primary transition-all ${
                    errors.guardianName ? "border-rose-400 focus:border-rose-500" : "border-border/60"
                  }`}
                />
                {errors.guardianName && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.guardianName.message}</p>}
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase block mb-1">Guardian Mobile</label>
                <input
                  type="text"
                  placeholder="+8801XXXXXXXXX"
                  {...register("guardianPhone")}
                  className={`w-full bg-slate-50/50 border rounded-xl px-3 py-2.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-primary transition-all ${
                    errors.guardianPhone ? "border-rose-400 focus:border-rose-500" : "border-border/60"
                  }`}
                />
                {errors.guardianPhone && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.guardianPhone.message}</p>}
              </div>
            </div>
          </div>

          {/* Section 4: Student ID Exception Correction */}
          <div className="bg-white p-6 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h4 className="text-sm font-extrabold text-primary font-display border-b border-border/30 pb-2 flex items-center gap-1.5">
              <Key className="h-4.5 w-4.5 text-primary" />
              <span>Student ID Code Correction (Exceptional Flow)</span>
            </h4>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-muted uppercase block mb-1">Student ID Code</label>
                <input
                  type="text"
                  placeholder="STXXXX"
                  {...register("studentCode")}
                  className="w-full bg-slate-50/50 border border-border/60 rounded-xl px-3 py-2.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-primary transition-all"
                />
                {errors.studentCode && <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.studentCode.message}</p>}
              </div>

              {isCodeModified && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3.5">
                  <div className="flex gap-2.5">
                    <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[11px] font-extrabold uppercase text-amber-900 block leading-tight">
                        Confirming ID Correction
                      </span>
                      <p className="text-[10px] text-amber-800 font-normal mt-0.5 leading-relaxed">
                        Modifying a student identification code requires a documented administrative reason. It checks for uniqueness and triggers a system audit log.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1 border-t border-amber-200/55">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register("confirmCorrection")}
                        className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 h-4 w-4 shrink-0"
                      />
                      <span className="text-[11px] text-amber-900 font-bold leading-normal">
                        I confirm I explicitly intend to change this student's ID code.
                      </span>
                    </label>

                    <div>
                      <label className="text-[10px] text-amber-800 uppercase block mb-1">Reason for correction</label>
                      <input
                        type="text"
                        placeholder="e.g. Typo corrected, duplicate code resolving..."
                        {...register("correctionReason")}
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-amber-400 font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Status & Notes */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-4">
            <h4 className="text-sm font-extrabold text-primary font-display border-b border-border/30 pb-2">
              Status & Administrative Notes
            </h4>

            <div className="space-y-4">
              {/* Registration Status */}
              <div>
                <label className="block text-[10px] text-muted uppercase mb-1">Registration Status</label>
                <select
                  {...register("registrationStatus")}
                  className="w-full bg-slate-50/50 border border-border/60 rounded-xl px-3 py-2.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-primary"
                >
                  <option value="PENDING">Pending Approval</option>
                  <option value="APPROVED">Approved (Active Student)</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Account Access Status */}
              <div>
                <label className="block text-[10px] text-muted uppercase mb-1">Portal Account Access</label>
                <select
                  {...register("accountStatus")}
                  className="w-full bg-slate-50/50 border border-border/60 rounded-xl px-3 py-2.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-primary"
                >
                  <option value="ACTIVE">Active (Permitted to Login)</option>
                  <option value="DISABLED">Disabled (Suspended Access)</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] text-muted uppercase mb-1 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Teacher Note</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Private administrative observations..."
                  {...register("teacherNote")}
                  className="w-full bg-slate-50/50 border border-border/60 rounded-xl px-3 py-2.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-primary resize-y"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="bg-white p-5 rounded-2xl border border-border/40 shadow-sm space-y-3">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-primary text-white hover:bg-primary/95 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin animate-pulse" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Student Profile</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/teacher/students/${studentId}`)}
              className="w-full py-2.5 border border-border bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
            >
              <X className="h-4 w-4 text-muted" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
