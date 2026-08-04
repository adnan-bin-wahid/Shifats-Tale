"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    // Parse URL for PKCE code
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    
    if (code) {
      setLoading(true);
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError("Invalid or expired reset link. Please request a new one.");
        }
        // Clean up the URL
        url.searchParams.delete("code");
        window.history.replaceState({}, document.title, url.toString());
        setLoading(false);
      });
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        throw new Error(JSON.stringify(updateError));
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Link may be expired.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white border border-border/60 rounded-2xl p-8 shadow-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold font-display text-primary mb-2">
          Password Updated
        </h2>
        <p className="text-sm text-muted font-medium mb-6 leading-relaxed">
          Your account password was updated successfully. You can now use your new password to sign in.
        </p>
        <Link
          href="/login"
          className="w-full primary-btn py-2.5 rounded-xl text-sm font-bold block"
        >
          Proceed to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border/60 rounded-2xl p-8 shadow-sm">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold font-display text-primary leading-tight">
          Reset Password
        </h2>
        <p className="text-xs text-muted font-medium mt-1">
          Set a secure new password for your account
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200/60 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* New Password */}
        <div>
          <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wide">
            New Password
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

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full primary-btn py-2.5 mt-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating Password...</span>
            </>
          ) : (
            <span>Reset Password</span>
          )}
        </button>
      </form>
    </div>
  );
}
