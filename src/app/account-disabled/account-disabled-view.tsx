"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, LogOut, Loader2, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface AccountDisabledViewProps {
  studentName: string;
  studentCode: string;
  contactText: string;
  contactPhone: string;
}

export function AccountDisabledView({
  studentName,
  studentCode,
  contactText,
  contactPhone,
}: AccountDisabledViewProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

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
      {/* Alert icon with brand styling */}
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 animate-pulse">
        <ShieldAlert className="h-7 w-7" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-extrabold font-display text-primary leading-tight">
          Account Disabled
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
            {studentCode && studentCode !== "N/A" && (
              <div>
                <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                  Student ID
                </span>
                <span className="text-xs font-extrabold text-primary font-display">
                  {studentCode}
                </span>
              </div>
            )}
            <div>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
                Account Status
              </span>
              <span className="text-xs font-extrabold text-rose-600">DISABLED</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border/40 space-y-3">
        <a
          href={`tel:${contactPhone.replace(/[\s-]/g, "")}`}
          className="w-full primary-btn py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
        >
          <Phone className="h-4 w-4" />
          <span>Call Sir</span>
        </a>

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
