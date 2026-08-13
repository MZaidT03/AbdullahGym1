"use client";

import React from "react";

export default function CustomDialogModal({
  isOpen,
  type = "warning", // 'warning' | 'danger' | 'confirm' | 'info' | 'success'
  title = "Notification Notice",
  message = "",
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const iconMap = {
    warning: "⚠️",
    danger: "🗑️",
    confirm: "❓",
    info: "ℹ️",
    success: "✓",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-slate-900 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0">
              {iconMap[type] || "⚠️"}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">{title}</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                System Admin Alert
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel || onConfirm}
            className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer hover:bg-slate-100 w-8 h-8 rounded-lg flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-line">
          {message}
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 font-extrabold text-xs rounded-xl text-white transition shadow-xs cursor-pointer ${
              type === "danger"
                ? "bg-rose-600 hover:bg-rose-700"
                : type === "warning"
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
