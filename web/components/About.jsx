"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { siteData } from "../config/siteData";

export function About() {
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty("--about-x", `${x}px`);
    containerRef.current.style.setProperty("--about-y", `${y}px`);
  };

  return (
    <section
      id="about"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full py-20 sm:py-28 px-4 sm:px-8 bg-[#0A120B] border-y border-white/10 overflow-hidden text-white"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Interactive Spotlight Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300 z-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--about-x, 50%) var(--about-y, 50%), rgba(34, 197, 94, 0.15), transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left Column: Image with Dark Gym Tone */}
        <div className="lg:col-span-5 relative group">
          <div className="relative w-full aspect-[4/5] sm:aspect-square lg:aspect-[4/5] rounded-3xl overflow-hidden border border-emerald-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-black/60">
            <Image
              src="/assets/images/about.png"
              alt="About ABDULLAH GYM 1"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            {/* Dark Gradient Overlay matching Hero tone */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">
                ABDULLAH GYM 1
              </p>
              <p className="text-sm font-semibold text-white">
                Ladies & Gents Fitness Facility
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Content */}
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          {/* Section Badge */}
          <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-extrabold uppercase tracking-widest backdrop-blur-md">
            About Us
          </div>

          {/* Section Title */}
          <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-400 tracking-tight leading-tight mb-6 uppercase">
            {siteData.about.title}
          </h2>

          {/* Concise Description */}
          <p className="text-base sm:text-lg text-gray-300 leading-relaxed font-normal mb-8">
            {siteData.about.description}
          </p>

          {/* 3 Key Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            {siteData.about.highlights.map((item, idx) => (
              <div
                key={idx}
                className="group bg-white/5 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-5 backdrop-blur-md transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm mb-3 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                  0{idx + 1}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1.5 group-hover:text-emerald-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
