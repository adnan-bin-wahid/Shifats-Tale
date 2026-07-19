"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { 
  BookOpen, 
  LayoutDashboard, 
  CreditCard, 
  User,
  GraduationCap,
  LogOut,
  Loader2,
  Bell,
  Home,
  BookOpenCheck,
} from "lucide-react";

interface StudentNavBatch {
  id: string;
  name?: string | null;
  subject?: string | null;
}

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
  activeBatches?: StudentNavBatch[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function StudentSidebar({ className, onLinkClick, activeBatches = [] }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .is("read_at", null);

        if (!error && count !== null) {
          setUnreadCount(count);
        }
      } catch (err) {
        console.error("Failed to fetch unread notification count in student sidebar:", err);
      }
    };

    fetchUnreadCount();

    // Subscribe to new/updated notifications
    const channel = supabase
      .channel("realtime-student-sidebar-notifications-" + Math.random().toString(36).substring(7))
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

  // Dynamic Navigation Items
  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard },
    { label: "Academic Journey", href: "/student/academics", icon: BookOpenCheck },
  ];

  // Map active batches to individual navigation links
  activeBatches.forEach((batch) => {
    navItems.push({
      label: batch.name || `${batch.subject} Batch`,
      href: `/student/batches/${batch.id}`,
      icon: BookOpen,
    });
  });

  navItems.push(
    { label: "Exams & Results", href: "/student/exams", icon: GraduationCap },
    { label: "Payments", href: "/student/payments", icon: CreditCard },
    { label: "Notifications", href: "/student/notifications", icon: Bell },
    { label: "Profile", href: "/student/profile", icon: User },
    { label: "Go to Home", href: "/", icon: Home }
  );

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-primary-dark text-white border-r border-slate-900", className)}>
      {/* Brand area */}
      <div className="flex items-center px-6 py-5 border-b border-slate-900 bg-slate-950/20">
        <Image src="/images/alternate_logo.png" alt="Shifat's Tales Logo" width={160} height={40} className="object-contain" />
      </div>

      {/* Nav links */}
      <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/student"
            ? pathname === "/student"
            : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
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

        {/* Logout action directly inside sidebar */}
        <button
          onClick={handleSignOut}
          disabled={loggingOut}
          className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-bold rounded-xl text-white/70 hover:text-rose-200 hover:bg-rose-950/20 transition-all duration-200 text-left disabled:opacity-50"
        >
          {loggingOut ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-white/50" />
          ) : (
            <LogOut className="h-5 w-5 shrink-0 text-white/50 group-hover:text-rose-300" />
          )}
          <span>Logout</span>
        </button>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/10 text-xs font-semibold text-white/50 text-center">
        &copy; {new Date().getFullYear()} Shifat&apos;s Tales
      </div>
    </div>
  );
}
