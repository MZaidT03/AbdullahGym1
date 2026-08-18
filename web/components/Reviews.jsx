"use client";

import React, { useRef } from "react";
import { siteData } from "../config/siteData";

function StarRating({ rating = 5 }) {
  return (
    <div className="flex items-center gap-1 text-emerald-400 text-sm">
      {[...Array(rating)].map((_, i) => (
        <span key={i}>★</span>
      ))}
    </div>
  );
}

export function Reviews() {
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty("--reviews-x", `${x}px`);
    containerRef.current.style.setProperty("--reviews-y", `${y}px`);
  };

  const { badge, title, description, items } = siteData.reviews;

  return (
    <section
      id="reviews"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full py-20 sm:py-28 px-4 sm:px-8 bg-[#070D08] border-b border-white/10 overflow-hidden text-white"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-green-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Interactive Spotlight Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300 z-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--reviews-x, 50%) var(--reviews-y, 50%), rgba(34, 197, 94, 0.15), transparent 70%)",
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

        {/* 4 Member Review Cards (Ammad, Talha, Ahmed, Umar) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-6xl">
          {items.map((review) => (
            <div
              key={review.id}
              className="group relative bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-3xl p-6 sm:p-8 backdrop-blur-md transition-all duration-300 transform hover:-translate-y-1.5 flex flex-col justify-between shadow-[0_0_40px_rgba(0,0,0,0.6)] cursor-pointer"
            >
              {/* Top Header: Avatar & Rating */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-800 text-white font-black text-lg flex items-center justify-center border border-emerald-400/40 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                    {review.initial}
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-extrabold text-white uppercase group-hover:text-emerald-400 transition-colors">
                      {review.name}
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">
                      {review.role}
                    </p>
                  </div>
                </div>

                <StarRating rating={review.rating} />
              </div>

              {/* Review Comment */}
              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed italic font-normal text-left relative pl-4 border-l-2 border-emerald-500/40">
                &ldquo;{review.comment}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
