"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Check, Loader2, Calendar, Trophy, Bell, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { updatePageSection } from "@/features/website-cms/actions/content-actions";

export default function HomeNewsEventsAdmin({
  allNewsItems = [],
  initialSectionData,
}: {
  allNewsItems: any[];
  initialSectionData: any;
}) {
  const content = initialSectionData?.content || {};
  const [featuredId, setFeaturedId] = useState<string>(content.featuredId || "");
  const [selectedRightIds, setSelectedRightIds] = useState<string[]>(content.selectedRightIds || []);
  const [eyebrow, setEyebrow] = useState(initialSectionData?.eyebrow || "Latest Updates");
  const [title, setTitle] = useState(initialSectionData?.title || "News & Academic Events");
  const [description, setDescription] = useState(
    initialSectionData?.description ||
      "Stay informed with our orientation schedules, scholarship model tests, revision plans, and success celebrations."
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const newContent = initialSectionData?.content || {};
    setFeaturedId(newContent.featuredId || "");
    setSelectedRightIds(newContent.selectedRightIds || []);
    setEyebrow(initialSectionData?.eyebrow || "Latest Updates");
    setTitle(initialSectionData?.title || "News & Academic Events");
    setDescription(
      initialSectionData?.description ||
        "Stay informed with our orientation schedules, scholarship model tests, revision plans, and success celebrations."
    );
  }, [initialSectionData]);

  const toggleRightSelection = (id: string) => {
    setSelectedRightIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updatePageSection("HOME", "HOME_NEWS_EVENTS", {
        status: "PUBLISHED",
        eyebrow,
        title,
        description,
        content: {
          featuredId,
          selectedRightIds,
        },
      });
      toast.success("Home page News & Events updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update home News & Events");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
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
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent font-semibold"
              placeholder="e.g. Latest Updates"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent font-semibold"
              placeholder="e.g. News & Academic Events"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:border-accent min-h-[100px] font-semibold"
              placeholder="Short description under the title..."
            />
          </div>
        </div>
      </div>

      {/* Card Selection Box */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-primary">Select Cards for Home Page Section</h2>
            <p className="text-sm text-gray-500">
              Pick 1 item for the big Featured Card on the Left, and pick several items for the smaller cards on the Right.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent text-primary font-bold rounded-xl hover:bg-yellow-400 transition-colors shadow-sm disabled:opacity-50 shrink-0"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Save Selection</span>
          </button>
        </div>

        {allNewsItems.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
            <Trophy className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
            <h3 className="font-bold text-primary">No News & Event Cards Found</h3>
            <p className="text-sm text-muted mt-1">
              Please create some cards in News & Events -&gt; Cards & Body first.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allNewsItems.map((item) => {
                const meta = item.metadata || {};
                const isFeaturedLeft = featuredId === item.id;
                const isSelectedRight = selectedRightIds.includes(item.id);
                const imageUrl = item.mediaUrl || meta.imageUrl || item.imageUrl || "/images/gallery-event.png";
                const dateStr = `${meta.date || item.date || "15"} ${meta.month || item.month || "AUG"}`;
                const categoryStr = item.subtitle || meta.category || "NOTICE";

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isFeaturedLeft
                        ? "border-accent bg-accent/10 shadow-md ring-2 ring-accent"
                        : isSelectedRight
                        ? "border-primary/40 bg-primary/5 shadow-sm"
                        : "border-border bg-white hover:border-gray-300"
                    }`}
                  >
                    <div>
                      {/* Image Thumbnail & Category */}
                      <div className="relative h-36 w-full rounded-xl overflow-hidden bg-slate-100 mb-3">
                        <Image src={imageUrl} alt={item.title || "Card"} fill className="object-cover" />
                        <div className="absolute top-2 left-2 bg-[#08132E]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          {dateStr}
                        </div>
                        <div className="absolute top-2 right-2 bg-accent text-primary text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                          {categoryStr}
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-primary line-clamp-2 leading-snug mb-3">
                        {item.title || meta.title || "Untitled Announcement"}
                      </h4>
                    </div>

                    {/* Selection Controls */}
                    <div className="pt-3 border-t border-border/60 flex flex-col gap-2">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-primary bg-white p-2 rounded-lg border border-border hover:border-accent">
                        <input
                          type="radio"
                          name="featuredLeftItem"
                          checked={isFeaturedLeft}
                          onChange={() => {
                            setFeaturedId(item.id);
                            // If selected for left, remove from right side if it was checked
                            if (selectedRightIds.includes(item.id)) {
                              setSelectedRightIds((prev) => prev.filter((id) => id !== item.id));
                            }
                          }}
                          className="w-4 h-4 text-accent focus:ring-accent"
                        />
                        <span>Set as Big Left Card (Featured)</span>
                      </label>

                      <label className={`flex items-center gap-2.5 cursor-pointer text-xs font-bold p-2 rounded-lg border ${
                        isFeaturedLeft
                          ? "opacity-50 pointer-events-none bg-gray-100 border-gray-200 text-muted"
                          : "bg-white border-border hover:border-primary/40 text-primary"
                      }`}>
                        <input
                          type="checkbox"
                          checked={isSelectedRight}
                          disabled={isFeaturedLeft}
                          onChange={() => toggleRightSelection(item.id)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <span>Show on Right Side (Compact)</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
