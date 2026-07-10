"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Check, GripVertical, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { updatePageSection } from "@/features/website-cms/actions/content-actions";

export default function HomeSuccessAdmin({ 
  allItems, 
  initialSectionData, 
  sectionId 
}: { 
  allItems: any[], 
  initialSectionData: any,
  sectionId: string 
}) {
  const initialSelectedIds = initialSectionData?.content?.selectedStudentIds || [];
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [eyebrow, setEyebrow] = useState(initialSectionData?.eyebrow || "STUDENT SUCCESS STORIES");
  const [title, setTitle] = useState(initialSectionData?.title || "Celebrating Excellence");
  const [description, setDescription] = useState(initialSectionData?.description || "Here are some of the remarkable success stories from our past batches.");
  React.useEffect(() => {
    setSelectedIds(initialSectionData?.content?.selectedStudentIds || []);
    setEyebrow(initialSectionData?.eyebrow || "STUDENT SUCCESS STORIES");
    setTitle(initialSectionData?.title || "Celebrating Excellence");
    setDescription(initialSectionData?.description || "Here are some of the remarkable success stories from our past batches.");
  }, [initialSectionData]);
  const [isSaving, setIsSaving] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updatePageSection("HOME", "HOME_STUDENT_SUCCESS", {
        status: "PUBLISHED",
        eyebrow,
        title,
        description,
        content: { selectedStudentIds: selectedIds }
      });
      toast.success("Home page student success updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update home student success");
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
              placeholder="e.g. BATCHES & PROGRAMS"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
              placeholder="e.g. Offered Batches"
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
            <h2 className="text-lg font-bold">Select Students</h2>
            <p className="text-sm text-gray-500">Click on a student to toggle their visibility on the Home page.</p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="primary-btn flex items-center space-x-2 text-sm px-6 py-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Save Changes</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allItems.map((student) => {
          const isSelected = selectedIds.includes(student.id);
          const meta = student.metadata || {};
          const image = student.mediaUrl || meta.fallbackImageUrl || "/placeholder.jpg";
          
          return (
            <div 
              key={student.id}
              onClick={() => toggleSelection(student.id)}
              className={`relative rounded-xl border-2 cursor-pointer overflow-hidden transition-all duration-200
                ${isSelected ? 'border-accent shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 z-10 bg-accent text-white p-1 rounded-full shadow-md">
                  <Check className="w-4 h-4" />
                </div>
              )}
              
              <div className="relative h-40 w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                <img src={image} alt={student.title} className="object-cover w-full h-full" />
              </div>
              <div className="p-4 bg-white">
                <h3 className="font-bold text-[#08132E] truncate">{student.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{student.subtitle}</p>
                <div className="mt-2 text-[10px] bg-gray-100 px-2 py-1 rounded-full inline-block font-semibold">
                  {meta.examType || "N/A"} - {meta.year || ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}
