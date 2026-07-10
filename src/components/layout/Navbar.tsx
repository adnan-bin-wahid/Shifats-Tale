"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  User,
  BookOpen,
  TrendingUp,
  PlayCircle,
  Image as ImageIcon,
  Mail,
  HelpCircle,
  Phone,
  Menu,
  X,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/lib/providers/SiteSettingsProvider";
import { supabase } from "@/lib/supabase/client";

interface NavItemConfig {
  label: string;
  href?: string;
  iconName: string;
  match?: "exact" | "prefix";
  subItems?: { label: string; href: string; iconName: string }[];
}

const navItems: NavItemConfig[] = [
  { label: "Home", href: "/", iconName: "Home", match: "exact" },
  { label: "About", href: "/about", iconName: "User" },
  { 
    label: "Academic", 
    iconName: "BookOpen", 
    subItems: [
      { label: "Courses", href: "/courses", iconName: "BookOpen" },
      { label: "Results", href: "/results", iconName: "TrendingUp" }
    ]
  },
  { label: "Gallery", href: "/gallery", iconName: "Image" },
  { label: "Contact Me", href: "/contact", iconName: "Mail" },
];

const renderNavIcon = (iconName: string, className = "h-4 w-4") => {
  switch (iconName) {
    case "Home":
      return <Home className={className} />;
    case "User":
      return <User className={className} />;
    case "BookOpen":
      return <BookOpen className={className} />;
    case "TrendingUp":
      return <TrendingUp className={className} />;
    case "PlayCircle":
      return <PlayCircle className={className} />;
    case "Image":
      return <ImageIcon className={className} />;
    case "Mail":
      return <Mail className={className} />;
    case "HelpCircle":
      return <HelpCircle className={className} />;
    default:
      return <Home className={className} />;
  }
};

export default function Navbar() {
  const siteInfo = useSiteSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [expandedMobileMenu, setExpandedMobileMenu] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      if (currentSession?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('auth_user_id', currentSession.user.id)
          .single();
        if (profile) setRole(profile.role);
      }
    };
    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('auth_user_id', currentSession.user.id)
          .single();
        if (profile) setRole(profile.role);
      } else {
        setRole(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const dashboardHref = role === 'TEACHER' ? '/teacher' : (role === 'STUDENT' ? '/student' : '/login');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the drawer after route changes.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock page scrolling while the mobile drawer is open.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  const handleLinkClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    setIsOpen(false);

    if (href === "/" && pathname === "/") {
      event.preventDefault();
      const targetElement = document.querySelector("#home");
      const top = targetElement
        ? (targetElement as HTMLElement).offsetTop - 80
        : 0;
      window.scrollTo({ top, behavior: "smooth" });
      return;
    }

    if (href.startsWith("#") && pathname === "/") {
      event.preventDefault();
      const targetElement = document.querySelector(href);
      if (targetElement) {
        window.scrollTo({
          top: (targetElement as HTMLElement).offsetTop - 80,
          behavior: "smooth",
        });
      }
    }
  };

  const isActive = (item: NavItemConfig) => {
    if (item.subItems) {
      return item.subItems.some(sub => pathname === sub.href || pathname.startsWith(`${sub.href}/`));
    }
    if (!item.href) return false;
    if (item.href === "/") return pathname === "/";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 top-0 z-50 w-full select-none border-b transition-all duration-300",
          scrolled
            ? "border-accent/20 bg-white/95 py-2.5 shadow-sm backdrop-blur-md"
            : "border-border/40 bg-white/90 py-3.5 shadow-xs backdrop-blur-sm"
        )}
      >
        <div className="brand-container">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={pathname === "/" ? "#home" : "/"}
              onClick={(event) =>
                handleLinkClick(event, pathname === "/" ? "#home" : "/")
              }
              className="relative h-11 w-44 shrink-0 rounded-lg transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-13 sm:w-52"
            >
              <Image
                src="/images/logo_transparent.png"
                alt="Shifat's Tales Logo"
                fill
                sizes="(max-width: 768px) 176px, 208px"
                className="object-contain object-left"
                priority
              />
            </Link>

            <div className="hidden items-center space-x-1 lg:flex xl:space-x-1.5">
              {navItems.map((item, index) => {
                const active = isActive(item);
                const targetHref =
                  item.href?.startsWith("#") && pathname !== "/"
                    ? `/${item.href}`
                    : item.href || "#";
                const isLast = index === navItems.length - 1;

                return (
                  <React.Fragment key={item.label}>
                    {item.subItems ? (
                      <div className="group relative flex flex-col items-center justify-center rounded-xl px-3 py-1.5 transition-all duration-200 cursor-pointer">
                        <div
                          className={cn(
                            "transition-transform duration-200 group-hover:scale-110",
                            active ? "text-primary" : "text-primary/70 group-hover:text-primary"
                          )}
                        >
                          {renderNavIcon(item.iconName, "h-4 w-4 sm:h-4.5 sm:w-4.5")}
                        </div>
                        <span
                          className={cn(
                            "mt-1 whitespace-nowrap text-[11px] leading-tight flex items-center gap-0.5",
                            active
                              ? "font-extrabold text-primary"
                              : "font-bold text-primary-dark/80 group-hover:text-primary"
                          )}
                        >
                          {item.label} <ChevronDown className="h-3 w-3" />
                        </span>
                        
                        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                          <div className="bg-white rounded-xl shadow-lg border border-border/40 p-2 min-w-40 flex flex-col gap-1">
                            {item.subItems.map((sub) => (
                              <Link
                                key={sub.label}
                                href={sub.href}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg hover:bg-accent/10 text-primary-dark/80 hover:text-primary transition-colors"
                              >
                                {renderNavIcon(sub.iconName, "h-4 w-4")} {sub.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Link
                        href={targetHref}
                        onClick={(event) => handleLinkClick(event, item.href!)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex flex-col items-center justify-center rounded-xl px-3 py-1.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                          active
                            ? "scale-[1.02] border border-accent/40 bg-accent/15 font-extrabold text-primary shadow-xs after:absolute after:-bottom-1 after:left-1/2 after:h-0.5 after:w-5 after:-translate-x-1/2 after:rounded-full after:bg-accent"
                            : "text-primary-dark/80 hover:scale-[1.02] hover:bg-bg/80 hover:text-primary active:scale-[0.98]"
                        )}
                      >
                        <div
                          className={cn(
                            "transition-transform duration-200 group-hover:scale-110",
                            active
                              ? "text-primary"
                              : "text-primary/70 group-hover:text-primary"
                          )}
                        >
                          {renderNavIcon(
                            item.iconName,
                            "h-4 w-4 sm:h-4.5 sm:w-4.5"
                          )}
                        </div>
                        <span
                          className={cn(
                            "mt-1 whitespace-nowrap text-[11px] leading-tight",
                            active
                              ? "font-extrabold text-primary"
                              : "font-bold text-primary-dark/80 group-hover:text-primary"
                          )}
                        >
                          {item.label}
                        </span>
                      </Link>
                    )}

                    {!isLast && (
                      <span className="mx-0.5 hidden h-1.5 w-1.5 shrink-0 rounded-full bg-accent/40 pointer-events-none xl:inline-block" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Keep these hidden below lg so the tablet header never gets crowded. */}
            <div className="hidden items-center space-x-3 border-l border-border/60 pl-2 lg:flex xl:pl-4">
              <a
                href={`tel:${siteInfo.phone.replace(/[\s-]/g, "")}`}
                className="flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-sm font-extrabold text-primary transition-all duration-200 hover:scale-[1.04] hover:text-primary-dark active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                title="Call Sir"
              >
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-extrabold">Call Sir</span>
              </a>
              {session ? (
                <Link
                  href={dashboardHref}
                  className="primary-btn rounded-xl px-4 py-1.5 text-sm font-bold shadow-md transition-all duration-300 hover:scale-[1.03] hover:shadow-accent/25 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-xl border-2 border-primary/20 px-3.5 py-1.5 text-sm font-bold text-primary transition-all duration-200 hover:scale-[1.03] hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="primary-btn rounded-xl px-4 py-1.5 text-sm font-bold shadow-md transition-all duration-300 hover:scale-[1.03] hover:shadow-accent/25 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>

            <button
              onClick={() => setIsOpen(true)}
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-primary/10 bg-bg/70 p-2.5 text-primary shadow-sm transition-all duration-200 hover:scale-[1.04] hover:bg-accent/10 active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
              aria-label="Open navigation menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </nav>

      {/*
        IMPORTANT: the drawer is intentionally a sibling of <nav>, not a child.
        The navbar uses backdrop-filter, which can become the containing block for
        fixed descendants and causes the old drawer background to stop at nav height.
      */}
      <div
        className={cn(
          "fixed inset-0 z-[70] lg:hidden",
          isOpen ? "pointer-events-auto visible" : "pointer-events-none invisible"
        )}
        aria-hidden={!isOpen}
      >
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsOpen(false)}
          className={cn(
            "absolute inset-0 bg-primary/55 backdrop-blur-[2px] transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0"
          )}
        />

        <aside
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
          className={cn(
            "absolute inset-y-0 right-0 flex h-dvh w-[min(92vw,24rem)] flex-col overflow-y-auto overscroll-contain border-l border-accent/20 bg-[#fffdf8] shadow-2xl transition-transform duration-300 ease-out",
            isOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-[#fffdf8]/95 px-5 py-4 backdrop-blur-md">
            <Link
              href={pathname === "/" ? "#home" : "/"}
              onClick={(event) =>
                handleLinkClick(event, pathname === "/" ? "#home" : "/")
              }
              className="relative h-10 w-40"
            >
              <Image
                src="/images/logo_transparent.png"
                alt="Shifat's Tales Logo"
                fill
                sizes="160px"
                className="object-contain object-left"
              />
            </Link>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/10 bg-white text-primary shadow-sm transition hover:bg-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-1 flex-col px-5 py-5">
            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-accent">
              Navigation
            </p>

            <div className="space-y-2">
              {navItems.map((item) => {
                const active = isActive(item);
                const targetHref =
                  item.href?.startsWith("#") && pathname !== "/"
                    ? `/${item.href}`
                    : item.href || "#";

                if (item.subItems) {
                  return (
                    <div key={item.label} className="space-y-1">
                      <button 
                        onClick={() => setExpandedMobileMenu(prev => prev === item.label ? null : item.label)}
                        className="flex w-full min-h-14 items-center gap-3 rounded-2xl px-4 py-3 text-base font-bold text-primary-dark/90 hover:bg-black/5 transition-colors"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-white text-primary/75">
                          {renderNavIcon(item.iconName, "h-4.5 w-4.5")}
                        </span>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown 
                          className={cn(
                            "h-5 w-5 text-primary/50 transition-transform duration-300", 
                            expandedMobileMenu === item.label && "rotate-180"
                          )} 
                        />
                      </button>
                      <div 
                        className={cn(
                          "grid transition-all duration-300 ease-in-out",
                          expandedMobileMenu === item.label ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="pl-6 space-y-1">
                        {item.subItems.map((sub) => {
                          const active = isActive(sub as any);
                          const subHref =
                            sub.href.startsWith("#") && pathname !== "/"
                              ? `/${sub.href}`
                              : sub.href;
                          return (
                            <Link
                              key={sub.label}
                              href={subHref}
                              onClick={(event) => {
                                handleLinkClick(event, sub.href);
                                setIsOpen(false);
                              }}
                              className={cn(
                                "group flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-2 text-sm font-bold transition-all duration-200",
                                active
                                  ? "border-accent/45 bg-accent/10 text-primary shadow-sm"
                                  : "border-transparent text-primary-dark/90 hover:border-border/70 hover:bg-white hover:text-primary hover:shadow-sm"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border transition-colors",
                                  active
                                    ? "border-accent/40 bg-accent text-primary"
                                    : "border-primary/10 bg-white text-primary/75 group-hover:border-accent/30 group-hover:text-primary"
                                )}
                              >
                                {renderNavIcon(sub.iconName, "h-3.5 w-3.5")}
                              </span>
                              <span className="flex-1">{sub.label}</span>
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  active ? "bg-accent" : "bg-border"
                                )}
                              />
                            </Link>
                          );
                        })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={targetHref}
                    onClick={(event) => {
                      handleLinkClick(event, item.href!);
                      setIsOpen(false);
                    }}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-base font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      active
                        ? "border-accent/45 bg-gradient-to-r from-accent/20 to-accent/5 text-primary shadow-sm"
                        : "border-transparent text-primary-dark/90 hover:border-border/70 hover:bg-white hover:text-primary hover:shadow-sm"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
                        active
                          ? "border-accent/40 bg-accent text-primary"
                          : "border-primary/10 bg-white text-primary/75 group-hover:border-accent/30 group-hover:text-primary"
                      )}
                    >
                      {renderNavIcon(item.iconName, "h-4.5 w-4.5")}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        active ? "bg-accent" : "bg-border"
                      )}
                    />
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-accent/25 bg-primary p-4 text-white shadow-lg shadow-primary/10">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                Need guidance?
              </p>
              <p className="mt-1 text-sm text-white/80">
                Contact Shifat Sir directly for batch and admission information.
              </p>
              <a
                href={`tel:${siteInfo.phone.replace(/[\s-]/g, "")}`}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 font-extrabold text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Phone className="h-4 w-4 text-accent" />
                Call Sir Now
              </a>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
              {session ? (
                <Link
                  href={dashboardHref}
                  onClick={() => setIsOpen(false)}
                  className="col-span-2 primary-btn flex items-center justify-center rounded-xl px-4 py-3 font-extrabold shadow-lg shadow-accent/20 transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center rounded-xl border-2 border-primary/15 bg-white px-4 py-3 font-extrabold text-primary transition hover:border-primary/30 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsOpen(false)}
                    className="primary-btn flex items-center justify-center rounded-xl px-4 py-3 font-extrabold shadow-lg shadow-accent/20 transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}


