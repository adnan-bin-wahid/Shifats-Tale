"use client";

import React from "react";
import { Clock, Users, UserCheck, GraduationCap, ShieldCheck } from "lucide-react";
import { TrustHighlightItem } from "@/data/contact";

interface TrustHighlightsStripProps {
  highlights: TrustHighlightItem[];
}

const renderTrustIcon = (iconName: string, className: string = "h-5 w-5") => {
  switch (iconName) {
    case "Clock":
      return <Clock className={className} />;
    case "Users":
      return <Users className={className} />;
    case "UserCheck":
      return <UserCheck className={className} />;
    case "GraduationCap":
      return <GraduationCap className={className} />;
    default:
      return <ShieldCheck className={className} />;
  }
};

export const TrustHighlightsStrip: React.FC<TrustHighlightsStripProps> = ({ highlights }) => {
  if (!highlights || highlights.length === 0) return null;

  return (
    <section className="py-4">
      <div className="brand-container">
        <div className="brand-card rounded-2xl p-4 sm:p-6 bg-white border border-[#E7E0D2] shadow-xs">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 lg:divide-x divide-[#E7E0D2]/80">
            {highlights.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center justify-center space-x-3 text-center sm:text-left ${
                  idx > 0 ? "pt-4 sm:pt-0 lg:pl-6" : ""
                }`}
              >
                <div className="p-2 rounded-xl bg-accent/15 text-primary shrink-0">
                  {renderTrustIcon(item.iconName, "h-5 w-5 text-primary")}
                </div>
                <span className="text-xs sm:text-sm font-extrabold text-primary truncate">
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
