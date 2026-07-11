"use client";

import React from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { Loader2 } from "lucide-react";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

interface SecurePdfCanvasProps {
  previewUrl: string;
  onError: () => void;
}

export default function SecurePdfCanvas({ previewUrl, onError }: SecurePdfCanvasProps) {
  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const workerUrl = "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

  return (
    <div className="w-full h-full flex flex-col flex-1">
      <Worker workerUrl={workerUrl}>
        <Viewer
          fileUrl={previewUrl}
          withCredentials={true}
          plugins={[defaultLayoutPluginInstance]}
          renderLoader={(percentages) => (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/90 z-20 space-y-3">
              <Loader2 className="w-8 h-8 text-[#08132E] animate-spin" />
              <span className="text-sm font-bold text-[#08132E]">
                Loading secure PDF... {Math.round(percentages)}%
              </span>
            </div>
          )}
          renderError={(error) => {
            console.error("PDF.js Viewer Error:", error);
            onError();
            return <div className="hidden" />;
          }}
        />
      </Worker>
    </div>
  );
}
