"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Plus, Edit2, Trash2, Loader2, Trophy, BookOpen, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { deleteSectionItem } from "@/features/website-cms/actions/content-actions";
import StudentCardModal from "./StudentCardModal";

export default function StudentCardsAdmin({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  
  React.useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student's result?")) return;
    
    try {
      setIsDeleting(id);
      await deleteSectionItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Student result deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete student result");
    } finally {
      setIsDeleting(null);
    }
  };

  const onSaveComplete = (updatedItem: any, isNew: boolean) => {
    if (isNew) {
      setItems((prev) => [...prev, updatedItem]);
    } else {
      setItems((prev) => prev.map((item) => item.id === updatedItem.id ? updatedItem : item));
    }
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">Existing Results</h2>
        <button onClick={handleAddNew} className="primary-btn flex items-center space-x-2 text-sm px-4 py-2">
          <Plus className="w-4 h-4" />
          <span>Add New Result</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground">No student results added yet.</p>
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
                    onClick={() => handleDelete(item.id)}
                    disabled={isDeleting === item.id}
                    className="p-2 bg-white rounded-lg shadow text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {isDeleting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex p-4 gap-4 items-center border-b border-border bg-[#FFF9F2]">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-accent shadow-sm shrink-0">
                    <Image src={imgUrl} alt={item.title} fill className="object-cover" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#08132E] text-lg leading-tight">{item.title}</h3>
                    <p className="text-xs font-semibold text-accent">{item.subtitle}</p>
                  </div>
                </div>
                
                <div className="p-4 flex flex-col flex-grow">
                  <div className="mb-4">
                    {meta.examType ? (
                      <span className="text-xs font-bold text-gray-500 border px-2 py-1 rounded inline-block mb-2">
                        {meta.examType}
                      </span>
                    ) : null}
                    {meta.achievement && (
                      <div className="flex items-start space-x-2 text-sm font-semibold text-gray-800">
                        <Trophy className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <span>{meta.achievement}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs text-gray-500 mt-auto pt-4 border-t border-border min-h-[32px]">
                    {meta.year && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{meta.year}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <StudentCardModal 
          item={editingItem} 
          onClose={() => setIsModalOpen(false)} 
          onSave={onSaveComplete}
        />
      )}
    </div>
  );
}
