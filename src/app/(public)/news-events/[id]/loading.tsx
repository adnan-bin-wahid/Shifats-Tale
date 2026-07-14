import React from "react";

export default function LoadingNewsEventDetail() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 animate-pulse">
      <div className="h-64 sm:h-80 w-full bg-slate-900/60" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 space-y-8">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-6">
            <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="h-72 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
