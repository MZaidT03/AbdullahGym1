"use client";

import React from "react";
import { siteData } from "../config/siteData";
import { FeatureCard } from "./ui/FeatureCard";

export function Features() {
  return (
    <section id="features" className="w-full py-12 sm:py-16 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Section Title */}
      <div className="text-center mb-12 sm:mb-16">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1A261C] tracking-tight mb-3">
          Powerful Features
        </h2>
        <p className="text-sm sm:text-base text-[#525E54] font-normal">
          Everything you need to run your gym effortlessly.
        </p>
      </div>

      {/* Feature Cards 4-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {siteData.features.map((feature) => (
          <FeatureCard
            key={feature.id}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
          />
        ))}
      </div>
    </section>
  );
}
