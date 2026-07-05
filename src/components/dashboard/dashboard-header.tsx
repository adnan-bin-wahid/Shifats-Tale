"use client";

import React, { useState, useEffect } from "react";
import { Menu, LogOut, User, Bell, ChevronDown, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface DashboardHeaderProps {
  role: "STUDENT" | "TEACHER";
  onMenuToggle: () => void;
  userName?: string;
  userEmail?: string;
  adminMode?: "coaching" | "website";
  onAdminModeChange?: (mode: "coaching" | "website") => void;
}

export function DashboardHeader({
  role,
  onMenuToggle,
  userName = "User",
  userEmail = "user@example.com",
  adminMode = "coaching",
  onAdminModeChange,
}: DashboardHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  // Get User Initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  useEffect(() => {
    let activeProfileId: string | null = null;

    const fetchUnreadCount = async () => {
      try {
        if (!activeProfileId) {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData?.user) return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("auth_user_id", userData.user.id)
            .single();

          if (!profile) return;
          activeProfileId = profile.id;
        }

        const { count, error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", activeProfileId)
          .is("read_at", null);

        if (!error && count !== null) {
          setUnreadCount(count);
        }
      } catch (err) {
        console.error("Failed to fetch unread notification count:", err);
      }
    };

    fetchUnreadCount();

    // Subscribe to new/updated notifications
    const channel = supabase
      .channel("realtime-dashboard-header-notifications-" + Math.random().toString(36).substring(7))
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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/40 bg-white/80 px-6 backdrop-blur-md">
      {/* Left: Mobile Nav Toggle & Brand Mobile Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-primary border border-border/50 hover:bg-bg/50 transition-colors lg:hidden"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden lg:block">
          <span className="text-xs font-bold text-muted uppercase tracking-wider">
            Portal &bull; {role} AREA
          </span>
        </div>
      </div>

      {/* Right: Quick Action Controls, Notification, and User Avatar Dropdown */}
      <div className="flex items-center gap-4">
        {/* Toggle Website Admin vs Coaching Mode (TEACHER ONLY) */}
        {role === "TEACHER" && (
          <div className="hidden md:flex items-center gap-1 rounded-xl border border-border/50 bg-bg p-1 shadow-sm">
            <button
              type="button"
              onClick={() => {
                onAdminModeChange?.("coaching");
                router.push("/teacher");
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                adminMode === "coaching"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-primary hover:bg-bg/50"
              }`}
            >
              Coaching Admin
            </button>
            <button
              type="button"
              onClick={() => {
                onAdminModeChange?.("website");
                router.push("/teacher/website");
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                adminMode === "website"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-primary hover:bg-bg/50"
              }`}
            >
              Website Admin
            </button>
          </div>
        )}
        
        {/* Go to Home Page */}
        <button
          onClick={() => router.push("/")}
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 text-muted hover:text-primary hover:bg-bg/50 transition-colors"
          aria-label="Home Page"
          title="Go to Home Page"
        >
          <Home className="h-4 w-4" />
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => router.push(role === "STUDENT" ? "/student/notifications" : "/teacher/notifications")}
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 text-muted hover:text-primary hover:bg-bg/50 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[9px] font-extrabold text-white animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-xl border border-border/50 p-1.5 pr-3 hover:bg-bg/50 transition-all text-left"
            type="button"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-xs font-bold font-display shadow-sm">
              {getInitials(userName)}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-extrabold text-primary font-display leading-none">
                {userName}
              </p>
              <p className="text-[10px] font-semibold text-muted tracking-tight mt-0.5 leading-none">
                {role}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted transition-transform duration-200" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          {/* Dropdown Menu Overlay */}
          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2.5 z-20 w-56 origin-top-right rounded-2xl border border-border/60 bg-white p-2 shadow-lg shadow-primary/5 focus:outline-none">
                <div className="px-3 py-2 border-b border-border/30 mb-1">
                  <p className="text-xs font-bold text-primary truncate leading-normal">
                    {userName}
                  </p>
                  <p className="text-[10px] font-medium text-muted truncate mt-0.5 leading-none">
                    {userEmail}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push(role === "STUDENT" ? "/student/profile" : "/teacher/settings");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-text hover:bg-bg/70 hover:text-primary transition-colors"
                >
                  <User className="h-4 w-4 text-muted" />
                  <span>Account Settings</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleSignOut();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
