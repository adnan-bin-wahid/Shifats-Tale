"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import dynamic from "next/dynamic";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-transparent" />,
});

import HeroSection from "@/components/home/HeroSection";
import TrustStats from "@/components/home/TrustStats";
import CoursesSection from "@/components/home/CoursesSection";
import WhyChooseSection from "@/components/home/WhyChooseSection";
import TeacherSection from "@/components/home/TeacherSection";
import TopOfTheMonthSection from "@/components/home/TopOfTheMonthSection";
import ResultsSection from "@/components/home/ResultsSection";
import YouTubeClassesSection from "@/components/home/YouTubeClassesSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import GallerySection from "@/components/home/GallerySection";
import HomeNewsEventsSection from "@/components/home/HomeNewsEventsSection";
import { useSiteSettings } from "@/lib/providers/SiteSettingsProvider";

export default function HomeClient({ 
  heroData,
  statsData,
  whyChooseData,
  teacherData,
  topStudentsData,
  youtubeData,
  galleryData,
  displayAlbums,
  displayCourses, 
  headerData,
  displayStudents,
  successHeaderData,
  testimonialsData,
  testimonialsHeaderData,
  newsEventsData,
  newsItems
}: { 
  heroData?: any,
  displayCourses?: any[], 
  headerData?: any,
  displayStudents?: any[],
  successHeaderData?: any,
  statsData?: any,
  whyChooseData?: any,
  teacherData?: any,
  topStudentsData?: any,
  youtubeData?: any,
  galleryData?: any,
  displayAlbums?: any[],
  testimonialsData?: any[],
  testimonialsHeaderData?: any,
  newsEventsData?: any,
  newsItems?: any[]
}) {
  const siteInfo = useSiteSettings();
  const heroContent = heroData?.content || {};
  const teacherName = heroContent.teacherName || siteInfo.teacherName || "Md. Zia Uddin Azad Sifat";
  const teacherTitle = heroContent.teacherTitle || "Instructor & CEO";
  const teacherSubtitle = heroContent.teacherSubtitle || "EEE, CUET";
  const teacherImage = heroContent.teacherImage || "/images/sir_photo_clean.png";

  const [flyingState, setFlyingState] = useState<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    endX: number;
    endY: number;
    endWidth: number;
    endHeight: number;
  } | null>(null);

  const handleTeacherPhotoClick = () => {
    const heroEl = document.getElementById("hero-teacher-block");
    const teacherEl = document.getElementById("teacher-instructor-block");
    const teacherSection = document.getElementById("teacher");

    if (heroEl && teacherEl && teacherSection) {
      const heroRect = heroEl.getBoundingClientRect();
      const teacherRect = teacherEl.getBoundingClientRect();

      // Get absolute coordinates relative to the document
      const startX = heroRect.left + window.scrollX;
      const startY = heroRect.top + window.scrollY;
      const startWidth = heroRect.width;
      const startHeight = heroRect.height;

      const endX = teacherRect.left + window.scrollX;
      const endY = teacherRect.top + window.scrollY;
      const endWidth = teacherRect.width;
      const endHeight = teacherRect.height;

      setFlyingState({
        startX,
        startY,
        startWidth,
        startHeight,
        endX,
        endY,
        endWidth,
        endHeight
      });

      // Synchronized smooth scroll to the teacher section
      const offsetTop = teacherSection.offsetTop - 80;
      const startScroll = window.scrollY;

      // Temporarily disable CSS-based smooth scroll to avoid conflicts with JS animation loop
      const originalScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      const duration = 1200;
      const startTime = performance.now();

      const scrollStep = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        window.scrollTo(0, startScroll + (offsetTop - startScroll) * easeProgress);

        if (progress < 1) {
          requestAnimationFrame(scrollStep);
        } else {
          document.documentElement.style.scrollBehavior = originalScrollBehavior;
        }
      };

      requestAnimationFrame(scrollStep);
    }
  };

  const isFlying = flyingState !== null;

  return (
    <div className="overflow-x-hidden">
      <HeroSection heroData={heroData} isTeacherFlying={isFlying} onImageClick={handleTeacherPhotoClick} />
      <TrustStats statsData={statsData} />
      <CoursesSection headerData={headerData} courseItems={displayCourses} />
      <WhyChooseSection whyChooseData={whyChooseData} />
      <TeacherSection isTeacherFlying={isFlying} teacherData={teacherData} />
      <TopOfTheMonthSection topStudentsData={topStudentsData} />
      <ResultsSection studentItems={displayStudents} headerData={successHeaderData} />
      <YouTubeClassesSection youtubeData={youtubeData} />
      <TestimonialsSection initialTestimonials={testimonialsData} headerData={testimonialsHeaderData} />

      {/* Dynamic News & Events Section on Home Page */}
      <HomeNewsEventsSection headerData={newsEventsData} newsItems={newsItems} />

      {/* Dynamic Captured Moments Section */}
      <GallerySection headerData={galleryData} albums={displayAlbums} />

      {/* Flying 3D Teacher Portrait Animation Overlay */}
      <AnimatePresence>
        {flyingState && (
          <motion.div
            initial={{
              left: flyingState.startX,
              top: flyingState.startY,
              width: flyingState.startWidth,
              height: flyingState.startHeight,
              opacity: 1,
              rotateY: 0,
              rotateX: 0,
              rotateZ: 0,
              scale: 1,
            }}
            animate={{
              left: flyingState.endX,
              top: flyingState.endY,
              width: flyingState.endWidth,
              height: flyingState.endHeight,
              opacity: [1, 1, 1, 0.9, 1], // Subtle flash of light
              rotateY: [0, 45, -25, 0], // Gorgeous 3D rotations during flight
              rotateX: [0, 15, -10, 0],
              rotateZ: [0, -12, 6, 0],
              scale: [1, 1.03, 0.99, 1], // Subtle scaling for the entire block
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.2, // Perfect matched duration for flight and scroll
              ease: [0.25, 1, 0.5, 1], // Smooth custom cubic bezier easing
            }}
            onAnimationComplete={() => {
              setFlyingState(null);
            }}
            style={{
              position: "absolute",
              pointerEvents: "none",
              zIndex: 9999,
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
            }}
          >
            <div className="w-full h-full flex flex-col items-center justify-center relative bg-transparent" style={{ perspective: 1000 }}>
              {/* 3D Scene Layer rendering during flight */}
              <div className="absolute inset-0 z-0 w-full h-full pointer-events-none">
                <HeroScene />
              </div>

              {/* Centered Teacher Portrait container */}
              <div className="relative w-full max-w-[280px] sm:max-w-[340px] aspect-[1/1.2] flex items-end justify-center z-10 select-none">
                {/* Radial shadows & glows */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[85%] h-[20%] bg-primary-dark/25 rounded-full blur-xl z-0 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 bg-accent/6 rounded-full blur-[80px] z-0 pointer-events-none" />

                {/* Premium gold glow trail following the flight */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{
                    opacity: [0, 0.6, 0.6, 0],
                    scale: [0.5, 1.25, 1.1, 0.5],
                  }}
                  transition={{
                    duration: 1.2,
                    ease: [0.25, 1, 0.5, 1],
                  }}
                  className="absolute inset-0 bg-accent/20 rounded-full blur-3xl -z-10"
                />

                {/* Gradient fade overlay (uses landing bg to dissolve cropped bottom edge) */}
                <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-[#FFF8E6] via-[#FFF8E6]/85 to-transparent z-10 pointer-events-none" />

                <img
                  src={teacherImage}
                  alt={teacherName}
                  className="w-full h-full object-contain object-bottom filter drop-shadow-[0_16px_32px_rgba(1,14,98,0.22)] z-10"
                />
              </div>

              {/* Compact Designation Tag */}
              <div className="mt-6 z-20 text-center w-full max-w-[280px] sm:max-w-[340px] bg-white border border-border p-3.5 rounded-xl shadow-sm">
                <span className="block text-accent font-extrabold text-[10px] sm:text-xs uppercase tracking-widest">
                  {teacherTitle}
                </span>
                <h4 className="font-extrabold text-base sm:text-lg text-primary mt-1">
                  {teacherName}
                </h4>
                <span className="block text-xs text-muted font-bold mt-0.5">
                  {teacherSubtitle}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
