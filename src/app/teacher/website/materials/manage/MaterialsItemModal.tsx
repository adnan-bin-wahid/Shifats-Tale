"use client";

import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { upsertSectionItem } from "@/features/website-cms/actions/content-actions";
import { MediaSelector } from "@/features/website-cms/components/MediaSelector";

interface MaterialsItemModalProps {
  item: any | null;
  categories: string[];
  onClose: () => void;
  onSave: (savedItem: any, isNew: boolean) => void;
}

export default function MaterialsItemModal({ item, categories, onClose, onSave }: MaterialsItemModalProps) {
  const meta = item?.metadata || {};
  
  const [isSaving, setIsSaving] = useState(false);
  
  const [title, setTitle] = useState(item?.title || "");
  const [category, setCategory] = useState(item?.subtitle || (categories[0] || ""));
  
  const [fileType, setFileType] = useState(meta.fileType || "PDF"); // PDF, IMAGE, LINK
  const [fileUrl, setFileUrl] = useState(meta.fileUrl || ""); // For PDF or LINK
  
  const [mediaId, setMediaId] = useState<string | null>(item?.media_id || null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(item?.mediaUrl || null);
  
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [isCoverSelectorOpen, setIsCoverSelectorOpen] = useState(false);

  const handleSave = async () => {
    if (!title || !category) {
      toast.error("Title and Category are required.");
      return;
    }
    if (fileType === "IMAGE" && !mediaUrl) {
      toast.error("Please upload an image.");
      return;
    }
    if ((fileType === "PDF" || fileType === "LINK") && !fileUrl) {
      toast.error("Please provide a file URL or upload a PDF.");
      return;
    }

    const payload = {
      id: item?.id,
      title,
      subtitle: category,
      body: "", 
      media_id: mediaId,
      status: "PUBLISHED" as const,
      metadata: {
        fileType,
        fileUrl,
      }
    };

    try {
      setIsSaving(true);
      await upsertSectionItem("MATERIALS_ITEMS", payload);
      
      const savedItem = {
        ...item,
        id: item?.id || Math.random().toString(36).substr(2, 9), 
        title,
        subtitle: category,
        body: "",
        media_id: mediaId,
        mediaUrl: mediaUrl,
        metadata: payload.metadata
      };
      
      toast.success(item ? "Material updated successfully" : "Material added successfully");
      onSave(savedItem, !item);
    } catch (err: any) {
      toast.error(err.message || "Failed to save material");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col my-8">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-bold text-primary">{item ? "Edit Material" : "Add New Material"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          <div>
            <label className="block text-sm font-semibold mb-1">Title *</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
              placeholder="e.g. Physics Chapter 1 CQ Suggestions"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Category *</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-white"
              >
                <option value="">Select Category</option>
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Type *</label>
              <select 
                value={fileType}
                onChange={(e) => {
                  setFileType(e.target.value);
                  if (e.target.value === "IMAGE") {
                    setFileUrl("");
                  }
                }}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent bg-white"
              >
                <option value="PDF">PDF Document</option>
                <option value="IMAGE">Image</option>
                <option value="LINK">External Link</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            {fileType === "IMAGE" && (
              <div>
                <label className="block text-sm font-semibold mb-2">Upload Image *</label>
                {!isCoverSelectorOpen && !mediaUrl ? (
                  <button 
                    onClick={() => setIsCoverSelectorOpen(true)}
                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-accent hover:bg-accent/5 transition-colors font-semibold"
                  >
                    Select or Upload Image
                  </button>
                ) : isCoverSelectorOpen ? (
                  <div className="border border-border rounded-xl p-4">
                    <MediaSelector 
                      folderKey="MATERIALS" 
                      onSelect={(id, url) => {
                        setMediaId(id);
                        if (url) setMediaUrl(url);
                        setIsCoverSelectorOpen(false);
                      }} 
                    />
                    <button onClick={() => setIsCoverSelectorOpen(false)} className="mt-2 text-sm text-red-500 font-bold">Cancel</button>
                  </div>
                ) : (
                  <div className="relative border border-border rounded-xl p-2 bg-gray-50 flex items-center gap-4">
                    <img src={mediaUrl!} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                    <div className="flex-1 overflow-hidden text-sm text-gray-600 truncate">{mediaUrl}</div>
                    <button 
                      onClick={() => setIsCoverSelectorOpen(true)}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded shadow-sm text-xs font-bold hover:bg-gray-50"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            )}

            {fileType === "PDF" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Upload PDF File *</label>
                  {!isFileSelectorOpen && !fileUrl ? (
                    <button 
                      onClick={() => setIsFileSelectorOpen(true)}
                      className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-accent hover:bg-accent/5 transition-colors font-semibold"
                    >
                      Select or Upload PDF
                    </button>
                  ) : isFileSelectorOpen ? (
                    <div className="border border-border rounded-xl p-4">
                      <MediaSelector 
                        folderKey="MATERIALS" 
                        onSelect={(id, url) => {
                          if (url) setFileUrl(url);
                          setIsFileSelectorOpen(false);
                        }} 
                      />
                      <button onClick={() => setIsFileSelectorOpen(false)} className="mt-2 text-sm text-red-500 font-bold">Cancel</button>
                    </div>
                  ) : (
                    <div className="relative border border-border rounded-xl p-2 bg-gray-50 flex items-center gap-4">
                      <div className="flex-1 overflow-hidden text-sm text-gray-600 truncate font-mono bg-white p-2 border rounded">{fileUrl}</div>
                      <button 
                        onClick={() => setIsFileSelectorOpen(true)}
                        className="px-3 py-1.5 bg-white border border-gray-300 rounded shadow-sm text-xs font-bold hover:bg-gray-50"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Cover Thumbnail (Optional)</label>
                  <p className="text-xs text-muted mb-3">Upload a cover image to show on the card instead of a generic PDF icon.</p>
                  {!isCoverSelectorOpen && !mediaUrl ? (
                    <button 
                      onClick={() => setIsCoverSelectorOpen(true)}
                      className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-accent hover:bg-accent/5 transition-colors font-semibold"
                    >
                      Select Cover Image
                    </button>
                  ) : isCoverSelectorOpen ? (
                    <div className="border border-border rounded-xl p-4">
                      <MediaSelector 
                        folderKey="MATERIALS" 
                        onSelect={(id, url) => {
                          setMediaId(id);
                          if (url) setMediaUrl(url);
                          setIsCoverSelectorOpen(false);
                        }} 
                      />
                      <button onClick={() => setIsCoverSelectorOpen(false)} className="mt-2 text-sm text-red-500 font-bold">Cancel</button>
                    </div>
                  ) : (
                    <div className="relative border border-border rounded-xl p-2 bg-gray-50 flex items-center gap-4">
                      <img src={mediaUrl!} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                      <button 
                        onClick={() => {
                          setMediaId(null);
                          setMediaUrl(null);
                        }}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-red-500 rounded shadow-sm text-xs font-bold hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {fileType === "LINK" && (
              <div>
                <label className="block text-sm font-semibold mb-1">External Link URL *</label>
                <input 
                  type="url" 
                  value={fileUrl} 
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent"
                  placeholder="https://..."
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-border bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            {isSaving ? "Saving..." : "Save Material"}
          </button>
        </div>
      </div>
    </div>
  );
}
