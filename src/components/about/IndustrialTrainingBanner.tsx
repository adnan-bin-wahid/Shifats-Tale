"use client";

import React, { useState } from "react";
import { Award, ExternalLink, ShieldCheck, X, FileText } from "lucide-react";
import { TrainingItem } from "@/data/about";

interface IndustrialTrainingBannerProps {
  training: TrainingItem;
}

export const IndustrialTrainingBanner: React.FC<IndustrialTrainingBannerProps> = ({ training }) => {
  const [showModal, setShowModal] = useState(false);

  if (!training) return null;

  return (
    <section className="py-10">
      <div className="brand-container">
        <div className="relative rounded-3xl bg-gradient-to-r from-[#010E62] via-[#08132E] to-[#000940] p-8 sm:p-10 lg:p-12 text-white shadow-2xl overflow-hidden border border-white/10 text-left">
          {/* Ambient Background Glows & Patterns */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-primary/30 rounded-full blur-[120px] pointer-events-none" />

          {/* Glowing Golden Bottom Border Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent/80 to-transparent shadow-[0_-2px_10px_rgba(251,181,3,0.6)]" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Left Content Area */}
            <div className="lg:col-span-8 space-y-5">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-accent/20 text-accent border border-accent/30 shrink-0">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-accent block">
                    INDUSTRIAL TRAINING
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold !text-white tracking-tight font-display mt-0.5" style={{ color: '#ffffff' }}>
                    {training.title}
                  </h3>
                </div>
              </div>

              <p className="text-sm sm:text-base font-bold text-white/90">
                {training.organization}
              </p>

              <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-2xl font-medium">
                {training.description}
              </p>

              {/* View Certificate Button */}
              <div className="pt-2">
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-accent text-primary font-extrabold text-xs sm:text-sm shadow-md hover:bg-accent/90 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <span>View Certificate</span>
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Right Graphic Certificate Mockup Display */}
            <div className="lg:col-span-4 flex items-center justify-center lg:justify-end">
              <div
                onClick={() => setShowModal(true)}
                className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-[1.4/1] rounded-2xl bg-white p-4 text-primary shadow-2xl border-2 border-accent/50 transform lg:rotate-3 hover:rotate-0 transition-transform duration-500 cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between border-b border-[#E7E0D2] pb-2">
                  <div className="flex items-center space-x-1.5">
                    <ShieldCheck className="h-4 w-4 text-accent" />
                    <span className="text-[10px] font-extrabold text-primary uppercase">Official Certificate</span>
                  </div>
                  <span className="text-[9px] font-bold text-muted">BTCL</span>
                </div>

                <div className="text-center py-2 space-y-1">
                  <h4 className="text-xs font-extrabold text-primary">CERTIFICATE OF COMPLETION</h4>
                  <p className="text-[9px] text-muted font-semibold">10 Days Industrial Training</p>
                  <p className="text-[8px] text-accent font-extrabold">Bangladesh Telecommunication Company Limited</p>
                </div>

                <div className="flex justify-between items-end border-t border-[#E7E0D2] pt-2">
                  <div className="w-8 h-8 rounded-full border border-accent/40 flex items-center justify-center">
                    <Award className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-[9px] font-bold text-primary group-hover:underline flex items-center space-x-1">
                    <span>Click to verify</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Modal Lightbox */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative bg-white rounded-3xl border border-[#E7E0D2] shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E7E0D2] pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-accent/20 text-primary">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent block">
                    Verified Training Document
                  </span>
                  <h4 className="text-lg font-extrabold text-primary font-display mt-0.5">
                    Industrial Training Certificate
                  </h4>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-bg-soft text-primary transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-bg-soft/60 border border-[#E7E0D2] space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-accent/20 text-primary mx-auto flex items-center justify-center border-2 border-accent">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h5 className="font-extrabold text-base sm:text-lg text-primary">
                  {training.title}
                </h5>
                <p className="text-xs sm:text-sm font-bold text-muted mt-1">
                  {training.organization} ({training.duration})
                </p>
              </div>
              <p className="text-xs text-text/80 max-w-md mx-auto leading-relaxed">
                {training.description}
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="primary-btn px-5 py-2 text-xs"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
