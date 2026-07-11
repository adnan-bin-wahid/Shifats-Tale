"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Download, ExternalLink, AlertCircle, Loader2 } from "lucide-react";

// Dynamically import the PDF.js canvas engine with ssr: false to prevent Node/build canvas errors
const SecurePdfCanvas = dynamic(() => import("./SecurePdfCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center p-12 text-gray-500 space-y-3 m-auto">
      <Loader2 className="w-8 h-8 text-[#08132E] animate-spin" />
      <span className="text-sm font-bold text-[#08132E]">Initializing secure viewer...</span>
    </div>
  ),
});

interface SecurePdfViewerProps {
  contentId: string;
  title: string;
  allowDownload?: boolean;
}

export default function SecurePdfViewer({
  contentId,
  title,
  allowDownload = false,
}: SecurePdfViewerProps) {
  const [hasError, setHasError] = useState(false);

  const previewUrl = `/api/materials/${contentId}/access?mode=preview`;
  const downloadUrl = `/api/materials/${contentId}/access?mode=download`;

  return (
    <div className="w-full h-full flex flex-col bg-gray-100 relative overflow-hidden">
      {/* Action / Fallback & Control Banner */}
      <div className="bg-amber-50 border-b border-amber-200/80 px-3 sm:px-4 py-2 text-xs text-amber-900 font-semibold flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 z-10">
        <span className="text-center sm:text-left flex items-center gap-1.5 leading-tight">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          {hasError
            ? "PDF preview could not load on this browser. Open directly or download the file."
            : "Secure PDF.js Canvas Preview active (No iframe block on Android/PC)."}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-[#08132E] hover:bg-[#08132E]/90 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5"
            title="Open direct secure preview in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Direct ↗</span>
          </a>
          {allowDownload && (
            <a
              href={downloadUrl}
              download
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download ⬇</span>
            </a>
          )}
        </div>
      </div>

      {/* PDF.js Viewer Container */}
      <div className="flex-1 w-full h-full relative overflow-auto bg-gray-200/60 flex flex-col items-center justify-center">
        {hasError ? (
          <div className="p-6 sm:p-8 text-center space-y-4 bg-white border border-amber-200 rounded-2xl max-w-md mx-4 shadow-lg">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-amber-950 text-base mb-1">
                PDF preview could not load on this browser.
              </h4>
              <p className="text-xs text-gray-600">
                Your device or browser might restrict large canvas allocation. Please open or download the file using the secure buttons below.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-[#08132E] hover:bg-[#08132E]/90 text-white rounded-xl font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4 text-accent" />
                <span>Open Direct Preview</span>
              </a>
              {allowDownload && (
                <a
                  href={downloadUrl}
                  download
                  className="px-4 py-2.5 bg-accent hover:bg-amber-400 text-[#08132E] rounded-xl font-extrabold text-xs transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col flex-1">
            <SecurePdfCanvas previewUrl={previewUrl} onError={() => setHasError(true)} />
          </div>
        )}
      </div>
    </div>
  );
}
