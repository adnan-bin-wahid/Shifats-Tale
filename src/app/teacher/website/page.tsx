import React from "react";
import { Globe, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Website Admin - Teacher Portal",
  description: "Manage dynamic website content.",
};

export default function WebsiteAdminOverview() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-primary font-display tracking-tight">
            Website Overview
          </h1>
          <p className="text-sm text-muted font-medium mt-1">
            Manage your landing page content, sections, and gallery.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: "Academic Calendar", description: "Manage hero banner and full schedule flyer card image.", href: "/teacher/website/academic-calendar" },
          { title: "Class Routine", description: "Manage hero banner and full class routine flyer card image.", href: "/teacher/website/class-routine" },
          { title: "News & Events", description: "Manage hero banner, announcements, orientation workshops, and spotlight items.", href: "/teacher/website/news-events/manage" },
          { title: "Courses Hero", description: "Edit main title, subtitle, and primary call-to-actions for the Courses page.", href: "/teacher/website/courses/hero" },
          { title: "Results Hero", description: "Edit main title, subtitle, and banner for the Results page.", href: "/teacher/website/results/hero" },
          { title: "Materials Hero", description: "Edit main title, subtitle, and banner for the Materials page.", href: "/teacher/website/materials/hero" },
          { title: "Reviews Hero", description: "Edit main title, subtitle, and banner for the All Reviews page.", href: "/teacher/website/reviews/hero" },
          { title: "Gallery Hero", description: "Edit main title, subtitle, and banner for the Gallery page.", href: "/teacher/website/gallery/hero" },
          { title: "Contact Hero", description: "Edit main title, subtitle, and banner for the Contact page.", href: "/teacher/website/contact/hero" },
          { title: "Manage Reviews", description: "Approve, edit, or delete student and parent reviews.", href: "/teacher/website/reviews/manage" },
          { title: "About Me", description: "Update your profile, skills, education, and experience.", href: "/teacher/website/about" },
          { title: "Gallery", description: "Manage photos and memories displayed on the website.", href: "/teacher/website/gallery" },
          { title: "Contact & Footer", description: "Update social links, contact info, and footer text.", href: "/teacher/website/contact" },
        ].map((module, i) => (
          <div key={i} className="bg-white border border-border/60 rounded-2xl p-6 shadow-sm flex flex-col h-full group hover:shadow-md hover:border-accent/50 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-bg flex items-center justify-center text-primary group-hover:bg-accent group-hover:text-white transition-colors">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-primary">{module.title}</h3>
            </div>
            <p className="text-sm text-muted mb-6 flex-grow">{module.description}</p>
            <Link 
              href={module.href}
              className="mt-auto inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-accent transition-colors w-fit"
            >
              Manage Section <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
