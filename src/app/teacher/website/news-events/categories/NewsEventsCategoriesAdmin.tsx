"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, GripVertical, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { updatePageSection } from "@/features/website-cms/actions/content-actions";

export default function NewsEventsCategoriesAdmin({ initialData }: { initialData: any }) {
  const router = useRouter();
  
  const defaultCategories = ["EVENT", "NOTICE", "NEWS"];
  
  const [categories, setCategories] = useState<string[]>(
    initialData?.content?.categories && Array.isArray(initialData.content.categories) && initialData.content.categories.length > 0
      ? initialData.content.categories
      : defaultCategories
  );
  const [newCategory, setNewCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Sync state if initialData changes (User Rule 2: React App Router State Sync)
  useEffect(() => {
    if (initialData?.content?.categories && Array.isArray(initialData.content.categories) && initialData.content.categories.length > 0) {
      setCategories(initialData.content.categories);
    }
  }, [initialData]);

  const handleAdd = () => {
    const formatted = newCategory.trim().toUpperCase();
    if (!formatted) return;
    if (categories.some(cat => cat.toUpperCase() === formatted)) {
      toast.error("Category already exists!");
      return;
    }
    setCategories([...categories, formatted]);
    setNewCategory("");
  };

  const handleRemove = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (categories.length === 0) {
      toast.error("Please keep at least one category.");
      return;
    }
    setIsLoading(true);
    try {
      const data = { categories };
      await updatePageSection("NEWS_EVENTS", "NEWS_EVENTS_CATEGORIES", { content: data, status: "PUBLISHED" });
      toast.success("News & Events categories saved successfully!");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save categories");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="p-6 border-b border-border bg-slate-50/70">
        <h3 className="font-bold text-primary">News & Events Categories List</h3>
        <p className="text-xs text-muted mt-0.5">
          These categories will appear in the dropdown when adding/editing news cards, and as filter tabs on the public page.
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. SCHOLARSHIP, WORKSHOP, EXAM ROUTINE..."
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-bold uppercase outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
          />
          <button
            onClick={handleAdd}
            type="button"
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>

        <div className="space-y-3">
          {categories.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-border text-muted text-sm font-medium">
              No categories added yet. Add your first category above.
            </div>
          ) : (
            categories.map((cat, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3.5 px-4 bg-white border border-border rounded-xl group hover:border-accent/80 hover:shadow-xs transition-all"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
                  <span className="font-extrabold text-sm text-primary tracking-wide">{cat}</span>
                </div>
                <button
                  onClick={() => handleRemove(index)}
                  type="button"
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove Category"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-6 border-t border-border bg-slate-50/70 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isLoading}
          type="button"
          className="primary-btn px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md hover:scale-102 transition-transform disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Categories</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
