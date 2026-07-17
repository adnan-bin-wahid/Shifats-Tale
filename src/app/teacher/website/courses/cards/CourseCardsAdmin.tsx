"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Calendar, Clock, Loader2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { deleteSectionItem } from "@/features/website-cms/actions/content-actions";
import { CascadeDeletionDetails } from "@/components/common/cascade-deletion-details";
import CourseCardModal from "./CourseCardModal";

export default function CourseCardsAdmin({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  
  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

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
      toast.success("Course card deleted successfully");
      setConfirmDeleteId(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete course card");
    } finally {
      setIsDeleting(null);
    }
  };

  const router = useRouter();

  const onSaveComplete = (updatedItem: any, isNew: boolean) => {
    if (isNew) {
      setItems((prev) => [...prev, updatedItem]);
    } else {
      setItems((prev) => prev.map((item) => item.id === updatedItem.id ? updatedItem : item));
    }
    setIsModalOpen(false);
    router.refresh(); // Tell Next.js to update the cache in the background
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">Existing Courses</h2>
        <button onClick={handleAddNew} className="primary-btn flex items-center space-x-2 text-sm px-4 py-2">
          <Plus className="w-4 h-4" />
          <span>Add New Course</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground">No course cards added yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const meta = item.metadata || {};
            const imgUrl = item.mediaUrl || meta.fallbackImageUrl || "/placeholder.jpg";
            
            return (
              <div key={item.id} className="border border-border rounded-xl overflow-hidden shadow-sm flex flex-col group relative">
                
                {/* Actions Overlay */}
                <div className="absolute top-2 right-2 flex space-x-2 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEdit(item)}
                    className="p-2 bg-white rounded-lg shadow text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setConfirmDeleteId(item.id)}
                    disabled={isDeleting === item.id}
                    className="p-2 bg-white rounded-lg shadow text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {isDeleting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>

                <div className="relative w-full h-40 bg-[#FFF9F2] p-4 flex items-center justify-center border-b border-border">
                  <Image src={imgUrl} alt={item.title} fill className="object-contain p-2" />
                </div>
                
                <div className="p-4 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded">
                      {meta.target || "N/A"}
                    </span>
                    <span className="text-xs text-muted-foreground border px-2 py-1 rounded">
                      {meta.examType || "N/A"}
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-[#08132E] text-lg leading-tight mb-1">{item.title}</h3>
                  <p className="text-xs font-semibold text-accent mb-2">{item.subtitle}</p>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-grow">
                    {item.body}
                  </p>

                  <div className="flex justify-between items-center text-xs text-gray-500 mt-auto pt-4 border-t border-border">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{meta.schedule || "N/A"}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{meta.duration || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <CourseCardModal 
          item={editingItem} 
          onClose={() => setIsModalOpen(false)} 
          onSave={onSaveComplete}
        />
      )}

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
                  Are you sure you want to permanently delete this course display card from the website? This action cannot be undone.
                </p>
              </div>
            </div>

            <CascadeDeletionDetails
              entityName="Course Card"
              deletedItems={[
                {
                  label: "Website Section Display Row",
                  description: "The public course card item in the website content table",
                  subItems: [
                    "Database content row (`website_content` / section items table)",
                    "Course card thumbnail image link and feature highlight bullets",
                    "Course pricing banner and public join button redirect on the website",
                  ],
                },
              ]}
              preservedItems={[
                {
                  label: "Actual Academic Batches",
                  description: "The underlying academic batches and enrolled students remain 100% untouched",
                  subItems: [
                    "The teacher's internal academic batches (`batches` table)",
                    "Enrolled student accounts, fee ledgers, and classroom routines",
                  ],
                },
                {
                  label: "Other Website Sections",
                  description: "All other homepage and course catalog items remain intact",
                  subItems: [
                    "Other published course cards and programs on the website",
                    "Hero banner, teachers showcase, and student reviews sections",
                  ],
                },
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
