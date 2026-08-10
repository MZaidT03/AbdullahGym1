"use client";

import React, { useRef } from "react";
import { siteData } from "../config/siteData";

export function CtaLocation({ onJoinClick }) {
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty("--cta-x", `${x}px`);
    containerRef.current.style.setProperty("--cta-y", `${y}px`);
  };

  const { headline, subtitle, buttonText, location } = siteData.ctaLocation;

  return (
    <section
      id="location"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full py-20 sm:py-28 px-4 sm:px-8 bg-[#070D08] border-b border-white/10 overflow-hidden text-white"
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-green-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* Interactive Spotlight Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-300 z-0"
        style={{
          background:
            "radial-gradient(600px circle at var(--cta-x, 50%) var(--cta-y, 50%), rgba(34, 197, 94, 0.18), transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center">
        {/* 1. CTA Banner Container */}
        <div className="relative w-full bg-gradient-to-br from-emerald-950/60 via-[#0E1A10] to-[#070D08] border border-emerald-500/40 rounded-3xl p-8 sm:p-14 mb-16 shadow-[0_0_60px_rgba(34,197,94,0.2)] text-center flex flex-col items-center overflow-hidden">
          {/* Subtle Background Particle Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <span className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs sm:text-sm font-extrabold uppercase tracking-widest backdrop-blur-md">
            🔥 Transform Your Life
          </span>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-400 tracking-tight leading-tight mb-5 uppercase">
            {headline}
          </h2>

          <p className="text-base sm:text-lg md:text-xl text-gray-200 max-w-3xl leading-relaxed font-normal mb-8">
            {subtitle}
          </p>

          <button
            onClick={onJoinClick}
            className="interactive-shine glow-cta-btn bg-[#22C55E] hover:bg-[#16A34A] text-white font-black text-lg sm:text-xl uppercase tracking-wider px-10 py-4.5 rounded-2xl transition-all duration-300 border border-emerald-400/30 hover:scale-105 active:scale-95 cursor-pointer"
          >
            {buttonText}
          </button>
        </div>

        {/* 2. Location & Google Map Container */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Address Details Card */}
          <div className="lg:col-span-4 bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md flex flex-col justify-between shadow-[0_0_40px_rgba(0,0,0,0.6)] text-left">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                📍 Exact Location
              </div>

              <h3 className="text-2xl font-black text-white uppercase tracking-wide mb-3">
                {location.name}
              </h3>

              <div className="flex flex-col gap-3.5 text-sm text-gray-300 mb-6">
                <div className="flex items-start gap-2.5">
                  <span className="text-emerald-400 text-lg">🏢</span>
                  <div>
                    <strong className="text-white block text-xs uppercase tracking-wider">Address</strong>
                    <span>{location.address}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-emerald-400 text-lg">📌</span>
                  <div>
                    <strong className="text-white block text-xs uppercase tracking-wider">Plus Code</strong>
                    <span className="font-mono text-emerald-400 font-bold">{location.plusCode}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-emerald-400 text-lg">✉️</span>
                  <div>
                    <strong className="text-white block text-xs uppercase tracking-wider">Email Us</strong>
                    <a
                      href={`mailto:${siteData.contact.email}`}
                      className="text-emerald-400 font-bold hover:underline break-all transition-colors cursor-pointer"
                    >
                      {siteData.contact.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-emerald-400 text-lg">📞</span>
                  <div>
                    <strong className="text-white block text-xs uppercase tracking-wider">Direct Calls</strong>
                    <div className="flex flex-col gap-1 mt-0.5">
                      {siteData.contact.phones.map((phone, idx) => {
                        const clean = phone.replace(/\s+/g, "");
                        const telNumber = clean.startsWith("0") ? `+92${clean.slice(1)}` : clean;
                        return (
                          <a
                            key={idx}
                            href={`tel:${telNumber}`}
                            className="font-mono text-emerald-400 font-bold hover:underline block transition-colors cursor-pointer"
                          >
                            {phone}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* External Google Maps Button */}
            <a
              href={location.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-white/10 hover:bg-emerald-500 hover:text-black text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider py-3.5 px-4 rounded-xl border border-white/20 hover:border-emerald-400 text-center transition-all duration-300 flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <span>Open in Google Maps</span>
              <span>🗺️</span>
            </a>
          </div>

          {/* Embedded Google Map Iframe Container */}
          <div className="lg:col-span-8 relative w-full min-h-[350px] sm:min-h-[420px] rounded-3xl overflow-hidden border border-emerald-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-black/60">
            <iframe
              title="Abdullah Gym 1 Location Map"
              src={location.embedUrl}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: "350px" }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full grayscale-[30%] contrast-[110%] hover:grayscale-0 transition-all duration-500"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
