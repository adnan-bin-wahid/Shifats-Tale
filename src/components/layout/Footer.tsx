"use client";

import Link from "next/link";
import Image from "next/image";
import { Phone, MapPin, Mail } from "lucide-react";
import { FacebookIcon, YoutubeIcon } from "@/components/ui/Icons";
import { useSiteSettings } from "@/lib/providers/SiteSettingsProvider";
import { MessageCircleHeart } from "lucide-react"; // for whatsapp chat icon

export default function Footer() {
  const siteInfo = useSiteSettings();
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const targetElement = document.querySelector(href);
      if (targetElement) {
        const offsetTop = (targetElement as HTMLElement).offsetTop - 80;
        window.scrollTo({
          top: offsetTop,
          behavior: "smooth",
        });
      }
    }
  };

  return (
    <footer className="relative bg-[#FFF9EE] border-t-4 border-[#071A68] pt-20 overflow-hidden z-10">
      {/* Small gold line just below the navy border */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-[#F4B400]"></div>
      
      {/* Soft gradient blobs for modern feel (very subtle) */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#F4B400] opacity-[0.03] blur-[120px] rounded-full pointer-events-none z-[-1]" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#071A68] opacity-[0.02] blur-[120px] rounded-full pointer-events-none z-[-1]" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 pb-16 px-4 sm:px-6 lg:px-8">
        
        {/* Brand & About Section (col-span-4) */}
        <div className="md:col-span-4 space-y-6 lg:pr-8">
          <div className="flex items-center space-x-2">
            <div className="inline-block relative h-12 w-48 sm:h-14 sm:w-56">
              <Image
                src="/images/logo_transparent.png"
                alt="Shifat's Tales Logo"
                fill
                sizes="(max-width: 768px) 192px, 224px"
                className="object-contain object-left"
              />
            </div>
          </div>
          <p className="text-[15px] leading-relaxed text-[#475569] font-medium">
            {siteInfo.footerDescription}
          </p>
          <div className="flex items-center space-x-3 pt-2">
            <a
              href={siteInfo.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-11 h-11 rounded-full bg-white border border-[#E8DDBF] text-[#071A68] hover:text-[#F4B400] hover:border-[#F4B400] hover:bg-[#FFF4D6] hover:shadow-sm transition-all duration-300"
              aria-label="Facebook Page"
            >
              <FacebookIcon className="h-5 w-5" />
            </a>
            <a
              href={siteInfo.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-11 h-11 rounded-full bg-white border border-[#E8DDBF] text-[#071A68] hover:text-[#F4B400] hover:border-[#F4B400] hover:bg-[#FFF4D6] hover:shadow-sm transition-all duration-300"
              aria-label="YouTube Channel"
            >
              <YoutubeIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Quick Links (col-span-2) */}
        <div className="md:col-span-3 lg:col-span-2 lg:pl-4">
          <h3 className="text-lg font-bold text-[#071A68] mb-1">Quick Links</h3>
          <div className="w-8 h-[3px] bg-[#F4B400] rounded-full mb-6"></div>
          <ul className="space-y-3.5">
            {siteInfo.quickLinks?.map((link) => (
              <li key={link.label}>
                {link.isPortal || link.href?.startsWith("/") ? (
                  <Link
                    href={link.href}
                    className="text-[15px] text-[#475569] hover:text-[#F4B400] transition-colors duration-200 font-medium"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    href={link.href}
                    onClick={(e) => handleLinkClick(e, link.href)}
                    className="text-[15px] text-[#475569] hover:text-[#F4B400] transition-colors duration-200 font-medium"
                  >
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Contact info (col-span-3) */}
        <div className="md:col-span-5 lg:col-span-3 lg:pl-4 border-l-0 md:border-l border-[#E8DDBF] md:pl-8">
          <h3 className="text-lg font-bold text-[#071A68] mb-1">Contact Info</h3>
          <div className="w-8 h-[3px] bg-[#F4B400] rounded-full mb-6"></div>
          <ul className="space-y-6">
            <li className="flex items-start space-x-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FFFCF7] border border-[#E8DDBF] shrink-0">
                <Phone className="h-4.5 w-4.5 text-[#071A68]" strokeWidth={2.5} />
              </div>
              <div className="pt-0.5">
                <span className="block text-[#071A68] font-bold text-[15px]">Call / WhatsApp</span>
                <a href={`tel:${siteInfo.phone.replace(/[\s-]/g, "")}`} className="hover:text-[#F4B400] text-[#475569] text-sm transition-colors mt-0.5 block font-medium">
                  {siteInfo.phone}
                </a>
              </div>
            </li>
            <li className="flex items-start space-x-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FFFCF7] border border-[#E8DDBF] shrink-0">
                <Mail className="h-4.5 w-4.5 text-[#071A68]" strokeWidth={2.5} />
              </div>
              <div className="pt-0.5">
                <span className="block text-[#071A68] font-bold text-[15px]">Email</span>
                <a href={`mailto:${siteInfo.email}`} className="hover:text-[#F4B400] text-[#475569] text-sm transition-colors mt-0.5 block font-medium">
                  {siteInfo.email}
                </a>
              </div>
            </li>
            <li className="flex items-start space-x-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FFFCF7] border border-[#E8DDBF] shrink-0">
                <MapPin className="h-4.5 w-4.5 text-[#071A68]" strokeWidth={2.5} />
              </div>
              <div className="pt-0.5">
                <span className="block text-[#071A68] font-bold text-[15px]">Location</span>
                <span className="text-[#475569] text-sm leading-relaxed block mt-1 font-medium">
                  {siteInfo.address}
                </span>
              </div>
            </li>
          </ul>
        </div>

        {/* Notice & Direct Admission (col-span-3) */}
        <div className="md:col-span-12 lg:col-span-3 lg:pl-6 flex flex-col justify-center">
          <div className="space-y-6">
            <p className="text-[15px] text-[#475569] leading-relaxed font-medium">
              {siteInfo.footerNotice}
            </p>
            <a
              href={`https://wa.me/${siteInfo.whatsapp}?text=Hello%20Sir%2C%20I%20would%20like%20to%20know%20more%20about%20the%20admissions.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-2.5 w-full py-3.5 px-6 rounded-xl bg-[#071A68] text-white font-extrabold text-[15px] hover:bg-[#0B237F] hover:shadow-[0_4px_20px_rgba(7,26,104,0.2)] transition-all duration-300 group"
            >
              <MessageCircleHeart className="h-5 w-5 text-[#20B86A] group-hover:scale-110 transition-transform duration-300" strokeWidth={2.5} />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Copyright Strip */}
      <div className="w-full bg-[#F8F0DE] border-t border-[#E8DDBF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[14px] text-[#718096] font-medium">
            <p>{siteInfo.footerCopyright}</p>
            <p className="flex items-center gap-1">
              Designed by <a href="https://effytechbd.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#F4B400] transition-colors font-semibold">Effy Tech</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}


