"use client";

import React from "react";
import InnerPageHero from "@/components/layout/InnerPageHero";

export default function MaterialsClient({ heroData, materialItems = [] }: { heroData?: any, materialItems?: any[] }) {
  const title = heroData?.title || "Study Materials & Resources";
  const subtitle = heroData?.description || "Access premium notes, formula sheets, and practice exams carefully crafted for your academic success.";
  const coverImage = heroData?.content?.coverImage;

  return (
    <div className="min-h-screen bg-bg-soft pt-24 pb-20 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <InnerPageHero
        title={title}
        description={subtitle}
        breadcrumbs={[{ label: "Academic", href: "#" }, { label: "Materials", href: "/materials" }]}
        imageSrc={coverImage}
      />

      <div className="brand-container relative z-10 mt-12">
        <div className="text-center py-20 bg-white rounded-3xl border border-border border-dashed">
          <p className="text-text font-bold text-lg">Materials section is coming soon.</p>
        </div>
      </div>
    </div>
  );
}
