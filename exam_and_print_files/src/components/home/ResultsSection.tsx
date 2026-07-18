"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { GraduationCap, School, ChevronLeft, ChevronRight, Star, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

// Category filter type removed

const getCardMotion = (offset: number, isMobile: boolean) => {
  const abs = Math.abs(offset);

  if (isMobile) {
    if (offset === 0) {
      return {
        x: 0,
        z: 0,
        rotateY: 0,
        scale: 1.05,
        opacity: 1,
        blur: 0,
        zIndex: 50,
        pointerEvents: "auto" as const,
      };
    }
    if (offset === -1) {
      return {
        x: -190,
        z: -20,
        rotateY: 25,
        scale: 0.82,
        opacity: 0.55,
        blur: 1,
        zIndex: 30,
        pointerEvents: "auto" as const,
      };
    }
    if (offset === 1) {
      return {
        x: 190,
        z: -20,
        rotateY: -25,
        scale: 0.82,
        opacity: 0.55,
        blur: 1,
        zIndex: 30,
        pointerEvents: "auto" as const,
      };
    }
    return {
      x: offset > 0 ? 300 : -300,
      z: -50,
      rotateY: offset > 0 ? -45 : 45,
      scale: 0.6,
      opacity: 0,
      blur: 6,
      zIndex: 0,
      pointerEvents: "none" as const,
    };
  }

  const visible = abs <= 2;

  if (!visible) {
    return {
      x: offset > 0 ? 620 : -620,
      z: -120,
      rotateY: offset > 0 ? -70 : 70,
      scale: 0.58,
      opacity: 0,
      blur: 8,
      zIndex: 0,
      pointerEvents: "none" as const,
    };
  }

  if (offset === 0) {
    return {
      x: 0,
      z: 0,
      rotateY: 0,
      scale: 1.15,
      opacity: 1,
      blur: 0,
      zIndex: 50,
      pointerEvents: "auto" as const,
    };
  }

  if (offset === -1) {
    return {
      x: -300,
      z: -20,
      rotateY: 42,
      scale: 0.86,
      opacity: 0.72,
      blur: 1.5,
      zIndex: 30,
      pointerEvents: "auto" as const,
    };
  }

  if (offset === 1) {
    return {
      x: 300,
      z: -20,
      rotateY: -42,
      scale: 0.86,
      opacity: 0.72,
      blur: 1.5,
      zIndex: 30,
      pointerEvents: "auto" as const,
    };
  }

  if (offset === -2) {
    return {
      x: -500,
      z: -60,
      rotateY: 62,
      scale: 0.68,
      opacity: 0.28,
      blur: 4,
      zIndex: 10,
      pointerEvents: "none" as const,
    };
  }

  return {
    x: 500,
    z: -60,
    rotateY: -62,
    scale: 0.68,
    opacity: 0.28,
    blur: 4,
    zIndex: 10,
    pointerEvents: "none" as const,
  };
};

const StudentSuccessCard = ({ result, isActive }: { result: any; isActive: boolean }) => {
  return (
    <div className={`w-full h-full rounded-3xl p-6 flex flex-col justify-between bg-[#FFFDF9] border border-[#E7E0D2] transition-all duration-500 shadow-lg relative group/card select-none text-center ${
      isActive 
        ? "hover:shadow-[0_20px_45px_rgba(251,181,3,0.25)] hover:border-accent/80 hover:bg-[#FFFDF9]" 
        : "opacity-60 border-transparent bg-white/50"
    }`}>
      {/* Background card corner ambient glow */}
      {isActive && (
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#FBB503]/10 rounded-full blur-2xl pointer-events-none group-hover/card:bg-[#FBB503]/20 transition-all duration-700" />
      )}
      
      {/* Decorative dot pattern */}
      <svg className="absolute bottom-4 left-4 text-accent/5 w-16 h-12 pointer-events-none" fill="currentColor">
        <pattern id={`card-dots-${result.id}`} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" />
        </pattern>
        <rect width="100%" height="100%" fill={`url(#card-dots-${result.id})`} />
      </svg>

      <div className="space-y-5 relative z-10 flex flex-col items-center w-full">
        {/* Category Badge & Class Year */}
        <div className="flex items-center justify-between w-full min-h-[24px]">
          {result.examType ? (
            <span className="text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md bg-[#010E62]/5 text-[#010E62] border border-[#010E62]/10 group-hover/card:bg-primary group-hover/card:text-white group-hover/card:border-primary transition-all duration-300">
              {result.examType}
            </span>
          ) : <span />}
          {result.year ? (
            <span className="text-[10px] font-bold text-muted bg-[#FFF9EA] px-2 py-0.5 rounded border border-[#E7E0D2]">
              Class of {result.year}
            </span>
          ) : <span />}
        </div>

        {/* Student Photo - Boldly Highlighted with glowing borders & shadow */}
        <div className="relative pt-4 pb-3">
          {/* Animated pulsing outer halo glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-accent via-[#010E62] to-accent rounded-2xl blur-md opacity-45 group-hover/card:opacity-85 transition-opacity duration-300 -m-1.5 animate-pulse" />
          
          {/* Outer Border Frame */}
          <div className="relative w-[130px] h-[180px] sm:w-[160px] sm:h-[220px] rounded-2xl p-1 bg-gradient-to-tr from-accent via-[#010E62] to-accent shadow-xl group-hover/card:scale-105 transition-transform duration-300 mx-auto">
            {/* Inner Image Container */}
              <div className="w-full h-full rounded-[14px] overflow-hidden border-[3px] border-white bg-[#F8F7F2] flex items-center justify-center">
                {result.image && result.image !== "/placeholder.jpg" ? (
                  <img
                    src={result.image}
                    alt={result.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-[#010E62] opacity-30">
                    <GraduationCap className="w-12 h-12" />
                  </div>
                )}
              </div>
            
            {/* Achievement Badge Overlay */}
            <div className="absolute -bottom-3 -right-3 bg-accent text-primary p-2.5 rounded-full border-[3px] border-white shadow-md group-hover/card:scale-110 transition-transform duration-300 z-10">
              <Star className="h-5 w-5 fill-primary text-primary stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Student Info */}
        <div className="text-center w-full space-y-1.5">
          <h4 className="font-extrabold text-primary text-xl sm:text-2xl leading-tight truncate group-hover/card:text-primary-dark transition-colors">
            {result.name}
          </h4>
          <p className="text-xs sm:text-sm text-[#4B5563] flex items-center justify-center space-x-1.5 font-bold">
            <School className="h-4 w-4 text-accent shrink-0" />
            <span className="truncate">{result.college}</span>
          </p>
        </div>
      </div>

      {/* Achieved Result highlight box at bottom */}
      <div className="bg-[#FFFDF9] border border-[#E7E0D2] p-4 rounded-2xl flex items-center space-x-3.5 relative z-10 transition-all duration-300 group-hover/card:border-accent/60 group-hover/card:bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.01)] mt-5 w-full text-left">
        {/* Glowing cap icon container */}
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 group-hover/card:scale-110 group-hover/card:bg-accent/20 transition-all duration-300">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-0.5">SECURED RESULT</p>
          <p className="text-sm font-extrabold text-[#08132E] truncate">
            {result.achievement || "-"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function ResultsSection({ studentItems = [], headerData }: { studentItems?: any[], headerData?: any }) {
  const mappedResults = studentItems.map(item => {
    const meta = item.metadata || {};
    return {
      id: item.id,
      name: item.title,
      studentName: item.title,
      college: item.subtitle,
      image: item.mediaUrl || meta.fallbackImageUrl || "/placeholder.jpg",
      achievement: meta.achievement || "",
      course: meta.course || "",
      examType: meta.examType || "",
      year: meta.year || "",
      note: meta.note || ""
    };
  });

  const studentResults = mappedResults;

  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Detect screen size on mount and resize (hydration-safe)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Autoplay functionality: shifts index every 4.2 seconds (slower, cinematic pace)
  useEffect(() => {
    if (isHovered || studentResults.length <= 1) return;
    const interval = setInterval(() => {
      handleNext();
    }, 4200);
    return () => clearInterval(interval);
  }, [activeIndex, isHovered]);

  const handleNext = () => {
    setActiveIndex((prev) => (studentResults.length === 0 ? 0 : (prev + 1) % studentResults.length));
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (studentResults.length === 0 ? 0 : (prev - 1 + studentResults.length) % studentResults.length));
  };

  const getCircularOffset = (index: number, active: number, total: number) => {
    if (total === 0) return 0;
    let offset = (index - active + total) % total;
    if (offset > total / 2) {
      offset -= total;
    }
    return offset;
  };

  const headerVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const }
    }
  };

  return (
    <section id="results" className="brand-section-wrapper bg-[#FFF9EA] relative overflow-hidden">
      {/* Dotted abstract grid background */}
      <svg className="absolute inset-0 text-[#010E62]/4 w-full h-full pointer-events-none z-0" fill="currentColor">
        <pattern id="results-dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#results-dot-grid)" />
      </svg>

      {/* Radial soft golden glow behind center carousel */}
      <div className="absolute inset-0 m-auto w-96 h-96 bg-[#FBB503]/8 rounded-full blur-[130px] pointer-events-none z-0" />

      <div className="brand-container relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-xs font-bold text-accent tracking-widest uppercase mb-3"
          >
            {headerData?.eyebrow || "STUDENT SUCCESS STORIES"}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight mb-4"
          >
            {headerData?.title || "Celebrating Excellence"}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-text max-w-xl mx-auto text-sm sm:text-base font-medium"
          >
            {headerData?.description || "Here are some of the remarkable success stories from our past batches."}
          </motion.p>
        </div>

        {/* Filters Panel removed (showing all results at once) */}
        <div className="mb-6" />

        {/* 3D Coverflow Carousel Container */}
        {studentResults.length > 0 ? (
          <div className="flex flex-col items-center select-none">
            
            {/* Carousel Track with drag swipe capability */}
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(e, info) => {
                const threshold = 80;
                if (info.offset.x < -threshold) {
                  handleNext();
                } else if (info.offset.x > threshold) {
                  handlePrev();
                }
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onFocus={() => setIsHovered(true)}
              onBlur={() => setIsHovered(false)}
              className="relative w-full h-[580px] sm:h-[650px] flex items-center justify-center overflow-visible cursor-grab active:cursor-grabbing"
              style={{ perspective: "1400px", transformStyle: "preserve-3d" }}
            >
              {/* Soft radial glow behind the active card */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[450px] h-[300px] sm:h-[450px] bg-[#FBB503]/8 rounded-full blur-[80px] sm:blur-[110px] pointer-events-none z-0" />

              {/* Faint curved dotted arc representing the circular track */}
              <svg 
                className="absolute top-1/2 left-1/2 w-full max-w-5xl h-40 -translate-x-1/2 -translate-y-1/2 text-accent/15 pointer-events-none z-0 hidden sm:block" 
                viewBox="0 0 1000 200" 
                fill="none"
              >
                <path 
                  d="M 50,150 Q 500,40 950,150" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  strokeDasharray="6,10" 
                  strokeLinecap="round"
                />
              </svg>

              {studentResults.map((result, idx) => {
                const offset = getCircularOffset(idx, activeIndex, studentResults.length);
                const cardMotion = getCardMotion(offset, isMobile);

                return (
                  <motion.div
                    key={result.id}
                    className="absolute left-1/2 top-1/2 w-[280px] sm:w-[360px] h-[520px] sm:h-[580px]"
                    style={{
                      zIndex: cardMotion.zIndex,
                      transformStyle: offset === 0 ? "flat" : "preserve-3d",
                      pointerEvents: cardMotion.pointerEvents,
                      backfaceVisibility: offset === 0 ? "visible" : "hidden",
                      transformOrigin: "center center"
                    }}
                    transformTemplate={({ x, z, rotateY, scale }) =>
                      `translate(-50%, -50%) translate3d(${x}, 0px, ${z}) rotateY(${rotateY}) scale(${scale})`
                    }
                    animate={{
                      x: cardMotion.x,
                      z: cardMotion.z,
                      rotateY: cardMotion.rotateY,
                      scale: cardMotion.scale,
                      opacity: cardMotion.opacity,
                      filter: cardMotion.blur > 0 ? `blur(${cardMotion.blur}px)` : "none",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 90,
                      damping: 22,
                      mass: 0.9,
                    }}
                    onClick={() => {
                      if (offset !== 0) {
                        setActiveIndex(idx);
                      }
                    }}
                  >
                    <StudentSuccessCard result={result} isActive={offset === 0} />
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Navigation Controls Center Panel */}
            <div className="flex flex-col items-center gap-6 mt-6 w-full max-w-xs relative z-20">
              
              {/* Previous / Next Arrow buttons */}
              <div className="flex items-center space-x-6">
                <button
                  onClick={handlePrev}
                  aria-label="Previous Student Success Story"
                  className="w-10 h-10 rounded-full bg-white border border-[#E7E0D2] text-primary flex items-center justify-center transition-all hover:bg-primary hover:text-white cursor-pointer active:scale-90 hover:scale-105 shadow-sm"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {/* Dots indicator array */}
                <div className="flex items-center space-x-2">
                  {studentResults.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveIndex(idx)}
                      aria-label={`Select student result story ${idx + 1}`}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        activeIndex === idx 
                          ? "bg-accent w-6" 
                          : "bg-[#E7E0D2] w-2 hover:bg-primary/30"
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  aria-label="Next Student Success Story"
                  className="w-10 h-10 rounded-full bg-white border border-[#E7E0D2] text-primary flex items-center justify-center transition-all hover:bg-primary hover:text-white cursor-pointer active:scale-90 hover:scale-105 shadow-sm"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Swipe Drag Help CTA */}
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest block select-none">
                Drag cards or click dots to slide
              </span>
            </div>

            {/* View All Results Button */}
            <div className="mt-16 text-center w-full flex justify-center z-20 relative">
              <Link
                href="/results"
                className="inline-flex items-center justify-center space-x-2 px-8 py-3.5 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1"
              >
                <span>View All Success Stories</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

          </div>
        ) : (
          <div className="text-center p-12 bg-white border border-border rounded-2xl max-w-md mx-auto shadow-sm">
            <GraduationCap className="h-10 w-10 text-muted mx-auto mb-4" />
            <h4 className="font-extrabold text-primary text-base">No achievements found</h4>
            <p className="text-xs text-text mt-2">Try choosing another category tab to view achievements.</p>
          </div>
        )}

      </div>
    </section>
  );
}
