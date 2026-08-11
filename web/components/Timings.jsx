"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { siteData } from "../config/siteData";

function CheckIcon() {
  return (
    <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

export function Timings() {
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty("--timings-x", `${x}px`);
    containerRef.current.style.setProperty("--timings-y", `${y}px`);
  };

  const { ladies, gents } = siteData.genderSections;

  return (
    <section
      id="timings"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full py-20 sm:py-28 px-4 sm:px-8 bg-[#0A120B] border-b border-white/10 overflow-hidden text-white"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Interactive Spotlight Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300 z-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--timings-x, 50%) var(--timings-y, 50%), rgba(34, 197, 94, 0.15), transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center">
        {/* Section Badge */}
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-extrabold uppercase tracking-widest backdrop-blur-md">
          {siteData.genderSections.badge}
        </div>

        {/* Section Title */}
        <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-400 tracking-tight leading-tight mb-4 uppercase text-center">
          {siteData.genderSections.title}
        </h2>

        {/* Reassuring Privacy Message */}
        <p className="text-base sm:text-lg md:text-xl text-gray-200 max-w-3xl leading-relaxed font-semibold mb-12 sm:mb-16 text-center bg-white/5 border border-emerald-500/30 px-6 py-4 rounded-2xl backdrop-blur-md shadow-lg shadow-emerald-500/5">
          {siteData.genderSections.description}
        </p>

        {/* Two Featured Shift Cards (Ladies & Gents) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 w-full">
          {/* Ladies Section Card */}
          <div className="group relative bg-white/5 border border-emerald-500/30 hover:border-emerald-500/60 rounded-3xl p-6 sm:p-8 backdrop-blur-md transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.6)]">
            {/* Image Container with Hijab Fitness Image */}
            <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden mb-6 border border-white/10 bg-black/60">
              <Image
                src={ladies.image}
                alt="Ladies Fitness Section with Hijab"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
              
              {/* Timing Badge on Image */}
              <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg">
                Ladies Shift: {ladies.timings}
              </div>

              {/* Privacy Pill */}
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 text-xs font-bold text-emerald-400">
                🔒 100% Secluded & Private Facilities
              </div>
            </div>

            {/* Title & Subtitle */}
            <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-wide group-hover:text-emerald-400 transition-colors">
              {ladies.title}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-400 font-semibold mb-6">
              {ladies.subtitle}
            </p>

            {/* Checklist */}
            <div className="flex flex-col gap-3 mt-auto border-t border-white/10 pt-5">
              {ladies.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="text-xs sm:text-sm text-gray-200 font-medium">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Gents Section Card */}
          <div className="group relative bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-3xl p-6 sm:p-8 backdrop-blur-md transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.6)]">
            {/* Image Container */}
            <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden mb-6 border border-white/10 bg-black/60">
              <Image
                src={gents.image}
                alt="Gents Fitness Section"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
              
              {/* Timing Badge on Image */}
              <div className="absolute top-4 left-4 px-3.5 py-1.5 rounded-xl bg-white/20 border border-white/30 text-white font-black text-xs sm:text-sm uppercase tracking-wider backdrop-blur-md shadow-lg">
                Gents Shift: {gents.timings}
              </div>

              {/* Tag Pill */}
              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 text-xs font-bold text-gray-200">
                💪 Powerlifting & Bodybuilding Setup
              </div>
            </div>

            {/* Title & Subtitle */}
            <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-wide group-hover:text-emerald-400 transition-colors">
              {gents.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 font-semibold mb-6">
              {gents.subtitle}
            </p>

            {/* Checklist */}
            <div className="flex flex-col gap-3 mt-auto border-t border-white/10 pt-5">
              {gents.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckIcon />
                  <span className="text-xs sm:text-sm text-gray-200 font-medium">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
