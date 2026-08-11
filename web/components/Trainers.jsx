"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { siteData } from "../config/siteData";

export function Trainers() {
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty("--trainers-x", `${x}px`);
    containerRef.current.style.setProperty("--trainers-y", `${y}px`);
  };

  const { badge, title, description, members } = siteData.trainers;

  return (
    <section
      id="trainers"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full py-20 sm:py-28 px-4 sm:px-8 bg-[#070D08] border-b border-white/10 overflow-hidden text-white"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-green-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Interactive Spotlight Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300 z-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--trainers-x, 50%) var(--trainers-y, 50%), rgba(34, 197, 94, 0.15), transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center">
        {/* Section Badge */}
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-extrabold uppercase tracking-widest backdrop-blur-md">
          {badge}
        </div>

        {/* Section Title */}
        <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-400 tracking-tight leading-tight mb-4 uppercase text-center">
          {title}
        </h2>

        {/* Description */}
        <p className="text-base sm:text-lg text-gray-300 max-w-2xl leading-relaxed font-normal mb-12 sm:mb-16 text-center">
          {description}
        </p>

        {/* 2 Featured Trainer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 w-full max-w-5xl">
          {members.map((trainer) => (
            <div
              key={trainer.id}
              className="group relative bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-3xl p-6 sm:p-8 backdrop-blur-md transition-all duration-300 transform hover:-translate-y-2 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.6)]"
            >
              {/* Trainer Image Container */}
              <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden mb-6 border border-emerald-500/30 bg-black/60">
                <Image
                  src={trainer.image}
                  alt={trainer.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20" />

                {/* Experience Badge on Image */}
                <div className="absolute bottom-4 left-4 px-3 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/20 text-xs font-bold text-gray-200">
                  ⏳ {trainer.experience}
                </div>
              </div>

              {/* Name & Role */}
              <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mb-1 group-hover:text-emerald-400 transition-colors">
                {trainer.name}
              </h3>
              <p className="text-xs sm:text-sm font-bold text-emerald-400 mb-2 tracking-wide">
                {trainer.role}
              </p>
              {trainer.subtitle ? (
                <div className="mb-5 inline-block self-start px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-extrabold tracking-wide uppercase">
                  {trainer.subtitle}
                </div>
              ) : (
                <div className="mb-3" />
              )}

              {/* Specialties List */}
              <div className="mt-auto border-t border-white/10 pt-5 flex flex-wrap gap-2">
                {trainer.specialties.map((spec, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold"
                  >
                    ✓ {spec}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
