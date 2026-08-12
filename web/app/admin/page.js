"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    todayCheckIns: 0,
    monthlyRevenue: "PKR 0",
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timeframe Toggle States for Graphs
  const [attendanceTimeframe, setAttendanceTimeframe] = useState("daily"); // 'daily' | 'monthly' | 'yearly'
  const [paymentTimeframe, setPaymentTimeframe] = useState("daily"); // 'daily' | 'monthly' | 'yearly'

  // Raw Database Cache for Dynamic Aggregations
  const [allAttendance, setAllAttendance] = useState([]);
  const [allPayments, setAllPayments] = useState([]);

  // Default Daily Graphs Data
  const [attendanceGraphData, setAttendanceGraphData] = useState([
    { day: "Mon", count: 24 },
    { day: "Tue", count: 35 },
    { day: "Wed", count: 42 },
    { day: "Thu", count: 38 },
    { day: "Fri", count: 48 },
    { day: "Sat", count: 52 },
    { day: "Sun", count: 28 },
  ]);

  const [paymentGraphData, setPaymentGraphData] = useState([
    { day: "Mon", amount: 5000 },
    { day: "Tue", amount: 14000 },
    { day: "Wed", amount: 9500 },
    { day: "Thu", amount: 15000 },
    { day: "Fri", amount: 18000 },
    { day: "Sat", amount: 22000 },
    { day: "Sun", amount: 12000 },
  ]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    if (isSupabaseConfigured()) {
      try {
        // 1. Fetch Total Members
        const { count: memberCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // 2. Fetch Active Members
        const { count: activeCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "Active");

        // 3. Fetch Today Check-ins
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count: checkInCount } = await supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .gte("check_in_time", todayStart.toISOString());

        // 4. Fetch Attendance Logs
        const { data: attData } = await supabase
          .from("attendance")
          .select("check_in_time");

        if (attData) {
          setAllAttendance(attData);

          const daysMap = {};
          const daysOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayName = daysOrder[d.getDay()];
            daysMap[dayName] = 0;
          }

          attData.forEach((row) => {
            if (row.check_in_time) {
              const dayName = daysOrder[new Date(row.check_in_time).getDay()];
              if (daysMap[dayName] !== undefined) {
                daysMap[dayName] += 1;
              }
            }
          });

          const formattedAttGraph = Object.entries(daysMap).map(([day, count]) => ({
            day,
            count,
          }));
          setAttendanceGraphData(formattedAttGraph);
        }

        // 5. Fetch Payments
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("amount, date");

        if (paymentsData) {
          setAllPayments(paymentsData);
          let totalRev = paymentsData.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

          const payDaysMap = {};
          const daysOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayName = daysOrder[d.getDay()];
            payDaysMap[dayName] = 0;
          }

          paymentsData.forEach((p) => {
            if (p.date) {
              const dayName = daysOrder[new Date(p.date).getDay()];
              if (payDaysMap[dayName] !== undefined) {
                payDaysMap[dayName] += parseFloat(p.amount) || 0;
              }
            }
          });

          const formattedPayGraph = Object.entries(payDaysMap).map(([day, amount]) => ({
            day,
            amount,
          }));
          setPaymentGraphData(formattedPayGraph);

          setStats({
            totalMembers: memberCount || 0,
            activeMembers: activeCount || 0,
            todayCheckIns: checkInCount || 0,
            monthlyRevenue: `PKR ${Number(totalRev).toLocaleString()}`,
          });
        }

        // 6. Fetch Recent Members / Activity
        const { data: recentProfiles } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        if (recentProfiles && recentProfiles.length > 0) {
          const formatted = recentProfiles.map((p) => ({
            id: p.id,
            name: p.full_name || "Member",
            time: p.created_at ? new Date(p.created_at).toLocaleDateString() : "Today",
            status: p.status || "Active",
            plan: p.plan || "Pro Membership",
          }));
          setRecentActivity(formatted);
        }
      } catch (err) {
        console.warn("Supabase fetch notice:", err);
      }
    }
    setLoading(false);
  };

  // Dynamic Attendance Graph Data Generator
  const getAttendanceGraphData = () => {
    if (attendanceTimeframe === "monthly") {
      if (allAttendance.length > 0) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthCounts = Array(12).fill(0);
        allAttendance.forEach((row) => {
          if (row.check_in_time) {
            const m = new Date(row.check_in_time).getMonth();
            monthCounts[m] += 1;
          }
        });
        return monthNames.map((name, idx) => ({
          label: name,
          count: monthCounts[idx],
        }));
      }
      return [
        { label: "Jan", count: 420 },
        { label: "Feb", count: 510 },
        { label: "Mar", count: 630 },
        { label: "Apr", count: 580 },
        { label: "May", count: 710 },
        { label: "Jun", count: 850 },
        { label: "Jul", count: 920 },
        { label: "Aug", count: 780 },
        { label: "Sep", count: 610 },
        { label: "Oct", count: 540 },
        { label: "Nov", count: 490 },
        { label: "Dec", count: 410 },
      ];
    } else if (attendanceTimeframe === "yearly") {
      if (allAttendance.length > 0) {
        const yearsMap = { 2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0 };
        allAttendance.forEach((row) => {
          if (row.check_in_time) {
            const y = new Date(row.check_in_time).getFullYear();
            if (yearsMap[y] !== undefined) yearsMap[y] += 1;
          }
        });
        return Object.entries(yearsMap).map(([yr, count]) => ({ label: yr, count }));
      }
      return [
        { label: "2022", count: 3200 },
        { label: "2023", count: 5400 },
        { label: "2024", count: 7800 },
        { label: "2025", count: 10200 },
        { label: "2026", count: 12800 },
      ];
    }
    return attendanceGraphData.map((d) => ({ label: d.day, count: d.count }));
  };

  // Dynamic Payment Graph Data Generator
  const getPaymentGraphData = () => {
    if (paymentTimeframe === "monthly") {
      if (allPayments.length > 0) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthAmts = Array(12).fill(0);
        allPayments.forEach((p) => {
          if (p.date) {
            const m = new Date(p.date).getMonth();
            monthAmts[m] += parseFloat(p.amount) || 0;
          }
        });
        return monthNames.map((name, idx) => ({
          label: name,
          amount: monthAmts[idx],
        }));
      }
      return [
        { label: "Jan", amount: 140000 },
        { label: "Feb", amount: 180000 },
        { label: "Mar", amount: 210000 },
        { label: "Apr", amount: 195000 },
        { label: "May", amount: 250000 },
        { label: "Jun", amount: 290000 },
        { label: "Jul", amount: 310000 },
        { label: "Aug", amount: 280000 },
        { label: "Sep", amount: 230000 },
        { label: "Oct", amount: 210000 },
        { label: "Nov", amount: 190000 },
        { label: "Dec", amount: 160000 },
      ];
    } else if (paymentTimeframe === "yearly") {
      if (allPayments.length > 0) {
        const yearsMap = { 2022: 0, 2023: 0, 2024: 0, 2025: 0, 2026: 0 };
        allPayments.forEach((p) => {
          if (p.date) {
            const y = new Date(p.date).getFullYear();
            if (yearsMap[y] !== undefined) yearsMap[y] += parseFloat(p.amount) || 0;
          }
        });
        return Object.entries(yearsMap).map(([yr, amount]) => ({ label: yr, amount }));
      }
      return [
        { label: "2022", amount: 1200000 },
        { label: "2023", amount: 1900000 },
        { label: "2024", amount: 2600000 },
        { label: "2025", amount: 3400000 },
        { label: "2026", amount: 4100000 },
      ];
    }
    return paymentGraphData.map((d) => ({ label: d.day, amount: d.amount }));
  };

  const currentAttGraphData = getAttendanceGraphData();
  const currentPayGraphData = getPaymentGraphData();

  const maxAttCount = Math.max(...currentAttGraphData.map((d) => d.count), 1);
  const maxPayAmount = Math.max(...currentPayGraphData.map((d) => d.amount), 1);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-[#122917] via-[#17381E] to-[#0D1F11] border border-[#224A28] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Welcome Back, Abdullah Manager 👋
          </h2>
          <p className="text-xs sm:text-sm text-[#A1B8A6] mt-1">
            Real-time live operations dashboard & visual financial analytics connected to Supabase.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <Link
            href="/admin/revenue"
            className="bg-[#22C55E] hover:bg-[#16A34A] text-black font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-500/20"
          >
            📊 Revenue Analytics Page →
          </Link>
          <Link
            href="/admin/members"
            className="bg-[#1D3B22] hover:bg-[#254A2C] border border-[#2D5B32] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
          >
            + Register New Member
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#0E1A0F] border border-[#1E3621] p-5 rounded-2xl shadow-lg relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#738F7A] uppercase tracking-wider">
              Total Members
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#17361D] text-[#4ADE80] flex items-center justify-center font-bold">
              👤
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-white">{loading ? "..." : stats.totalMembers}</p>
            <span className="text-[11px] font-medium text-[#22C55E] mt-1 inline-block">
              Live Supabase profiles count
            </span>
          </div>
        </div>

        <div className="bg-[#0E1A0F] border border-[#1E3621] p-5 rounded-2xl shadow-lg relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#738F7A] uppercase tracking-wider">
              Active Subscriptions
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#17361D] text-[#4ADE80] flex items-center justify-center font-bold">
              ✓
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-white">{loading ? "..." : stats.activeMembers}</p>
            <span className="text-[11px] font-medium text-[#4ADE80] mt-1 inline-block">
              Active members in gym
            </span>
          </div>
        </div>

        <div className="bg-[#0E1A0F] border border-[#1E3621] p-5 rounded-2xl shadow-lg relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#738F7A] uppercase tracking-wider">
              Today's Check-Ins
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#17361D] text-[#4ADE80] flex items-center justify-center font-bold">
              ⚡
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-white">{loading ? "..." : stats.todayCheckIns}</p>
            <span className="text-[11px] font-medium text-[#738F7A] mt-1 inline-block">
              Live attendance entries
            </span>
          </div>
        </div>

        <div className="bg-[#0E1A0F] border border-[#1E3621] p-5 rounded-2xl shadow-lg relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#738F7A] uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#17361D] text-[#4ADE80] flex items-center justify-center font-bold">
              💳
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-white">{loading ? "..." : stats.monthlyRevenue}</p>
            <span className="text-[11px] font-medium text-[#22C55E] mt-1 inline-block">
              Recorded payments sum
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISUAL GRAPHS SECTION WITH DAILY, MONTHLY & YEARLY TIMEFRAME TOGGLE BTNS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 1: ATTENDANCE TREND WITH TIMEFRAME BUTTONS */}
        <div className="bg-[#0E1A0F] border border-[#1E3621] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E3621] pb-3">
            <div>
              <h3 className="text-base font-extrabold text-white">Attendance Trend Graph</h3>
              <p className="text-xs text-[#738F7A]">
                {attendanceTimeframe === "daily" && "Daily check-ins for the past 7 days"}
                {attendanceTimeframe === "monthly" && "Monthly check-ins for the year"}
                {attendanceTimeframe === "yearly" && "Yearly check-ins comparison"}
              </p>
            </div>

            {/* Daily, Monthly, Yearly Toggle Buttons */}
            <div className="flex items-center gap-1 bg-[#081109] border border-[#173019] p-1 rounded-xl shrink-0">
              <button
                onClick={() => setAttendanceTimeframe("daily")}
                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition ${
                  attendanceTimeframe === "daily"
                    ? "bg-[#22C55E] text-black shadow-md shadow-emerald-500/20"
                    : "text-[#738F7A] hover:text-white"
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setAttendanceTimeframe("monthly")}
                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition ${
                  attendanceTimeframe === "monthly"
                    ? "bg-[#22C55E] text-black shadow-md shadow-emerald-500/20"
                    : "text-[#738F7A] hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAttendanceTimeframe("yearly")}
                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition ${
                  attendanceTimeframe === "yearly"
                    ? "bg-[#22C55E] text-black shadow-md shadow-emerald-500/20"
                    : "text-[#738F7A] hover:text-white"
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="h-56 flex items-end justify-between gap-1.5 sm:gap-2.5 pt-6 pb-2 px-2 sm:px-3 bg-[#081109] rounded-xl border border-[#173019] overflow-x-auto">
            {currentAttGraphData.map((item, idx) => {
              const heightPercent = Math.round((item.count / maxAttCount) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative min-w-[20px]">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-[#16331C] text-[#4ADE80] text-[10px] font-bold px-2 py-0.5 rounded border border-[#22C55E] pointer-events-none whitespace-nowrap z-10 shadow-lg">
                    {item.count} Check-Ins
                  </div>

                  {/* Count Label */}
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-[#4ADE80] mb-1.5">
                    {item.count >= 1000 ? `${(item.count / 1000).toFixed(1)}k` : item.count}
                  </span>

                  {/* Vertical Bar */}
                  <div className="w-full bg-[#122415] rounded-t-lg overflow-hidden flex items-end h-36">
                    <div
                      className="w-full bg-gradient-to-t from-[#1EA850] to-[#4ADE80] rounded-t-lg group-hover:brightness-125 transition-all duration-500 shadow-md shadow-emerald-500/20"
                      style={{ height: `${Math.max(8, heightPercent)}%` }}
                    />
                  </div>

                  {/* Label */}
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#738F7A] mt-2 group-hover:text-white transition truncate">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* GRAPH 2: REVENUE GRAPH WITH TIMEFRAME BUTTONS */}
        <div className="bg-[#0E1A0F] border border-[#1E3621] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E3621] pb-3">
            <div>
              <h3 className="text-base font-extrabold text-white">Revenue & Payment Graph</h3>
              <p className="text-xs text-[#738F7A]">
                {paymentTimeframe === "daily" && "Daily revenue collection in PKR (Past 7 Days)"}
                {paymentTimeframe === "monthly" && "Monthly revenue collection in PKR (12 Months)"}
                {paymentTimeframe === "yearly" && "Yearly revenue totals comparison in PKR"}
              </p>
            </div>

            {/* Daily, Monthly, Yearly Toggle Buttons */}
            <div className="flex items-center gap-1 bg-[#081109] border border-[#173019] p-1 rounded-xl shrink-0">
              <button
                onClick={() => setPaymentTimeframe("daily")}
                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition ${
                  paymentTimeframe === "daily"
                    ? "bg-amber-400 text-black shadow-md shadow-amber-500/20"
                    : "text-[#738F7A] hover:text-white"
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setPaymentTimeframe("monthly")}
                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition ${
                  paymentTimeframe === "monthly"
                    ? "bg-amber-400 text-black shadow-md shadow-amber-500/20"
                    : "text-[#738F7A] hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPaymentTimeframe("yearly")}
                className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition ${
                  paymentTimeframe === "yearly"
                    ? "bg-amber-400 text-black shadow-md shadow-amber-500/20"
                    : "text-[#738F7A] hover:text-white"
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="h-56 flex items-end justify-between gap-1.5 sm:gap-2.5 pt-6 pb-2 px-2 sm:px-3 bg-[#081109] rounded-xl border border-[#173019] overflow-x-auto">
            {currentPayGraphData.map((item, idx) => {
              const heightPercent = Math.round((item.amount / maxPayAmount) * 100);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative min-w-[20px]">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition absolute -top-8 bg-amber-950 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-700 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                    PKR {Number(item.amount).toLocaleString()}
                  </div>

                  {/* Amount Label */}
                  <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-400 mb-1.5 truncate max-w-full">
                    {item.amount >= 1000000
                      ? `${(item.amount / 1000000).toFixed(1)}M`
                      : item.amount >= 1000
                      ? `${(item.amount / 1000).toFixed(0)}k`
                      : item.amount}
                  </span>

                  {/* Vertical Bar */}
                  <div className="w-full bg-[#1A180E] rounded-t-lg overflow-hidden flex items-end h-36">
                    <div
                      className="w-full bg-gradient-to-t from-amber-600 to-amber-300 rounded-t-lg group-hover:brightness-125 transition-all duration-500 shadow-md shadow-amber-500/20"
                      style={{ height: `${Math.max(8, heightPercent)}%` }}
                    />
                  </div>

                  {/* Label */}
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#738F7A] mt-2 group-hover:text-white transition truncate">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Activity & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Container: Recent Members / Activity */}
        <div className="lg:col-span-2 bg-[#0E1A0F] border border-[#1E3621] rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6 border-b border-[#1E3621] pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Recent Registered Members</h3>
              <p className="text-xs text-[#738F7A]">Live members directory from Supabase</p>
            </div>
            <Link
              href="/admin/members"
              className="text-xs text-[#22C55E] hover:underline font-semibold"
            >
              View All Members →
            </Link>
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs text-[#738F7A]">Loading database activity...</div>
          ) : recentActivity.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#738F7A]">
              No members registered yet. Click <span className="text-[#22C55E] font-bold">"+ Register New Member"</span> above to add your first member!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1E3621] text-[11px] font-bold text-[#738F7A] uppercase tracking-wider">
                    <th className="py-3 px-3">Member Name</th>
                    <th className="py-3 px-3">Plan</th>
                    <th className="py-3 px-3">Joined Date</th>
                    <th className="py-3 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#152A18] text-xs">
                  {recentActivity.map((row) => (
                    <tr key={row.id} className="hover:bg-[#132415] transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#1A331D] text-[#4ADE80] font-bold text-xs flex items-center justify-center">
                          {row.name.charAt(0)}
                        </div>
                        {row.name}
                      </td>
                      <td className="py-3.5 px-3 text-[#A1B8A6]">{row.plan}</td>
                      <td className="py-3.5 px-3 text-[#A1B8A6]">{row.time}</td>
                      <td className="py-3.5 px-3 text-right">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            row.status === "Active"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-slate-900 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Operational Shortcuts Sidebar */}
        <div className="bg-[#0E1A0F] border border-[#1E3621] rounded-2xl p-6 shadow-lg space-y-4">
          <h3 className="text-base font-bold text-white border-b border-[#1E3621] pb-3">Quick Actions</h3>

          <div className="space-y-3">
            <Link
              href="/admin/attendance"
              className="block p-3.5 bg-[#081109] hover:bg-[#132415] border border-[#1E3621] rounded-xl transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-[#4ADE80]">⚡ Member Check-In Portal</span>
                <span className="text-xs text-[#738F7A]">→</span>
              </div>
              <p className="text-[11px] text-[#738F7A] mt-1">Check in members and manual walk-in guests</p>
            </Link>

            <Link
              href="/admin/revenue"
              className="block p-3.5 bg-[#081109] hover:bg-[#132415] border border-[#1E3621] rounded-xl transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 group-hover:text-amber-200">📊 Revenue Analytics Page</span>
                <span className="text-xs text-amber-400">→</span>
              </div>
              <p className="text-[11px] text-[#738F7A] mt-1">View revenue charts, payment methods & breakdown</p>
            </Link>

            <Link
              href="/admin/configuration"
              className="block p-3.5 bg-[#081109] hover:bg-[#132415] border border-[#1E3621] rounded-xl transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-[#4ADE80]">⚙️ Manage Plans & Pricing</span>
                <span className="text-xs text-[#738F7A]">→</span>
              </div>
              <p className="text-[11px] text-[#738F7A] mt-1">Set monthly and daily rates in PKR</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
