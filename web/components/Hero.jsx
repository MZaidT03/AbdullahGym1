"use client";

import React from "react";
import { siteData } from "../config/siteData";
import { Button } from "./ui/Button";

export function Hero() {
  return (
    <section className="w-full py-16 sm:py-24 px-4 sm:px-8 text-center flex flex-col items-center max-w-4xl mx-auto">
      {/* Headline */}
      <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#1A261C] tracking-tight leading-[1.15] mb-6">
        {siteData.hero.headline}
      </h1>

      {/* Subtitle */}
      <p className="text-sm sm:text-base md:text-lg text-[#525E54] max-w-2xl leading-relaxed mb-10 font-normal">
        {siteData.hero.subtitle}
      </p>

      {/* Action CTA Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button variant="primary" size="lg" className="px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-500/25">
          {siteData.hero.primaryCta}
        </Button>
        <a href="/admin/login">
          <Button variant="admin" size="lg" className="px-8 py-3.5 rounded-xl font-bold">
            {siteData.hero.secondaryCta}
          </Button>
        </a>
      </div>
    </section>
  );
}
