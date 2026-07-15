"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, MapPin, ArrowRight, Bell, Sparkles, Trophy } from "lucide-react";
import { motion } from "framer-motion";

export default function HomeNewsEventsSection({
  headerData,
  newsItems = [],
}: {
  headerData?: any;
  newsItems?: any[];
}) {
  const eyebrowText = headerData?.eyebrow || "Latest Updates";
  const titleText = headerData?.title || "News & Academic Events";
  const descriptionText =
    headerData?.description ||
    "Stay informed with our orientation schedules, scholarship model tests, revision plans, and success celebrations.";

  // Extract primary title word and highlight word
  const titleParts = titleText.split(" ");
  const firstWord = titleParts[0];
  const restWords = titleParts.slice(1).join(" ");

  // Selected IDs by admin
  const featuredId = headerData?.content?.featuredId;
  const selectedRightIds: string[] = headerData?.content?.selectedRightIds || [];

  // Determine left big featured item
  let featuredItem = newsItems.find((item) => item.id === featuredId);
  if (!featuredItem && newsItems.length > 0) {
    featuredItem = newsItems.find((item) => item.metadata?.isFeatured || item.isFeatured) || newsItems[0];
  }

  // Determine right smaller items
  let rightItems = selectedRightIds
    .map((id) => newsItems.find((item) => item.id === id))
    .filter(Boolean);

  if (rightItems.length === 0 && newsItems.length > 0) {
    rightItems = newsItems.filter((item) => item.id !== featuredItem?.id).slice(0, 3);
  }

  if (!featuredItem && rightItems.length === 0) {
    return null; // Nothing to show if no items exist at all
  }

  const formatItem = (item: any) => {
    const meta = item.metadata || {};
    return {
      id: item.id || "",
      title: item.title || meta.title || "Untitled Announcement",
      category: item.subtitle || meta.category || "NOTICE",
      date: meta.date || item.date || "15",
      month: meta.month || item.month || "AUG",
      time: meta.time || item.time || "",
      location: meta.location || item.location || "",
      excerpt: item.body || meta.excerpt || item.excerpt || "",
      imageUrl: item.mediaUrl || meta.imageUrl || item.imageUrl || "/images/gallery-event.png",
    };
  };

  const bigCard = featuredItem ? formatItem(featuredItem) : null;
  const smallCards = rightItems.map(formatItem);

  const getCategoryColor = (cat: string) => {
    const upper = (cat || "").toUpperCase();
    if (upper === "EVENT") return "bg-teal-500/15 text-teal-700 border-teal-500/30";
    if (upper === "NOTICE") return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    if (upper === "NEWS") return "bg-[#010E62]/15 text-[#010E62] border-[#010E62]/30";
    return "bg-indigo-500/15 text-indigo-700 border-indigo-500/30";
  };

  return (
    <section className="py-20 md:py-28 bg-[#FFF8E6] dark:bg-[#08122B] relative overflow-hidden transition-colors duration-300 border-t border-[#E8DDBF]/40">
      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-0 w-1/3 h-1/2 bg-[#010E62]/5 dark:bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-1/4 h-1/3 bg-[#FBB503]/5 dark:bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FBB503]/15 border border-[#FBB503]/30 text-[#010E62] dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
            <Bell className="w-3.5 h-3.5 text-accent" />
            <span>{eyebrowText}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[#010E62] dark:text-white tracking-tight mb-4">
            {firstWord} {restWords && <span className="text-accent">{restWords}</span>}
          </h2>
          <p className="text-[#4A5568] dark:text-slate-300 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed font-medium">
            {descriptionText}
          </p>
        </div>

        {/* Layout: Left Big Featured Card (7 Cols) & Right Compact Cards (5 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* LEFT BIG CARD */}
          {bigCard && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-7 flex"
            >
              <Link
                href={`/news-events/${bigCard.id}`}
                className="group flex flex-col w-full bg-white dark:bg-slate-900 border border-[#E8DDBF]/80 dark:border-slate-800 rounded-3xl overflow-hidden shadow-md hover:shadow-2xl hover:border-accent transition-all duration-300"
              >
                {/* Big Image Container */}
                <div className="relative h-64 sm:h-80 md:h-96 w-full bg-[#08132E] overflow-hidden shrink-0">
                  <Image
                    src={bigCard.imageUrl}
                    alt={bigCard.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#08132E]/80 via-transparent to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-10">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase border shadow-md bg-white/95 backdrop-blur-md ${getCategoryColor(
                        bigCard.category
                      )}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{bigCard.category}</span>
                    </span>

                    <div className="bg-[#08132E]/90 backdrop-blur-md border border-white/20 text-white px-4 py-1.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg">
                      <Calendar className="w-4 h-4 text-accent" />
                      <span>
                        {bigCard.date} {bigCard.month}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Big Card Content */}
                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#4A5568] dark:text-slate-400">
                      {bigCard.time && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#010E62] dark:text-accent" />
                          <span>{bigCard.time}</span>
                        </div>
                      )}
                      {bigCard.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#010E62] dark:text-accent" />
                          <span>{bigCard.location}</span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-[#010E62] dark:text-white group-hover:text-accent transition-colors leading-tight line-clamp-2">
                      {bigCard.title}
                    </h3>

                    <p className="text-sm sm:text-base text-[#4A5568] dark:text-slate-300 line-clamp-3 leading-relaxed font-medium">
                      {bigCard.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#E8DDBF]/60 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-accent uppercase tracking-wider">
                      Featured Spotlight
                    </span>
                    <span className="inline-flex items-center gap-2 text-sm font-black text-[#010E62] dark:text-white group-hover:text-accent transition-colors">
                      <span>Read Details</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* RIGHT SMALL COMPACT CARDS (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {smallCards.map((card, idx) => (
              <motion.div
                key={card.id || idx}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex-1 flex"
              >
                <Link
                  href={`/news-events/${card.id}`}
                  className="group flex flex-row items-center gap-4 w-full p-4 sm:p-5 bg-white dark:bg-slate-900 border border-[#E8DDBF]/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-sm hover:shadow-xl hover:border-accent transition-all duration-300"
                >
                  {/* Small Image Thumbnail */}
                  <div className="relative w-24 sm:w-32 h-24 sm:h-32 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                    <Image
                      src={card.imageUrl}
                      alt={card.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2 bg-[#08132E]/90 text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-xs">
                      {card.date} {card.month}
                    </div>
                  </div>

                  {/* Small Card Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getCategoryColor(
                          card.category
                        )}`}
                      >
                        {card.category}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-extrabold text-[#010E62] dark:text-white group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                      {card.title}
                    </h4>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-accent pt-1">
                      <span>View Update</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* View All CTA (Exact same style as GallerySection) */}
        <div className="mt-16 text-center">
          <Link
            href="/news-events"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border border-[#E8DDBF] dark:border-slate-700 text-[#010E62] dark:text-white font-extrabold text-sm uppercase tracking-widest rounded-xl hover:bg-[#FBB503] hover:text-[#010E62] hover:border-[#FBB503] dark:hover:bg-[#FBB503] dark:hover:text-[#010E62] transition-all shadow-sm hover:shadow-lg group"
          >
            <span>View All News & Events</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
