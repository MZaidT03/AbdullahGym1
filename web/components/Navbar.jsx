"use client";

import React from "react";
import Link from "next/link";
import { siteData } from "../config/siteData";

export function Navbar() {
  return (
    <header className="w-full bg-[#EFF6ED] border-b border-[#D5E0D2] px-4 sm:px-8 py-3.5 flex items-center justify-between">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-1.5 cursor-pointer">
        <span className="text-xl sm:text-2xl font-extrabold text-[#0B6634] tracking-tight">
          {siteData.name}
        </span>
      </Link>

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
        <Link
          href="/admin/login"
          className="bg-[#E4EDE1] text-[#0B6634] text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#D8E6D4] transition border border-[#D0DEC9]"
        >
          Admin Login
        </Link>
        <button className="bg-[#22C55E] text-white text-xs sm:text-sm font-semibold px-4.5 py-2 rounded-xl hover:bg-[#16A34A] transition shadow-sm shadow-emerald-500/20">
          Download App
        </button>
      </div>
    </header>
  );
}
