"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 Minutes

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Brute-force lockout state
  const [failedCount, setFailedCount] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  useEffect(() => {
    // Check existing lockout state on mount
    try {
      const storedLock = localStorage.getItem("admin_lockout_until");
      const storedFails = localStorage.getItem("admin_failed_count");
      if (storedFails) setFailedCount(parseInt(storedFails, 10) || 0);

      if (storedLock) {
        const lockUntil = parseInt(storedLock, 10);
        const now = Date.now();
        if (now < lockUntil) {
          setLockoutTimer(Math.ceil((lockUntil - now) / 1000));
        } else {
          localStorage.removeItem("admin_lockout_until");
          localStorage.removeItem("admin_failed_count");
          setFailedCount(0);
        }
      }
    } catch (e) {
      console.warn("Lockout storage error:", e);
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => {
        if (prev <= 1) {
          localStorage.removeItem("admin_lockout_until");
          localStorage.removeItem("admin_failed_count");
          setFailedCount(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleFailedAttempt = () => {
    const newCount = failedCount + 1;
    setFailedCount(newCount);
    localStorage.setItem("admin_failed_count", String(newCount));

    if (newCount >= MAX_FAILED_ATTEMPTS) {
      const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
      localStorage.setItem("admin_lockout_until", String(lockUntil));
      setLockoutTimer(15 * 60);
      setErrorMsg("🔒 Account temporarily locked due to 5 consecutive failed login attempts. Try again in 15 minutes.");
    } else {
      const remaining = MAX_FAILED_ATTEMPTS - newCount;
      setErrorMsg(`Invalid credentials. ${remaining} attempt(s) remaining before security lockout.`);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (lockoutTimer > 0) {
      setErrorMsg(`🔒 Security Lockout Active: Please wait ${Math.floor(lockoutTimer / 60)}m ${lockoutTimer % 60}s.`);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please provide both username and password.");
      return;
    }

    setLoading(true);

    let loginEmail = email.trim().toLowerCase();
    if (!loginEmail.includes("@")) {
      if (loginEmail === "admin") loginEmail = "admin@abdullahgym.com";
      else loginEmail = `${loginEmail}@abdullahgym.com`;
    }

    if (isSupabaseConfigured()) {
      try {
        // 1. Authenticate with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: password,
        });

        if (error || !data?.user) {
          handleFailedAttempt();
          setLoading(false);
          return;
        }

        // 2. Strict Role & Status Verification in Database
        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", data.user.id)
          .single();

        if (profErr || !profile || profile.role !== "admin") {
          // Reject non-admin users immediately & sign out session
          await supabase.auth.signOut();
          setErrorMsg("⛔ Access Denied: Only registered Administrators can access this portal.");
          handleFailedAttempt();
          setLoading(false);
          return;
        }

        if (profile.status === "Suspended") {
          await supabase.auth.signOut();
          setErrorMsg("⛔ Account Suspended: Your administrator account has been suspended.");
          handleFailedAttempt();
          setLoading(false);
          return;
        }

        if (profile.status === "Expired") {
          await supabase.auth.signOut();
          setErrorMsg("⛔ Account Expired: Your administrator account access has expired.");
          handleFailedAttempt();
          setLoading(false);
          return;
        }

        // Clear failed login counters on successful admin login
        localStorage.removeItem("admin_lockout_until");
        localStorage.removeItem("admin_failed_count");
        localStorage.setItem("admin_authenticated", "true");
        localStorage.setItem("admin_user_id", data.user.id);

        router.push("/admin");
        return;
      } catch (err) {
        console.error("Auth Exception:", err);
        setErrorMsg("Authentication service unavailable. Please check your network connection.");
      }
    } else {
      setErrorMsg("Database connection is not configured yet in .env.local.");
    }

    setLoading(false);
  };

  const formatLockoutTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 flex flex-col justify-center items-center px-4 py-12 font-sans relative text-slate-800 overflow-hidden select-none">
      {/* Dynamic Keyframes for Cool 3D Micro-Animations */}
      <style jsx global>{`
        @keyframes float3D {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-7px) rotate(1deg);
          }
        }
        @keyframes pulseAura {
          0%, 100% {
            opacity: 0.35;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
        @keyframes subtleCardEntrance {
          0% {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-float-logo {
          animation: float3D 4s ease-in-out infinite;
        }
        .animate-aura-glow {
          animation: pulseAura 5s ease-in-out infinite;
        }
        .animate-card-entrance {
          animation: subtleCardEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* 3D Background Decorative Ambient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/12 rounded-full blur-3xl pointer-events-none animate-aura-glow" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/3 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 3D Elevated Main Login Card with Entrance Animation */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.14),0_10px_25px_-5px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] relative z-10 animate-card-entrance">
        {/* Brand Header with 3D Floating Logo Badge */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="relative group mb-3.5">
            {/* Animated 3D Aura Behind Logo */}
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 rounded-3xl blur-md opacity-70 group-hover:opacity-100 transition duration-500 animate-aura-glow" />

            {/* 3D Floating Logo Container */}
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-b from-white via-slate-50 to-slate-100 border border-slate-200/90 shadow-[0_15px_30px_rgba(0,0,0,0.12),inset_0_2px_4px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(0,0,0,0.05)] flex items-center justify-center p-2.5 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_20px_35px_rgba(16,185,129,0.2)] animate-float-logo">
              <img
                src="/assets/icons/logo.png"
                alt="Abdullah Gym 1"
                className="w-14 h-14 object-contain filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.18)] transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          </div>
          
          {/* Abdullah Gym 1 Heading */}
          <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 tracking-tight leading-tight">
            Abdullah Gym 1
          </h1>

          {/* Admin Panel Sub-Label Below Heading */}
          <div className="mt-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3.5 py-0.5 rounded-full shadow-2xs inline-block">
              Admin Panel
            </span>
          </div>
        </div>

        {/* Lockout Warning Banner */}
        {lockoutTimer > 0 && (
          <div className="mb-5 p-4 bg-rose-50 border border-rose-200/80 rounded-2xl text-xs text-rose-800 space-y-1 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <span>🔒 Account Temporarily Locked</span>
            </div>
            <p className="text-[11px] text-rose-700 leading-relaxed">
              Too many failed attempt entries. For security against brute-force attacks, login is locked.
            </p>
            <div className="pt-2 flex justify-between items-center text-xs font-mono font-bold text-rose-900 border-t border-rose-200/60">
              <span>Time Remaining:</span>
              <span className="text-sm bg-rose-100 px-2 py-0.5 rounded">{formatLockoutTime(lockoutTimer)}</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && lockoutTimer <= 0 && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 font-medium shadow-xs">
            <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              disabled={lockoutTimer > 0 || loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03)] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-all disabled:opacity-50 font-medium"
              placeholder="e.g. admin@abdullahgym.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              disabled={lockoutTimer > 0 || loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03)] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.15)] transition-all disabled:opacity-50 font-medium"
              placeholder="••••••••"
            />
          </div>

          {/* 3D Elevated Button */}
          <button
            type="submit"
            disabled={lockoutTimer > 0 || loading}
            className="w-full bg-gradient-to-b from-slate-900 to-slate-950 hover:from-emerald-600 hover:to-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl shadow-[0_10px_20px_-5px_rgba(15,23,42,0.3),0_4px_6px_-2px_rgba(15,23,42,0.1),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:shadow-[0_12px_24px_-5px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.3)] active:translate-y-0.5 active:shadow-[0_2px_4px_rgba(0,0,0,0.2)] text-xs tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 mt-3"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-2 text-center">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-900 font-medium transition"
          >
            ← Return to Public Website
          </Link>
          <span className="text-[10px] text-slate-400 font-mono">
            Protected by CodeInn Tech Security Framework
          </span>
        </div>
      </div>
    </div>
  );
}
