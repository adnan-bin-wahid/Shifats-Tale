"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface InnerPageHeroProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  imageSrc?: string;
  imageAlt?: string;
  imagePosition?: string;
  className?: string;
}

export default function InnerPageHero({
  eyebrow,
  title,
  description,
  breadcrumbs,
  imageSrc = "/images/gallery-classroom.png",
  imageAlt = "Hero cover background",
  imagePosition = "center",
  className = "",
}: InnerPageHeroProps) {
  return (
    <section className={`relative w-full max-w-7xl mx-auto mb-10 sm:mb-14 px-2 sm:px-4 ${className}`}>
      {/* Outer Banner Wrapper with Drop Shadow */}
      <div className="relative w-full filter drop-shadow-lg">
        
        {/* Main Navy Box Container (Top Corners Rounded, Bottom Edge Flawlessly Curved) */}
        <div className="relative w-full rounded-t-[2rem] sm:rounded-t-[2.5rem] bg-[#08132E] overflow-hidden">
          
          {/* Subtle Decorative Dotted Grid Texture (Left Navy Region Only) */}
          <div className="absolute inset-y-0 left-0 w-full lg:w-1/2 bg-[radial-gradient(rgba(255,255,255,0.12)_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none opacity-40 z-0" />
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 bg-accent/5 rounded-full blur-3xl pointer-events-none z-0" />

          {/* Dynamic Cover Image on Right with Seamless Horizontal Blend */}
          <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[62%] h-full z-0 overflow-hidden">
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 65vw"
              style={{ objectPosition: imagePosition }}
              className="object-cover object-center opacity-95 brightness-[0.95] contrast-[1.02]"
            />
            {/* Seamless Horizontal Gradient Blend: Navy on Left -> Transparent on Right */}
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#08132E] via-[#08132E]/95 via-25% lg:via-38% to-transparent pointer-events-none" />
          </div>

          {/* Content Layer */}
          <div className="relative z-10 p-6 sm:p-10 lg:p-14 pb-12 sm:pb-16 lg:pb-20 max-w-2xl text-left">
            
            {/* Eyebrow Pill */}
            {eyebrow && (
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#08132E]/80 border border-accent/40 text-accent text-[11px] font-extrabold tracking-wider uppercase shadow-xs backdrop-blur-sm mb-4">
                <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
                <span>{eyebrow}</span>
              </div>
            )}

            {/* Main Heading Hierarchy */}
            <div className="mb-3">
              <h1 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.08] font-display text-white drop-shadow-sm">
                {title}
              </h1>
            </div>

            {/* Gold Horizontal Divider Bar */}
            <div className="w-14 h-1 bg-accent rounded-full my-3.5 shadow-xs" />

            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs sm:text-sm font-semibold text-white/90 mb-3">
                {breadcrumbs.map((item, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={index}>
                      {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-white/60 shrink-0 mx-0.5" />}
                      {item.href && !isLast ? (
                        <Link href={item.href} className="hover:text-accent transition-colors">
                          {item.label}
                        </Link>
                      ) : (
                        <span className={isLast ? "text-accent font-bold" : ""} aria-current={isLast ? "page" : undefined}>
                          {item.label}
                        </span>
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>
            )}

            {/* Description */}
            {description && (
              <p className="text-white/85 text-xs sm:text-sm lg:text-base leading-relaxed max-w-[520px] font-medium">
                {description}
              </p>
            )}
          </div>

        </div>

        {/* Bottom Curved Golden Boundary Area (Downward Navy Extension with Golden Edge Line & Transparent Below) */}
        <div className="relative w-full h-8 sm:h-12 lg:h-14 -mt-1 pointer-events-none z-20">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            {/* Deep Navy Curved Extension extending the banner downward into a smooth arch */}
            <path
              d="M0,0 Q600,100 1200,0 L1200,0 L0,0 Z"
              fill="#08132E"
            />
            {/* Glowing Golden Curved Line tracing the exact bottom edge of the navy banner */}
            <path
              d="M0,0 Q600,100 1200,0"
              fill="none"
              stroke="#FBB503"
              strokeWidth="4"
              style={{ filter: "drop-shadow(0px 3px 6px rgba(251, 181, 3, 0.7))" }}
            />
          </svg>
        </div>

      </div>
    </section>
  );
}
