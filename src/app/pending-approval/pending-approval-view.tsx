"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogOut, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface PendingApprovalViewProps {
  studentName: string;
  studentCode: string;
  registrationStatus: string;
  registrationDate: string;
  contactText: string;
  contactPhone: string;
  contactEmail: string;
}

export function PendingApprovalView({
  studentName,
  studentCode,
  registrationStatus,
  registrationDate,
  contactText,
  contactPhone,
  contactEmail,
}: PendingApprovalViewProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Triggers Next.js to fetch a fresh Server Component state
    router.refresh();
    // Allow a small delay for user experience feedback
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Clock icon with brand styling */}
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 animate-pulse">
        <Clock className="h-7 w-7" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold font-display text-primary leading-tight">
          Admission Pending Approval
        </h2>
        <div className="text-sm text-muted font-medium leading-relaxed max-w-sm mx-auto space-y-4">
          <p>{contactText}</p>

          {/* Student metadata panel */}
          <div className="bg-bg/40 border border-border/60 rounded-xl p-4 text-left space-y-2">
            <div>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Student Name
              </span>
              <span className="text-xs font-extrabold text-primary">{studentName}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  Student ID
                </span>
                <span className="text-xs font-extrabold text-primary font-display">
                  {studentCode}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  Status
                </span>
                <span className="text-xs font-extrabold text-amber-600">
                  {registrationStatus}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Registration Date
              </span>
              <span className="text-xs font-extrabold text-primary">{registrationDate}</span>
            </div>
          </div>

          <p className="text-[11px] font-bold text-muted uppercase tracking-wider">
            Need Help? Contact Center at:
            <span className="block mt-1 font-extrabold text-primary lowercase">
              {contactEmail} &bull; {contactPhone}
            </span>
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-border/40 space-y-3">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full primary-btn py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>Refresh Status</span>
        </button>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 border border-border/80 bg-white hover:bg-slate-50 text-xs font-bold text-muted hover:text-primary py-2.5 rounded-xl transition-all duration-200"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
