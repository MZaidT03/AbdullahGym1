"use client";

import React from "react";
import Image from "next/image";
import { siteData } from "../config/siteData";

export function Footer() {
  const { name, logo, hero, contact, socials, footerLinks, copyright } = siteData;

  return (
    <footer className="w-full bg-[#050A06] border-t border-white/10 pt-16 pb-10 px-4 sm:px-8 text-white relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
        {/* Col 1: Brand Info */}
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-3.5 mb-4 group cursor-pointer">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-300">
              <Image
                src={logo}
                alt="ABDULLAH GYM 1 Logo"
                fill
                sizes="48px"
                className="object-contain"
              />
            </div>
            <span className="text-xl font-black text-white tracking-wider uppercase">
              ABDULLAH <span className="text-[#22C55E]">GYM 1</span>
            </span>
          </div>

          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-4">
            GENTS AND LADIES FITNESS CENTER
          </p>

          <span className="text-xs font-black text-[#22C55E] italic tracking-wide">
            &ldquo;{hero.slogan}&rdquo;
          </span>
        </div>

        {/* Col 2: Social Media Connect */}
        <div className="flex flex-col text-left">
          <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4">
            Follow & Connect
          </h4>
          <div className="flex flex-col gap-3">
            <a
              href={socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-black border border-white/10 hover:border-emerald-400 transition-all duration-300 text-xs sm:text-sm font-bold text-gray-200 shadow-sm group"
            >
              <svg className="w-5 h-5 fill-current text-emerald-400 group-hover:text-black transition-colors" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Facebook Official</span>
            </a>

            <a
              href={socials.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-black border border-white/10 hover:border-emerald-400 transition-all duration-300 text-xs sm:text-sm font-bold text-gray-200 shadow-sm group"
            >
              <svg className="w-5 h-5 fill-current text-emerald-400 group-hover:text-black transition-colors" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.56-1.36 1.48-1.44 2.47-.11 1.27.42 2.56 1.42 3.32.95.73 2.29.9 3.41.44 1.13-.44 1.98-1.49 2.18-2.69.06-1.93.03-3.87.03-5.8V.02z"/>
              </svg>
              <span>TikTok Official</span>
            </a>

            <a
              href={socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-black border border-white/10 hover:border-emerald-400 transition-all duration-300 text-xs sm:text-sm font-bold text-gray-200 shadow-sm group"
            >
              <svg className="w-5 h-5 fill-current text-emerald-400 group-hover:text-black transition-colors" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span>Instagram Official</span>
            </a>
          </div>
        </div>

        {/* Col 3: Direct Phone & WhatsApp */}
        <div className="flex flex-col text-left">
          <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4">
            Direct Contacts
          </h4>
          <div className="flex flex-col gap-2.5 text-xs sm:text-sm text-gray-300">
            <a
              href={contact.whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 text-emerald-400 font-extrabold hover:underline"
            >
              <span>💬 WhatsApp:</span>
              <span>{contact.whatsapp}</span>
            </a>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                <span>✉️</span>
                <span>Official Email:</span>
              </span>
              <a
                href={`mailto:${contact.email}`}
                className="text-gray-200 hover:text-emerald-400 font-bold transition-colors text-sm break-all hover:underline cursor-pointer"
              >
                {contact.email}
              </a>
            </div>

            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                <span>📞</span>
                <span>Direct Phone Calls:</span>
              </span>
              {contact.phones.map((phone, idx) => {
                const clean = phone.replace(/\s+/g, "");
                const telNumber = clean.startsWith("0") ? `+92${clean.slice(1)}` : clean;
                return (
                  <a
                    key={idx}
                    href={`tel:${telNumber}`}
                    className="font-mono text-gray-200 hover:text-emerald-400 font-extrabold text-sm flex items-center gap-2 hover:underline transition-colors cursor-pointer"
                  >
                    <span className="text-emerald-400 text-xs">📞</span>
                    <span>{phone}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Col 4: Quick Navigation Links */}
        <div className="flex flex-col text-left">
          <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4">
            Quick Navigation
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-300">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-emerald-400 transition-colors py-1"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Copyright, Physical Address & Developer Credit */}
      <div className="max-w-7xl mx-auto border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400 text-center md:text-left">
        <div>{copyright}</div>

        <div className="flex items-center gap-1.5 text-gray-300 font-medium">
          <span className="text-emerald-400">📍</span>
          <span>{contact.address}</span>
        </div>

        <div className="flex items-center gap-1 text-gray-300">
          <span>Developed with ❤️ by</span>
          <a
            href={siteData.developer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 font-extrabold hover:text-emerald-300 underline transition-colors"
          >
            {siteData.developer.name}
          </a>
        </div>
      </div>
    </footer>
  );
}
