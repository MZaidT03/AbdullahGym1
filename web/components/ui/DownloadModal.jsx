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
          Download Now
        </span>

        {/* Title */}
        <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
          Get The App
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6 font-normal">
          Download the official{" "}
          <strong className="text-emerald-400 font-bold">ABDULLAH GYM 1</strong>{" "}
          mobile app for iOS & Android, or access our web app. Manage
          memberships, track attendance, and view real-time gym status.
        </p>

        {/* Download Buttons */}
        <div className="w-full flex flex-col gap-3 mb-4">
          {/* Mobile App Button */}
          <a
            href="https://expo.dev/accounts/zaidtahir/projects/abdullah-gym-1/builds/6bcf33f6-d950-452b-bc10-ab195a232410"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white font-black text-sm uppercase tracking-wider py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/30 border border-emerald-400/30 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>📱</span>
            Download Mobile App
          </a>

          {/* Web App Button for iOS */}
          <a
            href="https://abdullahgym1-member.netlify.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider py-3 rounded-xl transition-all shadow-lg shadow-blue-500/30 border border-blue-400/30 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>🌐</span>
            Access Web App (iOS)
          </a>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full text-gray-300 hover:text-white font-semibold text-sm py-2 rounded-xl transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
