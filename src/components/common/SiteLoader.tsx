"use client";

import React from "react";
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
  const logoUrl = settings?.logoUrl || "/images/logo_transparent.png";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${title}`}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#FFFCF2] via-[#FFF8E6] to-[#FDF4DF] dark:from-[#08122B] dark:via-[#010E62] dark:to-[#0A193D] transition-all duration-700 ease-out ${
        isDismissing ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      {/* Background Floating Physics & Mathematics Geometric Symbols */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
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

      {/* 3D Atomic & Infinity Orbital Rings around Center Stage */}
      <div className="absolute w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] pointer-events-none flex items-center justify-center">
        <div className="absolute inset-0 border-[1.5px] border-dashed border-[#FBB503]/40 dark:border-[#FBB503]/50 rounded-full animate-atom-orbit-1" />
        <div className="absolute inset-4 sm:inset-6 border-[1.5px] border-dotted border-[#010E62]/30 dark:border-cyan-400/40 rounded-full animate-atom-orbit-2" />
      </div>

      {/* Centerpiece Luxury Glass Showcase Card */}
      <div className="relative z-20 flex flex-col items-center justify-center bg-white/95 dark:bg-[#010E62]/95 backdrop-blur-2xl border border-[#E7E0D2] dark:border-[#FBB503]/30 shadow-[0_30px_80px_-15px_rgba(1,14,98,0.22)] dark:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.6)] rounded-[2.5rem] px-8 py-10 sm:px-14 sm:py-12 max-w-xl w-[92%] text-center transform transition-transform duration-500">
        
        {/* Subtle top crown accent */}
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#010E62] via-[#FBB503] to-[#010E62] text-[#FFFCF2] text-[10px] sm:text-xs font-black tracking-[0.25em] uppercase px-4 py-1 rounded-full shadow-md border border-white/20 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FBB503] animate-ping" />
          <span>Academic & Admission Care</span>
        </div>

        {/* Proper Official Horizontal Logo Showcase */}
        <div className="relative flex items-center justify-center w-64 sm:w-80 h-20 sm:h-24 mb-4">
          <img
            src={logoUrl}
            alt={title}
            className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-500 hover:scale-[1.02]"
          />
        </div>

        {/* Shimmering Gold Divider */}
        <div className="w-40 sm:w-52 h-0.5 bg-gradient-to-r from-transparent via-[#FBB503] to-transparent my-3 opacity-80" />

        {/* Headline & Tagline Typography */}
        <div className="space-y-1.5 max-w-md mx-auto">
          <h2 className="text-sm sm:text-base font-extrabold tracking-wide text-[#010E62] dark:text-white font-display leading-snug">
            {tagline}
          </h2>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">
            Empowering SSC, HSC & Engineering Aspirants
          </p>
        </div>

        {/* Premium Dual Progress Indicator */}
        <div className="flex flex-col items-center w-full mt-7">
          <div className="relative w-64 sm:w-80 h-2.5 bg-[#010E62]/10 dark:bg-white/10 border border-[#010E62]/15 dark:border-white/20 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div className="h-full rounded-full bg-gradient-to-r from-[#010E62] via-[#FBB503] to-[#010E62] w-full animate-shimmer-gold" />
          </div>

          <div className="flex items-center justify-between w-64 sm:w-80 mt-2.5 px-1 text-[11px] font-bold tracking-wider text-[#010E62]/80 dark:text-[#FBB503]/90 uppercase font-mono">
            <span>{message || "Initializing Portal..."}</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBB503] animate-ping" />
              <span>100%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Shimmer Accent Line across Viewport Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#010E62]/10 dark:bg-white/10 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-r from-transparent via-[#FBB503] through-[#010E62] to-transparent animate-shimmer-gold" />
      </div>
    </div>
  );
}
