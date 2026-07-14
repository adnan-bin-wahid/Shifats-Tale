"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  Bell,
  Sparkles,
  Trophy,
  Filter,
  Search,
  X,
  Share2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import InnerPageHero from "@/components/layout/InnerPageHero";

import {
  NewsEventItem,
  defaultCuratedItems,
  formatAllNewsEventItems,
} from "./news-events-data";

export type { NewsEventItem };
export { defaultCuratedItems, formatAllNewsEventItems };

export default function NewsEventsClient({
  heroData,
  newsEventItems = [],
}: {
  heroData?: any;
  newsEventItems?: any[];
}) {
  const [activeTab, setActiveTab] = useState<"ALL" | "EVENT" | "NOTICE" | "NEWS">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const allItems: NewsEventItem[] = useMemo(() => {
    return formatAllNewsEventItems(newsEventItems);
  }, [newsEventItems]);

  // Filter items based on activeTab and searchQuery
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesTab = activeTab === "ALL" || item.category === activeTab;
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesTab && matchesSearch;
    });
  }, [allItems, activeTab, searchQuery]);

  const featuredItem = allItems.find((item) => item.isFeatured) || allItems[0];

  const getCategoryBadge = (category: "EVENT" | "NOTICE" | "NEWS") => {
    switch (category) {
      case "EVENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-teal-600/15 text-teal-700 dark:text-teal-400 border border-teal-500/30">
            <Calendar className="w-3.5 h-3.5" />
            <span>Event</span>
          </span>
        );
      case "NOTICE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
            <Bell className="w-3.5 h-3.5" />
            <span>Notice</span>
          </span>
        );
      case "NEWS":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-[#010E62]/15 text-[#010E62] dark:bg-blue-400/15 dark:text-blue-400 border border-[#010E62]/30 dark:border-blue-400/30">
            <Trophy className="w-3.5 h-3.5" />
            <span>News & Success</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8E6] dark:bg-[#08122B] pt-24 pb-24 relative overflow-hidden transition-colors duration-300">
      {/* Subtle Background Geometric Grid */}
      <div className="absolute top-0 right-0 opacity-[0.07] pointer-events-none w-full h-[500px]">
        <svg viewBox="0 0 1000 400" preserveAspectRatio="none" className="w-full h-full">
          <path d="M0,200 C300,100 700,300 1000,200" fill="none" stroke="#010E62" strokeWidth="3" />
          <path d="M0,230 C300,130 700,330 1000,230" fill="none" stroke="#FBB503" strokeWidth="2" />
        </svg>
      </div>

      <div className="brand-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14 relative z-10">
        
        {/* Exact Same Hero Banner as other public pages */}
        <InnerPageHero
          eyebrow={heroData?.eyebrow || "NEWS & EVENTS"}
          title={
            <>
              <span className="block text-white">{heroData?.title || "Latest News &"}</span>
              <span className="block text-accent mt-1">{heroData?.subtitle || "Upcoming Events"}</span>
            </>
          }
          description={
            heroData?.description ||
            "Stay informed with upcoming admission workshops, scholarship model tests, revision schedules, and student success celebrations at Shifat's Tales."
          }
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "News & Events" }]}
          imageSrc={heroData?.mediaUrl || "/images/gallery-event.png"}
        />

        {/* Spotlight Featured Banner Card */}
        {featuredItem && (
          <div className="relative bg-white dark:bg-slate-900 border-2 border-accent/40 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              
              {/* Left Image Thumbnail */}
              <div className="lg:col-span-5 relative h-64 sm:h-72 rounded-2xl overflow-hidden shadow-md border border-border/40">
                <Image
                  src={featuredItem.imageUrl || "/images/flyer_hsc26_hsc27.jpg"}
                  alt={featuredItem.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-4 left-4 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase bg-accent text-[#010E62] shadow-md">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Featured Spotlight</span>
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 z-10 bg-[#010E62]/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl border border-white/20 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold">
                    {featuredItem.date} {featuredItem.month}
                  </span>
                </div>
              </div>

              {/* Right Content */}
              <div className="lg:col-span-7 space-y-4 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  {getCategoryBadge(featuredItem.category)}
                  {featuredItem.time && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-[#010E62] dark:text-accent" />
                      <span>{featuredItem.time}</span>
                    </span>
                  )}
                </div>

                <Link href={`/news-events/${featuredItem.id}`} className="block">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#010E62] dark:text-white font-display tracking-tight leading-tight group-hover:text-accent transition-colors">
                    {featuredItem.title}
                  </h2>
                </Link>

                <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  {featuredItem.excerpt}
                </p>

                {featuredItem.location && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 pt-1">
                    <MapPin className="w-4 h-4 text-[#010E62] dark:text-accent shrink-0" />
                    <span>{featuredItem.location}</span>
                  </div>
                )}

                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/news-events/${featuredItem.id}`}
                    className="primary-btn flex items-center gap-2 px-6 py-3 rounded-xl shadow-md font-bold text-sm"
                  >
                    <span>Read Full Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <span className="text-xs font-semibold text-slate-400 italic">
                    • Prior registration recommended at campus counter
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter & Search Toolbar */}
        <div className="bg-white dark:bg-slate-900 border border-border/60 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full md:w-auto">
            {[
              { id: "ALL", label: "All Updates", icon: Filter },
              { id: "EVENT", label: "Upcoming Events", icon: Calendar },
              { id: "NOTICE", label: "Academic Notices", icon: Bell },
              { id: "NEWS", label: "Top News & Success", icon: Trophy },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    isActive
                      ? "bg-[#010E62] text-white shadow-md scale-[1.02]"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${isActive ? "text-accent" : "text-slate-500"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news, notices, events..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-border/60 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent text-slate-800 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Grid of Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-slate-900 border border-border/60 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col group"
            >
              {/* Card Image Banner */}
              <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                <Image
                  src={item.imageUrl || "/images/gallery-event.png"}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                {/* Date Badge */}
                <div className="absolute top-3 left-3 bg-white/95 dark:bg-[#010E62]/95 backdrop-blur-md rounded-2xl px-3 py-1.5 shadow-md border border-border/40 text-center min-w-[54px]">
                  <span className="block text-sm font-black text-[#010E62] dark:text-accent leading-none">
                    {item.date}
                  </span>
                  <span className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-tighter mt-0.5">
                    {item.month}
                  </span>
                </div>

                {/* Category Pill Top Right */}
                <div className="absolute top-3 right-3">{getCategoryBadge(item.category)}</div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex flex-col flex-1 justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                    {item.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-accent" />
                        <span>{item.time}</span>
                      </span>
                    )}
                    {item.location && (
                      <span className="flex items-center gap-1 truncate max-w-[170px]">
                        <MapPin className="w-3.5 h-3.5 text-[#010E62] dark:text-accent shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </span>
                    )}
                  </div>

                  <Link href={`/news-events/${item.id}`} className="block">
                    <h3 className="text-lg font-bold text-[#010E62] dark:text-white font-display tracking-tight leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                      {item.title}
                    </h3>
                  </Link>

                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {item.excerpt}
                  </p>
                </div>

                {/* Card Footer Button */}
                <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                  <Link
                    href={`/news-events/${item.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#010E62] dark:text-accent hover:underline group/btn"
                  >
                    <span>Read Details</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                  </Link>

                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Shifat's Tales
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-border rounded-3xl p-12 text-center max-w-xl mx-auto space-y-3">
            <Search className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-lg font-bold text-[#010E62] dark:text-white">No items found</h3>
            <p className="text-sm text-slate-500">
              We couldn't find any news or events matching "{searchQuery}". Try selecting "All Updates" or checking back soon.
            </p>
            <button
              onClick={() => {
                setActiveTab("ALL");
                setSearchQuery("");
              }}
              className="primary-btn px-6 py-2.5 rounded-xl text-xs font-bold mt-2"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
