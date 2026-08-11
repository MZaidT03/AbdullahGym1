"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { siteData } from "../config/siteData";

export function Navbar({ onDownloadClick }) {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isNavClickScrolling = React.useRef(false);

  useEffect(() => {
    const sectionIds = siteData.navLinks.map((link) => link.href.replace("#", ""));

    const handleScroll = () => {
      // Toggle navbar background on scroll
      setScrolled(window.scrollY > 20);

      // Lock active section during smooth click scrolling to prevent skipping
      if (isNavClickScrolling.current) return;

      // 1. Top of page / Hero section (no link active)
      if (window.scrollY < 120) {
        setActiveSection("");
        return;
      }

      // 2. Absolute bottom of page check
      const isAtBottom =
        window.innerHeight + Math.ceil(window.scrollY) >=
        document.documentElement.scrollHeight - 30;

      if (isAtBottom && sectionIds.length > 0) {
        setActiveSection(`#${sectionIds[sectionIds.length - 1]}`);
        return;
      }

      // 3. Focal point section detection (40% down viewport)
      const focalLine = window.innerHeight * 0.4;
      let active = "";

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= focalLine && rect.bottom >= focalLine) {
            active = `#${id}`;
            break;
          }
        }
      }

      if (active) {
        setActiveSection(active);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e, href) => {
    e.preventDefault();
    const id = href.replace("#", "");
    const element = document.getElementById(id);
    if (element) {
      isNavClickScrolling.current = true;
      setActiveSection(href);
      setMobileMenuOpen(false);

      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });

      // Release lock after smooth scroll animation settles
      setTimeout(() => {
        isNavClickScrolling.current = false;
      }, 900);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 w-full px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between transition-all duration-300 ${
        scrolled
          ? "bg-black/90 backdrop-blur-md border-b border-white/10 shadow-2xl py-2.5"
          : "bg-gradient-to-b from-black/90 via-black/50 to-transparent backdrop-blur-[3px] border-b border-white/10 py-3.5"
      }`}
    >
      {/* Brand Logo & Title */}
      <a href="#" className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0">
        <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-300">
          <Image
            src={siteData.logo}
            alt="ABDULLAH GYM 1 Logo"
            fill
            sizes="44px"
            className="object-contain"
          />
        </div>
        <span className="text-sm sm:text-lg md:text-xl font-black text-white tracking-wider uppercase drop-shadow-md whitespace-nowrap">
          ABDULLAH <span className="text-[#22C55E]">GYM 1</span>
        </span>
      </a>

      {/* Center Nav Links with Glowing Active Section Effect */}
      <nav className="max-md:hidden flex flex-1 items-center justify-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 xl:gap-5 text-[10px] md:text-[11px] lg:text-xs font-extrabold tracking-wider uppercase mx-2 lg:mx-4">
        {siteData.navLinks.map((link) => {
          const isActive = activeSection === link.href;
          return (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-300 cursor-pointer whitespace-nowrap ${
                isActive
                  ? "text-[#22C55E] bg-[#22C55E]/15 border border-[#22C55E]/50 shadow-[0_0_20px_rgba(34,197,94,0.45)] font-black scale-105"
                  : "text-white/80 hover:text-white hover:bg-white/10 border border-transparent"
              }`}
            >
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_8px_#22C55E] animate-pulse" />
              )}
              <span>{link.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Right Actions & Mobile Hamburger Button */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        <a
          href="/admin/login"
          className="bg-[#E4EDE1] text-[#0B6634] text-[11px] sm:text-xs md:text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl hover:bg-[#D8E6D4] transition border border-[#D0DEC9] whitespace-nowrap"
        >
          Admin Login
        </a>
        <button
          onClick={onDownloadClick}
          className="glow-cta-btn bg-[#22C55E] text-white text-[11px] sm:text-xs md:text-sm font-extrabold tracking-wider uppercase px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl hover:bg-[#16A34A] transition-all duration-200 border border-emerald-400/30 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
        >
          Download App
        </button>

        {/* Mobile Hamburger Button (< 768px Screens Only) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-white p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Hamburger Navigation Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#070D08]/98 border-b border-white/10 backdrop-blur-2xl p-6 flex flex-col gap-2 text-left shadow-2xl transition-all animate-fade-in z-50 max-h-[80vh] overflow-y-auto">
          {siteData.navLinks.map((link) => {
            const isActive = activeSection === link.href;
            return (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`text-sm sm:text-base font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl border flex items-center justify-between transition-all ${
                  isActive
                    ? "text-[#22C55E] font-black border-[#22C55E]/50 bg-[#22C55E]/15 shadow-[0_0_15px_rgba(34,197,94,0.35)]"
                    : "text-white/80 border-white/5 hover:text-emerald-400 hover:bg-white/5"
                }`}
              >
                <span>{link.label}</span>
                {isActive && (
                  <span className="flex items-center gap-1 text-xs text-[#22C55E] font-extrabold">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] shadow-[0_0_6px_#22C55E] animate-pulse" />
                    Active
                  </span>
                )}
              </a>
            );
          })}
        </div>
      )}
    </header>
  );
}
