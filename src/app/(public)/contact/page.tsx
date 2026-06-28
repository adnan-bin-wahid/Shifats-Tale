import React from "react";
import { Metadata } from "next";
import InnerPageHero from "@/components/layout/InnerPageHero";
import {
  contactHeroData,
  contactLocationData,
  contactFormConfig,
  guidanceCtaData,
  trustHighlightsData,
} from "@/data/contact";

import { ContactLocationSection } from "@/components/contact/ContactLocationSection";
import { ContactFormCard } from "@/components/contact/ContactFormCard";
import { AcademicGuidanceCta } from "@/components/contact/AcademicGuidanceCta";
import { TrustHighlightsStrip } from "@/components/contact/TrustHighlightsStrip";

export const metadata: Metadata = {
  title: "Contact Me | Office Location & Academic Inquiry | Shifat's Tales",
  description: "Reach out to Md. Zia Uddin Azad Sifat (Shifat Sir) for course enrollments, academic guidance, or office visits at Rangunia, Chattogram.",
};

export default function ContactPage() {
  return (
    <div className="pt-20 pb-16 bg-bg-soft text-text flex flex-col min-h-screen selection:bg-accent selection:text-primary">
      {/* 1. Shared Inner Page Contact Hero */}
      <InnerPageHero
        eyebrow={contactHeroData.eyebrow}
        title={
          <>
            {contactHeroData.title}
            <span className="text-accent">{contactHeroData.highlightedText}</span>
          </>
        }
        description={contactHeroData.description}
        breadcrumbs={contactHeroData.breadcrumbs}
        imageSrc={contactHeroData.imageSrc}
        imageAlt="Contact Me Hero Cover"
      />

      {/* 2 & 3. Location & Contact Form Section (Two-Column Layout) */}
      <section className="py-6">
        <div className="brand-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Column: My Location & Details */}
            <div className="lg:col-span-6">
              <ContactLocationSection location={contactLocationData} />
            </div>

            {/* Right Column: Send Me a Message Form */}
            <div className="lg:col-span-6">
              <ContactFormCard config={contactFormConfig} />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Academic Guidance CTA */}
      <AcademicGuidanceCta cta={guidanceCtaData} />

      {/* 5. Trust / Support Highlights */}
      <TrustHighlightsStrip highlights={trustHighlightsData} />
    </div>
  );
}
