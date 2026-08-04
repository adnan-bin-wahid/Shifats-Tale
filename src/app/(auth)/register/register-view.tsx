"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, User, Phone, Loader2, AlertCircle, Home, GraduationCap, Calendar, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { getDistinctAcademicYears } from "@/app/actions/academic-years";
import { getStudentCodeByUserId } from "@/app/actions/auth";

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().min(10, "Please enter a valid mobile number"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string(),
    academicLevel: z.string().min(1, "Please select your academic year"),
    institution: z.string().min(2, "Educational institution is required"),
    guardianName: z.string().min(2, "Guardian's name is required"),
    guardianPhone: z.string().min(10, "Guardian's mobile number must be valid"),
    address: z.string().min(5, "Address is required"),
    dateOfBirth: z.string().optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterInput = z.infer<typeof registerSchema>;

export function RegisterView() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [studentCode, setStudentCode] = useState<string | null>(null);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [loadingYears, setLoadingYears] = useState(true);

  React.useEffect(() => {
    async function loadYears() {
      const years = await getDistinctAcademicYears();
      setAcademicYears(years);
      setLoadingYears(false);
    }
    loadYears();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    setError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email.toLowerCase().trim(),
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone,
            academic_level: data.academicLevel,
            institution: data.institution,
            guardian_name: data.guardianName,
            guardian_phone: data.guardianPhone,
            address: data.address,
            date_of_birth: data.dateOfBirth || null,
          },
        },
      });

      if (authError) {
        throw new Error(JSON.stringify(authError));
      }

      // Check if email verification is required or user was auto-logged in
      const session = authData.session;
      const user = authData.user;

      if (user && user.identities && user.identities.length === 0) {
        throw new Error("This email address is already registered. Please log in instead.");
      }

      if (user) {
        // Retry loop to fetch the generated student code (waits for database triggers)
        let code = null;
        let attempts = 0;
        
        while (!code && attempts < 5) {
          await new Promise((resolve) => setTimeout(resolve, 1500)); // wait 1.5s per attempt
          code = await getStudentCodeByUserId(user.id);
          attempts++;
        }
        
        if (code) {
          setStudentCode(code);
        }
      }

      if (!session) {
        // Verification email sent, user is not logged in automatically
        setEmailConfirmationRequired(true);
      }
      
      setSuccess(true);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("User already registered") || msg.includes("already exists")) {
        setError("This email address is already registered. Please log in instead.");
      } else {
        setError(msg || "Registration failed. Please check your inputs.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white border border-border/60 rounded-2xl p-8 shadow-sm text-center max-w-lg mx-auto">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100">
          <GraduationCap className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold font-display text-primary mb-2">
          Registration Succeeded!
        </h2>

        <div className="text-sm text-muted font-medium mb-6 leading-relaxed text-left space-y-4 pt-2">
          {studentCode ? (
            <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-4 text-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block">
                Your Generated Student ID
              </span>
              <span className="text-xl font-extrabold text-primary font-display block mt-1">
                {studentCode}
              </span>
            </div>
          ) : (
            <p className="text-center italic text-xs">
              Your Student ID has been generated successfully.
            </p>
          )}

          <div className="bg-bg/40 border border-border/60 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-primary uppercase">Important Next Steps:</h4>
            <ul className="list-disc pl-4 text-xs space-y-1">
              {emailConfirmationRequired && (
                <li className="font-bold text-emerald-700">
                  Please click the verification link sent to your email inbox first.
                </li>
              )}
              <li>Provide your Student ID to the Teacher.</li>
              <li>Complete your offline admission payment process.</li>
              <li>Once approved, you will be granted access to the Student Dashboard.</li>
            </ul>
          </div>
        </div>

        <Link
          href="/login"
          className="w-full primary-btn py-2.5 rounded-xl text-sm font-bold block"
        >
          Proceed to Login
        </Link>
      </div>
    );
  }

  if (loadingYears) {
    return (
      <div className="bg-white border border-border/60 rounded-2xl p-8 shadow-sm text-center max-w-lg mx-auto flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm font-bold text-muted animate-pulse">Loading registration form...</p>
      </div>
    );
  }

  if (academicYears.length === 0) {
    return (
      <div className="bg-white border border-border/60 rounded-2xl p-10 shadow-sm text-center max-w-lg mx-auto">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-orange-500 mb-6 border border-orange-100">
          <Clock className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold font-display text-primary mb-3">
          Registration Closed
        </h2>
        <p className="text-sm text-muted font-medium mb-8 leading-relaxed max-w-sm mx-auto">
          Currently, there are no active batches available for new student enrollment. The registration process will be opened soon!
        </p>
        <Link
          href="/login"
          className="inline-block primary-btn py-3 px-8 rounded-xl text-sm font-bold"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border/60 rounded-2xl p-8 shadow-sm w-full max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold font-display text-primary leading-tight">
          Create Student Account
        </h2>
        <p className="text-xs text-muted font-medium mt-1">
          Register to join class batches and access materials
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200/60 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Step 1: Personal Details */}
        <div className="border-b border-border/30 pb-2">
          <h3 className="text-xs font-bold text-accent uppercase tracking-wider">
            1. Personal Details
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted">
                <User className="h-4 w-4" />
              </span>
              <input
                type="text"
                {...register("fullName")}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-bg/30 border border-border/80 focus:border-primary/40 focus:ring-1 focus:ring-primary/45 rounded-xl text-sm transition-all focus:outline-none placeholder-muted font-medium"
                placeholder="Adnan Bin Wahid"
              />
            </div>
            {errors.fullName && (
              <p className="text-rose-600 text-xs font-bold mt-1.5 leading-none pl-1">
                {errors.fullName.message}
              </p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                {...register("email")}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-bg/30 border border-border/80 focus:border-primary/40 focus:ring-1 focus:ring-primary/45 rounded-xl text-sm transition-all focus:outline-none placeholder-muted font-medium"
                placeholder="student@example.com"
              />
            </div>
            {errors.email && (
              <p className="text-rose-600 text-xs font-bold mt-1.5 leading-none pl-1">
                {errors.email.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">
              Mobile Number
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted">
                <Phone className="h-4 w-4" />
              </span>
              <input
                type="tel"
                {...register("phone")}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-bg/30 border border-border/80 focus:border-primary/40 focus:ring-1 focus:ring-primary/45 rounded-xl text-sm transition-all focus:outline-none placeholder-muted font-medium"
                placeholder="01700000000"
              />
            </div>
            {errors.phone && (
              <p className="text-rose-600 text-xs font-bold mt-1.5 leading-none pl-1">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* Date of Birth (Optional) */}
          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">
              Date of Birth <span className="text-muted font-medium font-sans">(Optional)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted">
                <Calendar className="h-4 w-4" />
              </span>
              <input
                type="date"
                {...register("dateOfBirth")}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-bg/30 border border-border/80 focus:border-primary/40 focus:ring-1 focus:ring-primary/45 rounded-xl text-sm transition-all focus:outline-none placeholder-muted font-medium"
              />
            </div>
            {errors.dateOfBirth && (
              <p className="text-rose-600 text-xs font-bold mt-1.5 leading-none pl-1">
                {errors.dateOfBirth.message}
              </p>
            )}
          </div>
        </div>

        {/* Step 2: Academic Details */}
        <div className="border-b border-border/30 pb-2 pt-2">
          <h3 className="text-xs font-bold text-accent uppercase tracking-wider">
            2. Academic Information
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Academic Level */}
          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">
              Academic Year
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted pointer-events-none">
                <GraduationCap className="h-4 w-4" />
              </span>
              <select
                {...register("academicLevel")}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-bg/30 border border-border/80 focus:border-primary/40 focus:ring-1 focus:ring-primary/45 rounded-xl text-sm transition-all focus:outline-none placeholder-muted font-medium appearance-none cursor-pointer"
              >
                <option value="">Select your academic year</option>
                {academicYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            {errors.academicLevel && (
              <p className="text-rose-600 text-xs font-bold mt-1.5 leading-none pl-1">
                {errors.academicLevel.message}
              </p>
            )}
          </div>

          {/* Educational Institution */}
          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">
              Educational Institution
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted">
                <Home className="h-4 w-4" />
              </span>
              <input
                type="text"
                {...register("institution")}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-bg/30 border border-border/80 focus:border-primary/40 focus:ring-1 focus:ring-primary/45 rounded-xl text-sm transition-all focus:outline-none placeholder-muted font-medium"
                placeholder="e.g. Chittagong College"
              />
            </div>
            {errors.institution && (
              <p className="text-rose-600 text-xs font-bold mt-1.5 leading-none pl-1">
                {errors.institution.message}
              </p>
            )}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">
            Present Address
          </label>
          <input
            type="text"
            {...register("address")}
            disabled={loading}
            className="w-full px-4 py-2.5 bg-bg/30 border border-border/80 focus:border-primary/40 focus:ring-1 focus:ring-primary/45 rounded-xl text-sm transition-all focus:outline-none placeholder-muted font-medium"
            placeholder="House #, Road #, Area, City"
          />
          {errors.address && (
            <p className="text-rose-600 text-xs font-bold mt-1.5 leading-none pl-1">
              {errors.address.message}
            </p>
          )}
        </div>

        {/* Step 3: Guardian Details */}
        <div className="border-b border-border/30 pb-2 pt-2">
          <h3 className="text-xs font-bold text-accent uppercase tracking-wider">
            3. Guardian Contact Details
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Guardian Name */}
          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">
              Guardian's Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted">
                <User className="h-4 w-4" />
              </span>
              <input
                type="text"
                {...register("guardianName")}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-bg/30 border border-border/80 focus:border-primary/40 focus:ring-1 focus:ring-primary/45 rounded-xl text-sm transition-all focus:outline-none placeholder-muted font-medium"
                placeholder="Parent/Guardian Name"
              />
            </div>
            {errors.guardianName && (
              <p className="text-rose-600 text-xs font-bold mt-1.5 leading-none pl-1">
                {errors.guardianName.message}
              </p>
            )}
          </div>

          {/* Guardian Phone */}
          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">
              Guardian's Mobile Number
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted">
                <Phone className="h-4 w-4" />
              </span>
              <input
                type="tel"
                {...register("guardianPhone")}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-bg/30 border border-border/80 focus:border-primary/40 focus:ring-1 focus:ring-primary/45 rounded-xl text-sm transition-all focus:outline-none placeholder-muted font-medium"
                placeholder="01700000000"
              />
            </div>
            {errors.guardianPhone && (
              <p className="text-rose-600 text-xs font-bold mt-1.5 leading-none pl-1">
                {errors.guardianPhone.message}
              </p>
            )}
          </div>
        </div>

        {/* Step 4: Security Password */}
        <div className="border-b border-border/30 pb-2 pt-2">
          <h3 className="text-xs font-bold text-accent uppercase tracking-wider">
            4. Security Password
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                {...register("password")}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-bg/30 border border-border/80 focus:border-primary/40 focus:ring-1 focus:ring-primary/45 rounded-xl text-sm transition-all focus:outline-none placeholder-muted font-medium"
                placeholder="••••••••"
              />
            </div>
            {errors.password && (
              <p className="text-rose-600 text-xs font-bold mt-1.5 leading-none pl-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                {...register("confirmPassword")}
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-bg/30 border border-border/80 focus:border-primary/40 focus:ring-1 focus:ring-primary/45 rounded-xl text-sm transition-all focus:outline-none placeholder-muted font-medium"
                placeholder="••••••••"
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-rose-600 text-xs font-bold mt-1.5 leading-none pl-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full primary-btn py-2.5 mt-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <span>Sign Up & Register</span>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-border/30 text-center">
        <p className="text-xs text-muted font-medium">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-primary hover:text-accent transition-colors"
          >
            Login Here
          </Link>
        </p>
      </div>
    </div>
  );
}
