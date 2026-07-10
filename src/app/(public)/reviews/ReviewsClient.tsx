"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import InnerPageHero from "@/components/layout/InnerPageHero";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const TestimonialCard = ({ item }: { item: any }) => (
  <div 
    className="brand-card rounded-2xl p-6 bg-white border border-border flex flex-col justify-between space-y-4 hover:shadow-lg hover:border-accent/40 transition-all duration-300 w-full text-left select-none"
  >
    <div className="space-y-3">
      {/* Star Rating */}
      <div className="flex items-center space-x-1">
        {[...Array(item.rating || 5)].map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent shrink-0" />
        ))}
      </div>

      {/* Message */}
      <p className="text-sm text-text font-semibold leading-relaxed italic">
        "{item.message}"
      </p>
    </div>

    {/* User Info Row */}
    <div className="pt-4 border-t border-border flex items-center space-x-3 mt-auto">
      {/* Initials Avatar */}
      <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-primary text-xs font-extrabold shrink-0 shadow-sm">
        {getInitials(item.name || "A")}
      </div>
      <div className="min-w-0">
        <h4 className="font-extrabold text-primary text-sm truncate leading-snug">
          {item.name}
        </h4>
        <span className="text-[10px] text-muted block font-semibold truncate">
          {item.role === "Student" ? item.batch : "Parent"} {item.achievement ? `| ${item.achievement}` : ""}
        </span>
      </div>
    </div>
  </div>
);

export default function ReviewsClient({ heroData, testimonialsData = [] }: { heroData?: any, testimonialsData?: any[] }) {
  const [filter, setFilter] = useState<"all" | "Student" | "Parent">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Calculate Stats
  const stats = useMemo(() => {
    const total = testimonialsData.length;
    if (total === 0) return { total, average: "0.0", distribution: { 5:0, 4:0, 3:0, 2:0, 1:0 } };
    
    let sum = 0;
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    
    testimonialsData.forEach(t => {
      const r = t.rating || 5;
      sum += r;
      if (dist[r] !== undefined) {
        dist[r] += 1;
      }
    });

    return {
      total,
      average: (sum / total).toFixed(1),
      distribution: dist
    };
  }, [testimonialsData]);

  // Filter and Pagination
  const filteredData = useMemo(() => {
    if (filter === "all") return testimonialsData;
    return testimonialsData.filter(t => t.role === filter);
  }, [testimonialsData, filter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleFilterChange = (newFilter: "all" | "Student" | "Parent") => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page on filter change
  };

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

        <div className="max-w-5xl mx-auto">
          {/* Stats Summary Section */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-[#E7E0D2] mb-12 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-shrink-0 text-center md:border-r border-[#E7E0D2] md:pr-10 w-full md:w-auto">
              <h2 className="text-5xl font-extrabold text-primary mb-2">{stats.average}</h2>
              <div className="flex items-center justify-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-5 w-5 ${i < Math.round(Number(stats.average)) ? 'fill-accent text-accent' : 'fill-gray-200 text-gray-200'}`} />
                ))}
              </div>
              <p className="text-sm font-bold text-gray-500">Based on {stats.total} reviews</p>
            </div>
            
            <div className="flex-1 w-full space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.distribution[star];
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-sm font-semibold text-gray-600">
                    <div className="flex items-center gap-1 w-12 shrink-0">
                      <span>{star}</span>
                      <Star className="h-3 w-3 fill-accent text-accent" />
                    </div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent rounded-full transition-all duration-1000" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-8 shrink-0 text-right text-gray-400 text-xs">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            {[
              { id: "all", label: "All Reviews" },
              { id: "Student", label: "Students" },
              { id: "Parent", label: "Parents" }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleFilterChange(cat.id as any)}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${
                  filter === cat.id 
                    ? "bg-primary text-white" 
                    : "bg-white text-primary border border-[#E7E0D2] hover:bg-white/80 hover:shadow-md"
                }`}
              >
                {filter === cat.id ? (
                  <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                ) : (
                  <Filter className="w-4 h-4 opacity-70 shrink-0" />
                )}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Reviews Grid */}
          {paginatedData.length > 0 ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6">
              <AnimatePresence mode="popLayout">
                {paginatedData.map((review) => (
                  <motion.div
                    layout
                    key={review.id}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ duration: 0.3 }}
                    className="inline-block w-full mb-6 break-inside-avoid"
                  >
                    <TestimonialCard item={review} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-[#E7E0D2] border-dashed">
              <p className="text-gray-500 font-bold text-lg">No reviews found for this category.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-3 rounded-full bg-white border border-[#E7E0D2] text-primary hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-sm font-bold text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-3 rounded-full bg-white border border-[#E7E0D2] text-primary hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
