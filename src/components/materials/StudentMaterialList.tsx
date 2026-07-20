"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Eye, Download, ExternalLink, Info, Calendar, FileText, X, ArrowRight, BookOpenCheck } from "lucide-react";
import SecurePdfViewer from "./SecurePdfViewer";

interface Material {
  id: string;
  subject_id: string | null;
  title: string;
  description: string;
  content_type: string;
  file_size: number | null;
  allow_download: boolean;
  external_url: string | null;
  published_at: string;
  created_at: string;
  subject?: { id: string; name: string; code: string } | null;
}

export function StudentMaterialList({
  materials,
  initialSubjectId = "ALL",
}: {
  materials: Material[];
  initialSubjectId?: string;
}) {
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [subjectFilter, setSubjectFilter] = useState(initialSubjectId);

  useEffect(() => {
    if (selectedMaterial) {
      document.body.style.overflow = "hidden";
      const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") setSelectedMaterial(null);
      };
      document.addEventListener("keydown", closeOnEscape);
      return () => {
        document.removeEventListener("keydown", closeOnEscape);
        document.body.style.overflow = "unset";
      };
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedMaterial]);

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const subjectOptions = Array.from(
    new Map(
      materials
        .filter((material) => material.subject)
        .map((material) => [material.subject!.id, material.subject!])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));
  const filteredMaterials = materials.filter((material) => {
    if (subjectFilter === "ALL") return true;
    if (subjectFilter === "GENERAL") return !material.subject_id;
    return material.subject_id === subjectFilter;
  });

  return (
    <>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <BookOpenCheck className="h-4 w-4 text-blue-700" />
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            Browse by subject
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter study materials by subject">
          {[
            { id: "ALL", label: `All resources (${materials.length})` },
            { id: "GENERAL", label: "General batch" },
            ...subjectOptions.map((subject) => ({ id: subject.id, label: `${subject.name} · ${subject.code}` })),
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={subjectFilter === option.id}
              onClick={() => setSubjectFilter(option.id)}
              className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-black transition ${
                subjectFilter === option.id
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 hover:text-blue-700"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredMaterials.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <FileText className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-black text-slate-800">No resources in this subject yet</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">Choose another subject or check again after your teacher publishes a resource.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map((material) => {
          const isFile = ["PDF", "DOC", "DOCX", "IMAGE"].includes(material.content_type);
          const isPreviewable = ["PDF", "IMAGE"].includes(material.content_type);
          const isExternal = ["LINK", "YOUTUBE"].includes(material.content_type);
          const isText = ["NOTE", "ANNOUNCEMENT"].includes(material.content_type);

          return (
            <div
              key={material.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] overflow-hidden group hover:shadow-[0_20px_35px_-5px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
            >
              {/* Thumbnail Header Area */}
              <button
                type="button"
                aria-label={`${isPreviewable ? "Preview" : isExternal ? "Open" : "Read"} ${material.title}`}
                className="relative w-full aspect-[16/10] bg-[#F8FAFC] overflow-hidden border-b border-gray-100/60 cursor-pointer"
                onClick={() => {
                  if (isPreviewable) setSelectedMaterial(material);
                  else if (isExternal && material.external_url) window.open(material.external_url, "_blank", "noopener,noreferrer");
                }}
              >
                <div className="w-full h-full bg-gradient-to-br from-[#0B1736] via-[#112350] to-[#0A1329] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform duration-500">
                    {isFile && <FileText className="w-7 h-7 text-red-400" />}
                    {isExternal && <ExternalLink className="w-7 h-7 text-green-400" />}
                    {isText && <Info className="w-7 h-7 text-yellow-400" />}
                  </div>
                  <span className="text-white font-bold text-sm tracking-wide px-4 line-clamp-2 drop-shadow-md">{material.title}</span>
                  <span className="text-[11px] text-[#F59E0B] font-extrabold mt-1 uppercase tracking-wider">{material.content_type}</span>
                </div>

                {/* Top Left Badge */}
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-sm border border-gray-100 flex items-center gap-1.5 z-10">
                  {isFile && <FileText className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                  {isExternal && <ExternalLink className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                  {isText && <Info className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                  <span className="text-xs font-bold text-gray-800 tracking-wide uppercase">{material.content_type}</span>
                </div>

                {/* Top Right Size / Badge */}
                <div className="absolute top-3 right-3 bg-gray-900/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm z-10">
                  {material.file_size ? formatBytes(material.file_size) : isText ? "Note" : "External"}
                </div>

                {/* Hover Actions Overlay */}
                <div className="absolute inset-0 bg-[#08132E]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px] z-20">
                  <div className="px-5 py-2.5 rounded-full bg-gray-900/90 text-white font-bold text-sm flex items-center gap-2 shadow-xl group-hover:scale-105 transition-transform">
                    <Eye className="w-4 h-4 text-[#F59E0B]" />
                    <span>{isPreviewable ? "Preview Material" : isExternal ? "Open Link" : "Read Note"}</span>
                  </div>
                </div>
              </button>

              {/* Content Block */}
              <div className="p-5 flex-1 flex flex-col justify-between bg-white">
                <div>
                  <span className="text-[11px] font-extrabold text-[#F59E0B] uppercase tracking-wider mb-1.5 block font-mono">
                    {material.subject ? `${material.subject.name} · ${material.subject.code}` : "General batch resource"}
                  </span>
                  <h3 
                    onClick={() => {
                      if (isPreviewable) setSelectedMaterial(material);
                      else if (isExternal && material.external_url) window.open(material.external_url, "_blank", "noopener,noreferrer");
                    }}
                    className="font-bold text-[#1E293B] text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2 cursor-pointer"
                  >
                    {material.title}
                  </h3>
                  {material.description && (
                    <p className="text-xs text-gray-500 font-medium leading-relaxed line-clamp-2 mb-4">
                      {material.description}
                    </p>
                  )}
                </div>

                {/* Footer Row */}
                <div className="pt-3.5 mt-2 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-500">{new Date(material.published_at || material.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {isFile && material.allow_download && (
                      <a
                        href={`/api/materials/${material.id}/access?mode=download`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary hover:text-accent font-bold flex items-center gap-1 transition-colors"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                    <button 
                      onClick={() => {
                        if (isPreviewable) setSelectedMaterial(material);
                        else if (isExternal && material.external_url) window.open(material.external_url, "_blank", "noopener,noreferrer");
                      }}
                      className="text-[#08132E] group-hover:text-[#F59E0B] font-bold flex items-center gap-1 transition-colors"
                    >
                      <span>{isPreviewable ? "View material" : "Open resource"}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {typeof window !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedMaterial && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-label={`Preview ${selectedMaterial.title}`}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-white/20 relative"
              >
                <div className="flex items-center justify-between p-3 sm:p-4 border-b border-[#E7E0D2] bg-gray-50/50 shrink-0">
                  <div className="flex items-center space-x-3 truncate mr-2">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
                    <h3 className="font-bold text-primary truncate text-xs sm:text-base">
                      {selectedMaterial.title}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <a
                      href={`/api/materials/${selectedMaterial.id}/access?mode=preview`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-gray-100 hover:bg-gray-200 text-primary text-xs font-bold rounded-lg flex items-center space-x-1"
                      title="Open directly in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Open in Tab</span>
                    </a>
                    {selectedMaterial.allow_download && (
                      <a
                        href={`/api/materials/${selectedMaterial.id}/access?mode=download`}
                        download
                        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 flex items-center space-x-1.5 shadow-sm"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Download</span>
                      </a>
                    )}
                    <button
                      onClick={() => setSelectedMaterial(null)}
                      className="p-1.5 sm:p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Close Viewer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-gray-100 relative flex flex-col overflow-hidden">
                  {selectedMaterial.content_type === "PDF" || selectedMaterial.title.toLowerCase().endsWith(".pdf") ? (
                    <SecurePdfViewer
                      contentId={selectedMaterial.id}
                      title={selectedMaterial.title}
                      allowDownload={selectedMaterial.allow_download}
                    />
                  ) : (
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-4 overflow-auto bg-gray-900/90">
                      <Image
                        src={`/api/materials/${selectedMaterial.id}/access?mode=preview`}
                        alt={selectedMaterial.title}
                        fill
                        unoptimized
                        sizes="100vw"
                        className="object-contain rounded-lg shadow-xl"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
