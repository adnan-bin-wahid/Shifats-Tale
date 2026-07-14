"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
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

export interface NewsEventItem {
  id: string;
  title: string;
  category: "EVENT" | "NOTICE" | "NEWS";
  date: string;
  month: string;
  time?: string;
  location?: string;
  excerpt: string;
  fullContent: string[];
  imageUrl?: string;
  isFeatured?: boolean;
}

const defaultCuratedItems: NewsEventItem[] = [
  {
    id: "evt-1",
    title: "HSC '26 & '27 Grand Orientation & Scholarship Model Test",
    category: "EVENT",
    date: "25",
    month: "AUG",
    time: "3:30 PM - 6:30 PM",
    location: "Shifat's Tales Campus, 3rd Floor, Rangunia, Chattogram",
    excerpt:
      "A mega orientation workshop for incoming science students featuring concept-building strategies, live physics demonstrations, and an exclusive scholarship exam.",
    fullContent: [
      "Join Shifat Sir for an inspiring 3-hour orientation session designed specifically for HSC 2026 and 2027 science aspirants.",
      "The event starts with a high-impact breakdown of the HSC Physics and Higher Mathematics curriculum, discussing common traps and how to score A+ effortlessly.",
      "Following the orientation, a 45-minute Scholarship Model Test will be held. Top 10 scorers will receive up to 50% merit scholarships on their tuition fees!",
      "All attendees will receive Shifat Sir's exclusive Formula Booklet free of cost. Seats are limited to 80 students due to venue capacity.",
    ],
    imageUrl: "/images/flyer_hsc26_hsc27.jpg",
    isFeatured: true,
  },
  {
    id: "not-1",
    title: "SSC 2026 Batch Final Revision & Model Test Routine Published",
    category: "NOTICE",
    date: "18",
    month: "AUG",
    time: "4:00 PM Daily",
    location: "Both Campus & Online Portal",
    excerpt:
      "The complete schedule for our intensive 12-week chapter-wise revision and OMR-based model tests is now officially released.",
    fullContent: [
      "Attention all SSC 2026 science batch candidates: the full chapter-wise revision schedule along with the Model Test syllabus is now active.",
      "Exams will take place every Friday and Tuesday afternoon. Each test will consist of 25 MCQ questions and 3 Creative Questions (CQ) strictly evaluated following board criteria.",
      "Solved copies and highest marks distribution will be published inside the Student Portal within 24 hours of each exam.",
      "Students can download the PDF routine directly from the Materials section or collect a hard copy from the coaching reception counter.",
    ],
    imageUrl: "/images/flyer_revision_2026.jpg",
  },
  {
    id: "nws-1",
    title: "Congratulations to Shifat's Tales Top Ranking Engineering Aspirants",
    category: "NEWS",
    date: "10",
    month: "AUG",
    time: "Announcement",
    location: "Shifat's Tales Hall of Fame",
    excerpt:
      "Celebrating our brilliant students who secured top positions in university admission tests, continuing our legacy of academic excellence.",
    fullContent: [
      "We are thrilled to announce that over 35 students from our senior batches have successfully secured merit positions across top public universities and engineering institutions.",
      "Special congratulations to our students who placed within the Top 500 in engineering admission merit lists through consistent hard work and problem-solving discipline.",
      "Shifat Sir will host an exclusive Merit Award Ceremony & Dinner next month to felicitate all achievers and present them with honorary plaques.",
    ],
    imageUrl: "/images/gallery-solve.png",
  },
  {
    id: "evt-2",
    title: "Weekly Physics Concept Marathon & Interactive Problem Solving",
    category: "EVENT",
    date: "29",
    month: "AUG",
    time: "9:00 AM - 12:00 PM",
    location: "Room 302, Shifat's Tales Main Campus",
    excerpt:
      "An intensive 3-hour deep dive into Electricity & Magnetism problems with live step-by-step whiteboard derivations.",
    fullContent: [
      "Struggling with complex circuit diagrams or magnetic field vectors? This weekly concept marathon is open for all enrolled HSC 2nd Year students.",
      "Shifat Sir will walk through 25 advanced admission-level mathematical problems step-by-step without skipping intermediate calculations.",
      "Students are requested to bring their scientific calculators and graph notebooks. Tea and light refreshments will be served during the short break.",
    ],
    imageUrl: "/images/gallery-classroom.png",
  },
  {
    id: "not-2",
    title: "Friday Special Math Admission Care Workshop Registration Open",
    category: "NOTICE",
    date: "05",
    month: "SEP",
    time: "5:00 PM - 7:00 PM",
    location: "Shifat's Tales Campus, Rangunia",
    excerpt:
      "Registration is now open for our specialized calculus and coordinate geometry shortcut technique workshop.",
    fullContent: [
      "To help students master time-saving shortcut techniques for university admission tests, we are organizing a special Friday evening workshop.",
      "Topics covered: Integration shortcuts, tangent & normal equation hacks, and vector cross-product visualization.",
      "Prior registration is required as seats are limited to 60 participants. Please confirm your seat at the office counter by Thursday evening.",
    ],
    imageUrl: "/images/flyer_model_test_2025.png",
  },
  {
    id: "nws-2",
    title: "New Batch Enrollment Open for Class 11 Physics & Higher Math",
    category: "NEWS",
    date: "12",
    month: "SEP",
    time: "All Day",
    location: "Admission Office & Online Portal",
    excerpt:
      "Admissions are officially underway for our foundational Class 11 batches with small group sizes and personalized mentoring.",
    fullContent: [
      "Shifat's Tales announces new enrollment slots for Class 11 students wishing to build a solid academic foundation right from the beginning of their college journey.",
      "Why join our Class 11 Batches? Small batch capacity, daily lecture sheets, weekly evaluation exams, and 1-on-1 problem-solving hours directly with Shifat Sir.",
      "To maintain high quality standards, we do not admit students once the batch capacity is filled. Visit our campus during afternoon office hours for batch counseling.",
    ],
    imageUrl: "/images/gallery-notes.png",
  },
];

export default function NewsEventsClient({
  heroData,
  newsEventItems = [],
}: {
  heroData?: any;
  newsEventItems?: any[];
}) {
  const [activeTab, setActiveTab] = useState<"ALL" | "EVENT" | "NOTICE" | "NEWS">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<NewsEventItem | null>(null);

  // Combine CMS items with curated items (CMS items take precedence or join)
  const allItems: NewsEventItem[] = useMemo(() => {
    const cmsFormatted: NewsEventItem[] = (newsEventItems || []).map((item: any) => ({
      id: item.id || `cms-${Math.random()}`,
      title: item.title || "Untitled Announcement",
      category: item.category || "NOTICE",
      date: item.date || "01",
      month: item.month || "JAN",
      time: item.time || "Office Hours",
      location: item.location || "Shifat's Tales Campus",
      excerpt: item.excerpt || item.description || "Click to read full details.",
      fullContent: Array.isArray(item.fullContent)
        ? item.fullContent
        : typeof item.fullContent === "string"
        ? item.fullContent.split("\n\n")
        : [item.excerpt || item.description || ""],
      imageUrl: item.imageUrl || item.mediaUrl || "/images/gallery-event.png",
      isFeatured: item.isFeatured || false,
    }));

    return [...cmsFormatted, ...defaultCuratedItems];
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

                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#010E62] dark:text-white font-display tracking-tight leading-tight group-hover:text-accent transition-colors">
                  {featuredItem.title}
                </h2>

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
                  <button
                    onClick={() => setSelectedItem(featuredItem)}
                    className="primary-btn flex items-center gap-2 px-6 py-3 rounded-xl shadow-md font-bold text-sm"
                  >
                    <span>Read Full Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
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

                  <h3 className="text-lg font-bold text-[#010E62] dark:text-white font-display tracking-tight leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {item.excerpt}
                  </p>
                </div>

                {/* Card Footer Button */}
                <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#010E62] dark:text-accent hover:underline group/btn"
                  >
                    <span>Read Details</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                  </button>

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

      {/* Interactive Modal for Full Article / Notice Reading */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-border rounded-3xl max-w-2xl w-full max-h-[88vh] overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Modal Header Image */}
              <div className="relative h-56 sm:h-64 w-full bg-slate-900 shrink-0">
                <Image
                  src={selectedItem.imageUrl || "/images/gallery-event.png"}
                  alt={selectedItem.title}
                  fill
                  className="object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                <button
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="absolute bottom-4 left-6 right-6 z-10 space-y-2">
                  <div className="flex items-center gap-2">
                    {getCategoryBadge(selectedItem.category)}
                    <span className="text-xs font-bold text-accent bg-black/60 px-2.5 py-1 rounded-full">
                      {selectedItem.date} {selectedItem.month}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight leading-snug">
                    {selectedItem.title}
                  </h2>
                </div>
              </div>

              {/* Modal Body Content */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-left">
                {/* Meta Bar */}
                <div className="flex flex-wrap items-center gap-4 py-3 px-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 border border-border/40">
                  {selectedItem.time && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#010E62] dark:text-accent" />
                      <span>{selectedItem.time}</span>
                    </div>
                  )}
                  {selectedItem.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#010E62] dark:text-accent" />
                      <span>{selectedItem.location}</span>
                    </div>
                  )}
                </div>

                {/* Paragraphs */}
                <div className="space-y-4 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {selectedItem.fullContent.map((paragraph, idx) => (
                    <p key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                      <span>{paragraph}</span>
                    </p>
                  ))}
                </div>

                {/* Call to action card */}
                <div className="bg-[#010E62] text-white rounded-2xl p-5 sm:p-6 shadow-md border border-accent/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-left">
                    <h4 className="text-base font-bold text-accent">Need more information or registration assistance?</h4>
                    <p className="text-xs text-slate-300">
                      Visit Shifat's Tales campus counter during daily office hours (4:00 PM - 9:00 PM) or call directly.
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="primary-btn px-6 py-2.5 rounded-xl text-xs font-bold shrink-0"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
