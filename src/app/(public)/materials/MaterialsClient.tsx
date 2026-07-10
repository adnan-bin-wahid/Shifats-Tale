"use client";

import React from "react";
import InnerPageHero from "@/components/layout/InnerPageHero";

export default function MaterialsClient({ heroData, materialItems = [] }: { heroData?: any, materialItems?: any[] }) {
  const title = heroData?.title || "Study Materials & Resources";
  const subtitle = heroData?.description || "Access premium notes, formula sheets, and practice exams carefully crafted for your academic success.";
  const coverImage = heroData?.content?.coverImage;

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
        
        {/* Header */}
        <InnerPageHero
          eyebrow={heroData?.eyebrow || "STUDY MATERIALS"}
          title={
            <>
              <span className="block text-white">{heroData?.title || "Premium Study"}</span>
              <span className="block text-accent mt-1">{heroData?.subtitle || "Materials"}</span>
            </>
          }
          description={heroData?.description || "Access premium notes, formula sheets, and practice exams carefully crafted for your academic success."}
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Materials" }
          ]}
          imageSrc={heroData?.mediaUrl || "/images/flyer_admission_science.jpg"}
          imageAlt="Study Materials Cover"
        />

      <div className="brand-container relative z-10 mt-12">
        <div className="text-center py-20 bg-white rounded-3xl border border-[#E7E0D2] border-dashed shadow-sm">
          <p className="text-gray-500 font-bold text-lg">Materials section is coming soon.</p>
        </div>
      </div>
      </div>
    </div>
  );
}
