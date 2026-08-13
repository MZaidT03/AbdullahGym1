"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Desktop sidebar toggle state
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Auto-collapse sidebar on smaller laptop screens (< 1024px) for optimal workspace
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  // 1. Strict Authentication Route Guard
  useEffect(() => {
    if (pathname === "/admin/login") {
      setCheckingAuth(false);
      return;
    }

    const checkAdminAuth = async () => {
      let isAuthenticated = false;

      // A. Verify Supabase Session & Admin Role
      if (isSupabaseConfigured()) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("role")
              .eq("id", sessionData.session.user.id)
              .single();

            if (profile && profile.role === "admin") {
              isAuthenticated = true;
            }
          }
        } catch (e) {
          console.warn("Auth check notice:", e);
        }
      }

      // B. Verify Local Authentication Token
      if (!isAuthenticated) {
        const isAuthLocal = localStorage.getItem("admin_authenticated") === "true";
        if (isAuthLocal) {
          isAuthenticated = true;
        }
      }

      if (!isAuthenticated) {
        // Redirect unauthenticated user to login immediately
        router.replace("/admin/login");
      } else {
        setCheckingAuth(false);
      }
    };

    checkAdminAuth();
  }, [pathname, router]);

  // Hide admin layout styling on the admin login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Show security loading overlay while validating session
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
        <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center font-black text-white text-lg shadow-md mb-4 animate-bounce">
          AG
        </div>
        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
          Verifying Admin Access & Session...
        </h3>
        <p className="text-xs text-slate-400 mt-1">Checking secure credentials</p>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Signout notice:", e);
    }
    localStorage.removeItem("admin_authenticated");
    localStorage.removeItem("admin_user_id");
    router.push("/admin/login");
  };

  const navItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      name: "Members",
      href: "/admin/members",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: "Attendance Desk",
      href: "/admin/attendance",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Payments & Invoices",
      href: "/admin/payments",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: "Revenue Reports",
      href: "/admin/revenue",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      name: "Plans & Settings",
      href: "/admin/configuration",
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans">
      {/* Sidebar Desktop */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-slate-200 p-4 shrink-0 transition-all duration-300 shadow-xs h-full ${
          sidebarOpen ? "w-64" : "w-20 items-center"
        }`}
      >
        {/* Brand Header & Single Arrow Toggle */}
        <div className={`flex items-center ${sidebarOpen ? "justify-between" : "justify-center flex-col gap-2.5"} w-full mb-6 pb-4 border-b border-slate-100`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md shadow-emerald-600/20 shrink-0">
                AG
              </div>
              <div className="truncate">
                <h2 className="font-extrabold text-slate-900 text-base tracking-tight leading-tight truncate">
                  Abdullah Gym 1
                </h2>
                <span className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                  Admin Portal
                </span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md shadow-emerald-600/20 shrink-0">
              AG
            </div>
          )}

          {/* Single Arrow Toggle Button (Left Arrow when expanded, Right Arrow when collapsed) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Collapse Sidebar (Left Arrow)" : "Expand Sidebar (Right Arrow)"}
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition border border-slate-200 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {sidebarOpen ? (
                // Left Double Arrow (Collapse)
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                // Right Double Arrow (Expand)
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation Bar List */}
        <nav className="flex-1 space-y-1.5 w-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!sidebarOpen ? item.name : undefined}
                className={`flex items-center rounded-xl text-xs font-bold transition-all ${
                  sidebarOpen ? "gap-3 px-3.5 py-2.5" : "justify-center w-10 h-10 mx-auto p-0"
                } ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className={isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"}>
                  {item.icon}
                </span>
                {sidebarOpen && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer Admin Profile Card */}
        <div className="pt-4 border-t border-slate-200 space-y-3 w-full">
          <div className={`flex items-center bg-slate-50 border border-slate-200/80 rounded-xl ${sidebarOpen ? "justify-between p-2.5" : "justify-center p-2"}`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center font-bold text-xs text-emerald-800 shrink-0">
                AM
              </div>
              {sidebarOpen && (
                <div className="text-left truncate">
                  <p className="text-xs font-bold text-slate-900 leading-tight truncate">Abdullah Manager</p>
                  <p className="text-[10px] text-slate-500 font-medium">System Admin</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>

          {sidebarOpen && (
            <>
              <Link
                href="/"
                className="block text-center text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-semibold transition"
              >
                ← View Public Site
              </Link>

              <div className="pt-2 text-center">
                <p className="text-[10px] font-bold text-slate-600">CodeInn Tech System</p>
                <a href="mailto:contact@codeinntech.com" className="text-[10px] text-slate-400 hover:underline block font-mono">
                  contact@codeinntech.com
                </a>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Header Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-black text-white text-sm">
            AG
          </div>
          <span className="font-extrabold text-slate-900 text-sm">Abdullah Gym 1 Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-700 p-2 rounded-lg hover:bg-slate-100 focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                pathname === item.href ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-slate-600"
              }`}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl"
          >
            Sign Out
          </button>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="hidden md:flex items-center justify-between bg-white border-b border-slate-200 px-8 py-3.5 shadow-2xs shrink-0">
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">Abdullah Gym 1 Admin</h1>
            <p className="text-[11px] text-slate-500">Real-time gym management & daily operational portal</p>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              System Online
            </span>
          </div>
        </header>

        {/* Page Content Body */}
        <div className="p-4 sm:p-6 flex-1 bg-slate-50 overflow-y-auto min-h-0">{children}</div>
      </main>
    </div>
  );
}
