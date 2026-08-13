"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";

// Reusable Professional SVG Area & Line Chart Component
function ProfessionalSvgChart({ data, valueKey = "amount", colorScheme = "emerald", formatTooltip }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) return null;

  const width = 800;
  const height = 220;
  const paddingX = 55;
  const paddingTop = 40;
  const paddingBottom = 40;

  const values = data.map((d) => Number(d[valueKey]) || 0);
  const rawMaxVal = Math.max(...values, 1000);
  const maxVal = rawMaxVal * 1.18;

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(1, data.length - 1)) * (width - paddingX * 2);
    const val = Number(d[valueKey]) || 0;
    const y = height - paddingBottom - (val / maxVal) * (height - paddingTop - paddingBottom);
    return { x, y, label: d.label, value: val, raw: d };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    pathD += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  const strokeColor = colorScheme === "emerald" ? "#059669" : "#d97706";
  const gradientStart = colorScheme === "emerald" ? "#10b981" : "#f59e0b";
  const gradientId = `revenueChartGrad_${colorScheme}_${Math.random().toString(36).substr(2, 4)}`;

  const selectedPt = hoveredIdx !== null ? points[hoveredIdx] : null;
  const isNearTop = selectedPt ? selectedPt.y < height * 0.45 : false;
  const isNearRight = selectedPt ? selectedPt.x > width * 0.75 : false;
  const isNearLeft = selectedPt ? selectedPt.x < width * 0.25 : false;

  let transformX = "-translate-x-1/2";
  if (isNearRight) transformX = "-translate-x-[88%]";
  if (isNearLeft) transformX = "-translate-x-[12%]";

  let transformY = isNearTop ? "translate-y-3" : "-translate-y-full -mt-2.5";

  return (
    <div className="relative w-full overflow-hidden bg-slate-50/80 rounded-xl border border-slate-200/90 p-4 mt-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientStart} stopOpacity="0.35" />
            <stop offset="100%" stopColor={gradientStart} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Reference Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = height - paddingBottom - ratio * (height - paddingTop - paddingBottom);
          const gridVal = Math.round(ratio * rawMaxVal);
          return (
            <g key={idx}>
              <line
                x1={paddingX - 15}
                y1={y}
                x2={width - paddingX + 15}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={paddingX - 18}
                y={y + 3}
                fill="#94a3b8"
                fontSize="9"
                fontWeight="bold"
                textAnchor="end"
              >
                {gridVal >= 1000000
                  ? `${(gridVal / 1000000).toFixed(1)}M`
                  : gridVal >= 1000
                  ? `${(gridVal / 1000).toFixed(0)}k`
                  : gridVal}
              </text>
            </g>
          );
        })}

        {/* Area Gradient Fill */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Smooth Cubic Bezier Line */}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" />

        {/* Interactive Data Points & Hover Targets */}
        {points.map((pt, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <g
              key={idx}
              className="cursor-pointer group"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Vertical Crosshair Guide */}
              {isHovered && (
                <line
                  x1={pt.x}
                  y1={paddingTop}
                  x2={pt.x}
                  y2={height - paddingBottom}
                  stroke="#cbd5e1"
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />
              )}

              {/* Data Point Outer Glow Ring */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? "8" : "4"}
                fill={strokeColor}
                fillOpacity={isHovered ? "0.2" : "1"}
                className="transition-all duration-200"
              />

              {/* Core Inner Point Dot */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? "4.5" : "2.5"}
                fill="#ffffff"
                stroke={strokeColor}
                strokeWidth="2.5"
                className="transition-all duration-200"
              />

              {/* Invisible Hit Target Circle */}
              <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />

              {/* X-Axis Labels */}
              <text
                x={pt.x}
                y={height - 12}
                fill={isHovered ? "#0f172a" : "#64748b"}
                fontSize={isHovered ? "10.5" : "9.5"}
                fontWeight={isHovered ? "800" : "600"}
                textAnchor="middle"
                className="transition-all duration-150 select-none"
              >
                {pt.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip Box */}
      {selectedPt && (
        <div
          style={{ left: `${(selectedPt.x / width) * 100}%`, top: `${(selectedPt.y / height) * 100}%` }}
          className={`absolute pointer-events-none z-30 transition-all duration-150 ${transformX} ${transformY}`}
        >
          <div className="bg-slate-900/95 text-white text-xs px-3.5 py-2 rounded-xl shadow-xl border border-slate-700/80 backdrop-blur-xs flex flex-col items-center whitespace-nowrap space-y-0.5">
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
              {selectedPt.label} Revenue
            </span>
            <span className="font-black text-sm text-white font-mono">
              {formatTooltip ? formatTooltip(selectedPt.value) : `PKR ${selectedPt.value.toLocaleString()}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RevenueAdminPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Analytics state
  const [graphPeriod, setGraphPeriod] = useState("monthly"); // 'daily' | 'monthly' | 'yearly'
  const [timeFilter, setTimeFilter] = useState("All"); // 'All' | 'Today' | 'This Week' | 'This Month' | 'This Year'
  const [typeFilter, setTypeFilter] = useState("All"); // 'All' | 'Subscriptions' | 'Walk-Ins'
  const [methodFilter, setMethodFilter] = useState("All"); // 'All' | 'Cash / Desk' | 'EasyPaisa' | 'JazzCash' | 'Bank Transfer'
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    setLoading(true);
    let loadedFromSupabase = false;

    if (isSupabaseConfigured()) {
      try {
        // Fetch profiles map
        const { data: profData } = await supabase.from("profiles").select("id, full_name, member_id, plan");
        const profileMap = new Map();
        if (profData) {
          profData.forEach((p) => profileMap.set(p.id, p));
        }

        // Fetch Payments
        const { data: payData, error } = await supabase
          .from("payments")
          .select("*")
          .order("date", { ascending: false });

        if (!error && payData) {
          const formatted = payData.map((item) => {
            const prof = profileMap.get(item.user_id);
            const numAmount = parseFloat(item.amount) || 0;
            const isWalkIn =
              item.invoice_id?.startsWith("INV-WALK-") ||
              prof?.member_id?.startsWith("GP-WALK-") ||
              prof?.role === "walkin";

            return {
              id: item.id,
              invoice_id: item.invoice_id || `INV-${item.id.slice(0, 4)}`,
              member_name: prof?.full_name || "Walk-In Guest",
              member_id: prof?.member_id || "GP-WALK-000",
              plan: prof?.plan || (isWalkIn ? "Daily Walk-In Pass" : "Pro Membership"),
              raw_amount: numAmount,
              amount: `PKR ${numAmount.toLocaleString()}`,
              raw_date: item.date,
              date: new Date(item.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
              method: item.payment_method || "Cash / Desk",
              status: item.status || "Paid",
              is_walk_in: isWalkIn,
            };
          });

          setPayments(formatted);
          loadedFromSupabase = true;
        }
      } catch (err) {
        console.warn("Revenue fetch notice:", err);
      }
    }

    if (!loadedFromSupabase && !isSupabaseConfigured()) {
      setPayments([
        {
          id: "1",
          invoice_id: "INV-2026-001",
          member_name: "Abdullah Khan",
          member_id: "GP-8472-991",
          plan: "Pro Membership",
          raw_amount: 5000,
          amount: "PKR 5,000",
          date: "Aug 01, 2026",
          raw_date: "2026-08-01T10:00:00Z",
          method: "Bank Transfer",
          status: "Paid",
          is_walk_in: false,
        },
        {
          id: "2",
          invoice_id: "INV-2026-002",
          member_name: "Zaid Tahir",
          member_id: "GP-5510-402",
          plan: "VIP Champion Pass",
          raw_amount: 9000,
          amount: "PKR 9,000",
          date: "Aug 03, 2026",
          raw_date: "2026-08-03T10:00:00Z",
          method: "JazzCash",
          status: "Paid",
          is_walk_in: false,
        },
        {
          id: "3",
          invoice_id: "INV-WALK-102",
          member_name: "Hamza Sheikh",
          member_id: "GP-WALK-991",
          plan: "Daily Walk-In Pass",
          raw_amount: 500,
          amount: "PKR 500",
          date: "Aug 10, 2026",
          raw_date: "2026-08-10T10:00:00Z",
          method: "Cash / Desk",
          status: "Paid",
          is_walk_in: true,
        },
        {
          id: "4",
          invoice_id: "INV-2026-004",
          member_name: "CodeInn Tech",
          member_id: "GP-9367-960",
          plan: "Pro Membership",
          raw_amount: 5000,
          amount: "PKR 5,000",
          date: "Aug 11, 2026",
          raw_date: "2026-08-11T10:00:00Z",
          method: "Bank Transfer",
          status: "Paid",
          is_walk_in: false,
        },
        {
          id: "5",
          invoice_id: "INV-WALK-105",
          member_name: "Ahmad Ali",
          member_id: "GP-WALK-402",
          plan: "Daily Walk-In Pass",
          raw_amount: 500,
          amount: "PKR 500",
          date: "Aug 12, 2026",
          raw_date: "2026-08-12T10:00:00Z",
          method: "Cash / Desk",
          status: "Paid",
          is_walk_in: true,
        },
      ]);
    }

    setLoading(false);
  };

  // Filtered Payments Dataset
  const filteredPayments = payments.filter((p) => {
    // Search
    const matchesSearch =
      !searchTerm ||
      p.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.invoice_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.plan?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // Method Filter
    if (methodFilter !== "All" && p.method !== methodFilter) return false;

    // Type Filter
    if (typeFilter === "Subscriptions" && p.is_walk_in) return false;
    if (typeFilter === "Walk-Ins" && !p.is_walk_in) return false;

    // Time Period Filter
    if (timeFilter !== "All") {
      const pDate = new Date(p.raw_date || p.date);
      if (isNaN(pDate.getTime())) return true;
      const now = new Date();

      if (timeFilter === "Today") {
        if (pDate.toDateString() !== now.toDateString()) return false;
      } else if (timeFilter === "This Week") {
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(now.getDate() - 7);
        if (pDate < oneWeekAgo) return false;
      } else if (timeFilter === "This Month") {
        if (pDate.getMonth() !== now.getMonth() || pDate.getFullYear() !== now.getFullYear()) return false;
      } else if (timeFilter === "This Year") {
        if (pDate.getFullYear() !== now.getFullYear()) return false;
      }
    }

    return true;
  });

  // Key Metrics computed from filtered dataset
  const totalRevenue = filteredPayments
    .filter((p) => p.status === "Paid" || p.status === "Partial")
    .reduce((acc, p) => acc + (p.raw_amount || 0), 0);

  const monthlySubscriptionRev = filteredPayments
    .filter((p) => !p.is_walk_in && (p.status === "Paid" || p.status === "Partial"))
    .reduce((acc, p) => acc + (p.raw_amount || 0), 0);

  const walkInPassRev = filteredPayments
    .filter((p) => p.is_walk_in && (p.status === "Paid" || p.status === "Partial"))
    .reduce((acc, p) => acc + (p.raw_amount || 0), 0);

  const totalTransactions = filteredPayments.length;

  // Breakdown by Payment Method
  const methodBreakdown = filteredPayments.reduce((acc, p) => {
    const m = p.method || "Cash / Desk";
    acc[m] = (acc[m] || 0) + (p.raw_amount || 0);
    return acc;
  }, {});

  // Breakdown by Plan
  const planBreakdown = filteredPayments.reduce((acc, p) => {
    const pl = p.plan || "Pro Membership";
    acc[pl] = (acc[pl] || 0) + (p.raw_amount || 0);
    return acc;
  }, {});

  // --- DYNAMIC GRAPH DATA COMPUTATION (Daily, Monthly, Yearly) ---

  // 1. Daily Mode (Past 14 Days)
  const getDailyChartData = () => {
    const last14Days = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString([], { month: "short", day: "numeric" });
      const dayIsoStr = d.toDateString();

      const sum = payments
        .filter((p) => {
          if (p.status !== "Paid" && p.status !== "Partial") return false;
          if (typeFilter === "Subscriptions" && p.is_walk_in) return false;
          if (typeFilter === "Walk-Ins" && !p.is_walk_in) return false;
          if (methodFilter !== "All" && p.method !== methodFilter) return false;

          const pDate = new Date(p.raw_date || p.date);
          return !isNaN(pDate.getTime()) && pDate.toDateString() === dayIsoStr;
        })
        .reduce((acc, p) => acc + (p.raw_amount || 0), 0);

      last14Days.push({ label: dateStr, amount: sum });
    }
    return last14Days;
  };

  // 2. Monthly Mode (12 Months of Current Year)
  const getMonthlyChartData = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYearVal = new Date().getFullYear();

    return monthNames.map((name, idx) => {
      const monthSum = payments
        .filter((p) => {
          if (p.status !== "Paid" && p.status !== "Partial") return false;
          if (typeFilter === "Subscriptions" && p.is_walk_in) return false;
          if (typeFilter === "Walk-Ins" && !p.is_walk_in) return false;
          if (methodFilter !== "All" && p.method !== methodFilter) return false;

          const d = new Date(p.raw_date || p.date);
          if (isNaN(d.getTime())) return false;
          return d.getMonth() === idx && d.getFullYear() === currentYearVal;
        })
        .reduce((acc, p) => acc + (p.raw_amount || 0), 0);
      return { label: name, amount: monthSum };
    });
  };

  // 3. Yearly Mode (2024, 2025, 2026)
  const getYearlyChartData = () => {
    const years = [2024, 2025, 2026];
    return years.map((yr) => {
      const yearSum = payments
        .filter((p) => {
          if (p.status !== "Paid" && p.status !== "Partial") return false;
          if (typeFilter === "Subscriptions" && p.is_walk_in) return false;
          if (typeFilter === "Walk-Ins" && !p.is_walk_in) return false;
          if (methodFilter !== "All" && p.method !== methodFilter) return false;

          const d = new Date(p.raw_date || p.date);
          if (isNaN(d.getTime())) return false;
          return d.getFullYear() === yr;
        })
        .reduce((acc, p) => acc + (p.raw_amount || 0), 0);
      return { label: String(yr), amount: yearSum };
    });
  };

  const chartData =
    graphPeriod === "daily"
      ? getDailyChartData()
      : graphPeriod === "yearly"
      ? getYearlyChartData()
      : getMonthlyChartData();

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 border border-emerald-600/30 rounded-2xl p-6 sm:p-7 shadow-md text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-emerald-900/60 border border-emerald-500/30 text-[10px] font-bold text-emerald-200 uppercase tracking-wider">
              Financial Intelligence
            </span>
            <span className="text-[11px] text-emerald-200 font-mono font-semibold">Real-Time Supabase Sync</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
            Revenue Analytics & Financial Ledger
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl">
            Detailed breakdown of monthly subscriptions, walk-in revenues, payment methods, and financial charts with period filters.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/admin/payments"
            className="bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold text-xs px-5 py-3 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            Payments & Invoices Portal →
          </Link>
        </div>
      </div>

      {/* REVENUE FILTER TOOLBAR */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-slate-900">🔍 Filter Financial Analytics</span>
            <span className="text-[11px] text-slate-400 font-mono">({filteredPayments.length} Invoices Filtered)</span>
          </div>

          {/* Time Period Quick Chips */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto">
            {[
              { key: "All", label: "All Time" },
              { key: "Today", label: "Today" },
              { key: "This Week", label: "This Week" },
              { key: "This Month", label: "This Month" },
              { key: "This Year", label: "This Year" },
            ].map((tp) => (
              <button
                key={tp.key}
                onClick={() => setTimeFilter(tp.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  timeFilter === tp.key
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Dropdowns & Search Input */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Revenue Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Revenue Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All Revenue Types</option>
              <option value="Subscriptions">Registered Monthly Subscriptions</option>
              <option value="Walk-Ins">Daily Walk-In Passes</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Payment Method</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="All">All Payment Methods</option>
              <option value="Cash / Desk">Cash at Desk</option>
              <option value="EasyPaisa">EasyPaisa</option>
              <option value="JazzCash">JazzCash</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Search Ledger</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search member, invoice ID..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtered Gross Revenue</span>
          <p className="text-3xl font-black text-slate-900">PKR {Number(totalRevenue).toLocaleString()}</p>
          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Filtered Ledger Balance
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Subscriptions</span>
          <p className="text-3xl font-black text-emerald-700">PKR {Number(monthlySubscriptionRev).toLocaleString()}</p>
          <span className="text-[11px] text-slate-500 font-medium">Registered Member Memberships</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daily Walk-In Passes</span>
          <p className="text-3xl font-black text-amber-600">PKR {Number(walkInPassRev).toLocaleString()}</p>
          <span className="text-[11px] text-slate-500 font-medium">Daily Visitor Income</span>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Transactions</span>
          <p className="text-3xl font-black text-slate-900">{totalTransactions}</p>
          <span className="text-[11px] text-slate-500 font-medium">Recorded Invoices & Receipts</span>
        </div>
      </div>

      {/* DYNAMIC SVG AREA & LINE CHART WITH PERIOD SELECTOR */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>📈</span> Revenue Growth Curve ({graphPeriod.toUpperCase()})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {graphPeriod === "daily"
                ? "Daily revenue breakdown for the past 14 days"
                : graphPeriod === "yearly"
                ? "Annual gross revenue trajectory per calendar year"
                : "12-Month annual gross revenue curve (Jan – Dec)"}
            </p>
          </div>

          {/* Graph Mode Period Tabs (Daily, Monthly, Yearly) */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
            {[
              { key: "daily", label: "📅 Daily (14 Days)" },
              { key: "monthly", label: "📊 Monthly (12 Mos)" },
              { key: "yearly", label: "📈 Yearly (Annual)" },
            ].map((gp) => (
              <button
                key={gp.key}
                onClick={() => setGraphPeriod(gp.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  graphPeriod === gp.key
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {gp.label}
              </button>
            ))}
          </div>
        </div>

        <ProfessionalSvgChart
          data={chartData}
          valueKey="amount"
          colorScheme="emerald"
          formatTooltip={(val) => `PKR ${val.toLocaleString()}`}
        />
      </div>

      {/* Visual Revenue Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Revenue by Payment Method */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Revenue by Payment Method</h3>
              <p className="text-[11px] text-slate-500">Income distribution across Cash, Cards, JazzCash, EasyPaisa</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Method Breakdown
            </span>
          </div>

          <div className="space-y-4">
            {Object.keys(methodBreakdown).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No payment method data available for filters.</p>
            ) : (
              Object.entries(methodBreakdown).map(([mMethod, mVal]) => {
                const percentage = totalRevenue > 0 ? Math.round((mVal / totalRevenue) * 100) : 0;
                return (
                  <div key={mMethod} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                        {mMethod}
                      </span>
                      <span className="font-mono text-emerald-700">
                        PKR {Number(mVal).toLocaleString()} ({percentage}%)
                      </span>
                    </div>

                    <div className="w-full h-3 bg-slate-100 rounded-full border border-slate-200 overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500 shadow-xs"
                        style={{ width: `${Math.max(5, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Graph 2: Revenue by Membership Plan */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Revenue by Membership Plan</h3>
              <p className="text-[11px] text-slate-500">Financial performance per plan subscription tier</p>
            </div>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              Plan Breakdown
            </span>
          </div>

          <div className="space-y-4">
            {Object.keys(planBreakdown).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No plan revenue data available for filters.</p>
            ) : (
              Object.entries(planBreakdown).map(([pName, pVal]) => {
                const percentage = totalRevenue > 0 ? Math.round((pVal / totalRevenue) * 100) : 0;
                return (
                  <div key={pName} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-900">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        {pName}
                      </span>
                      <span className="font-mono text-amber-800">
                        PKR {Number(pVal).toLocaleString()} ({percentage}%)
                      </span>
                    </div>

                    <div className="w-full h-3 bg-slate-100 rounded-full border border-slate-200 overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500 shadow-xs"
                        style={{ width: `${Math.max(5, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Transaction History Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs overflow-hidden space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900">Filtered Transactions Ledger</h3>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {filteredPayments.length} Transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                <th className="py-3 px-3.5 rounded-l-lg">Invoice ID</th>
                <th className="py-3 px-3.5">Member / Guest</th>
                <th className="py-3 px-3.5">Plan / Description</th>
                <th className="py-3 px-3.5">Payment Method</th>
                <th className="py-3 px-3.5">Date</th>
                <th className="py-3 px-3.5 text-right rounded-r-lg">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Loading revenue records...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-3.5 font-mono text-emerald-700 font-bold">{p.invoice_id}</td>
                    <td className="py-3.5 px-3.5 font-bold text-slate-900">
                      {p.member_name}
                      <span className="block text-[10px] text-slate-400 font-mono font-normal">{p.member_id}</span>
                    </td>
                    <td className="py-3.5 px-3.5 text-slate-700 font-medium">{p.plan}</td>
                    <td className="py-3.5 px-3.5 text-slate-700 font-bold">{p.method}</td>
                    <td className="py-3.5 px-3.5 text-slate-500 font-mono">{p.date}</td>
                    <td className="py-3.5 px-3.5 text-right font-black font-mono text-emerald-700">{p.amount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
