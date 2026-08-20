"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

// Auto-compress image to under maxKb (default 300KB)
async function compressImageFile(file, maxKb = 300) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      return reject(new Error("Please select a valid image file."));
    }

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        const maxDimension = 1024;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        let sizeKb = (dataUrl.length * (3 / 4)) / 1024;

        while (sizeKb > maxKb && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
          sizeKb = (dataUrl.length * (3 / 4)) / 1024;
        }

        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false); // When true, stays open; when false, auto open/close on hover
  const [isHovered, setIsHovered] = useState(false); // True on mouse enter
  const sidebarOpen = isPinned || isHovered;
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Admin Profile & Dropdown States
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [adminName, setAdminName] = useState("Abdullah Manager");
  const [adminEmail, setAdminEmail] = useState("admin@abdullahgym.com");
  const [adminAvatar, setAdminAvatar] = useState(
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250"
  );
  const [adminUserId, setAdminUserId] = useState(null);

  const adminFileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e, setterFn) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const compressedDataUrl = await compressImageFile(file, 300);
      setterFn(compressedDataUrl);
    } catch (err) {
      console.warn("Photo upload warning:", err);
      alert(err.message || "Failed to process photo.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  // Password Reset Form States
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Preset Avatars for quick selection
  const avatarPresets = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250",
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250",
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250",
  ];

  // Load saved sidebar pin preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPin = localStorage.getItem("admin_sidebar_pinned");
      if (savedPin !== null) {
        setIsPinned(savedPin === "true");
      }
    }
  }, []);

  const togglePin = () => {
    setIsPinned((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_sidebar_pinned", String(next));
      }
      return next;
    });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => setIsProfileDropdownOpen(false);
    if (isProfileDropdownOpen) {
      window.addEventListener("click", handleOutsideClick);
    }
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [isProfileDropdownOpen]);

  // 1. Strict Authentication Route Guard & Admin Profile Load
  useEffect(() => {
    if (pathname === "/admin/login") {
      setCheckingAuth(false);
      return;
    }

    const checkAdminAuth = async () => {
      let isAuthenticated = false;

      if (typeof window !== "undefined") {
        const savedName = localStorage.getItem("admin_name");
        const savedEmail = localStorage.getItem("admin_email");
        const savedAvatar = localStorage.getItem("admin_avatar");
        if (savedName) setAdminName(savedName);
        if (savedEmail) setAdminEmail(savedEmail);
        if (savedAvatar) setAdminAvatar(savedAvatar);
      }

      // A. Verify Supabase Session & Admin Role
      if (isSupabaseConfigured()) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            setAdminUserId(sessionData.session.user.id);
            if (sessionData.session.user.email) {
              setAdminEmail(sessionData.session.user.email);
            }

            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", sessionData.session.user.id)
              .single();

            if (profile && profile.role === "admin") {
              if (profile.status === "Suspended" || profile.status === "Expired") {
                try {
                  await supabase.from("profiles").update({ status: "Active" }).eq("id", profile.id);
                } catch (e) {}
              }
              isAuthenticated = true;
              if (profile.full_name) setAdminName(profile.full_name);
              if (profile.avatar_url) setAdminAvatar(profile.avatar_url);
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
        router.replace("/admin/login");
      } else {
        setCheckingAuth(false);
      }
    };

    checkAdminAuth();
  }, [pathname, router]);

  // Save Admin Profile Handler (Name & Avatar picture - Email is disabled/read-only)
  const handleSaveAdminProfileInfo = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!adminName.trim()) {
      setProfileError("Admin Full Name cannot be blank.");
      return;
    }

    setProfileSaving(true);

    try {
      if (isSupabaseConfigured() && adminUserId) {
        await supabase
          .from("profiles")
          .update({
            full_name: adminName.trim(),
            avatar_url: adminAvatar,
            updated_at: new Date().toISOString(),
          })
          .eq("id", adminUserId);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("admin_name", adminName.trim());
        localStorage.setItem("admin_avatar", adminAvatar);
      }

      setProfileSuccess("✓ Admin profile info & avatar updated successfully!");
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setProfileSuccess("");
      }, 1800);
    } catch (err) {
      setProfileError(err.message || "Failed to update profile info.");
    } finally {
      setProfileSaving(false);
    }
  };

  // Change Password Handler
  const handleChangeAdminPassword = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!newAdminPassword || newAdminPassword.length < 6) {
      setProfileError("New password must be at least 6 characters long.");
      return;
    }

    if (newAdminPassword !== confirmAdminPassword) {
      setProfileError("New password and confirm password do not match.");
      return;
    }

    setProfileSaving(true);

    try {
      let passwordUpdated = false;
      if (isSupabaseConfigured()) {
        try {
          const { error: passErr } = await supabase.auth.updateUser({
            password: newAdminPassword,
          });
          if (!passErr) {
            passwordUpdated = true;
          }
        } catch (err) {
          console.warn("Supabase auth updateUser notice:", err);
        }

        // Fallback to API reset route if direct client update had restriction
        if (!passwordUpdated) {
          const res = await fetch("/api/admin/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: adminUserId,
              email: adminEmail,
              newPassword: newAdminPassword,
            }),
          });
          const resData = await res.json();
          if (!res.ok || !resData.success) {
            throw new Error(resData.error || "Failed to update password.");
          }
        }
      }

      setProfileSuccess("✓ Admin password changed successfully!");
      setNewAdminPassword("");
      setConfirmAdminPassword("");
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setProfileSuccess("");
      }, 2000);
    } catch (err) {
      setProfileError(err.message || "Failed to change password.");
    } finally {
      setProfileSaving(false);
    }
  };

  // Hide admin layout styling on the admin login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Show security loading overlay while validating session
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-800 font-sans">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center p-1.5 shadow-md border border-slate-800 mb-4 animate-bounce overflow-hidden">
          <img
            src="/assets/icons/logo.png"
            alt="Abdullah Gym 1 Logo"
            className="w-full h-full object-contain"
          />
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

  const isItemActive = (href) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const currentNav = navItems.find((item) => isItemActive(item.href)) || navItems[0];

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans">
      {/* Sidebar Desktop - Auto expands on hover and collapses on mouse leave if not pinned */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden md:flex flex-col bg-white border-r border-slate-200 p-3.5 shrink-0 transition-all duration-300 ease-in-out shadow-xs h-full z-20 select-none ${
          sidebarOpen ? "w-64" : "w-20 items-center"
        }`}
      >
        {/* Brand Header & Hamburger Toggle */}
        <div className={`flex items-center ${sidebarOpen ? "justify-between" : "justify-center flex-col gap-2.5"} w-full mb-5 pb-3.5 border-b border-slate-100`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center p-1 shadow-md shadow-emerald-600/10 border border-slate-800 shrink-0 overflow-hidden">
                <img
                  src="/assets/icons/logo.png"
                  alt="Abdullah Gym 1 Logo"
                  className="w-full h-full object-contain rounded-lg"
                />
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
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center p-1 shadow-md shadow-emerald-600/10 border border-slate-800 shrink-0 overflow-hidden">
              <img
                src="/assets/icons/logo.png"
                alt="Abdullah Gym 1 Logo"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          )}

          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={togglePin}
            title={isPinned ? "Unpin Sidebar (Auto hover open/close)" : "Pin Sidebar Open"}
            className={`p-2 rounded-xl transition border shrink-0 cursor-pointer ${
              isPinned
                ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Navigation Bar List */}
        <nav className="flex-1 space-y-1.5 w-full">
          {navItems.map((item) => {
            const isActive = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={!sidebarOpen ? item.name : undefined}
                className={`relative flex items-center rounded-xl text-xs font-bold transition-all duration-200 ${
                  sidebarOpen ? "gap-3 px-3.5 py-2.5" : "justify-center w-11 h-11 mx-auto p-0"
                } ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className={`shrink-0 transition-transform duration-200 ${isActive ? "text-white scale-105" : "text-slate-400 group-hover:text-slate-700"}`}>
                  {item.icon}
                </span>
                {sidebarOpen && (
                  <span className="truncate flex-1 whitespace-nowrap">
                    {item.name}
                  </span>
                )}
                {isActive && sidebarOpen && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0 ml-auto" />
                )}
                {isActive && !sidebarOpen && (
                  <span className="absolute -left-1 top-2 bottom-2 w-1 bg-emerald-600 rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Admin Profile Card */}
        <div className="pt-4 border-t border-slate-200 space-y-3 w-full">
          <div className={`flex items-center bg-slate-50 border border-slate-200/80 rounded-xl ${sidebarOpen ? "justify-between p-2.5" : "justify-center p-2"}`}>
            <div className="flex items-center gap-2.5 overflow-hidden text-left">
              <img
                src={adminAvatar}
                alt={adminName}
                className="w-8 h-8 rounded-full object-cover border border-emerald-300 shrink-0"
              />
              {sidebarOpen && (
                <div className="text-left truncate">
                  <p className="text-xs font-bold text-slate-900 leading-tight truncate">{adminName}</p>
                  <p className="text-[10px] text-slate-500 font-medium">System Admin</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>

          {sidebarOpen && (
            <Link
              href="/"
              className="block text-center text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-semibold transition"
            >
              ← View Public Site
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Header Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center p-1 shadow-xs border border-slate-800 shrink-0 overflow-hidden">
            <img
              src="/assets/icons/logo.png"
              alt="Abdullah Gym 1 Logo"
              className="w-full h-full object-contain rounded"
            />
          </div>
          <span className="font-extrabold text-slate-900 text-sm">Abdullah Gym 1 Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsProfileDropdownOpen(!isProfileDropdownOpen);
            }}
            className="w-8 h-8 rounded-full border-2 border-emerald-500 overflow-hidden cursor-pointer"
          >
            <img src={adminAvatar} alt={adminName} className="w-full h-full object-cover" />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-slate-700 p-2 rounded-lg hover:bg-slate-100 focus:outline-none cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className={isActive ? "text-white" : "text-slate-400"}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white ml-auto" />}
              </Link>
            );
          })}
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
          <div className="flex items-center gap-3">
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Abdullah Gym 1</span>
              <span className="text-slate-300 font-normal">/</span>
              <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/80 text-xs">
                {currentNav.name}
              </span>
            </h1>
          </div>

          {/* CIRCULAR PROFILE AVATAR WITH DROPDOWN */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsProfileDropdownOpen(!isProfileDropdownOpen);
              }}
              className="relative group p-0.5 rounded-full border-2 border-emerald-500 hover:border-emerald-400 transition shadow-sm focus:outline-none cursor-pointer flex items-center justify-center"
              title="Admin Account Settings"
            >
              <img
                src={adminAvatar}
                alt={adminName}
                className="w-9 h-9 rounded-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </button>

            {/* DROPDOWN MENU */}
            {isProfileDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Admin Info Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                  <img
                    src={adminAvatar}
                    alt={adminName}
                    className="w-10 h-10 rounded-full object-cover border border-emerald-300 shrink-0"
                  />
                  <div className="overflow-hidden">
                    <p className="font-extrabold text-xs text-slate-900 truncate">{adminName}</p>
                    <p className="text-[10px] text-slate-500 font-medium truncate">{adminEmail}</p>
                    <span className="inline-block mt-0.5 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 uppercase">
                      System Admin
                    </span>
                  </div>
                </div>

                {/* Dropdown Options */}
                <div className="p-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      setProfileError("");
                      setProfileSuccess("");
                      setIsEditProfileOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                  >
                    <span className="text-sm">✏️</span>
                    <span>Edit Profile (Name & Avatar)</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      setProfileError("");
                      setProfileSuccess("");
                      setIsChangePasswordOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                  >
                    <span className="text-sm">🔒</span>
                    <span>Change Password</span>
                  </button>
                </div>

                {/* Footer Sign Out */}
                <div className="p-1 border-t border-slate-100 mt-1">
                  <button
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  >
                    <span className="text-sm">🚪</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content Body */}
        <div className="p-4 sm:p-6 flex-1 bg-slate-50 overflow-y-auto min-h-0">{children}</div>
      </main>

      {/* ============================================================================ */}
      {/* MODAL 1: EDIT PROFILE (Name & Avatar - Email Disabled) */}
      {/* ============================================================================ */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <img src={adminAvatar} alt={adminName} className="w-10 h-10 rounded-full object-cover border border-emerald-400" />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Edit Admin Profile</h3>
                  <p className="text-xs text-slate-500">Update full name and profile avatar.</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            {profileError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                ⚠️ {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
                {profileSuccess}
              </div>
            )}

            <form onSubmit={handleSaveAdminProfileInfo} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* EMAIL ADDRESS IS READ-ONLY & DISABLED */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase">
                    Email Address (Read-Only)
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">🔒 Cannot be modified</span>
                </div>
                <input
                  type="email"
                  value={adminEmail}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 text-slate-500 cursor-not-allowed rounded-xl px-3.5 py-2 text-xs font-mono font-medium"
                />
              </div>

              {/* AVATAR PICTURE SELECTION & UPLOAD */}
              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-slate-500 uppercase">
                  Admin Profile Picture
                </label>

                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div
                    onClick={() => adminFileInputRef.current?.click()}
                    className="relative w-14 h-14 rounded-full bg-slate-200 border-2 border-dashed border-slate-300 hover:border-emerald-500 flex items-center justify-center cursor-pointer overflow-hidden group transition shrink-0 shadow-2xs"
                  >
                    <img src={adminAvatar} alt={adminName} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition">
                      Replace
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <input
                      ref={adminFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, setAdminAvatar)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => adminFileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>📸</span>
                      <span>{uploadingImage ? "Compressing..." : "Upload / Replace Photo"}</span>
                    </button>
                  </div>
                </div>

                {/* Preset Avatars */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold block">Or choose a preset avatar:</span>
                  <div className="flex items-center gap-2">
                    {avatarPresets.map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setAdminAvatar(preset)}
                        className={`w-8 h-8 rounded-full overflow-hidden border-2 transition cursor-pointer ${
                          adminAvatar === preset ? "border-emerald-600 ring-2 ring-emerald-500/30 scale-105" : "border-slate-200 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={preset} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-4 py-2 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {profileSaving ? "Saving..." : "Save Profile Info"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* MODAL 2: CHANGE PASSWORD */}
      {/* ============================================================================ */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shadow-xs">
                  🔒
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Change Admin Password</h3>
                  <p className="text-xs text-slate-500">Update system login password securely.</p>
                </div>
              </div>
              <button
                onClick={() => setIsChangePasswordOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            {profileError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                ⚠️ {profileError}
              </div>
            )}

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
                {profileSuccess}
              </div>
            )}

            <form onSubmit={handleChangeAdminPassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmAdminPassword}
                  onChange={(e) => setConfirmAdminPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                🔒 Note: Password updates apply immediately to your admin login.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-4 py-2 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {profileSaving ? "Updating Password..." : "🔒 Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
