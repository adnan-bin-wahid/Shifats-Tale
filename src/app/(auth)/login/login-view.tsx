"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Read URL query errors (e.g. invalid_profile)
  const errorType = searchParams.get("error");
  const initialError =
    errorType === "invalid_profile"
      ? "There was an issue loading your profile. Please contact the administrator."
      : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email.toLowerCase().trim(),
        password: data.password,
      });

      if (authError) {
        throw new Error(JSON.stringify(authError));
      }

      // Refresh the page state to sync server components
      router.refresh();
      if (redirectPath) {
        router.push(redirectPath);
      } else {
        // Reloading the login page allows the server component to 
        // resolve the role and redirect to the appropriate dashboard
        window.location.href = "/login";
      }
    } catch (err: any) {
      // Map standard Supabase error messages to friendly user-facing messages
      const msg = err.message || "";
      if (msg.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please verify and try again.");
      } else if (msg.includes("Email not confirmed")) {
        setError("Your email address is not yet confirmed. Please verify your email first.");
      } else {
        setError("Sign in failed. " + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-border/60 rounded-2xl p-8 shadow-sm">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold font-display text-primary leading-tight">
          Welcome Back
        </h2>
        <p className="text-xs text-muted font-medium mt-1">
          Login to access your classes and reports
        </p>
      </div>

      {(error || initialError) && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200/60 rounded-xl text-rose-700 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error || initialError}</span>
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

        {/* Password Field */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-bold text-primary uppercase tracking-wide">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-primary hover:text-accent transition-colors"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted">
              <Lock className="h-4 w-4" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              {...register("password")}
              disabled={loading}
              className="w-full pl-10 pr-10 py-2.5 bg-bg/30 border border-border/80 focus:border-primary/40 focus:ring-1 focus:ring-primary/45 rounded-xl text-sm transition-all focus:outline-none placeholder-muted font-medium"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted hover:text-primary transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-rose-600 text-xs font-bold mt-1.5 leading-none pl-1">
              {errors.password.message}
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
              <span>Logging in...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-border/30 text-center">
        <p className="text-xs text-muted font-medium">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="font-bold text-primary hover:text-accent transition-colors"
          >
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}
