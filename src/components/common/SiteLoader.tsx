"use client";

import React from "react";
import { useSiteSettings } from "@/lib/providers/SiteSettingsProvider";
import { GraduationCap, Sparkles, BookOpen } from "lucide-react";

interface SiteLoaderProps {
  isDismissing?: boolean;
  message?: string;
}

export function SiteLoader({ isDismissing = false, message }: SiteLoaderProps) {
  const settings = useSiteSettings();

  const title = settings?.coachingCenterName || "Shifat's Tale";
  const tagline = settings?.tagline || settings?.shortDescription || "Excellence in Physics & Higher Mathematics";
  const logoUrl = settings?.logoUrl;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${title}`}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#0A1638] via-[#010E62] to-[#0B1B4D] transition-opacity duration-700 ease-in-out ${
        isDismissing ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background Ambient Glowing Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 bg-amber-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 sm:w-[30rem] sm:h-[30rem] bg-cyan-400/10 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Center Orbital Ring Seal Showcase */}
      <div className="relative z-10 flex flex-col items-center px-4 max-w-xl text-center">
        <div className="relative flex items-center justify-center w-40 h-40 sm:w-48 sm:h-48 mb-8">
          {/* Outer Rotating Orbit Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400/30 animate-loader-orbit-outer" />
          
          {/* Inner Rotating Orbit Ring */}
          <div className="absolute inset-2 sm:inset-3 rounded-full border-2 border-transparent border-t-cyan-400 border-l-amber-400/80 animate-loader-orbit-inner" />
          
          {/* Third subtle glow ring */}
          <div className="absolute inset-5 sm:inset-6 rounded-full border border-white/10" />

          {/* Center Pulsing Crest/Seal */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/95 dark:bg-slate-900 shadow-2xl flex items-center justify-center p-4 ring-4 ring-amber-400/20 animate-loader-seal">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={title}
                className="w-full h-full object-contain filter drop-shadow-md"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-[#010E62]">
                <GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500 mb-0.5" />
                <span className="text-[10px] font-black tracking-tighter uppercase text-[#010E62]/80">Excellence</span>
              </div>
            )}
          </div>
        </div>

        {/* Copy & Title Typography */}
        <div className="space-y-2 sm:space-y-3">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.28em] text-amber-400 animate-pulse">
            Welcome to
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-display tracking-tight text-white drop-shadow-sm leading-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-300 max-w-md mx-auto leading-relaxed line-clamp-2">
            {tagline}
          </p>
        </div>

        {/* Animated Bouncing Indicator Dots */}
        <div className="flex items-center gap-2 mt-8">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-bounce" />
        </div>

        {message && (
          <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {message}
          </p>
        )}
      </div>

      {/* Bottom Shimmer Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-900/60 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-amber-400 through-cyan-400 to-transparent animate-loader-shimmer" />
      </div>
    </div>
  );
}
