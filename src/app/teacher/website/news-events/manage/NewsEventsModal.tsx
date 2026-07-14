"use client";

import React, { useState } from "react";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { upsertSectionItem } from "@/features/website-cms/actions/content-actions";
import { MediaSelector } from "@/features/website-cms/components/MediaSelector";

export default function NewsEventsModal({
  isOpen,
  onClose,
  item,
  onSaveComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: any | null;
  onSaveComplete: (updatedItem: any, isNew: boolean) => void;
}) {
  const meta = item?.metadata || {};
  const [title, setTitle] = useState(item?.title || "");
  const [category, setCategory] = useState(item?.subtitle || meta.category || "NOTICE");
  const [date, setDate] = useState(meta.date || "15");
  const [month, setMonth] = useState(meta.month || "AUG");
  const [time, setTime] = useState(meta.time || "4:00 PM");
  const [location, setLocation] = useState(meta.location || "Shifat's Tales Campus, Rangunia");
  const [excerpt, setExcerpt] = useState(item?.body || meta.excerpt || "");
  const [fullContent, setFullContent] = useState(
    Array.isArray(meta.fullContent) ? meta.fullContent.join("\n\n") : meta.fullContent || ""
  );
  const [mediaId, setMediaId] = useState<string | null>(item?.media_id || null);
  const [imageUrl, setImageUrl] = useState(item?.mediaUrl || meta.imageUrl || "/images/gallery-event.png");
  const [isFeatured, setIsFeatured] = useState(meta.isFeatured || false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !excerpt) {
      toast.error("Please provide at least a title and summary");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        id: item?.id,
        title,
        subtitle: category,
        body: excerpt,
        media_id: mediaId,
        status: "PUBLISHED" as const,
        metadata: {
          category,
          date,
          month,
          time,
          location,
          excerpt,
          fullContent: fullContent.split("\n\n").filter((p: string) => p.trim() !== ""),
          imageUrl,
          isFeatured,
        },
      };

      await upsertSectionItem("NEWS_EVENTS_ITEMS", payload);
      
      const savedItem = {
        ...item,
        id: item?.id || Math.random().toString(36).substr(2, 9),
        title,
        subtitle: category,
        body: excerpt,
        media_id: mediaId,
        mediaUrl: imageUrl,
        metadata: payload.metadata,
      };

      toast.success(item ? "Updated successfully!" : "Added successfully!");
      onSaveComplete(savedItem, !item);
    } catch (err: any) {
      toast.error(err.message || "Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-border space-y-6 my-8">
        <div className="flex justify-between items-center border-b pb-4">
          <h3 className="text-lg font-bold text-primary">
            {item ? "Edit News / Event Item" : "Add New Item"}
          </h3>
          <button onClick={onClose} className="text-muted hover:text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. HSC '26 Orientation Workshop"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-border text-sm font-semibold focus:ring-2 focus:ring-accent bg-white"
              >
                <option value="EVENT">Event / Workshop</option>
                <option value="NOTICE">Academic Notice</option>
                <option value="NEWS">News & Success</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Date (Day)</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="25"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Month</label>
              <input
                type="text"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="AUG"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Time</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="4:00 PM"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase mb-1">Spotlight Item?</label>
              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded text-accent focus:ring-accent"
                />
                <span className="text-xs font-bold text-primary">Featured Hero Card</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase mb-1">Location / Venue</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Shifat's Tales Campus, 3rd Floor, Rangunia"
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase mb-1">Summary Excerpt</label>
            <textarea
              rows={2}
              required
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short summary for card view..."
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase mb-1">Full Article / Details (Separate paragraphs with double enter)</label>
            <textarea
              rows={5}
              value={fullContent}
              onChange={(e) => setFullContent(e.target.value)}
              placeholder="Full detailed explanation for modal view..."
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase mb-1">Image Banner URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="/images/gallery-event.png"
                className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-accent"
              />
              <button
                type="button"
                onClick={() => setIsMediaModalOpen(true)}
                className="secondary-btn px-4 py-2 text-xs font-bold rounded-xl shrink-0"
              >
                Browse Media
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="secondary-btn px-5 py-2 rounded-xl text-sm font-bold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="primary-btn px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Item</span>
            </button>
          </div>
        </form>

        {isMediaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-2 border-b">
                <h4 className="font-bold text-primary">Select or Upload Media</h4>
                <button type="button" onClick={() => setIsMediaModalOpen(false)} className="text-muted hover:text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <MediaSelector
                folderKey="NEWS_EVENTS"
                onSelect={(id: string, url?: string) => {
                  setMediaId(id);
                  if (url) setImageUrl(url);
                  setIsMediaModalOpen(false);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
