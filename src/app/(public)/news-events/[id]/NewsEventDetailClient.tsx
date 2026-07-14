"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Clock,
  Share2,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  PhoneCall,
  MessageCircle,
  FileText,
  BookmarkCheck,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import InnerPageHero from "@/components/layout/InnerPageHero";
import { NewsEventItem } from "../news-events-data";

export default function NewsEventDetailClient({
  item,
  relatedItems,
}: {
  item: NewsEventItem;
  relatedItems: NewsEventItem[];
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Article link copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleShareWhatsApp = () => {
    if (typeof window !== "undefined") {
      const text = encodeURIComponent(`Check out this update from Shifat's Tales: ${item.title} \n${window.location.href}`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    }
  };

  const handleShareFacebook = () => {
    if (typeof window !== "undefined") {
      const url = encodeURIComponent(window.location.href);
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "EVENT":
        return "bg-blue-600 text-white border-blue-500/30";
      case "NOTICE":
        return "bg-amber-500 text-slate-900 font-extrabold border-amber-400/30";
      case "NEWS":
        return "bg-emerald-600 text-white border-emerald-500/30";
      default:
        return "bg-accent text-[#010E62] font-black";
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F2] pt-24 pb-20 relative overflow-hidden">
      {/* Subtle Background Graphic */}
      <div className="absolute top-0 right-0 opacity-10 pointer-events-none w-full h-[400px]">
        <svg viewBox="0 0 1000 400" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,200 C300,100 700,300 1000,200" fill="none" stroke="#FBB503" strokeWidth="2" />
          <path d="M0,220 C300,120 700,320 1000,220" fill="none" stroke="#FBB503" strokeWidth="1" />
        </svg>
      </div>

      {/* Theme-Matched Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <InnerPageHero
          title={item.title}
          eyebrow={item.category || "EXCLUSIVES & UPDATES"}
          description={item.excerpt}
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "News & Events", href: "/news-events" },
            { label: item.category || "Detail View" },
          ]}
          imageSrc={item.imageUrl || "/images/gallery-event.png"}
        />
      </div>

      {/* Main Single Page Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-10 relative z-20">
        {/* Back Navigation Button */}
        <div className="mb-8">
          <Link
            href="/news-events"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-[#E8DDBF]/80 shadow-xs text-sm font-bold text-[#010E62] hover:text-accent hover:border-accent transition-all group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to All News & Events</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT MAIN ARTICLE COLUMN (8 Cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Main Cover Image Banner (Visual Showcase Only) */}
            <div className="bg-white border border-[#E8DDBF]/80 rounded-3xl overflow-hidden shadow-md">
              <div className="relative h-72 sm:h-80 md:h-96 w-full bg-[#08132E]">
                <Image
                  src={item.imageUrl || "/images/gallery-event.png"}
                  alt={item.title}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08132E]/70 via-transparent to-transparent" />

                {/* Top Overlay Badges */}
                <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
                  <span
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs tracking-wider uppercase shadow-lg border ${getCategoryColor(
                      item.category
                    )}`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{item.category || "UPDATE"}</span>
                  </span>

                  <div className="bg-[#08132E]/80 backdrop-blur-md border border-white/20 text-white px-4 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg">
                    <Calendar className="w-4 h-4 text-accent" />
                    <span>
                      {item.date} {item.month}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Meta Bar & Action Toasters */}
              <div className="p-6 sm:p-8 bg-[#FFF9F2]/60 border-t border-[#E8DDBF]/60 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm font-semibold text-[#4A5568]">
                  {item.time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#010E62] shrink-0" />
                      <span>{item.time}</span>
                    </div>
                  )}
                  {item.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#010E62] shrink-0" />
                      <span>{item.location}</span>
                    </div>
                  )}
                </div>

                {/* Share Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#4A5568] mr-1 hidden sm:inline">Share:</span>
                  <button
                    onClick={handleCopyLink}
                    className="p-2.5 rounded-xl bg-white border border-[#E8DDBF] hover:border-accent text-[#4A5568] hover:text-[#010E62] transition-colors shadow-xs"
                    title="Copy Link"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleShareWhatsApp}
                    className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                    title="Share on WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleShareFacebook}
                    className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
                    title="Share on Facebook"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Editorial Article Content Box */}
            <div className="bg-white border border-[#E8DDBF]/80 rounded-3xl p-6 sm:p-10 lg:p-12 shadow-md space-y-8">
              {/* Highlighted Excerpt Lead */}
              <div className="p-6 rounded-2xl bg-[#FFF9F2] border-l-4 border-accent space-y-2 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-black text-[#010E62] uppercase tracking-wider">
                  <BookmarkCheck className="w-4 h-4 text-accent" />
                  <span>Executive Summary / Overview</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-[#010E62] leading-relaxed">
                  {item.excerpt}
                </p>
              </div>

              {/* Full Detailed Paragraphs */}
              <div className="space-y-6 text-[#4A5568] font-medium text-base sm:text-lg leading-relaxed">
                {item.fullContent.map((paragraph, idx) => (
                  <p key={idx} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-accent mt-2.5 shrink-0" />
                    <span>{paragraph}</span>
                  </p>
                ))}
              </div>

              {/* Key Takeaways Box */}
              <div className="border border-[#E8DDBF]/80 rounded-2xl p-6 bg-[#FFF9F2]/60 space-y-4">
                <h3 className="text-base sm:text-lg font-bold text-[#010E62] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                  <span>Important Instructions for Students & Parents</span>
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm text-[#4A5568] font-semibold">
                  <li className="flex items-center gap-2 bg-white p-3 rounded-xl border border-[#E8DDBF]/60 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#010E62] shrink-0" />
                    <span>Bring valid coaching Student ID or Registration Slip</span>
                  </li>
                  <li className="flex items-center gap-2 bg-white p-3 rounded-xl border border-[#E8DDBF]/60 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#010E62] shrink-0" />
                    <span>Arrive at least 15 minutes prior to scheduled start</span>
                  </li>
                  <li className="flex items-center gap-2 bg-white p-3 rounded-xl border border-[#E8DDBF]/60 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#010E62] shrink-0" />
                    <span>Solved sheets & marks published in Student Portal</span>
                  </li>
                  <li className="flex items-center gap-2 bg-white p-3 rounded-xl border border-[#E8DDBF]/60 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#010E62] shrink-0" />
                    <span>For urgent queries, contact reception counter</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Call to Action Banner */}
            <div className="bg-gradient-to-br from-[#010E62] to-[#0a1b70] text-white rounded-3xl p-8 sm:p-10 shadow-xl border border-accent/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-accent/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center md:text-left">
                  <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-black uppercase tracking-wider">
                    Registration & Admission Desk
                  </span>
                  <h3 className="text-2xl font-black font-display text-white">
                    Want to enroll or confirm your participation?
                  </h3>
                  <p className="text-sm text-slate-300 max-w-xl">
                    Our academic advisors are available every day from 4:00 PM to 9:00 PM at the main coaching counter to assist you with enrollment and model test details.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
                  <Link
                    href="/portal/login"
                    className="primary-btn px-6 py-3.5 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2"
                  >
                    <span>Student Portal Login</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/routine"
                    className="secondary-btn px-6 py-3.5 rounded-xl text-sm font-bold bg-white/10 text-white hover:bg-white/20 border-white/20"
                  >
                    Check Class Routine
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR (4 Cols) */}
          <div className="lg:col-span-4 space-y-8 sticky top-28">
            {/* Brief Information Widget */}
            <div className="bg-white border border-[#E8DDBF]/80 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
              <h3 className="text-lg font-black text-[#010E62] border-b border-[#E8DDBF]/60 pb-3 flex items-center justify-between">
                <span>Quick Information</span>
                <Sparkles className="w-4 h-4 text-accent" />
              </h3>

              <div className="space-y-4 text-sm font-semibold">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FFF9F2] border border-[#E8DDBF]/50">
                  <Calendar className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-[#4A5568] block uppercase font-bold">Event Date</span>
                    <span className="text-[#010E62] font-bold">
                      {item.date} {item.month}, 2026
                    </span>
                  </div>
                </div>

                {item.time && (
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FFF9F2] border border-[#E8DDBF]/50">
                    <Clock className="w-5 h-5 text-[#010E62] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-[#4A5568] block uppercase font-bold">Time / Schedule</span>
                      <span className="text-[#010E62] font-bold">{item.time}</span>
                    </div>
                  </div>
                )}

                {item.location && (
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#FFF9F2] border border-[#E8DDBF]/50">
                    <MapPin className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-[#4A5568] block uppercase font-bold">Venue / Location</span>
                      <span className="text-[#010E62] font-bold leading-snug">{item.location}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-emerald-700 font-black uppercase block">Status</span>
                    <span className="text-emerald-900 font-bold">Official Verified Announcement</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/materials"
                  className="w-full primary-btn flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm shadow-md"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download Study Materials</span>
                </Link>
              </div>
            </div>

            {/* Explore More News & Events Widget */}
            {relatedItems.length > 0 && (
              <div className="bg-white border border-[#E8DDBF]/80 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
                <h3 className="text-lg font-black text-[#010E62] border-b border-[#E8DDBF]/60 pb-3 flex items-center justify-between">
                  <span>Explore More Updates</span>
                  <Link href="/news-events" className="text-xs font-bold text-accent hover:underline">
                    View All →
                  </Link>
                </h3>

                <div className="space-y-4">
                  {relatedItems.map((related) => (
                    <Link
                      key={related.id}
                      href={`/news-events/${related.id}`}
                      className="group flex items-center gap-3 p-3 rounded-2xl hover:bg-[#FFF9F2] transition-all border border-transparent hover:border-[#E8DDBF]/60"
                    >
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                        <Image
                          src={related.imageUrl || "/images/gallery-event.png"}
                          alt={related.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#FFF9F2] border border-[#E8DDBF]/60 text-[#010E62]">
                          {related.category || "NOTICE"}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-[#010E62] group-hover:text-accent transition-colors line-clamp-2 leading-tight">
                          {related.title}
                        </h4>
                        <span className="text-[11px] font-semibold text-[#4A5568] block">
                          {related.date} {related.month}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Support Card */}
            <div className="bg-[#FFF9F2] border border-[#E8DDBF]/80 rounded-3xl p-6 sm:p-8 space-y-4 text-left shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center text-[#010E62] font-black shadow-sm">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h4 className="text-base font-black text-[#010E62]">Need urgent academic guidance?</h4>
              <p className="text-xs text-[#4A5568] leading-relaxed font-medium">
                Our front desk is open every day during batch hours. Come meet Shifat Sir directly or ask your doubts at the counter.
              </p>
              <div className="pt-2 text-xs font-bold text-[#010E62]">
                Timing: 4:00 PM - 9:00 PM (Saturday to Friday)
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
