"use client";

import React from "react";
import InnerPageHero from "@/components/layout/InnerPageHero";

export default function ReviewsClient({ heroData }: { heroData?: any }) {
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
          eyebrow={heroData?.eyebrow || "TESTIMONIALS"}
          title={
            <>
              <span className="block text-white">{heroData?.title || "What People Say"}</span>
              <span className="block text-accent mt-1">{heroData?.subtitle || "About Us"}</span>
            </>
          }
          description={heroData?.description || "Read honest feedback and inspiring reviews from our students and parents."}
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "All Reviews" },
          ]}
          imageSrc={heroData?.mediaUrl || "/images/flyer_admission_science.jpg"}
          imageAlt="Reviews Cover"
        />

        {/* Placeholder for reviews content */}
        <div className="text-center py-20">
          <p className="text-gray-500 font-medium">Reviews content will be placed here.</p>
        </div>

      </div>
    </div>
  );
}
