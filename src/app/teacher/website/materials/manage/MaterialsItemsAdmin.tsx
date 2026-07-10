"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Plus, Edit2, Trash2, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { deleteSectionItem } from "@/features/website-cms/actions/content-actions";
import MaterialsItemModal from "./MaterialsItemModal";

export default function MaterialsItemsAdmin({ initialItems, categories }: { initialItems: any[], categories: string[] }) {
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
    if (!confirm("Are you sure you want to delete this material?")) return;
    
    try {
      setIsDeleting(id);
      await deleteSectionItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Material deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete material");
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
        <h2 className="text-lg font-bold">Existing Materials</h2>
        <button onClick={handleAddNew} className="primary-btn flex items-center space-x-2 text-sm px-4 py-2">
          <Plus className="w-4 h-4" />
          <span>Add New Material</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 bg-bg-soft rounded-xl border border-dashed border-border">
          <p className="text-muted">No materials added yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => {
            const meta = item.metadata || {};
            const imgUrl = item.mediaUrl || (meta.fileType === "IMAGE" ? meta.fileUrl : "/placeholder.jpg");
            
            return (
              <div key={item.id} className="border border-border rounded-xl overflow-hidden shadow-sm flex flex-col group relative">
                
                {/* Actions Overlay */}
                <div className="absolute top-2 right-2 flex space-x-2 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEdit(item)}
                    className="p-2 bg-white rounded-lg shadow-md text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    disabled={isDeleting === item.id}
                    className="p-2 bg-white rounded-lg shadow-md text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {isDeleting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>

                <div className="relative w-full h-40 bg-bg-soft border-b border-border overflow-hidden">
                  <Image src={imgUrl} alt={item.title} fill className="object-cover" />
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider shadow-sm flex items-center gap-1.5">
                    {meta.fileType === "PDF" ? <FileText className="w-3.5 h-3.5 text-red-500" /> : <ImageIcon className="w-3.5 h-3.5 text-blue-500" />}
                    {meta.fileType}
                  </div>
                </div>
                
                <div className="p-4 flex flex-col flex-grow bg-white">
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider mb-1">
                    {item.subtitle} {/* Category */}
                  </span>
                  <h3 className="font-bold text-primary text-base leading-tight mb-2 line-clamp-2">{item.title}</h3>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <MaterialsItemModal 
          item={editingItem} 
          categories={categories}
          onClose={() => setIsModalOpen(false)} 
          onSave={onSaveComplete}
        />
      )}
    </div>
  );
}
