"use client";

import React from "react";

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none";

  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs sm:text-sm",
    md: "px-6 py-3 text-sm sm:text-base",
    lg: "px-8 py-3.5 text-base sm:text-lg",
  };

  const variantStyles = {
    primary:
      "bg-[#22C55E] text-white hover:bg-[#16A34A] active:bg-[#15803D] shadow-md shadow-emerald-500/20",
    admin:
      "bg-[#EAF0E8] text-[#2563EB] border border-[#D5E2D2] hover:bg-[#E2ECE0] hover:text-[#1D4ED8] shadow-sm",
    secondary:
      "bg-[#DDE7DA] text-[#1E2922] hover:bg-[#D2DFC0] shadow-sm",
    outline:
      "border-1.5 border-[#BDC7BA] text-[#1E2922] hover:bg-black/5",
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
