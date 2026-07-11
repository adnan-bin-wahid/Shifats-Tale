"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Clock, MapPin, Download, CheckCircle2, Sparkles, Filter, BookOpen, AlertCircle, ArrowRight, Eye, X } from "lucide-react";
import InnerPageHero from "@/components/layout/InnerPageHero";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  month: string;
  day: string;
  time: string;
  batch: string;
  category: "Exam" | "Class" | "Orientation" | "Holiday" | "Mega Test";
  description: string;
  syllabus?: string;
  isImportant?: boolean;
}

const DEFAULT_EVENTS: CalendarEvent[] = [
  {
    id: "evt-1",
    title: "HSC-27 Grand Orientation & Foundation Workshop",
    date: "2026-07-15",
    month: "JUL",
    day: "15",
    time: "3:30 PM - 5:30 PM",
    batch: "HSC-27 Academic",
    category: "Orientation",
    description: "Welcome ceremony, complete academic guideline distribution, and introductory physics lecture on Vector & Measurement.",
    isImportant: true
  },
  {
    id: "evt-2",
    title: "Physics Paper 1: Vector & Thermodynamics Mega Test",
    date: "2026-07-28",
    month: "JUL",
    day: "28",
    time: "4:00 PM - 5:30 PM",
    batch: "HSC-26 Academic",
    category: "Mega Test",
    description: "High-standard board pattern exam consisting of 25 MCQs and 3 CQ questions. Offline examination at central campus.",
    syllabus: "Vector (Full) + Thermodynamics (Sutras & Entropy)",
    isImportant: true
  },
  {
    id: "evt-3",
    title: "SSC-27 Chapter-wise Exam: Motion & Work-Power-Energy",
    date: "2026-08-10",
    month: "AUG",
    day: "10",
    time: "2:30 PM - 4:00 PM",
    batch: "SSC Academic",
    category: "Exam",
    description: "Regular evaluation test to ensure solid problem-solving foundations for SSC candidates.",
    syllabus: "Physics Chapters 2 & 4 (Complete Numericals)"
  },
  {
    id: "evt-4",
    title: "BUET & Medical Standard Question Solve Mega Marathon",
    date: "2026-08-22",
    month: "AUG",
    day: "22",
    time: "10:00 AM - 1:00 PM",
    batch: "Admission Care",
    category: "Class",
    description: "Intensive problem-solving workshop tackling previous 10 years of BUET and Medical entrance questions.",
    isImportant: true
  },
  {
    id: "evt-5",
    title: "Mid-Term Break & Islamic Self-Reflection Camp",
    date: "2026-09-01",
    month: "SEP",
    day: "01",
    time: "All Day",
    batch: "All Batches",
    category: "Holiday",
    description: "3-day academic break combined with spiritual development and self-study consolidation."
  },
  {
    id: "evt-6",
    title: "HSC-26 Paper 2: Electrostatics & Current Electricity Exam",
    date: "2026-09-18",
    month: "SEP",
    day: "18",
    time: "4:00 PM - 5:30 PM",
    batch: "HSC-26 Academic",
    category: "Mega Test",
    description: "Comprehensive written & MCQ test evaluating circuit analysis and electrostatic field mastery.",
    syllabus: "Paper 2: Chapters 2 & 3",
    isImportant: true
  },
  {
    id: "evt-7",
    title: "Syllabus Completion & Board Model Test Phase-1 Begins",
    date: "2026-10-12",
    month: "OCT",
    day: "12",
    time: "3:00 PM Onwards",
    batch: "HSC-26 Academic",
    category: "Mega Test",
    description: "Start of the formal board pattern model test series for HSC candidates prior to college test exams.",
    isImportant: true
  },
  {
    id: "evt-8",
    title: "Advanced Problem Solving: Modern Physics & Nuclear Physics",
    date: "2026-11-05",
    month: "NOV",
    day: "05",
    time: "3:30 PM - 6:00 PM",
    batch: "HSC-27 Academic",
    category: "Class",
    description: "Deep dive conceptual session covering photo-electric effect, relativity, and nuclear reactions."
  }
];

export default function AcademicCalendarClient({ 
  heroData,
  eventsData
}: { 
  heroData?: any;
  eventsData?: any;
}) {
  const [selectedBatch, setSelectedBatch] = useState<string>("All Batches");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Events");

  const events: CalendarEvent[] = useMemo(() => {
    if (eventsData && Array.isArray(eventsData) && eventsData.length > 0) {
      return eventsData;
    }
    return DEFAULT_EVENTS;
  }, [eventsData]);

  const batches = ["All Batches", "HSC-26 Academic", "HSC-27 Academic", "SSC Academic", "Admission Care"];
  const categories = ["All Events", "Mega Test", "Exam", "Class", "Orientation", "Holiday"];

  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      const matchBatch = selectedBatch === "All Batches" || evt.batch === selectedBatch || evt.batch === "All Batches";
      const matchCategory = selectedCategory === "All Events" || evt.category === selectedCategory;
      return matchBatch && matchCategory;
    });
  }, [events, selectedBatch, selectedCategory]);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Mega Test":
        return "bg-red-50 text-red-600 border-red-200";
      case "Exam":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Orientation":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "Holiday":
        return "bg-emerald-50 text-emerald-600 border-emerald-200";
      default:
        return "bg-purple-50 text-purple-600 border-purple-200";
    }
  };

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
          eyebrow={heroData?.eyebrow || "SCHEDULE & TIMELINE"}
          title={
            <>
              <span className="block text-white">{heroData?.title || "Academic Calendar"}</span>
              <span className="block text-accent mt-1">{heroData?.subtitle || "Session 2026 - 2027"}</span>
            </>
          }
          description={heroData?.description || "Stay ahead with Shifat Sir's complete academic roadmap, mega exams, chapter-wise evaluations, and major milestones."}
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Academic" },
            { label: "Academic Calendar" }
          ]}
          imageSrc={heroData?.mediaUrl || "/images/gallery-classroom.png"}
          imageAlt="Academic Calendar Cover"
        />

        {/* Download & Quick Info Banner */}
        <div className="bg-gradient-to-r from-[#08132E] via-[#0F224A] to-[#08132E] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-60 h-60 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/30 text-accent text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Official Roadmap Available
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">Download Full Academic Schedule PDF</h3>
            <p className="text-gray-300 text-sm max-w-xl">
              Keep the complete 12-month syllabus distribution, class test dates, and board preparation routine right on your phone or study desk.
            </p>
          </div>

          <a
            href="/api/materials/calendar-2026-2027/access?mode=download"
            onClick={(e) => {
              if (!heroData?.fileUrl) {
                e.preventDefault();
                alert("The complete PDF version of the 2026-2027 Academic Calendar is being finalized by Shifat Sir. Please check back soon or browse the live timeline below!");
              }
            }}
            className="px-6 py-3.5 rounded-2xl bg-accent hover:bg-amber-400 text-[#08132E] font-black text-sm flex items-center gap-2.5 shadow-lg hover:scale-105 transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download Schedule PDF</span>
          </a>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2.5 text-[#08132E] font-extrabold text-base">
              <Filter className="w-5 h-5 text-accent" />
              <span>Filter Academic Events</span>
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
              Showing <strong className="text-[#08132E] font-black">{filteredEvents.length}</strong> events
            </span>
          </div>

          {/* Batches Filter */}
          <div className="space-y-2">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">Select Batch</span>
            <div className="flex flex-wrap gap-2">
              {batches.map((batch) => (
                <button
                  key={batch}
                  onClick={() => setSelectedBatch(batch)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedBatch === batch
                      ? "bg-[#08132E] text-white shadow-md scale-[1.02]"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {batch}
                </button>
              ))}
            </div>
          </div>

          {/* Categories Filter */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">Event Type</span>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? "bg-accent text-[#08132E] shadow-sm font-black"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Events List */}
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((evt, idx) => (
                <motion.div
                  key={evt.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                  className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group"
                >
                  {evt.isImportant && (
                    <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Important
                    </div>
                  )}

                  <div className="flex items-start sm:items-center gap-5 w-full md:w-auto">
                    {/* Date Badge */}
                    <div className="w-16 sm:w-20 shrink-0 bg-[#08132E] text-white rounded-2xl p-3 text-center shadow-md flex flex-col items-center justify-center border border-[#08132E]/80 group-hover:bg-accent group-hover:text-[#08132E] transition-colors duration-300">
                      <span className="text-xs font-black tracking-widest text-accent group-hover:text-[#08132E]">{evt.month}</span>
                      <span className="text-2xl sm:text-3xl font-black leading-none mt-1">{evt.day}</span>
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getCategoryColor(evt.category)}`}>
                          {evt.category}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold">
                          {evt.batch}
                        </span>
                      </div>

                      <h3 className="font-black text-[#08132E] text-lg sm:text-xl leading-snug group-hover:text-primary transition-colors">
                        {evt.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-500 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span>{evt.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span>Central Campus / Online Live</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-80 space-y-3 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 shrink-0">
                    <p className="text-xs text-gray-600 font-medium leading-relaxed line-clamp-2">
                      {evt.description}
                    </p>
                    {evt.syllabus && (
                      <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-2.5 text-[11px] text-amber-900 font-semibold flex items-start gap-2">
                        <BookOpen className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold uppercase tracking-wider block text-[9px] text-amber-700">Syllabus Highlight</span>
                          <span className="line-clamp-1">{evt.syllabus}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-[#E7E0D2] border-dashed shadow-sm">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-bold text-lg">No academic events found matching your filter criteria.</p>
                <button
                  onClick={() => { setSelectedBatch("All Batches"); setSelectedCategory("All Events"); }}
                  className="mt-4 px-6 py-2 bg-[#08132E] text-white rounded-xl text-xs font-bold hover:bg-accent hover:text-[#08132E] transition-all"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Academic Milestones System Section */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-lg space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-xs font-black text-accent uppercase tracking-wider block">THE 4-PHASE ROADMAP</span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#08132E]">Shifat Sir&apos;s Proven Academic System</h2>
            <p className="text-sm text-gray-500 font-medium">
              Every academic year follows a structured progression to ensure complete conceptual mastery before board and admission examinations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
            {[
              {
                step: "01",
                title: "Foundation Building",
                months: "July – September",
                desc: "In-depth chapter lectures, textbook problem solving, and weekly foundational evaluations.",
                color: "from-blue-500 to-indigo-600"
              },
              {
                step: "02",
                title: "Core Syllabus Mastery",
                months: "October – December",
                desc: "Advanced CQ numerical practice, creative question solving, and mid-session mega model tests.",
                color: "from-indigo-600 to-purple-600"
              },
              {
                step: "03",
                title: "Mega Exam Series",
                months: "January – February",
                desc: "Full paper board standard model examinations with live evaluation and personal feedback.",
                color: "from-purple-600 to-pink-600"
              },
              {
                step: "04",
                title: "Final Revision Care",
                months: "March – April",
                desc: "Targeted problem diagnosis, formula shortcuts, and super suggestions for 100% board success.",
                color: "from-amber-500 to-red-500"
              }
            ].map((phase, i) => (
              <div key={i} className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100 flex flex-col justify-between relative overflow-hidden group hover:bg-white hover:shadow-xl transition-all duration-300">
                <div className="space-y-3">
                  <span className={`inline-block text-xs font-black text-white px-3 py-1 rounded-full bg-gradient-to-r ${phase.color}`}>
                    Phase {phase.step}
                  </span>
                  <h4 className="font-black text-[#08132E] text-lg leading-tight group-hover:text-primary transition-colors">
                    {phase.title}
                  </h4>
                  <p className="text-xs font-bold text-accent">{phase.months}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{phase.desc}</p>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-200/60 flex items-center justify-between text-[11px] font-black text-gray-400 group-hover:text-[#08132E] transition-colors">
                  <span>Milestone Goal</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
