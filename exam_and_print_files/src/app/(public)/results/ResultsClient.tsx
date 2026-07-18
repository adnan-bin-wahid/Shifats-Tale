"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, GraduationCap, Building2, Stethoscope, BookOpen, Shield, Trophy, CheckCircle2 } from "lucide-react";
import { useSiteSettings } from "@/lib/providers/SiteSettingsProvider";
import InnerPageHero from "@/components/layout/InnerPageHero";

export default function ResultsClient({ heroData, studentItems = [] }: { heroData?: any, studentItems?: any[] }) {
  const siteInfo = useSiteSettings();
  const whatsappNumber = siteInfo.whatsapp;
  const [filter, setFilter] = useState("all");

  const categories = [
    { id: "all", label: "All Alumni", icon: Star },
    { id: "Engineering", label: "Engineering", icon: Building2 },
    { id: "University", label: "University", icon: GraduationCap },
    { id: "Medical", label: "Medical", icon: Stethoscope },
    { id: "Board", label: "Board Exams", icon: BookOpen }
  ];

  const filteredResults = studentItems.filter((result) => {
    if (filter === "all") return true;
    return result.metadata?.examType === filter;
  });

  return (
    <div className="min-h-screen bg-[#FFF9F2] pt-24 pb-20 relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 opacity-10 pointer-events-none w-full h-[400px]">
        <svg viewBox="0 0 1000 400" preserveAspectRatio="none" className="w-full h-full">
           <path d="M0,200 C300,100 700,300 1000,200" fill="none" stroke="#FBB503" strokeWidth="2"/>
           <path d="M0,220 C300,120 700,320 1000,220" fill="none" stroke="#FBB503" strokeWidth="1"/>
        </svg>
      </div>

      <div className="brand-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
        
        {/* Header */}
        <InnerPageHero 
          eyebrow={heroData?.eyebrow || "HALL OF FAME"}
          title={
            <>
              <span className="block text-white">{heroData?.title || "Our Success Stories"}</span>
              <span className="block text-accent mt-1">{heroData?.subtitle || "& Alumni"}</span>
            </>
          }
          description={heroData?.description || "Explore the brilliant minds who have achieved top ranks in board exams and university admissions."}
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Results" },
          ]}
          imageSrc={heroData?.mediaUrl || "/images/flyer_admission_science.jpg"}
          imageAlt="Success Stories Cover"
        />

        <div>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 pb-12">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${
                  filter === cat.id 
                    ? "bg-primary text-white" 
                    : "bg-white text-primary border border-[#E7E0D2] hover:bg-white/80 hover:shadow-md"
                }`}
              >
                {filter === cat.id ? (
                  <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                ) : (
                  <Icon className="w-4 h-4 opacity-70 shrink-0" />
                )}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Results Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
          <AnimatePresence mode="popLayout">
            {filteredResults.map((result) => {
              const meta = result.metadata || {};
              const name = result.title;
              const college = result.subtitle;
              const achievement = meta.achievement || "N/A";
              const examType = meta.examType || "N/A";
              const year = meta.year || "";
              const image = result.mediaUrl || meta.fallbackImageUrl || "/placeholder.jpg";
              
              return (
              <motion.div
                layout
                key={result.id}
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.3 }}
                className="w-full min-h-[220px] h-full rounded-[24px] bg-[#FFFBF3] border-[1.5px] border-[#F0D597] shadow-[0_8px_24px_rgba(200,180,140,0.15)] relative flex group/card hover:shadow-[0_12px_30px_rgba(200,180,140,0.25)] hover:-translate-y-1 transition-all overflow-hidden"
              >
                {/* Top-Left Category Badge */}
                <div className="absolute top-0 left-0 bg-[#010E62] text-white text-[9px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-br-xl z-20 shadow-sm">
                  {examType}
                </div>
                
                {/* Top-Right Year Badge */}
                <div className="absolute top-3 right-4 bg-[#FFFBF3] border border-[#E7E0D2] text-text text-[10px] font-bold px-3 py-1 rounded-full z-20 shadow-sm">
                  Class of {year}
                </div>

                {/* Left: Image Container */}
                <div className="absolute top-11 left-4 sm:left-5 z-20">
                  <div className="relative w-[110px] h-[145px] sm:w-[125px] sm:h-[155px] rounded-[18px] border-[2px] border-accent bg-white shadow-md p-1">
                    <img 
                      src={image} 
                      alt={name} 
                      className="w-full h-full object-cover rounded-[14px]" 
                    />
                    {/* Star Badge Overlap */}
                    <div className="absolute -bottom-3 -right-3 bg-gradient-to-br from-[#FFD756] to-[#FBB503] p-1.5 rounded-full border-[3px] border-[#FFFBF3] shadow-md z-30 w-10 h-10 flex items-center justify-center">
                      <Star className="h-5 w-5 fill-white text-white stroke-[0.5]" />
                    </div>
                  </div>
                </div>

                {/* Right: Info & Bottom Block */}
                <div className="ml-[135px] sm:ml-[155px] flex-1 flex flex-col justify-between pt-10 pb-0 pr-0 h-full relative z-10">
                  <div className="px-2 pr-4 mt-2">
                    <h4 className="font-extrabold text-[#010E62] text-xl sm:text-[22px] leading-tight truncate w-full">
                      {name}
                    </h4>
                    <div className="flex items-start text-[12.5px] sm:text-[13.5px] font-semibold text-text mt-2 gap-2">
                      <Building2 className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-snug">{college}</span>
                    </div>
                  </div>

                  {/* Bottom Navy Block */}
                  <div className="bg-[#010E62] w-full rounded-tl-[24px] p-3 sm:p-4 min-h-[72px] sm:min-h-[80px] flex items-center shadow-inner relative overflow-hidden mt-2">
                    {/* Soft gradient in navy block */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#FBB503]/5 pointer-events-none" />
                    
                    <div className="flex items-start space-x-3 w-full relative z-10 pl-1">
                      <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Shield className="h-4 w-4 text-accent" />
                      </div>
                      <div className="overflow-hidden flex-1 pr-2 pb-1">
                        <span className="text-[8px] font-black text-white/60 tracking-[0.2em] uppercase block mb-1">
                          Secured Result
                        </span>
                        <p className="text-[12px] sm:text-[13px] font-bold text-white leading-snug w-full pr-1">
                          {achievement}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )})}
          </AnimatePresence>
        </motion.div>

        {/* Features Footer Section */}
        <div className="max-w-5xl mx-auto mt-20 mb-8 border border-[#E7E0D2] bg-[#FFFBF3] rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-[#E7E0D2]">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 md:px-4">
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center shrink-0 text-primary">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <h5 className="font-extrabold text-[#010E62] text-sm sm:text-base">Proven Track Record</h5>
                <p className="text-xs sm:text-sm text-text font-medium mt-1">Consistent results across top institutions.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 md:px-6 pt-6 md:pt-0">
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center shrink-0 text-primary">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h5 className="font-extrabold text-[#010E62] text-sm sm:text-base">Guided to Excellence</h5>
                <p className="text-xs sm:text-sm text-text font-medium mt-1">Structured guidance, personalized mentoring.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 md:px-6 pt-6 md:pt-0">
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center shrink-0 text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h5 className="font-extrabold text-[#010E62] text-sm sm:text-base">Futures, Secured</h5>
                <p className="text-xs sm:text-sm text-text font-medium mt-1">From classrooms to careers—success continues.</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}


