"use client";

import React, { useRef } from "react";

function FeatureIcon({ type }) {
  switch (type) {
    case "fingerprint":
      return (
        <svg className="w-6 h-6 text-[#0B6634]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
        </svg>
      );
    case "id-card":
      return (
        <svg className="w-6 h-6 text-[#0B6634]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-4m-4 0V4a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6m-3 6h.01M9 16h6" />
        </svg>
      );
    case "credit-card":
      return (
        <svg className="w-6 h-6 text-[#0B6634]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "users":
      return (
        <svg className="w-6 h-6 text-[#0B6634]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    default:
      return null;
  }
}

export function FeatureCard({ title, description, icon }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty("--card-x", `${x}px`);
    cardRef.current.style.setProperty("--card-y", `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className="group relative bg-[#EEF4EC] border border-[#D5E0D2] rounded-2xl p-6 sm:p-7 flex flex-col items-center text-center shadow-[0_4px_16px_rgba(166,180,164,0.18)] hover:shadow-[0_12px_28px_rgba(34,197,94,0.22)] transition-all duration-300 transform hover:-translate-y-2 overflow-hidden cursor-pointer"
    >
      {/* Interactive Spotlight Radial Highlight */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background:
            "radial-gradient(300px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(34, 197, 94, 0.15), transparent 70%)",
        }}
      />

      {/* Icon Badge */}
      <div className="relative z-10 w-14 h-14 rounded-2xl bg-[#E0EBDC] flex items-center justify-center mb-5 shadow-inner border border-[#D0DFC9] group-hover:scale-110 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all duration-300">
        <FeatureIcon type={icon} />
      </div>

      {/* Card Title */}
      <h3 className="relative z-10 text-base sm:text-lg font-bold text-[#1A261C] mb-2 tracking-tight group-hover:text-[#0B6634] transition-colors duration-200">
        {title}
      </h3>

      {/* Description */}
      <p className="relative z-10 text-xs sm:text-sm text-[#5C655E] leading-relaxed font-normal">
        {description}
      </p>
    </div>
  );
}
