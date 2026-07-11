"use client";

import React from "react";
import InnerPageHero from "@/components/layout/InnerPageHero";

export default function AcademicCalendarClient({ 
  heroData
}: { 
  heroData?: any;
}) {
  return (
    <div className="min-h-screen bg-[#FFF9F2] pt-24 pb-20 relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 opacity-10 pointer-events-none w-full h-[400px]">
        <svg viewBox="0 0 1000 400" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,200 C300,100 700,300 1000,200" fill="none" stroke="#010E62" strokeWidth="2"/>
          <path d="M0,220 C300,120 700,320 1000,220" fill="none" stroke="#010E62" strokeWidth="1"/>
        </svg>
      </div>

      <div className="brand-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
        {/* Header Hero Section */}
        <InnerPageHero
          eyebrow={heroData?.eyebrow || "SCHEDULE & TIMELINE"}
          title={
            <>
              <span className="block text-white">{heroData?.title || "Academic Calendar"}</span>
              <span className="block text-accent mt-1">{heroData?.subtitle || "Session 2026 - 2027"}</span>
            </>
          }
          description={heroData?.description || "Stay ahead with Shifat Sir's complete academic roadmap, exam schedules, class routines, and batch milestones."}
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Academic" },
            { label: "Academic Calendar" }
          ]}
          imageSrc={heroData?.mediaUrl || "/images/gallery-classroom.png"}
          imageAlt="Academic Calendar Cover"
        />

        {/* Body left completely blank for now */}
        <div className="min-h-[40vh]"></div>
      </div>
    </div>
  );
}
