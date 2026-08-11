"use client";

import { useState } from "react";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { About } from "./About";
import { Services } from "./Services";
import { Timings } from "./Timings";
import { Trainers } from "./Trainers";
import { Gallery } from "./Gallery";
import { Reviews } from "./Reviews";
import { CtaLocation } from "./CtaLocation";
import { Faq } from "./Faq";
import { Footer } from "./Footer";
import { DownloadModal } from "./ui/DownloadModal";
import { FloatingWhatsapp } from "./ui/FloatingWhatsapp";
import { PageLoader } from "./ui/PageLoader";
import { ScrollReveal } from "./ui/ScrollReveal";

export function HomeClient() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen bg-[#070D08] flex flex-col font-sans">
      {/* Page Loading Animation Screen */}
      <PageLoader />

      {/* Full Screen Header Navigation */}
      <Navbar onDownloadClick={handleOpenModal} />

      {/* Main Full-Screen Landing Content */}
      <main className="flex-1 flex flex-col justify-center">
        <Hero onDownloadClick={handleOpenModal} />

        <ScrollReveal>
          <About />
        </ScrollReveal>

        <ScrollReveal>
          <Services />
        </ScrollReveal>

        <ScrollReveal>
          <Timings />
        </ScrollReveal>

        <ScrollReveal>
          <Trainers />
        </ScrollReveal>

        <ScrollReveal>
          <Gallery />
        </ScrollReveal>

        <ScrollReveal>
          <Reviews />
        </ScrollReveal>

        <ScrollReveal>
          <CtaLocation onJoinClick={handleOpenModal} />
        </ScrollReveal>

        <ScrollReveal>
          <Faq />
        </ScrollReveal>
      </main>

      {/* Full Width Footer */}
      <Footer />

      {/* Floating Sticky WhatsApp Button */}
      <FloatingWhatsapp />

      {/* Download App Coming Soon Modal */}
      <DownloadModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
}
