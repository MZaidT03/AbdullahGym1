"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { siteData } from "../../config/siteData";

export function PageLoader() {
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Only runs on client — safe to access sessionStorage here
    if (sessionStorage.getItem("__ag1_loaded")) {
      // Already visited this session — skip loader instantly
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => {
        setLoading(false);
        sessionStorage.setItem("__ag1_loaded", "1");
      }, 500);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!loading) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] bg-[#050A06] flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Animated Glowing Logo Container */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-6 flex items-center justify-center">
        {/* Pulsing Outer Emerald Ring */}
        <div className="absolute inset-0 rounded-3xl bg-emerald-500/20 blur-xl animate-pulse" />
        
        {/* Spinning Gradient Border Ring */}
        <div className="absolute inset-0 rounded-2xl p-[3px] bg-gradient-to-tr from-emerald-400 via-green-500 to-emerald-800 animate-spin">
          <div className="w-full h-full bg-[#050A06] rounded-[13px]" />
        </div>

        {/* Logo Image */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shadow-2xl z-10">
          <Image
            src={siteData.logo}
            alt="ABDULLAH GYM 1 Loading Logo"
            fill
            sizes="96px"
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Brand Title */}
      <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2">
        ABDULLAH <span className="text-[#22C55E]">GYM 1</span>
      </h2>

      {/* Slogan */}
      <p className="text-xs font-bold text-emerald-400 italic tracking-widest uppercase mb-6">
        &ldquo;{siteData.hero.slogan}&rdquo;
      </p>

      {/* Animated Loading Bar */}
      <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="w-full h-full bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-300 rounded-full animate-loading-bar" />
      </div>
    </div>
  );
}
