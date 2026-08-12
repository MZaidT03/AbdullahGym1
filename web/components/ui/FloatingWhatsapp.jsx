"use client";

import React from "react";
import { siteData } from "../../config/siteData";

export function FloatingWhatsapp() {
  const { whatsappLink, whatsapp } = siteData.contact;

  return (
    <a
      href={whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-[90] flex items-center justify-center bg-[#25D366] hover:bg-[#20ba5a] text-white p-3.5 sm:p-4 rounded-full shadow-[0_10px_30px_rgba(37,211,102,0.4)] border border-emerald-300/40 hover:scale-110 active:scale-95 transition-all duration-300 group cursor-pointer"
    >
      {/* WhatsApp SVG Icon */}
      <div className="relative flex items-center justify-center">
        <span className="absolute -inset-1 rounded-full bg-white/40 animate-ping pointer-events-none" />
        <svg
          className="w-7 h-7 fill-current relative z-10"
          viewBox="0 0 24 24"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.15 4.2 4.293-1.126zm9.362-6.52c-.287-.144-1.7-.838-1.963-.934-.264-.096-.456-.144-.648.144-.192.288-.744.934-.912 1.126-.168.192-.336.216-.624.072-.288-.144-1.219-.449-2.322-1.433-.858-.765-1.438-1.71-1.606-1.998-.168-.288-.018-.444.126-.587.13-.13.288-.336.432-.504.144-.168.192-.288.288-.48.096-.192.048-.36-.024-.504-.072-.144-.648-1.56-.888-2.136-.234-.562-.473-.486-.648-.495l-.552-.009c-.192 0-.504.072-.768.36-.264.288-1.008.984-1.008 2.4 0 1.416 1.032 2.784 1.176 2.976.144.192 2.035 3.108 4.93 4.358.689.298 1.227.476 1.646.609.693.22 1.324.189 1.822.115.556-.083 1.7-.695 1.94-1.367.24-.672.24-1.248.168-1.367-.072-.119-.264-.191-.552-.335z" />
        </svg>
      </div>
    </a>
  );
}
