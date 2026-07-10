"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Image as ImageIcon, Link as LinkIcon, Download, Eye, ExternalLink } from "lucide-react";
import InnerPageHero from "@/components/layout/InnerPageHero";

export default function MaterialsClient({ 
  heroData, 
  materialItems = [], 
  categories = [] 
}: { 
  heroData?: any, 
  materialItems?: any[], 
  categories?: string[] 
}) {
  const [filter, setFilter] = useState("All");
  
  // Modals state
  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<any | null>(null);

  // Filter items
  const filteredItems = useMemo(() => {
    return filter === "All" 
      ? materialItems 
      : materialItems.filter(item => item.subtitle === filter);
  }, [filter, materialItems]);

  const allCategories = ["All", ...categories];

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
          eyebrow={heroData?.eyebrow || "STUDY MATERIALS"}
          title={
            <>
              <span className="block text-white">{heroData?.title || "Premium Study"}</span>
              <span className="block text-accent mt-1">{heroData?.subtitle || "Materials"}</span>
            </>
          }
          description={heroData?.description || "Access premium notes, formula sheets, and practice exams carefully crafted for your academic success."}
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Materials" }
          ]}
          imageSrc={heroData?.mediaUrl || "/images/flyer_admission_science.jpg"}
          imageAlt="Study Materials Cover"
        />

        <div>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 pb-12">
            {allCategories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setFilter(cat)}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-sm ${
                  filter === cat 
                    ? "bg-primary text-white scale-105" 
                    : "bg-white text-primary border border-[#E7E0D2] hover:bg-white/80 hover:shadow-md hover:scale-105"
                }`}
              >
                {filter === cat ? (
                  <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                ) : null}
                <span>{cat}</span>
              </button>
            ))}
          </div>

          {/* Masonry Grid */}
          {filteredItems.length > 0 ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => {
                  const meta = item.metadata || {};
                  const fileType = meta.fileType || "PDF";
                  const fileUrl = meta.fileUrl || "";
                  const imgUrl = item.mediaUrl || (fileType === "IMAGE" ? fileUrl : "/placeholder.jpg");
                  
                  return (
                    <motion.div
                      layout
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      transition={{ duration: 0.3 }}
                      className="inline-block w-full mb-6 break-inside-avoid"
                    >
                      <div className="bg-white rounded-3xl border border-[#E7E0D2] shadow-sm overflow-hidden group hover:shadow-xl hover:border-accent/40 transition-all duration-500 hover:-translate-y-1">
                        
                        {/* Cover Image / Thumbnail */}
                        <div className="relative w-full aspect-[4/3] bg-bg-soft overflow-hidden">
                          <Image src={imgUrl} alt={item.title} fill className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                          
                          {/* Type Badge */}
                          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-md flex items-center gap-2">
                            {fileType === "PDF" && <FileText className="w-4 h-4 text-red-500" />}
                            {fileType === "IMAGE" && <ImageIcon className="w-4 h-4 text-blue-500" />}
                            {fileType === "LINK" && <LinkIcon className="w-4 h-4 text-green-500" />}
                            <span className="text-[10px] font-black tracking-wider text-primary">{fileType}</span>
                          </div>

                          {/* Hover Actions Overlay */}
                          <div className="absolute inset-0 bg-[#08132E]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                            {fileType === "IMAGE" && (
                              <button 
                                onClick={() => setSelectedImage(item)}
                                className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            )}
                            {fileType === "PDF" && (
                              <button 
                                onClick={() => setSelectedPdf(item)}
                                className="px-6 py-2.5 rounded-full bg-accent text-white font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg"
                              >
                                <Eye className="w-4 h-4" /> View PDF
                              </button>
                            )}
                            {fileType === "LINK" && (
                              <a 
                                href={fileUrl} target="_blank" rel="noopener noreferrer"
                                className="px-6 py-2.5 rounded-full bg-accent text-white font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg"
                              >
                                <ExternalLink className="w-4 h-4" /> Open Link
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-5">
                          <span className="text-xs font-black text-accent uppercase tracking-wider mb-2 block">
                            {item.subtitle}
                          </span>
                          <h3 className="font-extrabold text-[#08132E] text-lg leading-tight line-clamp-2">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-[#E7E0D2] border-dashed shadow-sm">
              <p className="text-gray-500 font-bold text-lg">No materials found for this category.</p>
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
          >
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-[85vh] h-full flex flex-col"
            >
              <div className="relative flex-1 rounded-2xl overflow-hidden bg-black">
                <Image 
                  src={selectedImage.metadata?.fileUrl || selectedImage.mediaUrl} 
                  alt={selectedImage.title} 
                  fill 
                  className="object-contain" 
                />
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-white font-bold text-xl">{selectedImage.title}</h3>
                <p className="text-accent text-sm font-semibold mt-1">{selectedImage.subtitle}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen PDF Viewer Modal (Case B) */}
      <AnimatePresence>
        {selectedPdf && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden"
          >
            {/* PDF Header Bar */}
            <div className="h-16 bg-[#08132E] text-white px-6 flex items-center justify-between shrink-0 shadow-lg relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight truncate max-w-[200px] sm:max-w-md">{selectedPdf.title}</h3>
                  <p className="text-accent text-xs font-semibold">{selectedPdf.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a 
                  href={selectedPdf.metadata?.fileUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-colors"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </a>
                <button 
                  onClick={() => setSelectedPdf(null)}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-red-500/80 text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* PDF Body Container */}
            <div className="flex-1 bg-gray-100 overflow-hidden relative">
              <iframe
                src={selectedPdf.metadata?.fileUrl}
                className="w-full h-full border-none"
                title={selectedPdf.title}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
