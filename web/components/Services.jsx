"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { siteData } from "../config/siteData";

function ServiceIcon({ type }) {
  switch (type) {
    case "dumbbell":
      return (
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 8v8m12-8v8M4 10v4m16-4v4m-5-6h2v8h-2m-8-8h2v8H7" />
        </svg>
      );
    case "heart-pulse":
      return (
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0zM12 11.5l1.5-2.5 2 4 1.5-2.5" />
        </svg>
      );
    case "user-check":
      return (
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7zM16 11l2 2 4-4" />
        </svg>
      );
    case "apple":
      return (
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v2m0 0a6 6 0 00-6 6c0 4.5 3.5 8.5 6 9.5 2.5-1 6-5 6-9.5a6 6 0 00-6-6zm0 0c.5-1 1.5-1.5 2.5-1.5" />
        </svg>
      );
    default:
      return null;
  }
}

export function Services() {
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty("--services-x", `${x}px`);
    containerRef.current.style.setProperty("--services-y", `${y}px`);
  };

  return (
    <section
      id="services"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full py-20 sm:py-28 px-4 sm:px-8 bg-[#070D08] border-b border-white/10 overflow-hidden text-white"
    >
      {/* Ambient Background Glows */}
      <div className="absolute top-1/2 right-10 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-green-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Interactive Spotlight Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300 z-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--services-x, 50%) var(--services-y, 50%), rgba(34, 197, 94, 0.15), transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center">
        {/* Section Badge */}
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-extrabold uppercase tracking-widest backdrop-blur-md">
          {siteData.services.badge}
        </div>

        {/* Section Title */}
        <h2 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-400 tracking-tight leading-tight mb-4 uppercase text-center">
          {siteData.services.title}
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-gray-300 max-w-2xl leading-relaxed font-normal mb-12 sm:mb-16 text-center">
          {siteData.services.description}
        </p>

        {/* Split Grid: Cards on Left, Image on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          {/* 4 Cards Grid (Left Column) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {siteData.services.items.map((service) => (
              <div
                key={service.id}
                className="group relative bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-2xl p-6 backdrop-blur-md transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-[0_10px_30px_rgba(34,197,94,0.18)] flex flex-col items-start text-left cursor-pointer"
              >
                {/* Icon Container */}
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-emerald-500/25 transition-all duration-300">
                  <ServiceIcon type={service.icon} />
                </div>

                {/* Service Title */}
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                  {service.title}
                </h3>

                {/* Service Description */}
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-normal">
                  {service.description}
                </p>
              </div>
            ))}
          </div>

          {/* Featured Dark Gym Image (Right Column) */}
          <div className="lg:col-span-5 relative group">
            <div className="relative w-full aspect-[4/5] sm:aspect-square lg:aspect-[4/5] rounded-3xl overflow-hidden border border-emerald-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-black/60">
              <Image
                src={siteData.services.image}
                alt="ABDULLAH GYM 1 Services"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              {/* Dark Overlay matching Theme */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
              <div className="absolute bottom-6 left-6 right-6 p-4.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-1">
                  WHAT WE OFFER
                </p>
                <p className="text-sm font-bold text-white">
                  State-of-the-art Gym & Training Programs
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
