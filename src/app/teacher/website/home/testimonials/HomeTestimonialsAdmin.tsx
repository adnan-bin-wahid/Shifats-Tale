"use client";

import React, { useState, useEffect } from "react";
import { Check, Loader2, Star } from "lucide-react";
import toast from "react-hot-toast";
import { updatePageSection } from "@/features/website-cms/actions/content-actions";
import { cn } from "@/lib/utils";

export default function HomeTestimonialsAdmin({ 
  allItems, 
  initialSectionData, 
  sectionId 
}: { 
  allItems: any[], 
  initialSectionData: any,
  sectionId: string 
}) {
  const initialSelectedIds = initialSectionData?.content?.selectedTestimonialIds || [];
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  
  const [eyebrow, setEyebrow] = useState(initialSectionData?.eyebrow || "TESTIMONIALS");
  const [title, setTitle] = useState(initialSectionData?.title || "What Parents & Students Say");
  const [description, setDescription] = useState(initialSectionData?.description || "Honest feedback from students who achieved Board A+ and cracked engineering university admissions under Shifat Sir's guidance.");
  
  useEffect(() => {
    setSelectedIds(initialSelectedIds);
    setEyebrow(initialSectionData?.eyebrow || "TESTIMONIALS");
    setTitle(initialSectionData?.title || "What Parents & Students Say");
    setDescription(initialSectionData?.description || "Honest feedback from students who achieved Board A+ and cracked engineering university admissions under Shifat Sir's guidance.");
  }, [initialSelectedIds, initialSectionData]);
  
  const [isSaving, setIsSaving] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updatePageSection("HOME", "HOME_TESTIMONIALS", {
        status: "PUBLISHED",
        eyebrow,
        title,
        description,
        content: { selectedTestimonialIds: selectedIds }
      });
      toast.success("Home page reviews updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update home reviews");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Fields Form */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
        <h2 className="text-lg font-bold mb-4">Section Header</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Eyebrow (Small Top Text)</label>
            <input
              type="text"
              value={eyebrow}
              onChange={(e) => setEyebrow(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
              placeholder="e.g. TESTIMONIALS"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
              placeholder="e.g. What Parents & Students Say"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent min-h-[100px]"
              placeholder="Short description under the title..."
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-bold">Select Reviews</h2>
            <p className="text-sm text-gray-500">Click on a review to toggle its visibility on the Home page.</p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="primary-btn px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:brightness-105 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Selection ({selectedIds.length})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allItems.length === 0 ? (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl">
              <p className="text-muted font-medium">No approved reviews found.</p>
            </div>
          ) : (
            allItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div 
                  key={item.id}
                  onClick={() => toggleSelection(item.id)}
                  className={cn(
                    "cursor-pointer rounded-xl border p-4 transition-all duration-200 relative",
                    isSelected 
                      ? "border-accent bg-accent/5 shadow-sm" 
                      : "border-border bg-white hover:border-gray-300"
                  )}
                >
                  <div className="absolute top-3 right-3 z-10">
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                      isSelected ? "border-accent bg-accent" : "border-gray-300"
                    )}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>

                  <div className="flex flex-col h-full opacity-90 pr-6">
                    <div className="flex items-center space-x-1 mb-2">
                      {[...Array(item.rating || 5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="text-xs text-text italic line-clamp-3 mb-3 flex-grow">"{item.message}"</p>
                    <div className="mt-auto">
                      <p className="text-sm font-bold text-primary">{item.name}</p>
                      <p className="text-[10px] text-muted">{item.role} • {item.batch}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
