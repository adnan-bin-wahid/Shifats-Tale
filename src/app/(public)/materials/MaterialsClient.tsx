"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Image as ImageIcon, Link as LinkIcon, Download, Eye, ExternalLink, ArrowRight, Maximize2 } from "lucide-react";
import InnerPageHero from "@/components/layout/InnerPageHero";
import PublicPdfViewer from "@/components/materials/PublicPdfViewer";

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
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] overflow-hidden group hover:shadow-[0_20px_35px_-5px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col">
                        
                        {/* Cover Image / Thumbnail Area */}
                        <div 
                          className="relative w-full aspect-[16/10] bg-[#F8FAFC] overflow-hidden border-b border-gray-100/60 cursor-pointer"
                          onClick={() => {
                            if (fileType === "IMAGE") setSelectedImage(item);
                            else if (fileType === "PDF") setSelectedPdf(item);
                            else if (fileUrl) window.open(fileUrl, "_blank");
                          }}
                        >
                          {item.mediaUrl ? (
                            <Image src={item.mediaUrl} alt={item.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#0B1736] via-[#112350] to-[#0A1329] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]" />
                              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                {fileType === "PDF" && <FileText className="w-7 h-7 text-red-400" />}
                                {fileType === "IMAGE" && <ImageIcon className="w-7 h-7 text-blue-400" />}
                                {fileType === "LINK" && <LinkIcon className="w-7 h-7 text-green-400" />}
                              </div>
                              <span className="text-white font-bold text-sm tracking-wide px-4 line-clamp-2 drop-shadow-md">{item.title}</span>
                              <span className="text-[11px] text-[#F59E0B] font-extrabold mt-1 uppercase tracking-wider">{item.subtitle}</span>
                            </div>
                          )}
                          
                          {/* Top Left Badge */}
                          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-sm border border-gray-100 flex items-center gap-1.5 z-10">
                            {fileType === "PDF" && <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            {fileType === "IMAGE" && <ImageIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                            {fileType === "LINK" && <LinkIcon className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                            <span className="text-xs font-bold text-gray-800 tracking-wide uppercase">{fileType}</span>
                          </div>

                          {/* Top Right Badge / Icon */}
                          {fileType === "IMAGE" ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedImage(item); }}
                              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-900/80 hover:bg-gray-900 backdrop-blur-md text-white flex items-center justify-center shadow-sm z-10 transition-colors"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="absolute top-3 right-3 bg-gray-900/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm z-10">
                              {meta.pages ? `${meta.pages} pages` : fileType === "PDF" ? "PDF Doc" : "External"}
                            </div>
                          )}

                          {/* Hover Overlay Button */}
                          <div className="absolute inset-0 bg-[#08132E]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] z-20">
                            <div className="px-5 py-2.5 rounded-full bg-gray-900/90 text-white font-bold text-sm flex items-center gap-2 shadow-xl group-hover:scale-105 transition-transform">
                              <Eye className="w-4 h-4 text-[#F59E0B]" />
                              <span>{fileType === "IMAGE" ? "Preview Image" : fileType === "PDF" ? "Preview PDF" : "Open Link"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-5 flex-1 flex flex-col justify-between bg-white">
                          <div>
                            <span className="text-[11px] font-extrabold text-[#F59E0B] uppercase tracking-wider mb-1.5 block font-mono">
                              {item.subtitle || "GENERAL"}
                            </span>
                            <h3 
                              onClick={() => {
                                if (fileType === "IMAGE") setSelectedImage(item);
                                else if (fileType === "PDF") setSelectedPdf(item);
                                else if (fileUrl) window.open(fileUrl, "_blank");
                              }}
                              className="font-bold text-[#1E293B] text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-4 cursor-pointer"
                            >
                              {item.title}
                            </h3>
                          </div>

                          {/* Footer Row */}
                          <div className="pt-3.5 mt-2 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-600">
                            <div className="flex items-center gap-1.5">
                              {fileType === "PDF" && <FileText className="w-4 h-4 text-red-500 shrink-0" />}
                              {fileType === "IMAGE" && <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />}
                              {fileType === "LINK" && <LinkIcon className="w-4 h-4 text-green-500 shrink-0" />}
                              <span className="font-bold text-gray-700">{fileType === "IMAGE" ? "Image" : fileType === "PDF" ? "PDF" : "Link"}</span>
                              <span className="text-gray-300 font-bold">•</span>
                            </div>
                            
                            <button 
                              onClick={() => {
                                if (fileType === "IMAGE") setSelectedImage(item);
                                else if (fileType === "PDF") setSelectedPdf(item);
                                else if (fileUrl) window.open(fileUrl, "_blank");
                              }}
                              className="text-[#08132E] group-hover:text-[#F59E0B] font-bold flex items-center gap-1 transition-colors"
                            >
                              <span>{fileType === "IMAGE" ? "View image" : fileType === "PDF" ? "View material" : "Open link"}</span>
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </button>
                          </div>
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
            <div className="h-16 bg-[#08132E] text-white px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-lg relative z-10">
              <div className="flex items-center gap-3 sm:gap-4 overflow-hidden mr-2">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                </div>
                <div className="truncate">
                  <h3 className="font-bold text-sm sm:text-lg leading-tight truncate">{selectedPdf.title}</h3>
                  <p className="text-accent text-[11px] sm:text-xs font-semibold truncate">{selectedPdf.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <a 
                  href={selectedPdf.metadata?.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs sm:text-sm font-bold transition-colors"
                  title="Open PDF directly in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
                  <span className="hidden md:inline">Open in Tab</span>
                </a>
                <a 
                  href={selectedPdf.metadata?.fileUrl ? (selectedPdf.metadata.fileUrl.includes("?") ? `${selectedPdf.metadata.fileUrl}&download=true` : `${selectedPdf.metadata.fileUrl}?download=true`) : "#"}
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-accent text-[#08132E] hover:bg-amber-400 rounded-xl text-xs sm:text-sm font-black transition-colors shadow-sm cursor-pointer"
                  title="Download PDF File"
                >
                  <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button 
                  onClick={() => setSelectedPdf(null)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-red-500/80 text-white flex items-center justify-center transition-colors shrink-0"
                  aria-label="Close Viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* PDF Body Container - Clean view with zero repeated top bar */}
            <div className="flex-1 bg-gray-100 overflow-hidden relative flex flex-col">
              {selectedPdf.metadata?.fileUrl ? (
                <PublicPdfViewer
                  fileUrl={selectedPdf.metadata.fileUrl}
                  title={selectedPdf.title}
                />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
