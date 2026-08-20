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
  const [dateFilter, setDateFilter] = useState("Today"); // 'Today' | 'This Week' | 'This Month' | 'All'
  const [typeFilter, setTypeFilter] = useState("All"); // 'All' | 'Registered' | 'Walk-In'
  const [statusMsg, setStatusMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("Recording Attendance Check-In...");

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

  // Modals state
  // 1. Walk-in Modal
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPlan, setWalkInPlan] = useState("Daily Visitor Pass (PKR 500/day)");
  const [walkInFee, setWalkInFee] = useState("500");
  const [walkInDate, setWalkInDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [walkInTime, setWalkInTime] = useState("");
  const [walkInMethod, setWalkInMethod] = useState("Cash / Desk");

  // 2. Member Check-In Modal (Supports past date adjustments)
  const [checkInTargetMember, setCheckInTargetMember] = useState(null);
  const [checkInDate, setCheckInDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [checkInTime, setCheckInTime] = useState("");

  // Helper: Get member's check-in log for a specific date (defaults to today)
  const getMemberCheckInForDate = (userId, targetDateStr = null) => {
    const compareDate = targetDateStr ? new Date(targetDateStr).toDateString() : new Date().toDateString();
    return logs.find((l) => {
      if (l.user_id !== userId) return false;
      if (!l.raw_check_in) return false;
      try {
        const logDateStr = new Date(l.raw_check_in).toDateString();
        return logDateStr === compareDate;
      } catch (e) {
        return false;
      }
    });
  };

  const getCurrentTimeHHMM = () => {
    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, "0");
    const mins = String(now.getMinutes()).padStart(2, "0");
    return `${hrs}:${mins}`;
  };

  const getYesterdayDateYMD = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
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
        // 1. Fetch Profiles/Members & Payments list from Supabase
        const { data: profData, error: profErr } = await supabase
          .from("profiles")
          .select("*")
          .order("full_name", { ascending: true });

        const { data: payData } = await supabase
          .from("payments")
          .select("*");

        let addonPayData = [];
        try {
          const { data: aData } = await supabase
            .from("addon_payments")
            .select("*");
          if (aData) addonPayData = aData;
        } catch (e) {}

        const profileMap = new Map();
        if (!profErr && profData) {
          const registeredOnly = profData.filter(
            (p) => !p.member_id?.startsWith("GP-WALK-") && !p.email?.includes("@abdullahgym.local") && p.role !== "walkin"
          );

          const evaluated = registeredOnly.map((p) => {
            if (p.role === "admin") {
              if (p.status === "Suspended" || p.status === "Expired") {
                p.status = "Active";
                supabase.from("profiles").update({ status: "Active" }).eq("id", p.id);
              }
              return p;
            }

            const allPays = [...(payData || []), ...(addonPayData || [])];
            const userPays = allPays.filter((pay) => pay.user_id === p.id && (pay.status === "Paid" || pay.status === "Partial"));
            const createdAt = p.created_at ? new Date(p.created_at) : null;
            const now = new Date();
            const daysDiff = createdAt ? (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24) : 0;

            if (daysDiff > 7 && userPays.length === 0 && p.status === "Active") {
              p.status = "Suspended";
              supabase.from("profiles").update({ status: "Suspended" }).eq("id", p.id);
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
    setWalkInDate(new Date().toISOString().split("T")[0]);
    setWalkInTime(getCurrentTimeHHMM());
    setIsWalkInOpen(true);
  };

  // Submit Manual Walk-In (Admin desk check-in without geofence blocking)
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

    const numericFee = parseFloat(walkInFee) || 0;
    if (numericFee <= 0) {
      showDialog({
        type: "warning",
        title: "Valid Fee Amount Required",
        message: "Please enter a valid walk-in fee collected amount greater than 0 PKR.",
      });
      return;
    }

    setSubmitMsg("Recording Walk-In Check-In...");
    setIsSubmitting(true);

    try {
      const cleanPlanName = walkInPlan.split(" (")[0];
      const [year, month, day] = (walkInDate || new Date().toISOString().split("T")[0]).split("-").map(Number);
      const [hours, minutes] = (walkInTime || getCurrentTimeHHMM()).split(":").map(Number);
      const selectedCheckInIso = new Date(year, month - 1, day, hours, minutes, 0).toISOString();

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
          raw_check_in: selectedCheckInIso,
          check_in_time: formatDisplayTime(selectedCheckInIso),
          check_in_date: formatDisplayDate(selectedCheckInIso),
        };
        setLogs([newLog, ...logs]);
      }

      setStatusMsg(`✓ Walk-in guest '${walkInName}' checked in for PKR ${numericFee}!`);
      setTimeout(() => setStatusMsg(""), 5000);
      setIsWalkInOpen(false);
      setWalkInName("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Check-In / Fix Attendance Modal for Registered Member
  const handleOpenCheckInMember = (member) => {
    if (member.status === "Suspended" || member.status === "Deactivated" || member.status === "Inactive") {
      showDialog({
        type: "warning",
        title: "Account Suspended 🚫",
        message: `Check-in denied for ${member.full_name}.\n\nThis account is currently SUSPENDED (no membership fee paid within 7 days or account paused).\n\nPlease record payment in the Payments Portal to reactivate access.`,
      });
      return;
    }

    setCheckInTargetMember(member);
    setCheckInDate(new Date().toISOString().split("T")[0]);
    setCheckInTime(getCurrentTimeHHMM());
  };

  // Submit Member Check-In (Supports any past date or today)
  const handleConfirmMemberCheckIn = async (e) => {
    e.preventDefault();
    if (!checkInTargetMember) return;

    if (!checkInDate || !checkInTime) {
      showDialog({
        type: "warning",
        title: "Date & Time Required",
        message: "Please specify both the attendance date and time.",
      });
      return;
    }

    setSubmitMsg(`Recording Attendance for ${checkInTargetMember.full_name}...`);
    setIsSubmitting(true);

    try {
      const [year, month, day] = checkInDate.split("-").map(Number);
      const [hours, minutes] = checkInTime.split(":").map(Number);
      const selectedIso = new Date(year, month - 1, day, hours, minutes, 0).toISOString();

      const formattedDisplayDate = new Date(year, month - 1, day).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

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
            showDialog({
              type: "warning",
              title: "Attendance Save Error",
              message: error.message,
            });
          } else {
            // Insert notification for member
            try {
              await supabase.from("notifications").insert([
                {
                  user_id: checkInTargetMember.id,
                  title: "Attendance Marked! 💪",
                  message: `Your check-in for ${formattedDisplayDate} at ${checkInTime} was recorded by admin. Keep crushing your workouts!`,
                  type: "attendance_marked",
                  action: "VIEW_ATTENDANCE",
                  created_at: new Date().toISOString(),
                },
              ]);
            } catch (notifErr) {
              console.warn("Notice creating attendance notification:", notifErr);
            }
            await fetchAllData();
          }
        } catch (err) {
          console.warn("Check-in exception:", err);
        }
      } else {
        const newLog = {
          id: String(Date.now()),
          user_id: checkInTargetMember.id,
          full_name: checkInTargetMember.full_name,
          member_id: checkInTargetMember.member_id,
          plan: checkInTargetMember.plan,
          raw_check_in: selectedIso,
          check_in_time: formatDisplayTime(selectedIso),
          check_in_date: formatDisplayDate(selectedIso),
        };
        setLogs([newLog, ...logs]);
      }

      setStatusMsg(`✓ Attendance marked for ${checkInTargetMember.full_name} on ${formattedDisplayDate} at ${checkInTime}!`);
      setTimeout(() => setStatusMsg(""), 5000);
      setCheckInTargetMember(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete / Fix Incorrect Attendance Log
  const handleDeleteAttendanceLog = (log) => {
    showDialog({
      type: "confirm",
      title: "Delete Attendance Entry?",
      message: `Are you sure you want to delete the attendance check-in for "${log.full_name}" on ${log.check_in_date} at ${log.check_in_time}?\n\nThis allows you to remove duplicate or incorrect entries.`,
      confirmText: "Yes, Delete Record",
      cancelText: "Cancel",
      onConfirm: async () => {
        setIsSubmitting(true);
        setSubmitMsg("Deleting attendance record...");
        try {
          if (isSupabaseConfigured()) {
            const { error } = await supabase.from("attendance").delete().eq("id", log.id);
            if (error) {
              console.warn("Delete error:", error);
            }
            await fetchAllData();
          } else {
            setLogs((prev) => prev.filter((l) => l.id !== log.id));
          }
          setStatusMsg(`✓ Attendance log for "${log.full_name}" deleted successfully.`);
          setTimeout(() => setStatusMsg(""), 4000);
        } catch (err) {
          console.error("Delete attendance exception:", err);
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  // Filter logs & members with Date Range & Member Type Filters
  const filteredLogs = logs.filter((l) => {
    // 1. Search Filter
    const matchesSearch =
      !searchTerm ||
      l.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.member_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.plan?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Member Type Filter
    const isWalkIn = l.member_id?.startsWith("GP-WALK-") || l.plan?.toLowerCase().includes("walk-in");
    if (typeFilter === "Registered" && isWalkIn) return false;
    if (typeFilter === "Walk-In" && !isWalkIn) return false;

    // 3. Date / Timeframe Filter
    if (dateFilter !== "All" && l.raw_check_in) {
      try {
        const checkInDate = new Date(l.raw_check_in);
        const now = new Date();

        if (dateFilter === "Today") {
          if (checkInDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "This Week") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (checkInDate < sevenDaysAgo) return false;
        } else if (dateFilter === "This Month") {
          if (
            checkInDate.getMonth() !== now.getMonth() ||
            checkInDate.getFullYear() !== now.getFullYear()
          ) return false;
        }
      } catch (e) {
        // Fallback for demo format
      }
    }

    return true;
  });

  const filteredMembers = members.filter(
    (m) =>
      !searchTerm ||
      m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.member_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Attendance & Check-In Desk
          </h1>
        </div>

        <button
          onClick={handleOpenWalkIn}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
        >
          <span>＋</span>
          <span>Walk-in Check-In</span>
        </button>
      </div>

      {/* Success Notification */}
      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between shadow-2xs">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-emerald-600 hover:text-emerald-800 font-bold ml-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Tabs Switcher */}
          <div className="sm:col-span-6 lg:col-span-5 flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "logs"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Check-In Logs ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "members"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Registered Members ({members.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="sm:col-span-6 lg:col-span-7 relative">
            <input
              type="text"
              placeholder={activeTab === "logs" ? "Search logs by member, ID, plan..." : "Search registered members by name or ID..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* Filters Row for Logs Tab */}
        {activeTab === "logs" && (
          <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Timeframe Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-400 px-2.5 uppercase tracking-wide shrink-0">Timeframe</span>
              {[
                { key: "Today", label: "Today" },
                { key: "This Week", label: "Past 7 Days" },
                { key: "This Month", label: "This Month" },
                { key: "All", label: "All Logs" },
              ].map((tf) => (
                <button
                  key={tf.key}
                  onClick={() => setDateFilter(tf.key)}
                  className={`flex-1 sm:flex-none px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    dateFilter === tf.key
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Payer Type Filter */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-400 px-2.5 uppercase tracking-wide shrink-0">Type</span>
              {[
                { key: "All", label: "All" },
                { key: "Registered", label: "Registered" },
                { key: "Walk-In", label: "Walk-In Guests" },
              ].map((tp) => (
                <button
                  key={tp.key}
                  onClick={() => setTypeFilter(tp.key)}
                  className={`flex-1 sm:flex-none px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    typeFilter === tp.key
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tp.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TABLE SECTION CARD */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-sm font-extrabold text-slate-900">
            {activeTab === "logs" ? "Check-In Activity Logs" : "Registered Members Directory"}
          </h3>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            ● {activeTab === "logs" ? `${filteredLogs.length} Records` : `${filteredMembers.length} Active Members`}
          </span>
        </div>

        <div className="overflow-auto max-h-[calc(100vh-280px)] rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-md z-10">
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Member ID</th>
                <th className="py-3 px-4">{activeTab === "logs" ? "Membership Plan" : "Assigned Plan"}</th>
                {activeTab === "logs" ? (
                  <>
                    <th className="py-3 px-4">Check-In Time</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Quick Action</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {activeTab === "logs" ? (
                loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No attendance check-ins found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {log.full_name?.charAt(0).toUpperCase() || "M"}
                          </div>
                          <span className="font-bold text-slate-900">{log.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-700 font-bold">{log.member_id}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{log.plan}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">
                          {log.check_in_time}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{log.check_in_date}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteAttendanceLog(log)}
                          title="Delete attendance record"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-xl transition shadow-2xs cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No active members found.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {m.full_name?.charAt(0).toUpperCase() || "M"}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{m.full_name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{m.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-700 font-bold">{m.member_id || "GP-MEMBER"}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{m.plan || "Pro Membership"}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === "Suspended" || m.status === "Inactive" || m.status === "Deactivated"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}>
                          ● {m.status || "Active"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {(() => {
                          if (m.status === "Suspended" || m.status === "Deactivated" || m.status === "Inactive") {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300 ml-auto select-none">
                                🚫 Suspended
                              </span>
                            );
                          }
                          const todayLog = getMemberCheckInForDate(m.id);
                          return (
                            <div className="inline-flex items-center gap-2 justify-end">
                              {todayLog && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ✓ Today ({todayLog.check_in_time})
                                </span>
                              )}
                              <button
                                onClick={() => handleOpenCheckInMember(m)}
                                className={`px-3 py-1.5 font-extrabold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                                  todayLog
                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                                }`}
                              >
                                <span>{todayLog ? "📅 Log Other Date" : "📍 Check-In Attendance"}</span>
                              </button>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: MANUAL WALK-IN GUEST CHECK-IN */}
      {isWalkInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Manual Walk-in Check-In</h3>
                <p className="text-xs text-slate-500">Record single-day walk-in guest check-in & fee.</p>
              </div>
              <button
                onClick={() => setIsWalkInOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWalkIn} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Guest Full Name *</label>
                <input
                  type="text"
                  required
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="e.g. Ahmad Ali"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Select Pass Plan</label>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
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
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Check-In Date *</label>
                  <input
                    type="date"
                    required
                    value={walkInDate}
                    onChange={(e) => setWalkInDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Check-In Time *</label>
                  <input
                    type="time"
                    required
                    value={walkInTime}
                    onChange={(e) => setWalkInTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Fee Collected (PKR)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={walkInFee}
                    onChange={(e) => setWalkInFee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Payment Method</label>
                  <select
                    value={walkInMethod}
                    onChange={(e) => setWalkInMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    <option value="Cash / Desk">💵 Cash at Desk</option>
                    <option value="EasyPaisa">📲 EasyPaisa</option>
                    <option value="JazzCash">📱 JazzCash</option>
                    <option value="Bank Transfer">🏦 Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsWalkInOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                >
                  ✓ Check-In & Collect Fee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MEMBER CHECK-IN & PAST DATE ADJUSTMENT */}
      {checkInTargetMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Mark Member Attendance</h3>
                <p className="text-xs text-slate-500">Record check-in or log past date attendance for {checkInTargetMember.full_name}.</p>
              </div>
              <button
                onClick={() => setCheckInTargetMember(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmMemberCheckIn} className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Member:</span>
                  <span className="font-bold text-slate-900">{checkInTargetMember.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Member ID:</span>
                  <span className="font-mono text-emerald-700 font-bold">{checkInTargetMember.member_id || "GP-MEMBER"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Assigned Plan:</span>
                  <span className="font-semibold text-slate-800">{checkInTargetMember.plan || "Pro Membership"}</span>
                </div>
              </div>

              {/* Attendance Date with Quick Shortcut Buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Attendance Date *</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCheckInDate(new Date().toISOString().split("T")[0])}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition cursor-pointer ${
                        checkInDate === new Date().toISOString().split("T")[0]
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckInDate(getYesterdayDateYMD())}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md border transition cursor-pointer ${
                        checkInDate === getYesterdayDateYMD()
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      Yesterday
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  required
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Attendance Time */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Check-In Time *</label>
                <input
                  type="time"
                  required
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Informational notice if existing attendance on this date */}
              {(() => {
                const existingForDate = getMemberCheckInForDate(checkInTargetMember.id, checkInDate);
                if (existingForDate) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-2 font-medium">
                      <span>⚠️</span>
                      <span>An attendance record already exists on this date ({existingForDate.check_in_time}). Submitting will add this attendance entry.</span>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCheckInTargetMember(null)}
                  className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                >
                  ✓ Record Attendance
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
