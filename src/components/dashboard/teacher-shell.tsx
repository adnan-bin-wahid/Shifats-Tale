"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { TeacherSidebar } from "./teacher-sidebar";
import { DashboardHeader } from "./dashboard-header";
import { MobileDashboardNav } from "./mobile-dashboard-nav";

interface TeacherShellProps {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
}

export function TeacherShell({
  children,
  userName,
  userEmail,
}: TeacherShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminMode, setAdminMode] = useState<"coaching" | "website">(() => 
    pathname?.startsWith("/teacher/website") ? "website" : "coaching"
  );

  useEffect(() => {
    if (pathname?.startsWith("/teacher/website") && adminMode !== "website") {
      setAdminMode("website");
    } else if (pathname && !pathname.startsWith("/teacher/website") && pathname.startsWith("/teacher") && adminMode === "website") {
      setAdminMode("coaching");
    }
  }, [pathname, adminMode]);

  return (
    <div className="authenticated-shell flex h-screen w-screen bg-bg-soft text-text overflow-hidden">
      {/* Desktop sidebar */}
      <TeacherSidebar 
        className="hidden lg:flex lg:w-64 lg:shrink-0" 
        adminMode={adminMode} 
      />

      {/* Mobile sidebar drawer */}
      <MobileDashboardNav
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        role="TEACHER"
        adminMode={adminMode}
      />

      {/* Main viewport area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Portal Header */}
        <DashboardHeader
          role="TEACHER"
          userName={userName}
          userEmail={userEmail}
          onMenuToggle={() => setSidebarOpen(true)}
          adminMode={adminMode}
          onAdminModeChange={setAdminMode}
        />

        {/* Scrollable Main Content Container */}
        <main className="flex-1 overflow-y-auto px-6 py-8 focus:outline-none">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
