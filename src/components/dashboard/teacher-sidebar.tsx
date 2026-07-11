"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { 
  Users, 
  Home,
  BookOpen, 
  LayoutDashboard, 
  CreditCard, 
  Bell, 
  FileText, 
  UserCheck,
  Settings,
  ShieldAlert,
  GraduationCap,
  Megaphone,
  User,
  Globe,
  Image as ImageIcon,
  MessageSquare,
  ChevronDown,
  Star,
  Calendar
} from "lucide-react";

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
  adminMode?: "coaching" | "website";
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: { label: string; href: string }[];
}

export const teacherNavItems: NavItem[] = [
  { label: "Overview", href: "/teacher", icon: LayoutDashboard },
  { label: "Manage Students", href: "/teacher/students", icon: Users },
  { label: "Manage Batches", href: "/teacher/batches", icon: BookOpen },
  { label: "Payment Ledger", href: "/teacher/payments", icon: CreditCard },
  { label: "Study Materials", href: "/teacher/materials", icon: FileText },
  { label: "Academic Calendar", href: "/teacher/website/academic-calendar", icon: Calendar },
  { label: "Class Routine", href: "/teacher/website/class-routine", icon: Calendar },
  { label: "Exams & Grading", href: "/teacher/exams", icon: GraduationCap },
  { label: "Notifications", href: "/teacher/notifications", icon: Bell },
  { label: "My Profile", href: "/teacher/profile", icon: User },
  { label: "Portal Settings", href: "/teacher/settings", icon: Settings },
  { label: "Go to Home", href: "/", icon: Home },
];

export const websiteAdminNavItems: NavItem[] = [
  { label: "Website Overview", href: "/teacher/website", icon: Globe },
  { 
    label: "Home Page", 
    icon: LayoutDashboard,
    subItems: [
      { label: "Hero", href: "/teacher/website/home/hero" },
      { label: "Hero Stats", href: "/teacher/website/home/stats" },
      { label: "Offered Batches", href: "/teacher/website/home/batches" },
      { label: "Why Learn Section", href: "/teacher/website/home/why-learn" },
      { label: "Meet Teacher Section", href: "/teacher/website/home/teacher" },
      { label: "Celebrating Excellence", href: "/teacher/website/home/excellence" },
      { label: "Our Student Success Stories", href: "/teacher/website/home/success" },
      { label: "Concept Breakdown Theater", href: "/teacher/website/home/youtube" },
      { label: "What Parents & Students Say", href: "/teacher/website/home/testimonials" },
      { label: "Captured Moments", href: "/teacher/website/home/gallery" },
    ]
  },
  { 
    label: "About Page", 
    icon: UserCheck,
    subItems: [
      { label: "About Hero", href: "/teacher/website/about/hero" },
      { label: "Summary Metrics Strip", href: "/teacher/website/about/metrics" },
      { label: "Education Timeline", href: "/teacher/website/about/education" },
      { label: "Research Experience", href: "/teacher/website/about/research-exp" },
      { label: "Research Publications", href: "/teacher/website/about/publications" },
      { label: "Industrial Training Banner", href: "/teacher/website/about/training" },
      { label: "Projects Grid", href: "/teacher/website/about/projects" },
      { label: "Technical Skills", href: "/teacher/website/about/skills" },
      { label: "Extra Curricular Activities", href: "/teacher/website/about/eca" },
    ]
  },
  { 
    label: "Courses Page", 
    icon: BookOpen,
    subItems: [
      { label: "Hero Section", href: "/teacher/website/courses/hero" },
      { label: "Card System", href: "/teacher/website/courses/cards" },
    ]
  },
  { 
    label: "Gallery Page", 
    icon: ImageIcon,
    subItems: [
      { label: "Hero Section", href: "/teacher/website/gallery/hero" },
      { label: "Photo Albums", href: "/teacher/website/gallery/albums" },
    ]
  },
  { 
    label: "Results Page", 
    icon: GraduationCap,
    subItems: [
      { label: "Hero Section", href: "/teacher/website/results/hero" },
      { label: "Student Cards", href: "/teacher/website/results/students" },
    ]
  },
  { 
    label: "Materials Page", 
    icon: FileText,
    subItems: [
      { label: "Hero Section", href: "/teacher/website/materials/hero" },
      { label: "Categories", href: "/teacher/website/materials/categories" },
      { label: "Manage Materials", href: "/teacher/website/materials/manage" },
    ]
  },
  { 
    label: "Academic Calendar", 
    icon: Calendar,
    subItems: [
      { label: "Overview", href: "/teacher/website/academic-calendar" },
      { label: "Hero Banner", href: "/teacher/website/academic-calendar/hero" },
      { label: "Schedule Flyer (Card)", href: "/teacher/website/academic-calendar/card" },
    ]
  },
  { 
    label: "Class Routine", 
    icon: Calendar,
    subItems: [
      { label: "Overview", href: "/teacher/website/class-routine" },
      { label: "Hero Banner", href: "/teacher/website/class-routine/hero" },
      { label: "Routine Flyer (Card)", href: "/teacher/website/class-routine/card" },
    ]
  },
  { 
    label: "Reviews Page", 
    icon: Star,
    subItems: [
      { label: "Hero Section", href: "/teacher/website/reviews/hero" },
      { label: "Manage Reviews", href: "/teacher/website/reviews/manage" },
    ]
  },
  { 
    label: "Contact Page", 
    icon: MessageSquare,
    subItems: [
      { label: "Hero Section", href: "/teacher/website/contact/hero" },
      { label: "Contact Info & Map", href: "/teacher/website/contact/info" },
      { label: "FAQ Section", href: "/teacher/website/contact/faq" },
    ]
  },
  { label: "Global Settings", href: "/teacher/website/settings", icon: Settings },
  { label: "Global Footer", href: "/teacher/website/footer", icon: Settings },
];

export function TeacherSidebar({ className, onLinkClick, adminMode = "coaching" }: SidebarProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", userData.user.id)
          .single();

        if (!profile) return;

        const { count, error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.id)
          .is("read_at", null);

        if (!error && count !== null) {
          setUnreadCount(count);
        }
      } catch (err) {
        console.error("Failed to fetch unread notification count in teacher sidebar:", err);
      }
    };

    fetchUnreadCount();

    // Subscribe to new/updated notifications
    const channel = supabase
      .channel("realtime-teacher-sidebar-notifications-" + Math.random().toString(36).substring(7))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className={cn("flex flex-col h-full bg-primary-dark text-white border-r border-slate-900", className)}>
      {/* Brand area */}
      <div className="flex items-center px-6 py-5 border-b border-slate-900 bg-slate-950/20">
        <Image src="/images/logo_transparent.png" alt="Shifat's Tales Logo" width={160} height={40} className="object-contain" />
      </div>

      {/* Nav links */}
      <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
        {(adminMode === "website" ? websiteAdminNavItems : teacherNavItems).map((item) => {
          const Icon = item.icon;
          const hasSubItems = item.subItems && item.subItems.length > 0;

          if (hasSubItems) {
            const isExpanded = expandedMenus[item.label];
            // Check if any sub-item is active to highlight the parent slightly
            const isChildActive = item.subItems?.some(sub => pathname === sub.href);

            return (
              <div key={item.label} className="space-y-1">
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 group",
                    isChildActive 
                      ? "text-white bg-[#102A66]/50" 
                      : "text-[#DCE5F5] hover:text-white hover:bg-[#102A66]"
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105", isChildActive ? "text-accent" : "text-[#9FB0D0] group-hover:text-white")} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded ? "rotate-180" : "")} />
                </button>
                
                {isExpanded && (
                  <div className="pl-12 space-y-1 pb-2">
                    {item.subItems!.map((sub) => {
                       const isSubActive = pathname === sub.href;
                       return (
                         <Link
                           key={sub.href}
                           href={sub.href}
                           onClick={onLinkClick}
                           className={cn(
                             "block px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200",
                             isSubActive 
                              ? "bg-accent text-primary-dark shadow-sm" 
                              : "text-[#9FB0D0] hover:text-white hover:bg-[#102A66]"
                           )}
                         >
                           {sub.label}
                         </Link>
                       );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = item.href === "/teacher"
            ? pathname === "/teacher"
            : (item.href && (pathname === item.href || pathname.startsWith(item.href + "/")));

          return (
            <Link
              key={item.href || item.label}
              href={item.href || "#"}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3.5 px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 group relative",
                isActive
                  ? "bg-accent text-primary-dark shadow-md"
                  : "text-[#DCE5F5] hover:text-white hover:bg-[#102A66]"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-white rounded-r-full" />
              )}
              <Icon className={cn("h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105", isActive ? "text-primary-dark" : "text-[#9FB0D0] group-hover:text-white")} />
              <span>{item.label}</span>
              {item.label === "Notifications" && unreadCount > 0 && (
                <span className="ml-auto px-1.5 py-0.5 rounded-lg bg-accent text-[9px] font-extrabold text-primary-dark leading-none">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Account indicator */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/10 text-xs font-semibold text-white/50 text-center">
        &copy; {new Date().getFullYear()} Shifat's Tales
      </div>
    </div>
  );
}

