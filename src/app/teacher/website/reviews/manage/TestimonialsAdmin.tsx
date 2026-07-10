"use client";

import React, { useState, useEffect } from "react";
import { Star, Trash2, Loader2, Check, X, User } from "lucide-react";
import toast from "react-hot-toast";
import { 
  TestimonialItem, 
  toggleTestimonialApproval, 
  deleteTestimonial 
} from "@/features/website-cms/actions/testimonials-actions";
import { useRouter } from "next/navigation";

export default function TestimonialsAdmin({ 
  initialTestimonials 
}: { 
  initialTestimonials: TestimonialItem[] 
}) {
  const router = useRouter();
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(initialTestimonials);
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sync state with server-side props
  useEffect(() => {
    setTestimonials(initialTestimonials);
  }, [initialTestimonials]);

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      setLoadingId(id);
      await toggleTestimonialApproval(id, !currentStatus);
      toast.success(currentStatus ? "Testimonial hidden from home page" : "Testimonial published on home page");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update testimonial status");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoadingId(id);
      await deleteTestimonial(id);
      toast.success("Testimonial deleted successfully");
      setDeleteConfirmId(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete testimonial");
    } finally {
      setLoadingId(null);
    }
  };

  // Filtered testimonials
  const filteredTestimonials = testimonials.filter((item) => {
    if (filter === "approved") return item.is_approved;
    if (filter === "pending") return !item.is_approved;
    return true;
  });

  const totalReviews = testimonials.length;
  const approvedReviews = testimonials.filter(t => t.is_approved).length;
  const pendingReviews = totalReviews - approvedReviews;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Reviews</p>
            <h3 className="text-3xl font-extrabold text-[#08132E] mt-1">{totalReviews}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
            <User className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Published on Home</p>
            <h3 className="text-3xl font-extrabold text-green-600 mt-1">{approvedReviews}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
            <Check className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Pending Moderation</p>
            <h3 className="text-3xl font-extrabold text-amber-500 mt-1">{pendingReviews}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
            <X className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex space-x-2">
          {(["all", "approved", "pending"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 uppercase tracking-wider ${
                filter === tab
                  ? "bg-accent text-primary shadow-sm"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab === "all" ? "All Reviews" : tab === "approved" ? "Published" : "Pending"}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500 font-semibold">
          Showing {filteredTestimonials.length} reviews
        </div>
      </div>

      {/* Reviews Grid */}
      {filteredTestimonials.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-border p-12 text-center">
          <p className="text-gray-500 font-semibold text-sm">No testimonials found matching this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredTestimonials.map((item) => (
            <div 
              key={item.id} 
              className={`bg-white p-6 rounded-2xl shadow-sm border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                item.is_approved ? "border-green-100 hover:border-green-200" : "border-amber-100 hover:border-amber-200"
              }`}
            >
              <div className="flex items-start gap-4 flex-grow min-w-0">
                {/* Avatar Initials */}
                <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-primary text-sm font-extrabold shrink-0 shadow-sm">
                  {getInitials(item.name)}
                </div>
                
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-extrabold text-[#08132E] text-base leading-snug">{item.name}</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                      item.role === "Student" 
                        ? "bg-blue-50 text-blue-600 border border-blue-100" 
                        : "bg-purple-50 text-purple-600 border border-purple-100"
                    }`}>
                      {item.role}
                    </span>
                    <span className="text-xs text-gray-400 font-semibold">
                      {new Date(item.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 shrink-0 ${
                          i < item.rating ? "fill-accent text-accent" : "text-gray-200"
                        }`} 
                      />
                    ))}
                  </div>

                  <p className="text-sm text-gray-700 leading-relaxed font-medium italic">
                    "{item.message}"
                  </p>

                  <div className="text-xs text-gray-500 font-bold">
                    Batch: <span className="text-primary">{item.batch}</span>
                    {item.achievement && (
                      <>
                        <span className="mx-2 text-gray-300">|</span>
                        Achievement: <span className="text-accent">{item.achievement}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Column */}
              <div className="flex items-center gap-4 shrink-0 self-end md:self-center border-t md:border-t-0 pt-4 md:pt-0">
                {/* Switch for Show/Hide on Homepage */}
                <div className="flex items-center space-x-2.5">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                    {item.is_approved ? "Visible" : "Hidden"}
                  </span>
                  <button
                    onClick={() => handleToggleApproval(item.id, item.is_approved)}
                    disabled={loadingId === item.id}
                    className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-none ${
                      item.is_approved ? "bg-accent" : "bg-gray-300"
                    } ${loadingId === item.id ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                        item.is_approved ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Delete Button */}
                {deleteConfirmId === item.id ? (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={loadingId === item.id}
                      className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      title="Confirm Delete"
                    >
                      {loadingId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="Delete Review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
