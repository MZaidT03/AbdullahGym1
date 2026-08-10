"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { siteData } from "../config/siteData";

export function Gallery() {
  const [selectedImage, setSelectedImage] = useState(null);
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty("--gallery-x", `${x}px`);
    containerRef.current.style.setProperty("--gallery-y", `${y}px`);
  };

  const { badge, title, description, items } = siteData.gallery;

  return (
    <section
      id="gallery"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full py-20 sm:py-28 px-4 sm:px-8 bg-[#0A120B] border-b border-white/10 overflow-hidden text-white"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-green-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Interactive Spotlight Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300 z-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--gallery-x, 50%) var(--gallery-y, 50%), rgba(34, 197, 94, 0.15), transparent 70%)",
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

        {/* 4 Image Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedImage(item)}
              className="group relative bg-white/5 border border-white/10 hover:border-emerald-500/50 rounded-3xl overflow-hidden backdrop-blur-md transition-all duration-300 transform hover:-translate-y-2 flex flex-col cursor-pointer shadow-[0_0_30px_rgba(0,0,0,0.6)]"
            >
              {/* Image Aspect Box */}
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-black/60">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                
                {/* Zoom Icon Badge */}
                <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 border border-white/20 text-emerald-400 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-md">
                  🔍
                </div>
              </div>

              {/* Card Label Content */}
              <div className="p-5 flex flex-col text-left">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 mb-1">
                  {item.category}
                </span>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {item.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal for Expanded View */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-8 bg-black/85 backdrop-blur-md animate-fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-[#0F1A11] border border-emerald-500/40 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(34,197,94,0.3)] text-white flex flex-col"
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-20 text-white bg-black/70 hover:bg-emerald-500 hover:text-black rounded-full w-9 h-9 flex items-center justify-center transition-all cursor-pointer font-bold shadow-lg"
            >
              ✕
            </button>

            {/* Modal Image Box */}
            <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-black">
              <Image
                src={selectedImage.image}
                alt={selectedImage.title}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            {/* Modal Image Caption */}
            <div className="p-6 bg-[#070D08] flex items-center justify-between border-t border-white/10">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 block mb-1">
                  {selectedImage.category}
                </span>
                <h4 className="text-lg sm:text-xl font-bold text-white">
                  {selectedImage.title}
                </h4>
              </div>
              <span className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase">
                ABDULLAH GYM 1
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
