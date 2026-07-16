import React from "react";

export default function PrintSheetLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-600 font-sans p-8 print:hidden">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm font-medium">Preparing result sheet for printing...</p>
    </div>
  );
}
