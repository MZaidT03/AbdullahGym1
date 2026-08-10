"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { siteData } from "../config/siteData";
import { Button } from "./ui/Button";

export function Hero({ onDownloadClick }) {
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty("--mouse-x", `${x}px`);
    containerRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full min-h-screen flex items-center justify-center text-center overflow-hidden group/hero"
    >
      {/* Full-Portion Background Image */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Image
          src="/assets/images/landing.png"
          alt="ABDULLAH GYM 1 Hero Background"
          fill
          priority
          className="object-cover object-center scale-105 group-hover/hero:scale-110 transition-transform duration-1000 ease-out"
          sizes="100vw"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/60 to-[#0A120B]" />

        {/* Interactive Dynamic Mouse Spotlight */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500 opacity-60 group-hover/hero:opacity-100 z-10"
          style={{
            background:
              "radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 40%), rgba(34, 197, 94, 0.22), transparent 60%)",
          }}
        />

        {/* Ambient Floating Glow Spheres */}
        <div className="absolute top-1/4 left-1/5 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl animate-float-1 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/5 w-80 h-80 rounded-full bg-green-600/20 blur-3xl animate-float-2 pointer-events-none" />
      </div>

      {/* Hero Content Overlay */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 pt-32 pb-20 flex flex-col items-center">
        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-400 tracking-tight leading-[1.05] mb-5 drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] uppercase transform hover:scale-[1.01] transition-transform duration-300">
          {siteData.hero.headline}
        </h1>

        {/* Subtitle / Center Type */}
        <div className="mb-5 inline-block px-6 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-white text-base sm:text-xl md:text-2xl font-black tracking-widest uppercase backdrop-blur-xl shadow-xl shadow-emerald-500/10 animate-pulse-glow">
          {siteData.hero.subheading}
        </div>

        {/* Slogan */}
        <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#22C55E] italic tracking-wide mb-10 drop-shadow-md">
          &ldquo;{siteData.hero.slogan}&rdquo;
        </p>

        {/* Action CTA Button */}
        <div className="flex items-center justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={onDownloadClick}
            className="interactive-shine glow-cta-btn px-10 py-4 text-base sm:text-lg rounded-2xl font-black border border-emerald-400/30 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            {siteData.hero.primaryCta}
          </Button>
        </div>
      </div>
    </section>
  );
}
