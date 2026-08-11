"use client";

import React, { useState, useRef } from "react";
import { siteData } from "../config/siteData";

export function Faq() {
  const [openId, setOpenId] = useState("timings");
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty("--faq-x", `${x}px`);
    containerRef.current.style.setProperty("--faq-y", `${y}px`);
  };

  const toggleAccordion = (id) => {
    setOpenId(openId === id ? null : id);
  };

  const { badge, title, description, items } = siteData.faqs;

  return (
    <section
      id="faq"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full py-20 sm:py-28 px-4 sm:px-8 bg-[#0A120B] border-b border-white/10 overflow-hidden text-white"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-green-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Interactive Spotlight Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300 z-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--faq-x, 50%) var(--faq-y, 50%), rgba(34, 197, 94, 0.15), transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
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

        {/* FAQ Accordion List */}
        <div className="w-full flex flex-col gap-4">
          {items.map((item) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className={`transition-all duration-300 rounded-2xl border backdrop-blur-md overflow-hidden ${
                  isOpen
                    ? "bg-white/10 border-emerald-500/50 shadow-[0_0_30px_rgba(34,197,94,0.15)]"
                    : "bg-white/5 border-white/10 hover:border-emerald-500/30"
                }`}
              >
                <button
                  onClick={() => toggleAccordion(item.id)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <span className="text-base sm:text-lg font-bold text-white tracking-wide uppercase">
                    {item.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center transition-transform duration-300 flex-shrink-0 ${
                      isOpen ? "rotate-180 bg-emerald-500 text-black border-transparent" : ""
                    }`}
                  >
                    ▼
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-sm sm:text-base text-gray-300 leading-relaxed border-t border-white/10 font-normal animate-fade-in text-left">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
