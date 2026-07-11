"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updatePageSection } from "@/features/website-cms/actions/content-actions";
import { MediaSelector } from "@/features/website-cms/components/MediaSelector";
import { Save, Loader2, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

export function RoutineCardForm({ 
  initialData, 
  pageKey, 
  sectionKey, 
  folderKey 
}: { 
  initialData: any;
  pageKey: string;
  sectionKey: string;
  folderKey: any; // AllowedFolder
}) {
  const router = useRouter();
  
  const [mediaId, setMediaId] = useState<string | null>(initialData?.content?.mediaId || null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(initialData?.mediaUrl || null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when initialData changes after a router.refresh() (React App Router State Sync rule)
  useEffect(() => {
    if (initialData) {
      setMediaId(initialData.content?.mediaId || null);
      setMediaUrl(initialData.mediaUrl || null);
    }
  }, [initialData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updatePageSection(pageKey, sectionKey, {
        status: "PUBLISHED",
        content: { mediaId }
      });
      toast.success("Class Routine image saved successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update class routine image.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-border/60 shadow-sm">
      <div className="space-y-4">
        <label className="block text-sm font-extrabold text-primary flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-accent" />
          Full Class Routine Image (Card Section)
        </label>
        <p className="text-xs text-muted leading-relaxed font-medium">
          Upload a new high-resolution class routine/schedule flyer image or choose from existing uploaded media in the library. This massive flyer will be displayed prominently on the Class Routine page.
        </p>

        {mediaUrl ? (
          <div className="relative w-full h-[320px] sm:h-[450px] rounded-2xl overflow-hidden border-2 border-dashed border-accent/40 bg-gray-900/90 flex items-center justify-center p-2 group shadow-inner">
            <Image 
              src={mediaUrl} 
              alt="Routine Preview" 
              fill 
              className="object-contain" 
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setMediaId(null);
                  setMediaUrl(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg transition-colors"
              >
                Remove Image
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <MediaSelector 
              folderKey={folderKey}
              onSelect={(id, url) => {
                setMediaId(id);
                if (url) setMediaUrl(url);
              }}
            />
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border/40 flex items-center justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 font-extrabold text-sm rounded-xl shadow-sm transition-all"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              <span>Saving Image...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 text-accent" />
              <span>Save Routine Image</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
