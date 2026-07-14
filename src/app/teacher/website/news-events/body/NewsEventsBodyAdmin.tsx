"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit3, Calendar, Clock, MapPin, Image as ImageIcon, Sparkles, Loader2, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { upsertSectionItem, deleteSectionItem } from "@/features/website-cms/actions/content-actions";
import { MediaSelector } from "@/features/website-cms/components/MediaSelector";

export interface CardItem {
  id: string;
  title: string;
  category: "EVENT" | "NOTICE" | "NEWS";
  date: string;
  month: string;
  time: string;
  location: string;
  excerpt: string;
  fullContent: string | string[];
  imageUrl: string;
  media_id?: string | null;
  isFeatured: boolean;
  isNew?: boolean;
}

export default function NewsEventsBodyAdmin({ initialItems }: { initialItems: any[] }) {
  const router = useRouter();

  // Format incoming database items into editable CardItem objects
  const formatItems = (dbItems: any[]): CardItem[] => {
    return (dbItems || []).map((item) => {
      const meta = item.metadata || {};
      return {
        id: item.id || `item-${Math.random().toString(36).substring(2, 9)}`,
        title: item.title || meta.title || "Untitled Announcement",
        category: item.subtitle || meta.category || "NOTICE",
        date: meta.date || item.date || "15",
        month: meta.month || item.month || "AUG",
        time: meta.time || item.time || "4:00 PM - 9:00 PM",
        location: meta.location || item.location || "Shifat's Tales Campus, Rangunia",
        excerpt: item.body || meta.excerpt || item.excerpt || "",
        fullContent: Array.isArray(meta.fullContent)
          ? meta.fullContent.join("\n\n")
          : meta.fullContent || item.body || "",
        imageUrl: item.mediaUrl || meta.imageUrl || item.imageUrl || "/images/gallery-event.png",
        media_id: item.media_id || meta.media_id || null,
        isFeatured: meta.isFeatured || item.isFeatured || false,
        isNew: false,
      };
    });
  };

  const [itemsList, setItemsList] = useState<CardItem[]>(formatItems(initialItems));
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);

  // Sync with initialItems on router.refresh() (User Rule 2: React App Router State Sync)
  useEffect(() => {
    setItemsList(formatItems(initialItems));
  }, [initialItems]);

  const handleAddCard = () => {
    const newCard: CardItem = {
      id: `temp-${Date.now()}`,
      title: "New Announcement / Event Title",
      category: "NOTICE",
      date: "01",
      month: "SEP",
      time: "4:00 PM - 6:00 PM",
      location: "Shifat's Tales Campus, Rangunia",
      excerpt: "Brief summary explaining what this announcement or event is about.",
      fullContent: "First paragraph describing the full details of this notice or event.\n\nSecond paragraph with instructions or requirements for students.",
      imageUrl: "/images/gallery-event.png",
      media_id: null,
      isFeatured: false,
      isNew: true,
    };
    setItemsList([newCard, ...itemsList]);
    toast.success("New card added at the top! Fill in the details and click Save Card.");
  };

  const updateCardField = (index: number, field: keyof CardItem, value: any) => {
    const newList = [...itemsList];
    newList[index] = { ...newList[index], [field]: value };
    setItemsList(newList);
  };

  const handleSaveCard = async (index: number) => {
    const card = itemsList[index];
    if (!card.title || !card.excerpt) {
      toast.error("Please fill in at least the Title and Summary Excerpt.");
      return;
    }

    try {
      setSavingId(card.id);

      const fullContentArray = typeof card.fullContent === "string"
        ? card.fullContent.split("\n\n").map((p) => p.trim()).filter((p) => p !== "")
        : card.fullContent;

      const payload = {
        id: card.isNew ? undefined : card.id,
        title: card.title,
        subtitle: card.category,
        body: card.excerpt,
        media_id: card.media_id || null,
        status: "PUBLISHED" as const,
        metadata: {
          category: card.category,
          date: card.date,
          month: card.month,
          time: card.time,
          location: card.location,
          excerpt: card.excerpt,
          fullContent: fullContentArray,
          imageUrl: card.imageUrl,
          isFeatured: card.isFeatured,
        },
      };

      await upsertSectionItem("NEWS_EVENTS_ITEMS", payload);

      toast.success("Card saved successfully!");
      router.refresh(); // Sync server and client state
    } catch (err: any) {
      toast.error(err.message || "Failed to save card item.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteCard = async (index: number) => {
    const card = itemsList[index];

    if (card.isNew) {
      // If it hasn't been saved to database yet, just remove from local array
      setItemsList(itemsList.filter((_, i) => i !== index));
      toast.success("Unsaved card removed.");
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete "${card.title}"?`)) {
      return;
    }

    try {
      setDeletingId(card.id);
      await deleteSectionItem(card.id);
      setItemsList(itemsList.filter((_, i) => i !== index));
      toast.success("Card deleted successfully!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-border shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-primary">Card Management System ({itemsList.length} items)</h2>
          <p className="text-xs text-muted mt-0.5">
            Add news articles, workshop flyers, or admission notices one by one.
          </p>
        </div>
        <button
          onClick={handleAddCard}
          type="button"
          className="primary-btn flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:scale-102 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Card</span>
        </button>
      </div>

      {itemsList.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-border p-12 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-primary">No News or Events Cards Yet</h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            Click &quot;Add New Card&quot; above to create your first announcement, exam routine notice, or workshop registration flyer.
          </p>
          <button
            onClick={handleAddCard}
            type="button"
            className="primary-btn px-5 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Card</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {itemsList.map((card, idx) => (
            <div
              key={card.id}
              className={`bg-white border rounded-2xl p-6 shadow-sm transition-all space-y-6 ${
                card.isNew ? "border-accent/80 bg-[#FFF9F2]/30 ring-2 ring-accent/20" : "border-border hover:border-border/80"
              }`}
            >
              {/* Card Header Info & Quick Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-[#FFF9F2] border border-[#E8DDBF]/80 flex items-center justify-center font-black text-xs text-[#010E62]">
                    #{idx + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-primary truncate max-w-md">
                      {card.title || "New Announcement"}
                    </h3>
                    <span className="text-[11px] font-semibold text-muted flex items-center gap-2">
                      <span>Category: {card.category}</span>
                      <span>•</span>
                      <span>Date: {card.date} {card.month}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-border px-3 py-1.5 rounded-xl text-xs font-bold text-primary hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={card.isFeatured}
                      onChange={(e) => updateCardField(idx, "isFeatured", e.target.checked)}
                      className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent"
                    />
                    <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span>Spotlight Featured</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleDeleteCard(idx)}
                    disabled={deletingId === card.id}
                    className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50"
                    title="Delete Card"
                  >
                    {deletingId === card.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Card Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Left 8 Cols: Text Info */}
                <div className="md:col-span-8 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-muted uppercase mb-1">
                        Title / Headline <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={card.title}
                        onChange={(e) => updateCardField(idx, "title", e.target.value)}
                        placeholder="e.g. HSC '26 Orientation Workshop"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm font-bold text-primary focus:ring-2 focus:ring-accent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted uppercase mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={card.category}
                        onChange={(e) => updateCardField(idx, "category", e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm font-bold text-primary bg-white focus:ring-2 focus:ring-accent outline-none"
                      >
                        <option value="EVENT">EVENT (Workshop / Seminar)</option>
                        <option value="NOTICE">NOTICE (Routine / Exam)</option>
                        <option value="NEWS">NEWS (Results / Spotlight)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-muted uppercase mb-1">Date (Day)</label>
                      <input
                        type="text"
                        value={card.date}
                        onChange={(e) => updateCardField(idx, "date", e.target.value)}
                        placeholder="e.g. 25"
                        className="w-full px-3.5 py-2 rounded-xl border border-border text-sm font-semibold focus:ring-2 focus:ring-accent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted uppercase mb-1">Month</label>
                      <input
                        type="text"
                        value={card.month}
                        onChange={(e) => updateCardField(idx, "month", e.target.value)}
                        placeholder="e.g. AUG"
                        className="w-full px-3.5 py-2 rounded-xl border border-border text-sm font-semibold focus:ring-2 focus:ring-accent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted uppercase mb-1">Schedule / Time</label>
                      <input
                        type="text"
                        value={card.time}
                        onChange={(e) => updateCardField(idx, "time", e.target.value)}
                        placeholder="e.g. 3:30 PM - 6:30 PM"
                        className="w-full px-3.5 py-2 rounded-xl border border-border text-sm font-semibold focus:ring-2 focus:ring-accent outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted uppercase mb-1">Venue / Location</label>
                      <input
                        type="text"
                        value={card.location}
                        onChange={(e) => updateCardField(idx, "location", e.target.value)}
                        placeholder="e.g. Campus Counter"
                        className="w-full px-3.5 py-2 rounded-xl border border-border text-sm font-semibold focus:ring-2 focus:ring-accent outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted uppercase mb-1">
                      Summary Excerpt <span className="text-red-500">*</span> (Shown on card lists)
                    </label>
                    <textarea
                      rows={2}
                      value={card.excerpt}
                      onChange={(e) => updateCardField(idx, "excerpt", e.target.value)}
                      placeholder="Brief overview summarizing this news or event (1-2 sentences)..."
                      className="w-full px-3.5 py-2 rounded-xl border border-border text-sm font-medium focus:ring-2 focus:ring-accent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-muted uppercase mb-1">
                      Full Article / Details (Shown when single page is opened)
                    </label>
                    <textarea
                      rows={4}
                      value={typeof card.fullContent === "string" ? card.fullContent : card.fullContent.join("\n\n")}
                      onChange={(e) => updateCardField(idx, "fullContent", e.target.value)}
                      placeholder="Write full paragraphs explaining all details, rules, or instructions. Separate multiple paragraphs with blank lines."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm font-medium focus:ring-2 focus:ring-accent outline-none leading-relaxed"
                    />
                    <span className="text-[11px] text-muted font-medium mt-1 block">
                      Tip: Press Enter twice (leave a blank line) between paragraphs for clean formatting on the detail page.
                    </span>
                  </div>
                </div>

                {/* Right 4 Cols: Cover Image Upload/Choose (User Rule 3: Media Selection Strategy) */}
                <div className="md:col-span-4 space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-border/80 flex flex-col justify-between">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-primary uppercase">
                      Card Cover Flyer / Image
                    </label>
                    
                    <div className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-200 border border-border shadow-xs">
                      {card.imageUrl ? (
                        <Image
                          src={card.imageUrl}
                          alt="Cover preview"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted p-4 text-center">
                          <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                          <span className="text-xs font-semibold">No flyer image selected</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingImageIndex(idx)}
                      className="w-full py-2.5 px-4 rounded-xl bg-white border border-border text-primary font-bold text-xs shadow-xs hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4 text-accent" />
                      <span>{card.imageUrl ? "Change / Upload Image" : "Select Flyer Image"}</span>
                    </button>
                    <p className="text-[10px] text-muted leading-tight text-center">
                      Provides both &apos;Upload New&apos; and &apos;Choose Existing Media&apos; options from your database library.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Footer: Save Button */}
              <div className="flex items-center justify-between pt-4 border-t border-border/60 bg-slate-50/50 -mx-6 -mb-6 p-4 rounded-b-2xl px-6">
                <span className="text-xs text-muted font-semibold flex items-center gap-1.5">
                  {card.isNew ? (
                    <span className="text-amber-600 font-bold">● Unsaved Draft Card</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">● Saved in Database</span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => handleSaveCard(idx)}
                  disabled={savingId === card.id}
                  className="primary-btn px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md hover:scale-102 transition-transform disabled:opacity-50"
                >
                  {savingId === card.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Card...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Card Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media Selector Modal (Upload / Choose Existing Media) */}
      {editingImageIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl border border-border">
            <div className="flex justify-between items-center pb-2 border-b">
              <h4 className="font-bold text-primary">Select or Upload Card Cover Flyer</h4>
              <button
                type="button"
                onClick={() => setEditingImageIndex(null)}
                className="text-muted hover:text-primary p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <MediaSelector
              folderKey="NEWS_EVENTS"
              onSelect={(id: string, url?: string) => {
                if (editingImageIndex !== null) {
                  if (url) updateCardField(editingImageIndex, "imageUrl", url);
                  updateCardField(editingImageIndex, "media_id", id);
                  setEditingImageIndex(null);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
