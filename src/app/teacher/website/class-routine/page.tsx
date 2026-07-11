import React from "react";
import { Globe, ArrowRight, Calendar, ImageIcon } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Manage Class Routine - Website Admin",
  description: "Manage the hero banner and full schedule flyer for the Class Routine page.",
};

export default function ClassRoutineCMSPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-extrabold text-primary font-display tracking-tight">
          Class Routine Content
        </h1>
        <p className="text-sm text-muted font-medium mt-1">
          Customize the hero section banner and upload the official class routine/schedule image displayed on the Class Routine page.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Hero Section */}
        <div className="bg-white border border-border/60 rounded-3xl p-6 shadow-sm flex flex-col h-full group hover:shadow-md hover:border-accent/50 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-bg flex items-center justify-center text-primary group-hover:bg-accent group-hover:text-white transition-colors">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-primary text-lg">Hero Section</h3>
              <p className="text-xs text-accent font-semibold">Common Header Banner</p>
            </div>
          </div>
          <p className="text-sm text-muted mb-6 flex-grow leading-relaxed">
            Edit the main title, subtitle, eyebrow text, description, and cover image of the Class Routine top header section.
          </p>
          <Link 
            href="/teacher/website/class-routine/hero"
            className="mt-auto inline-flex items-center gap-2 px-5 py-2.5 bg-[#08132E] text-white hover:bg-[#08132E]/90 rounded-xl text-xs font-bold transition-colors w-fit shadow-sm"
          >
            Manage Hero Section <ArrowRight className="w-3.5 h-3.5 text-accent" />
          </Link>
        </div>

        {/* Card 2: Routine Image (Card Section) */}
        <div className="bg-white border border-border/60 rounded-3xl p-6 shadow-sm flex flex-col h-full group hover:shadow-md hover:border-accent/50 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-bg flex items-center justify-center text-primary group-hover:bg-accent group-hover:text-white transition-colors">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-primary text-lg">Routine Image (Card)</h3>
              <p className="text-xs text-accent font-semibold">Full Routine Flyer</p>
            </div>
          </div>
          <p className="text-sm text-muted mb-6 flex-grow leading-relaxed">
            Upload or select the massive high-resolution class routine/schedule image. This image will be displayed full-view on the page.
          </p>
          <Link 
            href="/teacher/website/class-routine/card"
            className="mt-auto inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-[#08132E] hover:bg-amber-400 rounded-xl text-xs font-extrabold transition-colors w-fit shadow-sm"
          >
            Manage Routine Image <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
