"use client";

import React from "react";
import { siteData } from "../config/siteData";

export function Navbar() {
  return (
    <header className="w-full bg-[#EFF6ED] border-b border-[#D5E0D2] px-4 sm:px-8 py-3.5 flex items-center justify-between">
      {/* Brand Logo */}
      <div className="flex items-center gap-1.5 cursor-pointer">
        <span className="text-xl sm:text-2xl font-extrabold text-[#0B6634] tracking-tight">
          GymPro
        </span>
      </div>

      {/* Center Nav Links */}
      <nav className="hidden md:flex items-center gap-8 text-xs sm:text-sm font-medium text-[#4B564D]">
        {siteData.navLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="hover:text-[#0B6634] transition-colors duration-200"
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-3">
        <button className="bg-[#E4EDE1] text-[#2563EB] text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#D8E6D4] transition border border-[#D0DEC9]">
          Admin Login
        </button>
        <button className="bg-[#22C55E] text-white text-xs sm:text-sm font-semibold px-4.5 py-2 rounded-xl hover:bg-[#16A34A] transition shadow-sm shadow-emerald-500/20">
          Download App
        </button>
      </div>
    </header>
  );
}
