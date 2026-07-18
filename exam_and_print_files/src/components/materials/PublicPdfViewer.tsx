"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Download, ExternalLink, AlertCircle, FileText, Loader2 } from "lucide-react";

// Dynamically import the PDF.js canvas engine with ssr: false to prevent Node/build canvas errors
const SecurePdfCanvas = dynamic(() => import("./SecurePdfCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center p-12 text-gray-500 space-y-3 m-auto">
      <Loader2 className="w-8 h-8 text-[#08132E] animate-spin" />
      <span className="text-sm font-bold text-[#08132E]">Initializing PDF canvas preview...</span>
    </div>
  ),
});

interface PublicPdfViewerProps {
  fileUrl: string;
  title: string;
}

export default function PublicPdfViewer({
  fileUrl,
  title,
}: PublicPdfViewerProps) {
  const [hasError, setHasError] = useState(false);

  const downloadUrl = fileUrl.includes("?") ? `${fileUrl}&download=true` : `${fileUrl}?download=true`;

  return (
    <div className="w-full h-full flex flex-col bg-gray-100 relative overflow-hidden">
      {/* PDF.js Viewer Container - Clean view with zero repeated top bar */}
      <div className="flex-1 w-full h-full relative overflow-auto bg-gray-200/60 flex flex-col items-center justify-center p-4 sm:p-6">
        {hasError ? (
          /* Cream-styled natural & professional middle popup box when preview is unavailable/restricted by device */
          <div className="bg-amber-50 border-2 border-amber-300/80 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl flex flex-col items-center space-y-5 my-auto mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-2xl bg-amber-200/60 text-amber-800 flex items-center justify-center shadow-inner">
              <AlertCircle className="w-9 h-9" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-amber-950 text-base sm:text-lg">
                PDF Preview Unavailable Here
              </h4>
              <p className="text-xs text-amber-900/80 leading-relaxed font-medium">
                Your device browser restricted embedded canvas viewing. Please open the document directly or save a copy below.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-3 bg-[#08132E] hover:bg-[#08132E]/90 text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4 text-accent" />
                <span>Open Direct ↗</span>
              </a>
              <a
                href={downloadUrl}
                download
                className="w-full sm:w-auto px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download File ⬇</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col flex-1">
            <SecurePdfCanvas previewUrl={fileUrl} onError={() => setHasError(true)} />
          </div>
        )}
      </div>
    </div>
  );
}
