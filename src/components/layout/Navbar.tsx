"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { siteInfo } from "@/data/site";

interface NavItemConfig {
  label: string;
  href: string;
  iconName: string;
  match?: "exact" | "prefix";
}

const navItems: NavItemConfig[] = [
  { label: "Home", href: "/", iconName: "Home", match: "exact" },
  { label: "About", href: "/about", iconName: "User" },
  { label: "Courses", href: "#courses", iconName: "BookOpen" },
  { label: "Results", href: "#results", iconName: "TrendingUp" },
  { label: "Free Classes", href: "#youtube-classes", iconName: "PlayCircle" },
  { label: "Gallery", href: "/gallery", iconName: "Image" },
  { label: "Contact Me", href: "/contact", iconName: "Mail" },
  { label: "FAQ", href: "#faq", iconName: "HelpCircle" },
];

const renderNavIcon = (iconName: string, className: string = "h-4 w-4") => {
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
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setIsOpen(false);
    if (href === "/" && pathname === "/") {
      e.preventDefault();
      const targetElement = document.querySelector("#home");
      if (targetElement) {
        const offsetTop = (targetElement as HTMLElement).offsetTop - 80;
        window.scrollTo({ top: offsetTop, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    if (href.startsWith("#")) {
      if (pathname === "/") {
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
    }
  };

  const isActive = (item: NavItemConfig) => {
    if (item.href === "/") {
      return pathname === "/";
    }
    if (item.href.startsWith("/")) {
      return pathname === item.href || pathname.startsWith(item.href + "/");
    }
    return false;
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 w-full z-50 transition-all duration-300 border-b select-none",
        scrolled
          ? "bg-white/95 backdrop-blur-md py-2.5 shadow-sm border-accent/20"
          : "bg-white/90 backdrop-blur-sm py-3.5 border-border/40 shadow-xs"
      )}
    >
      <div className="brand-container">
        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <Link
            href={pathname === "/" ? "#home" : "/"}
            onClick={(e) => handleLinkClick(e, pathname === "/" ? "#home" : "/")}
            className="relative h-11 w-44 sm:h-13 sm:w-52 transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg shrink-0"
          >
            <Image
              src="/images/logo_transparent.png"
              alt="Shifat's Tales Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </Link>

          {/* Desktop Navigation (Stacked Icon above Label + Separator Dots) */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-1.5">
            {navItems.map((item, index) => {
              const active = isActive(item);
              const targetHref = item.href.startsWith("#") && pathname !== "/" ? `/${item.href}` : item.href;
              const isLast = index === navItems.length - 1;

              return (
                <React.Fragment key={item.label}>
                  <Link
                    href={targetHref}
                    onClick={(e) => handleLinkClick(e, item.href)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex flex-col items-center justify-center px-3 py-1.5 rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      active
                        ? "bg-accent/15 border border-accent/40 text-primary font-extrabold shadow-xs scale-[1.02] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-0.5 after:bg-accent after:rounded-full"
                        : "text-primary-dark/80 hover:text-primary hover:bg-bg/80 hover:scale-[1.02] active:scale-[0.98]"
                    )}
                  >
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
                        "text-[11px] leading-tight mt-1 whitespace-nowrap",
                        active ? "font-extrabold text-primary" : "font-bold text-primary-dark/80 group-hover:text-primary"
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>

                  {/* Decorative Separator Dot */}
                  {!isLast && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent/40 hidden xl:inline-block shrink-0 mx-0.5 pointer-events-none" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Call to Action Right-Side Group */}
          <div className="hidden sm:flex items-center space-x-3 pl-2 xl:pl-4 border-l border-border/60">
            <a
              href={`tel:${siteInfo.phone.replace(/[\s-]/g, "")}`}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-extrabold text-primary hover:text-primary-dark hover:scale-[1.04] active:scale-[0.98] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
              title="Call Sir"
            >
              <Phone className="h-4 w-4 text-primary shrink-0" />
              <span className="hidden md:inline font-extrabold">Call Sir</span>
            </a>
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl border-2 border-primary/20 hover:border-primary/40 text-primary text-xs sm:text-sm font-bold hover:bg-primary/5 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span>Login</span>
            </Link>
            <Link
              href="/register"
              className="primary-btn px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-accent/25 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span>Register</span>
            </Link>
          </div>

          {/* Mobile Menu Button (Only visible on mobile/tablet) */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-lg text-primary hover:text-primary-dark hover:bg-bg/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent hover:scale-[1.05] active:scale-[0.95] transition-all duration-200 relative z-50"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <div
        className={cn(
          "lg:hidden fixed inset-y-0 right-0 w-full sm:w-80 bg-bg-soft/98 backdrop-blur-xl border-l border-border/80 shadow-2xl z-40 transform transition-all duration-350 ease-in-out p-6 pt-24",
          isOpen
            ? "translate-x-0 opacity-100 pointer-events-auto"
            : "translate-x-full opacity-0 pointer-events-none invisible"
        )}
        id="mobile-menu"
      >
        <div className="flex flex-col space-y-3.5">
          {navItems.map((item) => {
            const active = isActive(item);
            const targetHref = item.href.startsWith("#") && pathname !== "/" ? `/${item.href}` : item.href;
            return (
              <Link
                key={item.label}
                href={targetHref}
                onClick={(e) => handleLinkClick(e, item.href)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center space-x-3 text-base font-bold border-b border-border/40 pb-2.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded",
                  active
                    ? "text-primary font-extrabold pl-2 border-l-4 border-l-accent bg-accent/15 py-1.5"
                    : "text-primary-dark/90 hover:text-primary hover:pl-2"
                )}
              >
                <div className={active ? "text-primary" : "text-primary/70"}>
                  {renderNavIcon(item.iconName, "h-5 w-5")}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-4 flex flex-col space-y-3">
            <a
              href={`tel:${siteInfo.phone.replace(/[\s-]/g, "")}`}
              className="flex items-center justify-center space-x-2 py-3 rounded-xl border-2 border-primary/20 bg-primary/5 text-primary font-extrabold hover:bg-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <Phone className="h-4 w-4" />
              <span>Call Sir Now</span>
            </a>
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center space-x-2 py-3 rounded-xl border-2 border-primary/20 bg-primary/5 text-primary font-extrabold hover:bg-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <span>Login</span>
            </Link>
            <Link
              href="/register"
              onClick={() => setIsOpen(false)}
              className="primary-btn flex items-center justify-center space-x-2 py-3 rounded-xl font-bold shadow-lg shadow-accent/15 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              <span>Register</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
