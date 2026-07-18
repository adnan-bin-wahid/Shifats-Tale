"use client";

import React, { useState } from "react";
import { X, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { upsertSectionItem } from "@/features/website-cms/actions/content-actions";
import { MediaSelector } from "@/features/website-cms/components/MediaSelector";

interface StudentCardModalProps {
  item: any | null;
  onClose: () => void;
  onSave: (savedItem: any, isNew: boolean) => void;
}

export default function StudentCardModal({ item, onClose, onSave }: StudentCardModalProps) {
  const meta = item?.metadata || {};
  
  const [isSaving, setIsSaving] = useState(false);
  
  const [title, setTitle] = useState(item?.title || "");
  const [subtitle, setSubtitle] = useState(item?.subtitle || "");
  const [body, setBody] = useState(item?.body || "");
  
  const [achievement, setAchievement] = useState(meta.achievement || "");
  const [examType, setExamType] = useState(meta.examType || "Engineering");
  const [year, setYear] = useState(meta.year || new Date().getFullYear().toString());
  
  const [mediaId, setMediaId] = useState<string | null>(item?.media_id || null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(item?.mediaUrl || null);
  const [isMediaSelectorOpen, setIsMediaSelectorOpen] = useState(false);

  const handleSave = async () => {
    if (!title || !examType) {
      toast.error("Student Name and Exam Type are required.");
      return;
    }

    const payload = {
      id: item?.id,
      title,
      subtitle,
      body: "", // not used in UI
      media_id: mediaId,
      status: "PUBLISHED" as const,
      metadata: {
        achievement,
        examType,
        year,
        fallbackImageUrl: meta.fallbackImageUrl // preserve if no mediaId is selected
      }
    };

    try {
      setIsSaving(true);
      await upsertSectionItem("RESULTS_STUDENTS", payload);
      
      // Construct the saved item format to update UI without refetching immediately
      const savedItem = {
        ...item,
        id: item?.id || Math.random().toString(36).substr(2, 9), 
        title,
        subtitle,
        body: "",
        media_id: mediaId,
        mediaUrl: mediaUrl || meta.fallbackImageUrl,
        metadata: payload.metadata
      };
      
      toast.success(item ? "Student result updated successfully" : "Student result added successfully");
      onSave(savedItem, !item);
    } catch (err: any) {
      toast.error(err.message || "Failed to save student result");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col my-8">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-bold text-[#08132E]">{item ? "Edit Student Result" : "Add Student Result"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Core Details */}
            <div className="space-y-5">
              <h3 className="font-bold text-gray-700 border-b pb-2">Student Info & Result</h3>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Student Name *</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  placeholder="e.g. Ayon Sen"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">College/School</label>
                <input 
                  type="text" 
                  value={subtitle} 
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  placeholder="e.g. Notre Dame College"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Achievement Highlights</label>
                <input 
                  type="text" 
                  value={achievement} 
                  onChange={(e) => setAchievement(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  placeholder="e.g. BUET - Merit Position 42"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Exam Type *</label>
                  <select 
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-white"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="University">University</option>
                    <option value="Medical">Medical</option>
                    <option value="Board">Board Exams</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Passing Year</label>
                  <input 
                    type="text" 
                    value={year} 
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                    placeholder="e.g. 2024"
                  />
                </div>
              </div>

            </div>

            {/* Right Column: Media */}
            <div className="space-y-5">
              <h3 className="font-bold text-gray-700 border-b pb-2">Student Photo</h3>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Upload or Choose Photo</label>
                {mediaUrl ? (
                  <div className="relative w-48 h-48 mx-auto bg-[#FFF9F2] rounded-full border-4 border-accent/20 flex items-center justify-center overflow-hidden mb-4 shadow-sm">
                    <img src={mediaUrl} alt="Photo Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => { setMediaId(null); setMediaUrl(null); }}
                      className="absolute top-2 right-2 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200 transition-colors shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-48 h-48 mx-auto bg-gray-50 rounded-full border-2 border-dashed border-border flex items-center justify-center mb-4">
                    <span className="text-sm text-gray-500">No photo selected</span>
                  </div>
                )}
                
                <button 
                  onClick={() => setIsMediaSelectorOpen(true)}
                  className="w-full py-2 border border-accent text-accent rounded-lg font-bold hover:bg-accent/5 transition-colors"
                >
                  {mediaUrl ? "Change Photo" : "Select Photo"}
                </button>
              </div>
            </div>
          </div>
          
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end space-x-3 bg-gray-50 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="primary-btn px-8 py-2 font-bold disabled:opacity-50 flex items-center space-x-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSaving ? "Saving..." : "Save Result"}</span>
          </button>
        </div>
      </div>

      {isMediaSelectorOpen && (
        <MediaSelector 
          folderKey="RESULTS" 
          onSelect={(id: string, url: string | undefined) => {
            setMediaId(id);
            setMediaUrl(url || null);
            setIsMediaSelectorOpen(false);
          }}
        />
      )}
    </div>
  );
}
