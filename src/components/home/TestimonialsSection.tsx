"use client";

import React, { useState } from "react";
import { testimonials as fallbackTestimonials } from "@/data/testimonials";
import { Star, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import toast from "react-hot-toast";
import { submitReview } from "@/features/website-cms/actions/testimonials-actions";
import Link from "next/link";

interface TestimonialsSectionProps {
  initialTestimonials?: any[];
  headerData?: any;
}

export default function TestimonialsSection({ initialTestimonials, headerData }: TestimonialsSectionProps) {
  const shouldReduceMotion = useReducedMotion();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [role, setRole] = useState<"Student" | "Parent">("Student");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [batch, setBatch] = useState("");
  const [achievement, setAchievement] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTestimonials = initialTestimonials && initialTestimonials.length > 0
    ? initialTestimonials
    : fallbackTestimonials;

  // Distribute testimonials into responsive columns dynamically (REMOVED: using tailwind columns instead)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const headerVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 15 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Please enter your name");
    if (!message.trim()) return toast.error("Please enter a review message");
    if (!batch.trim()) return toast.error("Please specify your batch (e.g. HSC 2025)");

    try {
      setIsSubmitting(true);
      await submitReview({
        name,
        role,
        message,
        rating,
        batch,
        achievement: achievement.trim() || undefined
      });
      toast.success("Thank you! Your review has been submitted for approval.");
      
      // Reset form
      setName("");
      setRole("Student");
      setMessage("");
      setRating(5);
      setBatch("");
      setAchievement("");
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  const TestimonialCard = ({ item }: { item: any }) => (
    <div 
      className="brand-card rounded-2xl p-6 bg-white border border-border flex flex-col justify-between space-y-4 hover:shadow-lg hover:border-accent/40 transition-all duration-300 w-full text-left select-none"
    >
      <div className="space-y-3">
        {/* Star Rating */}
        <div className="flex items-center space-x-1">
          {[...Array(item.rating)].map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent shrink-0" />
          ))}
        </div>

        {/* Message */}
        <p className="text-xs sm:text-sm text-text font-semibold leading-relaxed italic">
          "{item.message}"
        </p>
      </div>

      {/* User Info Row */}
      <div className="pt-4 border-t border-border flex items-center space-x-3 mt-auto">
        {/* Initials Avatar */}
        <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-primary text-xs font-extrabold shrink-0 shadow-sm">
          {getInitials(item.name)}
        </div>
        <div className="min-w-0">
          <h4 className="font-extrabold text-primary text-xs sm:text-sm truncate leading-snug">
            {item.name}
          </h4>
          <span className="text-[10px] text-muted block font-semibold truncate">
            {item.batch} {item.achievement ? `| ${item.achievement}` : ""}
          </span>
        </div>
      </div>
    </div>
  );

  // MarqueeColumn has been replaced with CSS columns for a cleaner Gallery-style layout.

  return (
    <section id="testimonials" className="brand-section-wrapper bg-bg-soft relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="brand-container relative">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <motion.h2
            variants={headerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-xs font-bold text-accent tracking-widest uppercase"
          >
            {headerData?.eyebrow || "Testimonials"}
          </motion.h2>
          <motion.p
            variants={headerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight"
          >
            {headerData?.title || "What Parents & Students Say"}
          </motion.p>
          <motion.p
            variants={headerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-text text-sm sm:text-base"
          >
            {headerData?.description || "Honest feedback from students who achieved Board A+ and cracked engineering university admissions under Shifat Sir's guidance."}
          </motion.p>
        </div>

        {/* Masonry Grid (Gallery Style) */}
        <div className="relative max-w-6xl mx-auto w-full px-4 mt-8">
          {currentTestimonials.length > 0 ? (
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
              {currentTestimonials.map((item, index) => (
                <div key={item.id} className="break-inside-avoid">
                  <TestimonialCard item={item} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted italic">
              No testimonials available at the moment.
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="relative z-20 flex flex-wrap items-center justify-center gap-4 mt-10">
          <Link
            href="/reviews"
            className="inline-flex items-center space-x-2 text-sm px-8 py-3.5 border-2 border-primary text-primary hover:bg-primary hover:text-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer font-bold rounded-xl"
          >
            See All Reviews
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="primary-btn inline-flex items-center space-x-2 text-sm px-8 py-3.5 shadow-md hover:scale-[1.02] active:scale-95 transition-all duration-200 cursor-pointer font-bold rounded-xl"
          >
            Submit a Review
          </button>
        </div>
      </div>

      {/* Aesthetic Star-theme Review Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-dark/40 backdrop-blur-sm">
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-bg-soft border border-border rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 z-10 text-left"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 text-muted hover:text-primary hover:bg-black/5 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-primary">Submit Your Review</h3>
                  <p className="text-xs text-muted font-semibold mt-1">
                    Your feedback motivates us to deliver the best educational support.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Role and Star Rating Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Role Selector */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                        Role
                      </label>
                      <div className="grid grid-cols-2 gap-2 bg-white p-1 border border-border rounded-xl">
                        {(["Student", "Parent"] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className={`py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                              role === r
                                ? "bg-accent text-primary shadow-sm"
                                : "text-muted hover:text-primary"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interactive Star Rating */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                        Rating
                      </label>
                      <div className="flex items-center space-x-1.5 h-10">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            className="p-0.5 focus:outline-none transition-transform active:scale-95"
                          >
                            <Star
                              className={`w-6 h-6 transition-all ${
                                star <= (hoveredRating || rating)
                                  ? "fill-accent text-accent scale-105"
                                  : "text-gray-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={
                        role === "Parent"
                          ? "e.g. Mother of Abrar / Father of Fahim"
                          : "e.g. Adib Hasan"
                      }
                      className="w-full px-4 py-2.5 text-sm bg-white border border-border rounded-xl focus:outline-none focus:border-accent font-semibold text-primary transition"
                    />
                  </div>

                  {/* Message Input */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                      Review Message
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your honest review here..."
                      className="w-full px-4 py-2.5 text-sm bg-white border border-border rounded-xl focus:outline-none focus:border-accent font-semibold text-primary transition resize-none"
                    />
                  </div>

                  {/* Batch & Achievement Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Batch Input */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                        Batch
                      </label>
                      <input
                        type="text"
                        required
                        value={batch}
                        onChange={(e) => setBatch(e.target.value)}
                        placeholder="e.g. HSC Batch 2025"
                        className="w-full px-4 py-2.5 text-sm bg-white border border-border rounded-xl focus:outline-none focus:border-accent font-semibold text-primary transition"
                      />
                    </div>

                    {/* Achievement Input */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                        Achievement (Optional)
                      </label>
                      <input
                        type="text"
                        value={achievement}
                        onChange={(e) => setAchievement(e.target.value)}
                        placeholder="e.g. BUET CSE / board A+"
                        className="w-full px-4 py-2.5 text-sm bg-white border border-border rounded-xl focus:outline-none focus:border-accent font-semibold text-primary transition"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full primary-btn py-3 font-extrabold shadow-lg rounded-xl flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition disabled:opacity-50 cursor-pointer text-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <span>Submit Review</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
