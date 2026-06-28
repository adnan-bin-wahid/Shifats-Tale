"use client";

import React from "react";
import { MapPin, Phone, Mail, Clock, ExternalLink } from "lucide-react";
import { ContactLocationData } from "@/data/contact";

interface ContactLocationSectionProps {
  location: ContactLocationData;
}

export const ContactLocationSection: React.FC<ContactLocationSectionProps> = ({ location }) => {
  if (!location) return null;

  return (
    <div className="brand-card rounded-3xl p-6 sm:p-8 bg-white border border-[#E7E0D2] shadow-md h-full flex flex-col justify-between text-left space-y-6">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-accent/15 text-primary">
              <MapPin className="h-6 w-6 text-accent shrink-0" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-primary tracking-tight font-display">
                {location.title}
              </h3>
              {location.description && (
                <p className="text-xs text-muted font-bold mt-0.5">
                  {location.description}
                </p>
              )}
            </div>
          </div>
          {location.googleMapDirectionUrl && (
            <a
              href={location.googleMapDirectionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-xs font-extrabold text-primary hover:text-accent transition-colors shrink-0 pt-1"
              title="Open Directions in Google Maps"
            >
              <span>Directions</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Interactive Map Embed / Preview Frame */}
        <div className="relative w-full aspect-[1.8/1] rounded-2xl overflow-hidden border border-[#E7E0D2] bg-bg-soft shadow-inner group">
          {location.googleMapEmbedUrl ? (
            <iframe
              src={location.googleMapEmbedUrl}
              title="Shifat's Tales Coaching Center Location Map"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full filter saturate-[1.05] contrast-[1.02]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-2 bg-gradient-to-br from-bg-soft to-white">
              <MapPin className="h-10 w-10 text-accent animate-bounce" />
              <p className="text-xs font-extrabold text-primary">{location.address}</p>
            </div>
          )}
        </div>
      </div>

      {/* 4 Contact Details Chips (Grid / Row) */}
      <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 border-t border-[#E7E0D2]/80">
        {/* Address */}
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-accent">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">Address</span>
          </div>
          <p className="text-[11px] font-semibold text-text/85 line-clamp-2 leading-tight">
            {location.address}
          </p>
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-accent">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">Phone</span>
          </div>
          <a
            href={`tel:${location.phone.replace(/[\s-]/g, "")}`}
            className="block text-[11px] font-extrabold text-primary hover:text-accent transition-colors truncate"
          >
            {location.phone}
          </a>
        </div>

        {/* Email */}
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-accent">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">Email</span>
          </div>
          <a
            href={`mailto:${location.email}`}
            className="block text-[11px] font-extrabold text-primary hover:text-accent transition-colors truncate"
          >
            {location.email}
          </a>
        </div>

        {/* Availability */}
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-accent">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">Availability</span>
          </div>
          <p className="text-[11px] font-semibold text-text/85 leading-tight">
            {location.availability}
          </p>
        </div>
      </div>
    </div>
  );
};
