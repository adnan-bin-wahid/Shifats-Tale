"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, Phone, BookOpen } from "lucide-react";
import { GuidanceCtaData } from "@/data/contact";

interface AcademicGuidanceCtaProps {
  cta: GuidanceCtaData;
}

export const AcademicGuidanceCta: React.FC<AcademicGuidanceCtaProps> = ({ cta }) => {
  if (!cta) return null;

  return (
    <section className="py-6">
      <div className="brand-container">
        <div className="relative rounded-3xl bg-gradient-to-r from-[#FFF8E6] via-white to-[#FFF5DC] p-6 sm:p-8 lg:p-10 border border-[#E7E0D2] shadow-md overflow-hidden text-left">
          {/* Subtle Background Pattern & Building Overlay */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
            {/* Left Graphic Academic Stack Illustration */}
            <div className="lg:col-span-4 flex items-center justify-center lg:justify-start">
              <div className="relative flex items-center justify-center p-6 rounded-3xl bg-white border border-[#E7E0D2] shadow-sm">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-accent/15 flex items-center justify-center text-primary">
                  <GraduationCap className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>
              </div>
            </div>

            {/* Middle Content & Action Buttons */}
            <div className="lg:col-span-8 space-y-4 flex flex-col justify-center">
              <div className="space-y-1">
                <span className="text-xs font-extrabold uppercase tracking-widest text-accent block">
                  {cta.eyebrow}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight font-display">
                  {cta.title}
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-text/85 leading-relaxed font-medium max-w-xl">
                {cta.description}
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-3 items-center">
                <a
                  href={cta.primaryButtonHref}
                  className="primary-btn px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-md hover:shadow-accent/25 flex items-center space-x-2 transition-all"
                >
                  <Phone className="h-4 w-4" />
                  <span>{cta.primaryButtonText}</span>
                </a>

                <Link
                  href={cta.secondaryButtonHref}
                  className="px-5 py-2.5 rounded-xl border-2 border-primary/20 hover:border-primary text-primary text-xs sm:text-sm font-extrabold hover:bg-primary/5 flex items-center space-x-2 transition-all"
                >
                  <span>{cta.secondaryButtonText}</span>
                  <BookOpen className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
