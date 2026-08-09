"use client";

import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { Features } from "../components/Features";
import { Footer } from "../components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#EFF6ED] flex flex-col font-sans">
      {/* Full Screen Header Navigation */}
      <Navbar />

      {/* Main Full-Screen Landing Content */}
      <main className="flex-1 flex flex-col justify-center">
        <Hero />
        <Features />
      </main>

      {/* Full Width Footer */}
      <Footer />
    </div>
  );
}
