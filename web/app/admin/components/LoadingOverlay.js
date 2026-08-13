"use client";

import React from "react";

export default function LoadingOverlay({ isLoading, message = "Processing request..." }) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-4 flex flex-col items-center">
        {/* Animated Glowing Ring Spinner */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-100 animate-ping opacity-75" />
          <div className="w-14 h-14 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 animate-spin" />
          <div className="absolute w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-md">
            AG
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-1">
          <h4 className="text-sm font-black text-slate-900 tracking-tight">{message}</h4>
          <p className="text-[11px] font-bold text-emerald-700 font-mono animate-pulse">
            ● Syncing with Supabase Live Database...
          </p>
        </div>
      </div>
    </div>
  );
}
