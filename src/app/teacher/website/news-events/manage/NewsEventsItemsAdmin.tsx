"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Plus, Edit2, Trash2, Calendar, Trophy, Bell, MapPin, Clock, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { deleteSectionItem } from "@/features/website-cms/actions/content-actions";
import { CascadeDeletionDetails } from "@/components/common/cascade-deletion-details";
import NewsEventsModal from "./NewsEventsModal";

export default function NewsEventsItemsAdmin({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const executeDelete = async (id: string) => {
    try {
      setIsDeleting(id);
      await deleteSectionItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Item deleted successfully");
      setConfirmDeleteId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    } finally {
      setIsDeleting(null);
    }
  };

  const onSaveComplete = (updatedItem: any, isNew: boolean) => {
    if (isNew) {
      setItems((prev) => [...prev, updatedItem]);
    } else {
      setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
    }
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-primary">News & Events List ({items.length})</h2>
        <button
          onClick={handleAddNew}
          className="primary-btn flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Item</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-2xl">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">No custom news or events created yet.</p>
          <p className="text-xs text-slate-400 mt-1">The public page will display our high-quality default curated items until you add custom items here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="border rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col justify-between space-y-4 bg-slate-50/50"
            >
              <div className="flex items-start gap-4">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                  <Image
                    src={item.imageUrl || item.mediaUrl || "/images/gallery-event.png"}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                      {item.category || "NOTICE"}
                    </span>
                    {item.isFeatured && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent text-[#010E62] uppercase">
                        Spotlight
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-400">
                      {item.date} {item.month}
                    </span>
                  </div>

                  <h3 className="font-bold text-primary truncate">{item.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{item.excerpt}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t text-xs">
                <span className="text-slate-400 font-medium truncate max-w-[200px]">
                  {item.location || "Campus Venue"}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(item.id)}
                    disabled={isDeleting === item.id}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NewsEventsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={editingItem}
        onSaveComplete={onSaveComplete}
      />

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-rose-300 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-800 rounded-xl shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-primary text-base">Permanent Delete</h4>
                <p className="text-xs text-muted leading-relaxed font-medium mt-1">
                  Are you sure you want to permanently delete this news/event post from the website? This action cannot be undone.
                </p>
              </div>
            </div>

            <CascadeDeletionDetails
              entityName="News or Event Post"
              deletedItems={[
                { label: "Website News/Event Post", description: "The public bulletin story and any spotlight features on the homepage/news page" },
              ]}
              preservedItems={[
                { label: "Archival Media & Logs", description: "The institutional archives and internal teacher announcement boards remain untouched" },
              ]}
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={isDeleting === confirmDeleteId}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => executeDelete(confirmDeleteId)}
                disabled={isDeleting === confirmDeleteId}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all font-extrabold text-xs disabled:opacity-50"
              >
                {isDeleting === confirmDeleteId ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
