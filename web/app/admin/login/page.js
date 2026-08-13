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
      setErrorMsg("Please provide both admin email and password.");
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured()) {
      try {
        // 1. Authenticate with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password,
        });

        if (error || !data?.user) {
          handleFailedAttempt();
          setLoading(false);
          return;
        }

        // 2. Strict Role Verification in Database
        const { data: profile, error: profErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profErr || !profile || profile.role !== "admin") {
          // Reject non-admin users immediately & sign out session
          await supabase.auth.signOut();
          setErrorMsg("⛔ Access Denied: Only registered System Administrators can access this portal.");
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
        setErrorMsg("Authentication service unavailable. Please check internet connection.");
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
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 py-12 font-sans relative text-slate-800">
      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-9 shadow-lg sm:shadow-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-slate-900 to-emerald-950 rounded-2xl flex items-center justify-center mb-4 shadow-lg text-white border border-slate-800">
            <svg
              className="w-8 h-8 text-emerald-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Secure Access
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Abdullah Gym 1
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-semibold">
            Strict Admin & Executive Management Portal
          </p>
        </div>

        {/* Lockout Warning Banner */}
        {lockoutTimer > 0 && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200/80 rounded-2xl text-xs text-rose-800 space-y-1">
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
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 font-medium">
            <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Admin Credentials Email
            </label>
            <input
              type="email"
              required
              disabled={lockoutTimer > 0 || loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all disabled:opacity-50"
              placeholder="admin@abdullahgym.com"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Admin Account Password
            </label>
            <input
              type="password"
              required
              disabled={lockoutTimer > 0 || loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={lockoutTimer > 0 || loading}
            className="w-full bg-slate-900 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 shadow-md text-xs tracking-wide disabled:opacity-50 mt-2"
          >
            {loading ? "VERIFYING CREDENTIALS..." : "SIGN IN TO ADMIN DASHBOARD"}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-2">
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
