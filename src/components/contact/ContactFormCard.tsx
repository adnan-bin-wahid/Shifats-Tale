"use client";

import React, { useState } from "react";
import { Mail, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { ContactFormConfig } from "@/data/contact";
import { siteInfo } from "@/data/site";

interface ContactFormCardProps {
  config: ContactFormConfig;
}

export const ContactFormCard: React.FC<ContactFormCardProps> = ({ config }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setStatus("error");
      setErrorMessage("Please fill out all required fields.");
      return;
    }

    setStatus("submitting");

    // Construct structured message for WhatsApp notification fallback
    const textMessage = `Hello ${siteInfo.teacherName.split(" ").pop()!} Sir,\n\n*Website Contact Message*\n\nName: *${formData.name}*\nEmail: *${formData.email}*\nSubject: *${formData.subject || "General Inquiry"}*\n\n*Message:* ${formData.message}`;
    const waUrl = `https://wa.me/${siteInfo.whatsapp}?text=${encodeURIComponent(textMessage)}`;

    setTimeout(() => {
      setStatus("success");
      window.open(waUrl, "_blank");
      setTimeout(() => {
        setStatus("idle");
        setFormData({ name: "", email: "", subject: "", message: "" });
      }, 3000);
    }, 1200);
  };

  return (
    <div className="brand-card rounded-3xl p-6 sm:p-8 bg-white border border-[#E7E0D2] shadow-md h-full flex flex-col justify-between text-left space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2.5 rounded-2xl bg-accent/15 text-primary">
          <Mail className="h-6 w-6 text-accent shrink-0" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-primary tracking-tight font-display">
            {config.title}
          </h3>
          {config.description && (
            <p className="text-xs text-muted font-bold mt-0.5">
              {config.description}
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Grid for Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Your Name */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-extrabold text-primary">
                Your Name <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full px-4 py-2.5 rounded-xl bg-bg-soft/70 border border-[#E7E0D2] text-xs font-semibold text-primary placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all"
              />
            </div>

            {/* Your Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-extrabold text-primary">
                Your Email <span className="text-accent">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="w-full px-4 py-2.5 rounded-xl bg-bg-soft/70 border border-[#E7E0D2] text-xs font-semibold text-primary placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label htmlFor="subject" className="block text-xs font-extrabold text-primary">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="What is this regarding?"
              className="w-full px-4 py-2.5 rounded-xl bg-bg-soft/70 border border-[#E7E0D2] text-xs font-semibold text-primary placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all"
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label htmlFor="message" className="block text-xs font-extrabold text-primary">
              Message <span className="text-accent">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={4}
              value={formData.message}
              onChange={handleChange}
              placeholder="Type your message here..."
              className="w-full px-4 py-2.5 rounded-xl bg-bg-soft/70 border border-[#E7E0D2] text-xs font-semibold text-primary placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent focus:bg-white transition-all resize-none"
            />
          </div>
        </div>

        {/* Status Messages */}
        {status === "error" && (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {status === "success" && (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Thank you! Redirecting your inquiry to Sir on WhatsApp...</span>
          </div>
        )}

        {/* Golden Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full primary-btn py-3 rounded-xl text-xs sm:text-sm font-extrabold shadow-md hover:shadow-accent/25 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-70"
          >
            <span>{status === "submitting" ? "Sending..." : config.submitLabel}</span>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
