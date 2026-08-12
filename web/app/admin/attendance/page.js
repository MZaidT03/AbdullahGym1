"use client";

import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";

export default function AttendanceAdminPage() {
  const [activeTab, setActiveTab] = useState("logs"); // 'logs' | 'members'
  const [logs, setLogs] = useState([]);
  const [members, setMembers] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

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
        // 1. Fetch Profiles/Members list from Supabase
        const { data: profData, error: profErr } = await supabase
          .from("profiles")
          .select("*")
          .order("full_name", { ascending: true });

        const profileMap = new Map();
        if (!profErr && profData) {
          profData.forEach((p) => profileMap.set(p.id, p));
          // Filter out walk-in guests from Registered Members tab
          const registeredOnly = profData.filter(
            (p) => !p.member_id?.startsWith("GP-WALK-") && !p.email?.includes("@abdullahgym.local") && p.role !== "walkin"
          );
          setMembers(registeredOnly);
        }

        // 2. Fetch Attendance logs from Supabase (Check-ins only)
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
            };
          });
          setLogs(formatted);
          loadedFromSupabase = true;
        }

        // 3. Fetch Active Gym Plans from Supabase
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

    // Demo fallback ONLY if Supabase is NOT configured
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
        {
          id: "demo-3",
          full_name: "Sara Ahmed",
          member_id: "GP-1204-883",
          plan: "Daily Visitor Pass",
          check_in_time: "08:30 AM",
          check_in_date: "Today",
        },
      ]);

      setMembers([
        { id: "m-1", full_name: "Abdullah Khan", member_id: "GP-8472-991", plan: "Pro Membership", status: "Active" },
        { id: "m-2", full_name: "Zaid Tahir", member_id: "GP-5510-402", plan: "Standard Monthly Pass", status: "Active" },
        { id: "m-3", full_name: "Sara Ahmed", member_id: "GP-1204-883", plan: "Daily Visitor Pass", status: "Active" },
        { id: "m-4", full_name: "Hamza Sheikh", member_id: "GP-9031-115", plan: "VIP Champion Pass", status: "Active" },
      ]);
    }

    setLoading(false);
  };

  // Open Walk-In Modal
  const handleOpenWalkIn = () => {
    setWalkInTime(getCurrentTimeHHMM());
    setIsWalkInOpen(true);
  };

  // Submit Manual Walk-In with Time Selection
  const handleSaveWalkIn = async (e) => {
    e.preventDefault();
    if (!walkInName.trim()) {
      alert("Please enter the walk-in guest's name.");
      return;
    }

    const generatedMemberId = `GP-WALK-${Math.floor(1000 + Math.random() * 9000)}`;
    const guestId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    const cleanPlanName = walkInPlan.split(" (")[0];
    const numericFee = parseFloat(walkInFee) || 500.0;
    const selectedCheckInIso = createIsoFromTime(walkInTime);

    if (isSupabaseConfigured()) {
      try {
        // 1. Insert Profile
        await supabase.from("profiles").insert([
          {
            id: guestId,
            email: `walkin.${Date.now()}@abdullahgym.local`,
            full_name: walkInName.trim(),
            member_id: generatedMemberId,
            plan: cleanPlanName,
            days_remaining: cleanPlanName.toLowerCase().includes("daily") ? 1 : 30,
            role: "walkin",
            status: "Active",
            created_at: selectedCheckInIso,
          },
        ]);

        // 2. Insert Attendance Log (check_in_time only)
        await supabase.from("attendance").insert([
          {
            user_id: guestId,
            check_in_time: selectedCheckInIso,
          },
        ]);

        // 3. Insert Payment Transaction
        await supabase.from("payments").insert([
          {
            user_id: guestId,
            amount: numericFee,
            total_fee: numericFee,
            status: "Paid",
            payment_method: walkInMethod,
            invoice_id: `INV-WALK-${Math.floor(1000 + Math.random() * 9000)}`,
            date: selectedCheckInIso,
          },
        ]);

        await fetchAllData();
      } catch (err) {
        console.warn("Walk-in check-in exception:", err);
      }
    } else {
      // Local fallback
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

    setStatusMsg(`✓ Walk-in guest '${walkInName}' checked in at ${walkInTime || "current time"}!`);
    setTimeout(() => setStatusMsg(""), 5000);
    setIsWalkInOpen(false);
    setWalkInName("");
  };

  // Open Check-In Modal for Registered Member
  const handleOpenCheckInMember = (member) => {
    setCheckInTargetMember(member);
    setCheckInTime(getCurrentTimeHHMM());
  };

  // Submit Member Check-In with Selected Time
  const handleConfirmMemberCheckIn = async (e) => {
    e.preventDefault();
    if (!checkInTargetMember) return;

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
        member_id: checkInTargetMember.member_id || "GP-0000-000",
        plan: checkInTargetMember.plan || "Pro Membership",
        check_in_time: formatDisplayTime(selectedIso),
        check_in_date: "Today",
      };
      setLogs([newLog, ...logs]);
    }

    setStatusMsg(`✓ ${checkInTargetMember.full_name} checked in at ${checkInTime || "current time"}!`);
    setTimeout(() => setStatusMsg(""), 5000);
    setCheckInTargetMember(null);
  };

  // History Log Filters State
  const [dateFilter, setDateFilter] = useState("all"); // 'all' | 'today' | 'yesterday' | 'week' | 'month'
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'registered' | 'walkin'
  const [planFilter, setPlanFilter] = useState("all");

  const filteredLogs = logs.filter((l) => {
    // 1. Search term match
    const matchesSearch =
      !searchTerm ||
      l.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.member_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.plan?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Entry Type filter match
    const isWalkIn = l.member_id?.startsWith("GP-WALK-") || l.plan?.toLowerCase().includes("walk-in");
    if (typeFilter === "registered" && isWalkIn) return false;
    if (typeFilter === "walkin" && !isWalkIn) return false;

    // 3. Plan filter match
    if (planFilter !== "all" && !l.plan?.toLowerCase().includes(planFilter.toLowerCase())) {
      return false;
    }

    // 4. Date filter match
    if (dateFilter !== "all" && l.raw_check_in) {
      const logDate = new Date(l.raw_check_in);
      const now = new Date();

      if (dateFilter === "today") {
        if (logDate.toDateString() !== now.toDateString()) return false;
      } else if (dateFilter === "yesterday") {
        const yest = new Date(now);
        yest.setDate(now.getDate() - 1);
        if (logDate.toDateString() !== yest.toDateString()) return false;
      } else if (dateFilter === "week") {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        if (logDate < weekAgo) return false;
      } else if (dateFilter === "month") {
        if (logDate.getMonth() !== now.getMonth() || logDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      }
    }

    return true;
  });

  // Set of member IDs checked in today
  const checkedInUserIdsToday = new Set(
    logs
      .filter((l) => {
        if (!l.raw_check_in) return true;
        const d = new Date(l.raw_check_in);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      })
      .map((l) => l.user_id)
  );

  // Members who have NOT checked in today yet
  const pendingMembersAwaitingCheckIn = members.filter((m) => !checkedInUserIdsToday.has(m.id));

  const filteredMembers = pendingMembersAwaitingCheckIn.filter(
    (m) =>
      m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.member_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count total check-ins today
  const todayCheckInsCount = logs.filter((l) => {
    if (!l.raw_check_in) return true;
    const d = new Date(l.raw_check_in);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1E3621] pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Member Check-In & Entry Portal</h1>
          <p className="text-xs text-[#9EB5A3] mt-1">
            Track member check-ins in real-time with custom time selection stored directly in Supabase.
          </p>
        </div>

        <button
          onClick={handleOpenWalkIn}
          className="bg-[#22C55E] hover:bg-[#1ea850] text-black font-extrabold text-xs px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          + Manual Walk-in Check-In
        </button>
      </div>

      {/* Success Notification */}
      {statusMsg && (
        <div className="p-4 bg-[#16331C] border border-[#22C55E] text-[#4ADE80] text-xs font-bold rounded-2xl shadow-lg flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-gray-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex gap-2 bg-[#0E1A0F] p-1.5 rounded-xl border border-[#1E3621]">
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "logs" ? "bg-[#22C55E] text-black" : "text-[#9EB5A3] hover:text-white"
            }`}
          >
            Check-In History Logs ({logs.length})
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "members" ? "bg-[#22C55E] text-black" : "text-[#9EB5A3] hover:text-white"
            }`}
          >
            Members Awaiting Check-In ({pendingMembersAwaitingCheckIn.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, or plan..."
            className="w-full bg-[#081109] border border-[#1E3621] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW TAB 1: CHECK-IN HISTORY LOGS */}
      {/* ========================================================================= */}
      {activeTab === "logs" && (
        <div className="bg-[#0E1A0F] border border-[#1E3621] rounded-2xl p-4 sm:p-6 shadow-xl overflow-hidden space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-white">Live Check-In Activity Stream</h3>
              <p className="text-[11px] text-[#738F7A]">Filter logs by date range, entry type, or plan.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#4ADE80] bg-[#16331C] px-3 py-1 rounded-full border border-[#234A28]">
                ● {todayCheckInsCount} Check-Ins Today
              </span>
              {(dateFilter !== "all" || typeFilter !== "all" || planFilter !== "all" || searchTerm) && (
                <button
                  onClick={() => {
                    setDateFilter("all");
                    setTypeFilter("all");
                    setPlanFilter("all");
                    setSearchTerm("");
                  }}
                  className="text-[10px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800 px-2.5 py-1 rounded-full hover:bg-amber-900/60 transition"
                >
                  ✕ Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Filters Control Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#081209] border border-[#162D19] rounded-xl">
            {/* Date Range Filter */}
            <div>
              <label className="block text-[10px] font-bold text-[#738F7A] uppercase mb-1">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full bg-[#0E1A0F] border border-[#1E3621] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
              >
                <option value="all">All Dates</option>
                <option value="today">Today Only</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week (Last 7 Days)</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Entry Type Filter */}
            <div>
              <label className="block text-[10px] font-bold text-[#738F7A] uppercase mb-1">Entry Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full bg-[#0E1A0F] border border-[#1E3621] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
              >
                <option value="all">All Entry Types</option>
                <option value="registered">Registered Members Only</option>
                <option value="walkin">Walk-in Guests Only</option>
              </select>
            </div>

            {/* Plan Filter */}
            <div>
              <label className="block text-[10px] font-bold text-[#738F7A] uppercase mb-1">Membership Plan</label>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="w-full bg-[#0E1A0F] border border-[#1E3621] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
              >
                <option value="all">All Plans</option>
                {availablePlans.length > 0 ? (
                  availablePlans.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Daily Visitor Pass">Daily Visitor Pass</option>
                    <option value="Standard Monthly Pass">Standard Monthly Pass</option>
                    <option value="Pro Membership">Pro Membership</option>
                    <option value="VIP Champion Pass">VIP Champion Pass</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E3621] text-[11px] font-bold text-[#738F7A] uppercase tracking-wider">
                  <th className="py-3 px-3">Member Name</th>
                  <th className="py-3 px-3">Member ID</th>
                  <th className="py-3 px-3">Membership Plan</th>
                  <th className="py-3 px-3">Check-In Time</th>
                  <th className="py-3 px-3 text-right">Check-In Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152A18] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500">
                      Loading check-in logs from Supabase...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-500">
                      No check-in activity logs found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#132415] transition">
                      <td className="py-3.5 px-3 font-bold text-white flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1A331D] border border-[#28502F] text-[#4ADE80] flex items-center justify-center font-extrabold text-xs">
                          {log.full_name ? log.full_name.charAt(0).toUpperCase() : "G"}
                        </div>
                        {log.full_name}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[#4ADE80]">{log.member_id}</td>
                      <td className="py-3.5 px-3 text-[#A1B8A6] font-medium">{log.plan}</td>
                      <td className="py-3.5 px-3 font-mono text-emerald-400 font-bold">{log.check_in_time}</td>
                      <td className="py-3.5 px-3 font-mono text-[#738F7A] text-right">{log.check_in_date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW TAB 2: REGISTERED MEMBERS CHECK-IN LIST */}
      {/* ========================================================================= */}
      {activeTab === "members" && (
        <div className="bg-[#0E1A0F] border border-[#1E3621] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-white">Registered Members Check-In Control</h3>
            <p className="text-xs text-[#738F7A]">
              Click 'Check In Member' to record check-in with custom time selection stored directly in Supabase.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E3621] text-[11px] font-bold text-[#738F7A] uppercase tracking-wider">
                  <th className="py-3 px-3">Member Name</th>
                  <th className="py-3 px-3">Member ID</th>
                  <th className="py-3 px-3">Plan</th>
                  <th className="py-3 px-3 text-right">Check-In Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152A18] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-gray-500">
                      Loading profiles...
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-[#4ADE80] font-bold">
                      🎉 All registered members have checked in for today!
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-[#132415] transition">
                      <td className="py-3.5 px-3 font-bold text-white flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1A331D] border border-[#28502F] text-[#4ADE80] flex items-center justify-center font-extrabold text-xs">
                          {m.full_name ? m.full_name.charAt(0).toUpperCase() : "M"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{m.full_name}</p>
                          <p className="text-[10px] text-[#738F7A]">{m.email}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[#4ADE80]">{m.member_id || "GP-0000-000"}</td>
                      <td className="py-3.5 px-3 text-[#A1B8A6]">{m.plan || "Pro Membership"}</td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => handleOpenCheckInMember(m)}
                          className="px-4 py-2 bg-[#22C55E] hover:bg-[#1ea850] text-black font-extrabold text-xs rounded-xl transition shadow-md shadow-emerald-500/10"
                        >
                          ⚡ Check In Member
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: MANUAL WALK-IN WITH TIME SELECTION */}
      {/* ========================================================================= */}
      {isWalkInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0E1A0F] border border-[#22C55E]/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E3621] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">Manual Walk-in Entry</h3>
                <p className="text-[11px] text-[#738F7A]">Set guest name, plan, fee, and custom check-in time.</p>
              </div>
              <button onClick={() => setIsWalkInOpen(false)} className="text-gray-400 hover:text-white font-bold text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWalkIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                  Walk-in Guest Name *
                </label>
                <input
                  type="text"
                  required
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="e.g. Ahmad Ali"
                  className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                  Select Gym Plan *
                </label>
                <select
                  value={walkInPlan}
                  onChange={(e) => {
                    setWalkInPlan(e.target.value);
                    const found = availablePlans.find((p) => e.target.value.includes(p.name));
                    if (found) setWalkInFee(String(found.daily_price || found.monthly_price || 500));
                  }}
                  className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                >
                  {availablePlans.length > 0 ? (
                    availablePlans.map((p) => {
                      const dPrice = p.daily_price ?? p.dailyPrice ?? 0;
                      const mPrice = p.monthly_price ?? p.monthlyPrice ?? 0;
                      const priceLabel = dPrice > 0 ? `PKR ${Number(dPrice).toLocaleString()}/day` : `PKR ${Number(mPrice).toLocaleString()}/mo`;
                      const fullVal = `${p.name} (${priceLabel})`;
                      return (
                        <option key={p.id} value={fullVal}>
                          {fullVal}
                        </option>
                      );
                    })
                  ) : (
                    <>
                      <option value="Daily Visitor Pass (PKR 500/day)">Daily Visitor Pass (PKR 500/day)</option>
                      <option value="Standard Monthly Pass (PKR 3,500/mo)">Standard Monthly Pass (PKR 3,500/mo)</option>
                      <option value="Pro Membership (PKR 5,000/mo)">Pro Membership (PKR 5,000/mo)</option>
                      <option value="VIP Champion Pass (PKR 9,000/mo)">VIP Champion Pass (PKR 9,000/mo)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                    Fee Collected (PKR)
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={walkInFee}
                    onChange={(e) => setWalkInFee(e.target.value)}
                    className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4ADE80] uppercase mb-1">
                    Check-In Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={walkInTime}
                    onChange={(e) => setWalkInTime(e.target.value)}
                    className="w-full bg-[#081109] border border-[#22C55E] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={walkInMethod}
                  onChange={(e) => setWalkInMethod(e.target.value)}
                  className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="Cash / Desk">Cash / Desk</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Card">Credit/Debit Card</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#1E3621] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsWalkInOpen(false)}
                  className="px-4 py-2 bg-[#122414] text-xs font-bold text-gray-300 rounded-xl hover:bg-[#1a331c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#22C55E] text-xs font-bold text-black rounded-xl hover:bg-[#1ca64f] shadow-md shadow-emerald-500/20"
                >
                  Save & Check In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REGISTERED MEMBER CHECK-IN TIME SELECTION */}
      {/* ========================================================================= */}
      {checkInTargetMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0E1A0F] border border-[#22C55E]/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E3621] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">Member Check-In Time Selection</h3>
                <p className="text-[11px] text-[#738F7A]">Specify exact check-in time to store in Supabase.</p>
              </div>
              <button
                onClick={() => setCheckInTargetMember(null)}
                className="text-gray-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmMemberCheckIn} className="space-y-4">
              <div className="p-3 bg-[#081209] border border-[#173019] rounded-xl text-xs space-y-1">
                <p className="text-[#738F7A]">Member Name:</p>
                <p className="font-extrabold text-white">{checkInTargetMember.full_name}</p>
                <p className="text-[11px] text-[#4ADE80] font-mono">{checkInTargetMember.member_id || "GP-0000-000"}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4ADE80] uppercase mb-1">
                  Select Check-In Time *
                </label>
                <input
                  type="time"
                  required
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full bg-[#081109] border border-[#22C55E] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#1E3621] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCheckInTargetMember(null)}
                  className="px-4 py-2 bg-[#122414] text-xs font-bold text-gray-300 rounded-xl hover:bg-[#1a331c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#22C55E] text-xs font-bold text-black rounded-xl hover:bg-[#1ca64f] shadow-md shadow-emerald-500/20"
                >
                  Confirm Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
