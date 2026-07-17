"use client";

import React, { useEffect, useId } from "react";
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

  // Generate unique IDs for native DOM script targeting independent of React Suspense transitions
  const uniqueId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const barId = `sl-bar-${uniqueId}`;
  const botId = `sl-bot-${uniqueId}`;
  const pctId = `sl-pct-${uniqueId}`;

  useEffect(() => {
    return () => {
      // Clean up timer on component unmount
      if (typeof window !== "undefined" && (window as any)[`__sl_timer_${uniqueId}`]) {
        clearInterval((window as any)[`__sl_timer_${uniqueId}`]);
      }
    };
  }, [uniqueId]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${title}`}
      className={`site-loader-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#FFFCF2] dark:bg-[#08122B] transition-all duration-700 ease-out print:hidden print:!hidden print:!opacity-0 print:!pointer-events-none ${
        isDismissing ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print { .site-loader-overlay { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; } }
        @keyframes loader-gold-expand {
          0% { width: 4%; }
          30% { width: 45%; }
          70% { width: 85%; }
          100% { width: 98%; }
        }
        .animate-loader-gold-fill {
          animation: loader-gold-expand 2.2s cubic-bezier(0.1, 0.7, 0.1, 1) forwards;
        }
      ` }} />
      
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
      <div className="absolute w-[380px] h-[380px] sm:w-[540px] sm:h-[540px] pointer-events-none flex items-center justify-center opacity-30 dark:opacity-40">
        <div className="absolute inset-0 border border-dashed border-[#FBB503]/40 dark:border-[#FBB503]/50 rounded-full animate-atom-orbit-1" />
        <div className="absolute inset-8 border border-dotted border-[#010E62]/30 dark:border-cyan-400/40 rounded-full animate-atom-orbit-2" />
      </div>

      {/* Centerpiece: Larger Prominent Layout with Clean Minimalist Style */}
      <div className="relative z-20 flex flex-col items-center justify-center max-w-2xl w-[94%] px-6 text-center">
        
        {/* Clean, Larger Prominent Logo Showcase */}
        <div className="relative flex items-center justify-center w-80 sm:w-96 h-24 sm:h-32 mb-6">
          <img
            src="/images/alternate_logo_dark.png"
            alt={title}
            className="w-full h-full object-contain filter drop-shadow-md transition-transform duration-500 hover:scale-[1.02] dark:hidden"
          />
          <img
            src={logoUrl}
            alt={title}
            className="w-full h-full object-contain filter drop-shadow-md transition-transform duration-500 hover:scale-[1.02] hidden dark:block"
          />
        </div>

        {/* Prominent Professional Typography */}
        <div className="space-y-2 max-w-xl mx-auto">
          <h2 className="text-lg sm:text-2xl font-black tracking-wide text-[#010E62] dark:text-[#FFFCF2] font-display drop-shadow-md">
            {tagline}
          </h2>
          <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 tracking-widest uppercase font-mono">
            Empowering SSC, HSC & Engineering Aspirants
          </p>
        </div>

        {/* Prominent Stylish Gold Effect Progress Indicator (Clearly Visible Movement) */}
        <div className="w-80 sm:w-[28rem] md:w-[32rem] mt-10 flex flex-col items-center space-y-3">
          {/* Thicker casing with luxury golden border glow */}
          <div className="w-full h-3.5 sm:h-4 bg-[#010E62]/15 dark:bg-black/50 border border-[#FBB503]/40 dark:border-[#FBB503]/50 rounded-full overflow-hidden p-0.5 shadow-inner backdrop-blur-md relative">
            <div
              id={barId}
              className="h-full rounded-full transition-all duration-150 ease-out relative overflow-hidden shadow-[0_0_15px_rgba(251,181,3,0.85)] animate-loader-gold-fill"
              style={{
                width: "4%",
                background: "linear-gradient(90deg, #F99E00, #FBB503, #FFF3B3, #FBB503, #F99E00)",
                backgroundSize: "200% 100%"
              }}
            >
              {/* Shimmering white/gold light reflection moving across the filling bar */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent w-full animate-shimmer-gold" />
            </div>
          </div>

          {/* Larger, Crisp Progress Status & Golden Percentage */}
          <div className="w-full flex items-center justify-between px-1 text-xs sm:text-sm font-bold tracking-wider text-[#010E62] dark:text-white font-mono">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FBB503] animate-ping shadow-[0_0_8px_rgba(251,181,3,0.8)]" />
              <span className="font-semibold text-slate-800 dark:text-slate-100">{message || "Initializing Portal..."}</span>
            </span>
            <span
              id={pctId}
              className="font-black text-sm sm:text-base text-[#010E62] dark:text-[#FBB503] drop-shadow-[0_0_8px_rgba(251,181,3,0.5)]"
            >
              4%
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Subtle Shimmer Accent Line */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#010E62]/10 dark:bg-white/10 overflow-hidden">
        <div
          id={botId}
          className="h-full bg-gradient-to-r from-transparent via-[#FBB503] to-transparent transition-all duration-150 ease-out shadow-[0_0_10px_rgba(251,181,3,0.7)] animate-loader-gold-fill"
          style={{ width: "4%" }}
        />
      </div>

      {/* Native inline script that executes immediately upon DOM insertion during Suspense fallbacks */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
            var bar = document.getElementById("${barId}");
            var bot = document.getElementById("${botId}");
            var pct = document.getElementById("${pctId}");
            if(!bar || !pct) return;
            var current = 4;
            if (window["__sl_timer_${uniqueId}"]) clearInterval(window["__sl_timer_${uniqueId}"]);
            var timer = setInterval(function(){
              if(current < 65) current += Math.floor(Math.random() * 6) + 5;
              else if(current < 94) current += Math.floor(Math.random() * 3) + 2;
              else if(current < 99) current += 1;
              if(current >= 99) current = 99;
              if(bar) bar.style.width = current + "%";
              if(bot) bot.style.width = current + "%";
              if(pct) pct.textContent = current + "%";
            }, 45);
            window["__sl_timer_${uniqueId}"] = timer;
          })();`
        }}
      />
    </div>
  );
}
