"use client";

import { useState } from "react";
import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { About } from "../components/About";
import { Services } from "../components/Services";
import { Timings } from "../components/Timings";
import { Trainers } from "../components/Trainers";
import { Gallery } from "../components/Gallery";
import { Reviews } from "../components/Reviews";
import { CtaLocation } from "../components/CtaLocation";
import { Faq } from "../components/Faq";
import { Footer } from "../components/Footer";
import { DownloadModal } from "../components/ui/DownloadModal";
import { FloatingWhatsapp } from "../components/ui/FloatingWhatsapp";
import { PageLoader } from "../components/ui/PageLoader";
import { ScrollReveal } from "../components/ui/ScrollReveal";

export default function Home() {
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
