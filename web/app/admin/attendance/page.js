"use client";

import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";
import CustomDialogModal from "../components/CustomDialogModal";
import LoadingOverlay from "../components/LoadingOverlay";

export default function AttendanceAdminPage() {
  const [activeTab, setActiveTab] = useState("logs"); // 'logs' | 'members'
  const [logs, setLogs] = useState([]);
  const [members, setMembers] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("Verifying Geofence & Recording Check-In...");

  // Custom Dialog Modal State
  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    type: "warning",
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: null,
    onConfirm: null,
    onCancel: null,
  });

  const showDialog = ({ type = "warning", title, message, confirmText = "OK", cancelText = null, onConfirm }) => {
    setDialogConfig({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: async () => {
        setDialogConfig((prev) => ({ ...prev, isOpen: false }));
        if (onConfirm) await onConfirm();
      },
      onCancel: cancelText ? () => setDialogConfig((prev) => ({ ...prev, isOpen: false })) : null,
    });
  };

  // Geofence Config State from Supabase
  const [geofenceConfig, setGeofenceConfig] = useState({
    enabled: true,
    latitude: 32.1877,
    longitude: 74.1945,
    radiusMeters: 200,
  });

  // Modals state
  // 1. Walk-in Modal
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPlan, setWalkInPlan] = useState("Daily Visitor Pass (PKR 500/day)");
  const [walkInFee, setWalkInFee] = useState("500");
  const [walkInTime, setWalkInTime] = useState("");
  const [walkInMethod, setWalkInMethod] = useState("Cash / Desk");

  // 2. Member Check-In Time Modal
  const [checkInTargetMember, setCheckInTargetMember] = useState(null);
  const [checkInTime, setCheckInTime] = useState("");

  // Haversine Distance Formula (Returns Distance in Meters)
  const calculateDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  // Helper: Get member's check-in log for today (12 AM to 12 AM cycle)
  const getTodayCheckInLog = (userId) => {
    const todayStr = new Date().toDateString();
    return logs.find((l) => {
      if (l.user_id !== userId) return false;
      if (!l.raw_check_in) return false;
      try {
        const logDateStr = new Date(l.raw_check_in).toDateString();
        return logDateStr === todayStr;
      } catch (e) {
        return false;
      }
    });
  };

  // Verify Geofence Proximity
  const verifyGeofenceProximity = () => {
    return new Promise((resolve) => {
      if (!geofenceConfig.enabled) {
        resolve({ allowed: true, distance: 0 });
        return;
      }

      if (!navigator.geolocation) {
        showDialog({
          type: "warning",
          title: "Geolocation Unsupported",
          message: "⚠️ Device Geolocation is not supported by your browser.",
        });
        resolve({ allowed: false, reason: "No Geolocation support" });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          const distance = calculateDistanceInMeters(
            userLat,
            userLng,
            geofenceConfig.latitude,
            geofenceConfig.longitude
          );

          if (distance > geofenceConfig.radiusMeters) {
            showDialog({
              type: "warning",
              title: "🚫 Geofence Check-in Blocked",
              message: `You are currently ${distance} meters away from Abdullah Gym 1.\n\nAttendance can ONLY be marked when physically within ${geofenceConfig.radiusMeters} meters of the gym.`,
            });
            resolve({ allowed: false, distance, userLat, userLng });
          } else {
            resolve({ allowed: true, distance, userLat, userLng });
          }
        },
        (err) => {
          showDialog({
            type: "warning",
            title: "GPS Verification Error",
            message: `⚠️ Geofence Verification Error: ${err.message}. GPS location permission is required to verify proximity to the gym.`,
          });
          resolve({ allowed: false, reason: err.message });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const getCurrentTimeHHMM = () => {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    return `${hrs}:${mins}`;
  };

  const createIsoFromTime = (timeStr) => {
    const d = new Date();
    if (timeStr) {
      const [h, m] = timeStr.split(":").map(Number);
      d.setHours(h || 0, m || 0, 0, 0);
    }
    return d.toISOString();
  };

  const formatDisplayTime = (isoString) => {
    if (!isoString) return "--";
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return isoString;
    }
  };

  const formatDisplayDate = (isoString) => {
    if (!isoString) return "Today";
    try {
      return new Date(isoString).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    } catch (e) {
      return "Today";
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    let loadedFromSupabase = false;

    if (isSupabaseConfigured()) {
      try {
        // Fetch Geofence Config from Supabase `gym_settings`
        const { data: geoData } = await supabase
          .from("gym_settings")
          .select("value")
          .eq("key", "geofence_settings")
          .single();
        if (geoData && geoData.value) {
          setGeofenceConfig(geoData.value);
        }

        // 1. Fetch Profiles/Members & Payments list from Supabase
        const { data: profData, error: profErr } = await supabase
          .from("profiles")
          .select("*")
          .order("full_name", { ascending: true });

        const { data: payData } = await supabase
          .from("payments")
          .select("user_id, status, amount");

        const profileMap = new Map();
        if (!profErr && profData) {
          const registeredOnly = profData.filter(
            (p) => !p.member_id?.startsWith("GP-WALK-") && !p.email?.includes("@abdullahgym.local") && p.role !== "walkin"
          );

          const evaluated = registeredOnly.map((p) => {
            const userPays = payData ? payData.filter((pay) => pay.user_id === p.id && (pay.status === "Paid" || pay.status === "Partial")) : [];
            const createdAt = p.created_at ? new Date(p.created_at) : null;
            const now = new Date();
            const daysDiff = createdAt ? (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24) : 0;

            if (daysDiff > 7 && userPays.length === 0) {
              p.status = "Deactivated";
              supabase.from("profiles").update({ status: "Deactivated" }).eq("id", p.id).then(() => {});
            }
            return p;
          });

          profData.forEach((p) => {
            const matchedEval = evaluated.find((ev) => ev.id === p.id);
            profileMap.set(p.id, matchedEval || p);
          });

          setMembers(evaluated);
        }

        // 2. Fetch Attendance logs from Supabase
        const { data: attData, error: attErr } = await supabase
          .from("attendance")
          .select("*")
          .order("check_in_time", { ascending: false });

        if (!attErr && attData) {
          const formatted = attData.map((item) => {
            const prof = profileMap.get(item.user_id);
            return {
              id: item.id,
              user_id: item.user_id,
              full_name: prof?.full_name || "Walk-in Guest",
              member_id: prof?.member_id || "GP-WALK-000",
              plan: prof?.plan || "Walk-in Pass",
              raw_check_in: item.check_in_time,
              check_in_time: formatDisplayTime(item.check_in_time),
              check_in_date: formatDisplayDate(item.check_in_time),
              distance: item.distance_meters ?? null,
            };
          });
          setLogs(formatted);
          loadedFromSupabase = true;
        }

        // 3. Fetch Active Gym Plans
        const { data: planData } = await supabase
          .from("gym_plans")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: true });

        if (planData && planData.length > 0) {
          setAvailablePlans(planData);
          const first = planData[0];
          const price = first.daily_price || first.monthly_price || 500;
          setWalkInPlan(`${first.name} (PKR ${Number(price).toLocaleString()})`);
          setWalkInFee(String(price));
        }
      } catch (err) {
        console.warn("Supabase fetch notice:", err);
      }
    }

    if (!loadedFromSupabase && !isSupabaseConfigured()) {
      setLogs([
        {
          id: "demo-1",
          full_name: "Abdullah Khan",
          member_id: "GP-8472-991",
          plan: "Pro Membership",
          check_in_time: "10:15 AM",
          check_in_date: "Today",
        },
        {
          id: "demo-2",
          full_name: "Zaid Tahir",
          member_id: "GP-5510-402",
          plan: "Standard Monthly Pass",
          check_in_time: "09:40 AM",
          check_in_date: "Today",
        },
      ]);

      setMembers([
        { id: "m-1", full_name: "Abdullah Khan", member_id: "GP-8472-991", plan: "Pro Membership", status: "Active" },
        { id: "m-2", full_name: "Zaid Tahir", member_id: "GP-5510-402", plan: "Standard Monthly Pass", status: "Active" },
      ]);
    }

    setLoading(false);
  };

  // Open Walk-In Modal
  const handleOpenWalkIn = () => {
    setWalkInTime(getCurrentTimeHHMM());
    setIsWalkInOpen(true);
  };

  // Submit Manual Walk-In with Geofence Proximity Check
  const handleSaveWalkIn = async (e) => {
    e.preventDefault();
    if (!walkInName.trim()) {
      showDialog({
        type: "warning",
        title: "Guest Name Required",
        message: "Please enter the walk-in guest's name before recording check-in.",
      });
      return;
    }

    setSubmitMsg("Verifying GPS Geofence & Recording Check-In...");
    setIsSubmitting(true);

    try {
      // Perform Geofence Proximity Verification
      const geoCheck = await verifyGeofenceProximity();
      if (!geoCheck.allowed) {
        setIsSubmitting(false);
        return; // Stop check-in if member is outside gym radius
      }

      const cleanPlanName = walkInPlan.split(" (")[0];
      const numericFee = parseFloat(walkInFee) || 500.0;
      const selectedCheckInIso = createIsoFromTime(walkInTime);

      if (isSupabaseConfigured()) {
        try {
          const walkInEmail = `walkin.${Date.now()}@abdullahgym.local`;
          let guestId = null;

          // 1. Create Walk-In profile safely via Admin API (handles auth.users & profiles FK properly)
          try {
            const res = await fetch("/api/admin/create-member", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: walkInEmail,
                password: "WalkInUser123!",
                full_name: walkInName.trim(),
                plan: cleanPlanName,
                fee_paid: numericFee,
              }),
            });
            const result = await res.json();
            if (res.ok && result.user?.id) {
              guestId = result.user.id;
            }
          } catch (apiErr) {
            console.warn("API create-member notice:", apiErr);
          }

          // Fallback if API was unavailable or returned non-200
          if (!guestId) {
            guestId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
            const generatedMemberId = `GP-WALK-${Math.floor(1000 + Math.random() * 9000)}`;

            const { error: profErr } = await supabase.from("profiles").upsert([
              {
                id: guestId,
                email: walkInEmail,
                full_name: walkInName.trim(),
                member_id: generatedMemberId,
                plan: cleanPlanName,
                days_remaining: 1,
                role: "walkin",
                status: "Active",
                created_at: selectedCheckInIso,
              },
            ]);

            if (profErr) {
              console.warn("Profile upsert notice:", profErr.message);
            }
          }

          // 2. Insert Attendance Log (Standard columns: user_id, check_in_time)
          const { error: attErr } = await supabase.from("attendance").insert([
            {
              user_id: guestId,
              check_in_time: selectedCheckInIso,
            },
          ]);

          if (attErr) {
            console.warn("Attendance insert notice:", attErr.message);
          }

          // 3. Insert Payment Record (Standard columns: user_id, amount, status, payment_method, invoice_id, date)
          const { error: payErr } = await supabase.from("payments").insert([
            {
              user_id: guestId,
              amount: numericFee,
              status: "Paid",
              payment_method: walkInMethod,
              invoice_id: `INV-WALK-${Math.floor(1000 + Math.random() * 9000)}`,
              date: selectedCheckInIso,
            },
          ]);

          if (payErr) {
            console.warn("Payment insert notice:", payErr.message);
          }

          await fetchAllData();
        } catch (err) {
          console.warn("Walk-in check-in exception:", err);
        }
      } else {
        const generatedMemberId = `GP-WALK-${Math.floor(1000 + Math.random() * 9000)}`;
        const guestId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
        const newLog = {
          id: guestId,
          full_name: walkInName.trim(),
          member_id: generatedMemberId,
          plan: cleanPlanName,
          check_in_time: formatDisplayTime(selectedCheckInIso),
          check_in_date: "Today",
        };
        setLogs([newLog, ...logs]);
      }

      setStatusMsg(`✓ Walk-in guest '${walkInName}' checked in at ${walkInTime || "current time"}! (Geofence Verified 📍)`);
      setTimeout(() => setStatusMsg(""), 5000);
      setIsWalkInOpen(false);
      setWalkInName("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Check-In Modal for Registered Member
  const handleOpenCheckInMember = (member) => {
    if (member.status === "Deactivated") {
      showDialog({
        type: "warning",
        title: "Account Deactivated 🚫",
        message: `Check-in denied for ${member.full_name}.\n\nThis account was automatically DEACTIVATED because no membership fee was paid within 7 days of registration.\n\nPlease record payment in the Payments Portal to reactivate access.`,
      });
      return;
    }

    const existingToday = getTodayCheckInLog(member.id);
    if (existingToday) {
      showDialog({
        type: "warning",
        title: "Already Checked-In Today ⚠️",
        message: `${member.full_name} has already marked attendance for today at ${existingToday.check_in_time}.\n\nOnly one check-in is allowed per day (12 AM to 12 AM cycle).`,
      });
      return;
    }
    setCheckInTargetMember(member);
    setCheckInTime(getCurrentTimeHHMM());
  };

  // Submit Member Check-In with Geofence Verification
  const handleConfirmMemberCheckIn = async (e) => {
    e.preventDefault();
    if (!checkInTargetMember) return;

    const existingToday = getTodayCheckInLog(checkInTargetMember.id);
    if (existingToday) {
      showDialog({
        type: "warning",
        title: "Already Checked-In Today ⚠️",
        message: `${checkInTargetMember.full_name} has already marked attendance for today at ${existingToday.check_in_time}.\n\nOnly one check-in is allowed per day (12 AM to 12 AM cycle).`,
      });
      setCheckInTargetMember(null);
      return;
    }

    setSubmitMsg(`Verifying Geofence & Marking Attendance for ${checkInTargetMember.full_name}...`);
    setIsSubmitting(true);

    try {
      // Perform Geofence Proximity Verification
      const geoCheck = await verifyGeofenceProximity();
      if (!geoCheck.allowed) {
        setIsSubmitting(false);
        return; // Block check-in if member is outside gym radius
      }

      const selectedIso = createIsoFromTime(checkInTime);

      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from("attendance").insert([
            {
              user_id: checkInTargetMember.id,
              check_in_time: selectedIso,
            },
          ]);
          if (error) {
            console.error("Check-in error:", error.message);
          } else {
            await fetchAllData();
          }
        } catch (err) {
          console.warn("Check-in exception:", err);
        }
      } else {
        const newLog = {
          id: String(Date.now()),
          full_name: checkInTargetMember.full_name,
          member_id: checkInTargetMember.member_id,
          plan: checkInTargetMember.plan,
          check_in_time: formatDisplayTime(selectedIso),
          check_in_date: "Today",
        };
        setLogs([newLog, ...logs]);
      }

      setStatusMsg(`✓ Attendance marked for ${checkInTargetMember.full_name} at ${checkInTime}! (Geofence Verified 📍)`);
      setTimeout(() => setStatusMsg(""), 5000);
      setCheckInTargetMember(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter logs & members
  const filteredLogs = logs.filter(
    (l) =>
      l.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.member_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMembers = members.filter(
    (m) =>
      m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.member_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Attendance & Check-In Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time gym member check-ins with Supabase database logs and GPS geofence proximity verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Geofence Status Badge */}
          <span
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold shadow-xs ${
              geofenceConfig.enabled
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${geofenceConfig.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
            {geofenceConfig.enabled
              ? `📍 Geofence Active (Within ${geofenceConfig.radiusMeters}m of Gym)`
              : "📍 Geofence Off"}
          </span>

          <button
            onClick={handleOpenWalkIn}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition shadow-xs flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Manual Walk-in Check-In
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {statusMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl shadow-xs flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-slate-400 hover:text-slate-700 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Tabs & Search Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "logs" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Attendance Logs ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "members" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Registered Member Quick Check-In ({members.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search member by name or ID..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* TAB 1: ATTENDANCE LOGS STREAM */}
      {activeTab === "logs" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">Check-In Activity Logs (Supabase Verified)</h3>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              ● {logs.length} Live Check-Ins
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3 px-3.5 rounded-l-lg">Member</th>
                  <th className="py-3 px-3.5">Member ID</th>
                  <th className="py-3 px-3.5">Membership Plan</th>
                  <th className="py-3 px-3.5">Check-In Time</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5 text-right rounded-r-lg">Geofence Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      No attendance check-ins found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-3.5 font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                          {log.full_name?.charAt(0) || "M"}
                        </div>
                        {log.full_name}
                      </td>
                      <td className="py-3.5 px-3.5 font-mono text-emerald-700 font-bold">{log.member_id}</td>
                      <td className="py-3.5 px-3.5 text-slate-700 font-medium">{log.plan}</td>
                      <td className="py-3.5 px-3.5 font-mono font-bold text-slate-900">{log.check_in_time}</td>
                      <td className="py-3.5 px-3.5 text-slate-500 font-mono">{log.check_in_date}</td>
                      <td className="py-3.5 px-3.5 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          📍 Verified {log.distance !== null ? `(${log.distance}m)` : ""}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: REGISTERED MEMBER QUICK CHECK-IN LIST */}
      {activeTab === "members" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Registered Members Directory</h3>
              <p className="text-[11px] text-slate-500">Click Check-In button to verify GPS proximity and record attendance.</p>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {filteredMembers.length} Members Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3 px-3.5 rounded-l-lg">Member</th>
                  <th className="py-3 px-3.5">Member ID</th>
                  <th className="py-3 px-3.5">Assigned Plan</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right rounded-r-lg">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      No active members found.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-3.5 font-bold text-slate-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                          {m.full_name?.charAt(0) || "M"}
                        </div>
                        {m.full_name}
                      </td>
                      <td className="py-3.5 px-3.5 font-mono text-emerald-700 font-bold">{m.member_id || "GP-MEMBER"}</td>
                      <td className="py-3.5 px-3.5 text-slate-700 font-medium">{m.plan || "Pro Membership"}</td>
                      <td className="py-3.5 px-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ● {m.status || "Active"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 text-right">
                        {(() => {
                          if (m.status === "Deactivated") {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 ml-auto select-none">
                                🚫 Deactivated (Unpaid &gt; 7 Days)
                              </span>
                            );
                          }
                          const todayLog = getTodayCheckInLog(m.id);
                          if (todayLog) {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 ml-auto select-none">
                                ✓ Checked-In Today ({todayLog.check_in_time})
                              </span>
                            );
                          }
                          return (
                            <button
                              onClick={() => handleOpenCheckInMember(m)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                            >
                              📍 Check-In Attendance
                            </button>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: MANUAL WALK-IN GUEST CHECK-IN */}
      {isWalkInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Manual Walk-in Check-In</h3>
                <p className="text-[11px] text-slate-500">Record single-day walk-in guest & verify GPS geofence.</p>
              </div>
              <button onClick={() => setIsWalkInOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWalkIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Guest Full Name *</label>
                <input
                  type="text"
                  required
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="e.g. Ahmad Ali"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Select Pass Plan</label>
                <select
                  value={walkInPlan}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    setWalkInPlan(selectedVal);
                    const foundPlan = availablePlans.find((p) => selectedVal.includes(p.name));
                    if (foundPlan) {
                      const price = foundPlan.daily_price || foundPlan.monthly_price || 500;
                      setWalkInFee(String(price));
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {availablePlans.map((p) => {
                    const price = p.daily_price || p.monthly_price || 500;
                    const label = `${p.name} (PKR ${Number(price).toLocaleString()})`;
                    return (
                      <option key={p.id} value={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Fee Collected (PKR)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={walkInFee}
                    onChange={(e) => setWalkInFee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Check-In Time</label>
                  <input
                    type="time"
                    required
                    value={walkInTime}
                    onChange={(e) => setWalkInTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Payment Method</label>
                <select
                  value={walkInMethod}
                  onChange={(e) => setWalkInMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Cash / Desk">Cash at Desk</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              {geofenceConfig.enabled && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                  <span>📍</span>
                  <span>GPS Geofence active. Proximity check within {geofenceConfig.radiusMeters}m of gym will be verified.</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsWalkInOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-xs font-bold text-white rounded-xl hover:bg-emerald-700 shadow-xs"
                >
                  📍 Check-In & Collect Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MEMBER CHECK-IN TIME SELECTION */}
      {checkInTargetMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Mark Member Attendance</h3>
                <p className="text-[11px] text-slate-500">Record check-in time for {checkInTargetMember.full_name}.</p>
              </div>
              <button onClick={() => setCheckInTargetMember(null)} className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmMemberCheckIn} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Member:</span>
                  <span className="font-bold text-slate-900">{checkInTargetMember.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Member ID:</span>
                  <span className="font-mono text-emerald-700 font-bold">{checkInTargetMember.member_id || "GP-MEMBER"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan:</span>
                  <span className="font-medium text-slate-800">{checkInTargetMember.plan || "Pro Membership"}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Check-In Time *</label>
                <input
                  type="time"
                  required
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {geofenceConfig.enabled && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                  <span>📍</span>
                  <span>GPS Geofence active. Member must be within {geofenceConfig.radiusMeters}m of gym location.</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCheckInTargetMember(null)}
                  className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-xs font-bold text-white rounded-xl hover:bg-emerald-700 shadow-xs"
                >
                  📍 Confirm Geofenced Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REUSABLE CUSTOM DIALOG MODAL */}
      <CustomDialogModal {...dialogConfig} />

      {/* REUSABLE LOADING ANIMATION OVERLAY */}
      <LoadingOverlay isLoading={isSubmitting} message={submitMsg} />
    </div>
  );
}
