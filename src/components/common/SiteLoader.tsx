"use client";

import React, { useState, useEffect } from "react";
import { useSiteSettings } from "@/lib/providers/SiteSettingsProvider";

interface SiteLoaderProps {
  isDismissing?: boolean;
  message?: string;
}

export function SiteLoader({ isDismissing = false, message }: SiteLoaderProps) {
  const settings = useSiteSettings();

  const title = settings?.coachingCenterName || "Shifat's Tales";
  const tagline =
    settings?.tagline ||
    settings?.heroDescription ||
    "Physics & Higher Mathematics Admission Care";
  const logoUrl = settings?.logoUrl || "/images/alternate_logo.png";

  // Single-pass progress counter from 0 to 100% (never resets or loops repeatedly)
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      // Progress smoothly up to 90%, then finish up to exactly 100%
      if (current < 65) {
        current += Math.floor(Math.random() * 8) + 7;
      } else if (current < 94) {
        current += Math.floor(Math.random() * 4) + 3;
      } else if (current < 100) {
        current += 2;
      }

      if (current >= 100) {
        current = 100;
        clearInterval(interval);
      }
      setProgress(current);
    }, 40);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${title}`}
      className={`site-loader-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#FFFCF2] dark:bg-[#08122B] transition-all duration-700 ease-out print:hidden print:!hidden print:!opacity-0 print:!pointer-events-none ${
        isDismissing ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      <style dangerouslySetInnerHTML={{ __html: `@media print { .site-loader-overlay { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; } }` }} />
      
      {/* Exact User Background Image for Loading Screen */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <img
          src="/images/bg.png"
          alt="Loading Background"
          className="w-full h-full object-cover object-center opacity-100"
        />
      </div>

      {/* Background Floating Physics & Mathematics Geometric Symbols */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-10">
        {/* Soft Ambient Golden & Navy Orbs */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-[#FBB503]/15 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/3 right-1/4 translate-x-1/2 translate-y-1/2 w-[32rem] h-[32rem] bg-[#010E62]/10 dark:bg-cyan-400/10 rounded-full blur-3xl animate-pulse-glow [animation-delay:-1.5s]" />
        <div className="absolute top-2/3 left-1/3 w-[24rem] h-[24rem] bg-amber-500/10 rounded-full blur-3xl" />

        {/* Floating Mathematical & Physics Formulas */}
        <span className="absolute top-[15%] left-[10%] text-xl sm:text-3xl font-bold font-mono text-[#010E62]/20 dark:text-[#FBB503]/25 animate-float-symbol">
          {"∫ f(x)dx"}
        </span>
        <span className="absolute top-[22%] right-[14%] text-2xl sm:text-4xl font-black font-mono text-[#010E62]/20 dark:text-white/20 animate-float-symbol [animation-delay:-1s]">
          {"E = mc²"}
        </span>
        <span className="absolute bottom-[20%] left-[15%] text-2xl sm:text-3xl font-bold font-mono text-[#FBB503]/30 dark:text-[#FBB503]/30 animate-float-symbol [animation-delay:-2s]">
          {"∇ × E = -∂B/∂t"}
        </span>
        <span className="absolute bottom-[25%] right-[12%] text-3xl sm:text-5xl font-black font-mono text-[#010E62]/15 dark:text-cyan-400/20 animate-float-symbol [animation-delay:-2.8s]">
          {"π ≈ 3.1416"}
        </span>
        <span className="absolute top-[45%] left-[6%] text-xl sm:text-2xl font-bold font-mono text-[#010E62]/15 dark:text-amber-300/20 animate-float-symbol [animation-delay:-3.5s]">
          {"F = G(m₁m₂)/r²"}
        </span>
        <span className="absolute top-[40%] right-[7%] text-2xl sm:text-3xl font-bold font-mono text-[#010E62]/18 dark:text-white/15 animate-float-symbol [animation-delay:-0.5s]">
          {"d/dx (eˣ) = eˣ"}
        </span>
      </div>

      {/* Subtle 3D Atomic Orbital Rings behind centerpiece */}
      <div className="absolute w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] pointer-events-none flex items-center justify-center opacity-30 dark:opacity-40">
        <div className="absolute inset-0 border border-dashed border-[#FBB503]/40 dark:border-[#FBB503]/50 rounded-full animate-atom-orbit-1" />
        <div className="absolute inset-8 border border-dotted border-[#010E62]/30 dark:border-cyan-400/40 rounded-full animate-atom-orbit-2" />
      </div>

      {/* Centerpiece: Clean, Plain, Professional Minimalist Style (No Card Box, No Border) */}
      <div className="relative z-20 flex flex-col items-center justify-center max-w-lg w-[90%] px-4 text-center">
        
        {/* Clean Logo Showcase */}
        <div className="relative flex items-center justify-center w-64 sm:w-80 h-20 sm:h-24 mb-5">
          <img
            src="/images/alternate_logo_dark.png"
            alt={title}
            className="w-full h-full object-contain filter drop-shadow transition-transform duration-500 hover:scale-[1.02] dark:hidden"
          />
          <img
            src={logoUrl}
            alt={title}
            className="w-full h-full object-contain filter drop-shadow transition-transform duration-500 hover:scale-[1.02] hidden dark:block"
          />
        </div>

        {/* Professional Typography */}
        <div className="space-y-1.5 max-w-md mx-auto">
          <h2 className="text-base sm:text-lg font-extrabold tracking-wide text-[#010E62] dark:text-[#FFFCF2] font-display drop-shadow-sm">
            {tagline}
          </h2>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wider uppercase font-mono">
            Empowering SSC, HSC & Engineering Aspirants
          </p>
        </div>

        {/* Sleek Minimalist Progress Indicator */}
        <div className="w-64 sm:w-80 mt-9 flex flex-col items-center space-y-2.5">
          {/* Thin, modern progress bar track */}
          <div className="w-full h-1.5 bg-[#010E62]/15 dark:bg-white/15 rounded-full overflow-hidden backdrop-blur-sm p-0 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#010E62] via-[#FBB503] to-[#FBB503] rounded-full transition-all duration-150 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Progress Status & Percentage */}
          <div className="w-full flex items-center justify-between text-[11px] font-bold tracking-wider text-[#010E62]/90 dark:text-white/90 font-mono">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${progress < 100 ? "bg-[#FBB503] animate-ping" : "bg-emerald-500"}`} />
              <span>{progress < 100 ? (message || "Initializing Portal...") : "Portal Ready"}</span>
            </span>
            <span className="font-extrabold text-[#010E62] dark:text-[#FBB503]">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Bottom Subtle Shimmer Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#010E62]/10 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-transparent via-[#FBB503] to-transparent transition-all duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
