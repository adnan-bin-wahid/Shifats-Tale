"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, X, Download } from "lucide-react";
import InnerPageHero from "@/components/layout/InnerPageHero";

export default function AcademicCalendarClient({ 
  heroData
}: { 
  heroData?: any;
}) {
  const [isZoomed, setIsZoomed] = useState(false);

  // Use CMS uploaded image or fallback to a full high-res academic schedule flyer
  const calendarImageSrc = heroData?.fileUrl || heroData?.mediaUrl || "/images/flyer_hsc26_hsc27.jpg";

  return (
    <div className="min-h-screen bg-[#FFF9F2] pt-24 pb-24 relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 opacity-10 pointer-events-none w-full h-[400px]">
        <svg viewBox="0 0 1000 400" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,200 C300,100 700,300 1000,200" fill="none" stroke="#010E62" strokeWidth="2"/>
          <path d="M0,220 C300,120 700,320 1000,220" fill="none" stroke="#010E62" strokeWidth="1"/>
        </svg>
      </div>

      <div className="brand-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        
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

        {/* Single Massive Calendar Image Body */}
        <div className="relative w-full bg-white rounded-3xl p-4 sm:p-8 shadow-[0_12px_40px_-10px_rgba(8,19,46,0.12)] border border-[#E7E0D2]">
          
          {/* Top Bar above the image for quick actions */}
          <div className="flex items-center justify-between pb-4 sm:pb-6 border-b border-gray-100 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-3.5 h-3.5 rounded-full bg-accent" />
              <h3 className="font-extrabold text-[#08132E] text-base sm:text-lg">
                Official Academic Routine & Schedule
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsZoomed(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-[#08132E] hover:text-white text-[#08132E] rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Full Screen View</span>
              </button>
              <a
                href={calendarImageSrc}
                download="Shifats-Tales-Academic-Calendar.jpg"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-amber-400 text-[#08132E] rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </a>
            </div>
          </div>

          {/* Large Interactive Image Container */}
          <div 
            onClick={() => setIsZoomed(true)}
            className="relative w-full overflow-hidden rounded-2xl bg-gray-50 border border-gray-200 cursor-zoom-in group flex items-center justify-center min-h-[600px] sm:min-h-[850px] transition-all"
          >
            <Image
              src={calendarImageSrc}
              alt="Full Academic Calendar"
              width={1600}
              height={2200}
              priority
              className="w-full h-auto object-contain rounded-xl group-hover:scale-[1.01] transition-transform duration-500"
            />
            
            {/* Hover overlay hint */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center pointer-events-none">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#08132E]/90 text-white font-bold px-6 py-3 rounded-full text-sm shadow-xl flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-accent" /> Click to enlarge full calendar
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Full-Screen Zoom Lightbox Modal */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-6"
          >
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-20"
            >
              <X className="w-6 h-6" />
            </button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl w-full max-h-[92vh] h-full flex flex-col items-center justify-center overflow-auto"
            >
              <Image
                src={calendarImageSrc}
                alt="Full Academic Calendar Zoomed"
                width={2000}
                height={2800}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
