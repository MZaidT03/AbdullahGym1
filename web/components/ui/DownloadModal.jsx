"use client";

import React from "react";

export function DownloadModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity duration-300">
      <div className="relative w-full max-w-md bg-[#0F1A11] border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(34,197,94,0.3)] text-center text-white flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* Rocket Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-3xl mb-4 shadow-inner">
          🚀
        </div>

        {/* Status Badge */}
        <span className="px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold uppercase tracking-widest mb-3">
          Coming Soon
        </span>

        {/* Title */}
        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
          App In Active Development
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6 font-normal">
          The official <strong className="text-emerald-400 font-bold">ABDULLAH GYM 1</strong> mobile app for iOS & Android is coming soon! You will be able to manage digital memberships, track attendance, and view real-time gym crowd status.
        </p>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white font-black text-sm uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/30 border border-emerald-400/30 active:scale-95 cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
