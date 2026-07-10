"use client";

import React, { useState } from "react";
import { Plus, X, Save, GripVertical } from "lucide-react";
import { toast } from "react-hot-toast";
import { updatePageSection } from "@/features/website-cms/actions/content-actions";

export default function MaterialsCategoriesAdmin({ initialData }: { initialData: any }) {
  const [categories, setCategories] = useState<string[]>(
    initialData?.content?.categories || []
  );
  const [newCategory, setNewCategory] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAdd = () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) {
      toast.error("Category already exists");
      return;
    }
    setCategories([...categories, newCategory.trim()]);
    setNewCategory("");
  };

  const handleRemove = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const data = { categories };
      await updatePageSection("MATERIALS", "MATERIALS_CATEGORIES", { content: data, status: "PUBLISHED" });
      toast.success("Categories saved successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save categories");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
      <div className="p-6 border-b border-border bg-bg-soft/50">
        <h3 className="font-bold text-primary">Categories List</h3>
        <p className="text-sm text-muted">These categories will appear in the filter bar on the public materials page.</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. Lecture Notes, MCQ Sheets, Suggestions..."
            className="flex-1 rounded-xl border border-border px-4 py-2.5 outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={handleAdd}
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add
          </button>
        </div>

        <div className="space-y-3">
          {categories.length === 0 ? (
            <div className="text-center py-8 bg-bg-soft rounded-xl border border-dashed border-border text-muted">
              No categories added yet.
            </div>
          ) : (
            categories.map((cat, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 px-4 bg-white border border-border rounded-xl group hover:border-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted cursor-move" />
                  <span className="font-semibold text-text">{cat}</span>
                </div>
                <button
                  onClick={() => handleRemove(index)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-6 border-t border-border bg-bg-soft/50 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-6 py-2.5 bg-accent text-white rounded-xl font-bold flex items-center gap-2 hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Save Categories
        </button>
      </div>
    </div>
  );
}
