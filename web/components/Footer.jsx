"use client";

import React from "react";
import { siteData } from "../config/siteData";

export function Footer() {
  return (
    <footer className="w-full bg-[#EFF6ED] border-t border-[#D5E0D2] mt-16 sm:mt-24 px-4 sm:px-8 py-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-[#525E54]">
        {/* Left Logo */}
        <div className="font-extrabold text-base sm:text-lg text-[#0B6634] tracking-tight">
          {siteData.name}
        </div>

        {/* Middle Footer Links */}
        <div className="flex flex-wrap justify-center items-center gap-6 font-medium">
          {siteData.footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-[#0B6634] transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right Copyright */}
        <div className="text-center md:text-right font-normal text-[#6B776D]">
          {siteData.copyright}
        </div>
      </div>
    </footer>
  );
}
