"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    setError(null);
    try {
      // Get current host location to construct redirection URL for password recovery
      const siteUrl = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        data.email.toLowerCase().trim(),
        {
          redirectTo: `${siteUrl}/reset-password`,
        }
      );

      if (resetError) {
        throw new Error(JSON.stringify(resetError));
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit request. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white border border-border/60 rounded-2xl p-8 shadow-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100">
          <Mail className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold font-display text-primary mb-2">
          Request Sent
        </h2>
        <p className="text-sm text-muted font-medium mb-6 leading-relaxed">
          If an account exists matching that email, a secure password reset link has been sent to it. Please check your inbox.
        </p>
        <Link
          href="/login"
          className="w-full primary-btn py-2.5 rounded-xl text-sm font-bold block"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border/60 rounded-2xl p-8 shadow-sm">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold font-display text-primary leading-tight">
          Forgot Password?
        </h2>
        <p className="text-xs text-muted font-medium mt-1">
          Enter your email to receive a recovery link
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200/60 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
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
              placeholder="name@example.com"
            />
          </div>
          {errors.email && (
            <p className="text-rose-600 text-xs font-bold mt-1.5 leading-none pl-1">
              {errors.email.message}
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
              <span>Sending Request...</span>
            </>
          ) : (
            <span>Send Reset Link</span>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-border/30 text-center">
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-muted hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Login</span>
        </Link>
      </div>
    </div>
  );
}
