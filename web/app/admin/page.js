"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

// ============================================================================
// 1. REUSABLE PROFESSIONAL SVG AREA & LINE CHART
// ============================================================================
function ProfessionalSvgChart({
  data,
  valueKey = "count",
  colorScheme = "emerald",
  formatTooltip,
}) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) return null;

  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingTop = 32;
  const paddingBottom = 32;

  const values = data.map((d) => Number(d[valueKey]) || 0);
  const rawMaxVal = Math.max(...values, 10);
  const maxVal = rawMaxVal * 1.18; // 18% headroom

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(1, data.length - 1)) * (width - paddingX * 2);
    const val = Number(d[valueKey]) || 0;
    const y = height - paddingBottom - (val / maxVal) * (height - paddingTop - paddingBottom);
    return { x, y, label: d.label, value: val };
  });

  // Calculate Smooth Cubic Bezier Curve Path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    pathD += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  const isEmerald = colorScheme === "emerald";
  const strokeColor = isEmerald ? "#059669" : "#d97706";
  const gradientStart = isEmerald ? "#10b981" : "#f59e0b";
  const gradientId = `chartGrad_${colorScheme}`;

  const selectedPt = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="relative w-full bg-slate-50/50 rounded-xl border border-slate-200/60 p-4 transition-all duration-300">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientStart} stopOpacity="0.25" />
            <stop offset="100%" stopColor={gradientStart} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Reference Grid Lines & Y-Axis Labels */}
        {[0, 0.33, 0.66, 1].map((ratio, idx) => {
          const y = height - paddingBottom - ratio * (height - paddingTop - paddingBottom);
          const gridVal = Math.round(ratio * rawMaxVal);
          return (
            <g key={idx}>
              <line
                x1={paddingX - 8}
                y1={y}
                x2={width - paddingX + 8}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={paddingX - 12}
                y={y + 3}
                fill="#94a3b8"
                fontSize="9"
                fontWeight="600"
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

        {/* Area Fill */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Main Smooth Line */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive Data Points */}
        {points.map((pt, i) => {
          const isHovered = hoveredIdx === i;
          return (
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {isHovered && (
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="11"
                  fill={strokeColor}
                  fillOpacity="0.18"
                  className="transition-all duration-200"
                />
              )}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? "5" : "3.5"}
                fill="#ffffff"
                stroke={strokeColor}
                strokeWidth={isHovered ? "3" : "2"}
                className="transition-all duration-200"
              />
              <text
                x={pt.x}
                y={height - 10}
                fill={isHovered ? strokeColor : "#64748b"}
                fontSize="10"
                fontWeight={isHovered ? "700" : "500"}
                textAnchor="middle"
              >
                {pt.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Dynamic Hover Tooltip */}
      {selectedPt && (
        <div
          className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-3 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl border border-slate-700/80 flex flex-col items-center gap-0.5 transition-all duration-150"
          style={{
            left: `${(selectedPt.x / width) * 100}%`,
            top: `${(selectedPt.y / height) * 100}%`,
          }}
        >
          <span className="text-[10px] text-slate-400 font-medium">{selectedPt.label}</span>
          <span className={`font-semibold ${isEmerald ? "text-emerald-400" : "text-amber-400"}`}>
            {formatTooltip ? formatTooltip(selectedPt.value) : selectedPt.value.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. HELPER UI COMPONENTS
// ============================================================================
function MetricCard({
  title,
  value,
  subtext,
  icon,
  badge,
  badgeType = "emerald",
}) {
  const badgeStyles = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    amber: "bg-amber-50 text-amber-700 border-amber-200/80",
    sky: "bg-sky-50 text-sky-700 border-sky-200/80",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <div className="group bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
          {title}
        </span>
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 text-lg group-hover:scale-105 transition-transform duration-200">
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-slate-500 font-medium truncate">{subtext}</p>
          {badge && (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeStyles[badgeType]}`}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TimeframeFilter({
  selected,
  onChange,
  color = "emerald",
}) {
  const activeBg = color === "emerald" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white";

  return (
    <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60 shrink-0">
      {["daily", "monthly", "yearly"].map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-bold capitalize transition-all duration-150 ${selected === tf ? `${activeBg} shadow-xs` : "text-slate-600 hover:text-slate-900"
            }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// 3. MAIN ADMIN DASHBOARD PAGE
// ============================================================================
export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    todayCheckIns: 0,
    monthlyRevenue: "PKR 0",
    totalRevenue: "PKR 0",
    totalAttendance: 0,
  });

  const [recentPayments, setRecentPayments] = useState([]);
  const [membershipStats, setMembershipStats] = useState({
    planCounts: {},
    activeRatio: 0,
    gentsCount: 0,
    ladiesCount: 0,
    otherCount: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timeframe Toggle States
  const [attendanceTimeframe, setAttendanceTimeframe] = useState("daily");
  const [paymentTimeframe, setPaymentTimeframe] = useState("daily");

  // Database Caches
  const [allAttendance, setAllAttendance] = useState([]);
  const [allPayments, setAllPayments] = useState([]);

  // Default Daily Graphs Fallbacks
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
        // 1. Fetch Profiles
        const { data: profilesData } = await supabase.from("profiles").select("*");

        let totalM = 0;
        let activeM = 0;
        let inactiveM = 0;
        let plansMap = {};
        let gents = 0;
        let ladies = 0;
        let otherG = 0;

        if (profilesData && profilesData.length > 0) {
          totalM = profilesData.length;
          profilesData.forEach((p) => {
            if (p.status === "Active") activeM += 1;
            else inactiveM += 1;

            const planName = p.plan || "Standard Membership";
            plansMap[planName] = (plansMap[planName] || 0) + 1;

            if (p.gender === "Female") ladies += 1;
            else if (p.gender === "Other") otherG += 1;
            else gents += 1;
          });
        } else {
          totalM = 48;
          activeM = 42;
          inactiveM = 6;
          plansMap = { "Pro Membership": 28, "Standard Membership": 14, "VIP Package": 6 };
          gents = 32;
          ladies = 16;
        }

        const activeRatioVal = totalM > 0 ? Math.round((activeM / totalM) * 100) : 0;
        setMembershipStats({
          planCounts: plansMap,
          activeRatio: activeRatioVal,
          gentsCount: gents,
          ladiesCount: ladies,
          otherCount: otherG,
        });

        // 2. Fetch Attendance
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count: checkInCount } = await supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .gte("check_in_time", todayStart.toISOString());

        const { data: attData } = await supabase.from("attendance").select("check_in_time");

        if (attData && attData.length > 0) {
          setAllAttendance(attData);

          const daysMap = {};
          const daysOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            daysMap[daysOrder[d.getDay()]] = 0;
          }

          attData.forEach((row) => {
            if (row.check_in_time) {
              const dayName = daysOrder[new Date(row.check_in_time).getDay()];
              if (daysMap[dayName] !== undefined) daysMap[dayName] += 1;
            }
          });

          setAttendanceGraphData(
            Object.entries(daysMap).map(([day, count]) => ({ day, count }))
          );
        }

        // 3. Fetch Payments
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("*")
          .order("created_at", { ascending: false });

        let cumTotalRev = 0;
        let currentMonthRev = 0;
        const now = new Date();

        if (paymentsData && paymentsData.length > 0) {
          setAllPayments(paymentsData);

          setRecentPayments(
            paymentsData.slice(0, 5).map((p) => ({
              id: p.id || Math.random().toString(),
              member_name: p.member_name || p.profiles?.full_name || "Gym Member",
              amount: p.amount || 0,
              date: p.date || p.created_at ? new Date(p.date || p.created_at).toLocaleDateString() : "Today",
              method: p.method || "Cash / Desk",
              status: p.status || "Completed",
              plan: p.plan || "Membership Fee",
            }))
          );

          const paidPaymentsOnly = paymentsData.filter(
            (p) => p.status === "Paid" || p.status === "Partial" || p.status === "Completed"
          );

          paidPaymentsOnly.forEach((p) => {
            const amt = parseFloat(p.amount) || 0;
            cumTotalRev += amt;

            if (p.date || p.created_at) {
              const pDate = new Date(p.date || p.created_at);
              if (
                pDate.getMonth() === now.getMonth() &&
                pDate.getFullYear() === now.getFullYear()
              ) {
                currentMonthRev += amt;
              }
            }
          });

          const payDaysMap = {};
          const daysOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            payDaysMap[daysOrder[d.getDay()]] = 0;
          }

          paidPaymentsOnly.forEach((p) => {
            if (p.date || p.created_at) {
              const dayName = daysOrder[new Date(p.date || p.created_at).getDay()];
              if (payDaysMap[dayName] !== undefined) {
                payDaysMap[dayName] += parseFloat(p.amount) || 0;
              }
            }
          });

          setPaymentGraphData(
            Object.entries(payDaysMap).map(([day, amount]) => ({ day, amount }))
          );
        } else {
          cumTotalRev = 485000;
          currentMonthRev = 145000;
          setRecentPayments([
            { id: "1", member_name: "Muhammad Hamza", amount: 5000, date: "Aug 12", method: "Cash", status: "Completed", plan: "Pro Membership" },
            { id: "2", member_name: "Usman Ali", amount: 4500, date: "Aug 11", method: "Bank Transfer", status: "Completed", plan: "Standard Plan" },
            { id: "3", member_name: "Ayesha Malik", amount: 6000, date: "Aug 10", method: "JazzCash", status: "Completed", plan: "Ladies Plan" },
            { id: "4", member_name: "Zainab Bibi", amount: 5000, date: "Aug 09", method: "Easypaisa", status: "Completed", plan: "Pro Membership" },
            { id: "5", member_name: "Bilal Chaudhry", amount: 15000, date: "Aug 08", method: "Cash", status: "Completed", plan: "Quarterly VIP" },
          ]);
        }

        setStats({
          totalMembers: totalM,
          activeMembers: activeM,
          inactiveMembers: inactiveM,
          todayCheckIns: checkInCount || (attData ? attData.length : 18),
          monthlyRevenue: `PKR ${Number(currentMonthRev).toLocaleString()}`,
          totalRevenue: `PKR ${Number(cumTotalRev).toLocaleString()}`,
          totalAttendance: attData ? attData.length : 1240,
        });

        // 4. Fetch Activity
        const { data: recentProfiles } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        if (recentProfiles && recentProfiles.length > 0) {
          setRecentActivity(
            recentProfiles.map((p) => ({
              id: p.id,
              name: p.full_name || "Member",
              time: p.created_at ? new Date(p.created_at).toLocaleDateString() : "Today",
              status: p.status || "Active",
              plan: p.plan || "Pro Membership",
            }))
          );
        }
      } catch (err) {
        console.warn("Supabase fetch notice:", err);
      }
    }
    setLoading(false);
  };

  // Dynamic Data Aggregators
  const currentAttGraphData = useMemo(() => {
    if (attendanceTimeframe === "monthly") {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthCounts = Array(12).fill(0);
      allAttendance.forEach((row) => {
        if (row.check_in_time) {
          const m = new Date(row.check_in_time).getMonth();
          if (!isNaN(m)) monthCounts[m] += 1;
        }
      });
      return monthNames.map((name, idx) => ({ label: name, count: monthCounts[idx] }));
    } else if (attendanceTimeframe === "yearly") {
      const yearsMap = { 2023: 0, 2024: 0, 2025: 0, 2026: 0 };
      allAttendance.forEach((row) => {
        if (row.check_in_time) {
          const y = new Date(row.check_in_time).getFullYear();
          if (yearsMap[y] !== undefined) yearsMap[y] += 1;
        }
      });
      return Object.entries(yearsMap).map(([yr, count]) => ({ label: yr, count }));
    }
    return attendanceGraphData.map((d) => ({ label: d.day, count: d.count }));
  }, [attendanceTimeframe, allAttendance, attendanceGraphData]);

  const currentPayGraphData = useMemo(() => {
    const validPayments = allPayments.filter(
      (p) => p.status === "Paid" || p.status === "Partial" || p.status === "Completed"
    );

    if (paymentTimeframe === "monthly") {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthAmts = Array(12).fill(0);
      validPayments.forEach((p) => {
        const rawD = p.date || p.created_at;
        if (rawD) {
          const d = new Date(rawD);
          if (!isNaN(d.getTime())) monthAmts[d.getMonth()] += parseFloat(p.amount) || 0;
        }
      });
      return monthNames.map((name, idx) => ({ label: name, amount: monthAmts[idx] }));
    } else if (paymentTimeframe === "yearly") {
      const yearsMap = { 2023: 0, 2024: 0, 2025: 0, 2026: 0 };
      validPayments.forEach((p) => {
        const rawD = p.date || p.created_at;
        if (rawD) {
          const d = new Date(rawD);
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            if (yearsMap[y] !== undefined) yearsMap[y] += parseFloat(p.amount) || 0;
          }
        }
      });
      return Object.entries(yearsMap).map(([yr, amount]) => ({ label: yr, amount }));
    }
    return paymentGraphData.map((d) => ({ label: d.day, amount: d.amount }));
  }, [paymentTimeframe, allPayments, paymentGraphData]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans p-2 sm:p-4 text-slate-800">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-3xl p-6 sm:p-8 shadow-md border border-slate-800 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 backdrop-blur-md">
              Abdullah Gym Portal
            </span>
            <span className="text-slate-400 text-xs">• Live Manager Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, Manager 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Here is your daily gym overview for active members, collections, and check-in desk logs.
          </p>
        </div>

        {/* Quick Action Navigation */}
        <div className="flex flex-wrap gap-2.5 z-10 shrink-0">
          <Link
            href="/admin/members"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 shadow-sm flex items-center gap-1.5 hover:scale-[1.02]"
          >
            <span>＋</span> Add Member
          </Link>
          <Link
            href="/admin/attendance"
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-1.5"
          >
            <span>⚡</span> Check-In
          </Link>
          <Link
            href="/admin/payments"
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 flex items-center gap-1.5"
          >
            <span>💳</span> Payments
          </Link>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          title="Total Members"
          value={loading ? "..." : stats.totalMembers}
          subtext="Registered profiles"
          icon="👥"
          badge={`${stats.inactiveMembers} Expired`}
          badgeType="slate"
        />
        <MetricCard
          title="Active Members"
          value={loading ? "..." : stats.activeMembers}
          subtext="Valid active passes"
          icon="✓"
          badge={`${membershipStats.activeRatio}% Active`}
          badgeType="emerald"
        />
        <MetricCard
          title="Monthly Revenue"
          value={loading ? "..." : stats.monthlyRevenue}
          subtext="Current month total"
          icon="💰"
          badge="PKR"
          badgeType="amber"
        />
        <MetricCard
          title="Today Check-Ins"
          value={loading ? "..." : stats.todayCheckIns}
          subtext="Recorded visits"
          icon="⚡"
          badge="Live Log"
          badgeType="sky"
        />
      </div>

      {/* ANALYTICS CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Chart */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Attendance Activity</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {attendanceTimeframe === "daily"
                  ? "Daily member traffic for past 7 days"
                  : attendanceTimeframe === "monthly"
                    ? "Monthly check-ins volume"
                    : "Yearly attendance totals"}
              </p>
            </div>
            <TimeframeFilter
              selected={attendanceTimeframe}
              onChange={setAttendanceTimeframe}
              color="emerald"
            />
          </div>

          <ProfessionalSvgChart
            data={currentAttGraphData}
            valueKey="count"
            colorScheme="emerald"
            formatTooltip={(val) => `${val.toLocaleString()} Visits`}
          />

          <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Peak hours: <strong className="text-slate-800 font-semibold">5:00 PM – 9:00 PM</strong>
            </span>
            <Link href="/admin/attendance" className="text-emerald-700 font-bold hover:underline">
              Logs →
            </Link>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Revenue & Collections</h3>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full">
                  PKR
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {paymentTimeframe === "daily"
                  ? "Daily cash collection breakdown"
                  : paymentTimeframe === "monthly"
                    ? "Monthly overall revenue trends"
                    : "Yearly revenue comparison"}
              </p>
            </div>
            <TimeframeFilter
              selected={paymentTimeframe}
              onChange={setPaymentTimeframe}
              color="amber"
            />
          </div>

          <ProfessionalSvgChart
            data={currentPayGraphData}
            valueKey="amount"
            colorScheme="amber"
            formatTooltip={(val) => `PKR ${val.toLocaleString()}`}
          />

          <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Primary source: <strong className="text-slate-800 font-semibold">Desk & Cash Transfers</strong>
            </span>
            <Link href="/admin/payments" className="text-amber-700 font-bold hover:underline">
              Financials →
            </Link>
          </div>
        </div>
      </div>

      {/* TABLE & DEMOGRAPHICS BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Payment Receipts</h3>
              <p className="text-xs text-slate-500">Latest recorded fee collections</p>
            </div>
            <Link
              href="/admin/payments"
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
            >
              View Invoices →
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading payment records...</div>
          ) : recentPayments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No payments logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Member</th>
                    <th className="pb-3 font-semibold">Plan</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Method</th>
                    <th className="pb-3 text-right font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-bold text-slate-900">{p.member_name}</td>
                      <td className="py-3 text-slate-600">{p.plan}</td>
                      <td className="py-3 font-mono font-bold text-emerald-700">
                        PKR {Number(p.amount).toLocaleString()}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-400 font-medium">{p.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Membership Demographics & Breakdown */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div>
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Demographics & Packages</h3>
              <p className="text-xs text-slate-500">Active distribution by tier & gender</p>
            </div>

            {/* Plan Distribution Segment */}
            <div className="mt-4 space-y-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Plan Popularity
              </span>
              <div className="space-y-2.5">
                {Object.entries(membershipStats.planCounts).map(([planName, count]) => {
                  const percentage = stats.totalMembers > 0 ? Math.round((count / stats.totalMembers) * 100) : 0;
                  return (
                    <div key={planName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{planName}</span>
                        <span className="font-mono text-slate-500 font-medium">{count} ({percentage}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gender Split Display */}
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Gender Ratio
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                <span className="text-xs text-slate-500 font-medium">Gents</span>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">{membershipStats.gentsCount}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                <span className="text-xs text-slate-500 font-medium">Ladies</span>
                <p className="text-lg font-extrabold text-slate-900 mt-0.5">{membershipStats.ladiesCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}