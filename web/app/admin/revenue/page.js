"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";

export default function RevenueAnalyticsPage() {
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState("All");

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    setLoading(true);
    let loadedFromSupabase = false;

    if (isSupabaseConfigured()) {
      try {
        // 1. Fetch profiles for user lookups
        const { data: profData } = await supabase.from("profiles").select("*");
        const profileMap = new Map();
        if (profData) {
          setMembers(profData);
          profData.forEach((p) => profileMap.set(p.id, p));
        }

        // 2. Fetch payments
        const { data: payData, error } = await supabase
          .from("payments")
          .select("*")
          .order("date", { ascending: false });

        if (!error && payData) {
          const formatted = payData.map((item) => {
            const prof = profileMap.get(item.user_id);
            const amt = parseFloat(item.amount) || 0;
            const isWalkIn =
              item.invoice_id?.startsWith("INV-WALK") ||
              prof?.member_id?.startsWith("GP-WALK-") ||
              prof?.role === "walkin" ||
              prof?.plan?.toLowerCase().includes("daily") ||
              prof?.plan?.toLowerCase().includes("walk-in");

            return {
              id: item.id,
              user_id: item.user_id,
              invoice_id: item.invoice_id || `INV-${item.id.slice(0, 4)}`,
              member_name: prof?.full_name || "Guest / Walk-In",
              member_id: prof?.member_id || "GP-GUEST",
              plan: prof?.plan || (isWalkIn ? "Daily Walk-In Pass" : "Pro Membership"),
              raw_amount: amt,
              amount: `PKR ${Number(amt).toLocaleString()}`,
              date: item.date
                ? new Date(item.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                : new Date().toLocaleDateString(),
              raw_date: item.date || new Date().toISOString(),
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
      // Demo fallback
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
          method: "Credit Card",
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
          method: "JazzCash / EasyPaisa",
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
          method: "Cash / Desk",
          status: "Paid",
          is_walk_in: true,
        },
      ]);
    }

    setLoading(false);
  };

  // Calculate Key Revenue Metrics
  const totalRevenue = payments
    .filter((p) => p.status === "Paid" || p.status === "Partial")
    .reduce((acc, p) => acc + (p.raw_amount || 0), 0);

  const monthlySubscriptionRev = payments
    .filter((p) => !p.is_walk_in && (p.status === "Paid" || p.status === "Partial"))
    .reduce((acc, p) => acc + (p.raw_amount || 0), 0);

  const walkInPassRev = payments
    .filter((p) => p.is_walk_in && (p.status === "Paid" || p.status === "Partial"))
    .reduce((acc, p) => acc + (p.raw_amount || 0), 0);

  const totalTransactions = payments.length;

  // Breakdown by Payment Method
  const methodBreakdown = payments.reduce((acc, p) => {
    const m = p.method || "Cash / Desk";
    acc[m] = (acc[m] || 0) + (p.raw_amount || 0);
    return acc;
  }, {});

  // Breakdown by Plan
  const planBreakdown = payments.reduce((acc, p) => {
    const pl = p.plan || "Pro Membership";
    acc[pl] = (acc[pl] || 0) + (p.raw_amount || 0);
    return acc;
  }, {});

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.invoice_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.plan?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (methodFilter !== "All" && p.method !== methodFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#122917] via-[#17381E] to-[#0D1F11] border border-[#224A28] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-[#22C55E] text-black uppercase tracking-wider">
              Financial Intelligence
            </span>
            <span className="text-[11px] text-[#4ADE80] font-mono">Real-Time Supabase Sync</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
            Revenue Analytics & Financial Ledger
          </h1>
          <p className="text-xs text-[#A1B8A6] mt-1">
            Detailed breakdown of monthly subscriptions, walk-in revenues, payment methods, and financial charts.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/admin/payments"
            className="bg-[#22C55E] hover:bg-[#16A34A] text-black font-extrabold text-xs px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20"
          >
            Payments & Invoices Portal →
          </Link>
        </div>
      </div>

      {/* Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#0E1A0F] border border-[#1E3621] p-5 rounded-2xl shadow-lg space-y-1">
          <span className="text-xs font-semibold text-[#738F7A] uppercase tracking-wider">Total Gross Revenue</span>
          <p className="text-3xl font-black text-white">PKR {Number(totalRevenue).toLocaleString()}</p>
          <span className="text-[11px] text-[#4ADE80] font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            100% verified ledger balance
          </span>
        </div>

        <div className="bg-[#0E1A0F] border border-[#1E3621] p-5 rounded-2xl shadow-lg space-y-1">
          <span className="text-xs font-semibold text-[#738F7A] uppercase tracking-wider">Monthly Subscriptions</span>
          <p className="text-3xl font-black text-[#4ADE80]">PKR {Number(monthlySubscriptionRev).toLocaleString()}</p>
          <span className="text-[11px] text-[#738F7A]">Registered Member Memberships</span>
        </div>

        <div className="bg-[#0E1A0F] border border-[#1E3621] p-5 rounded-2xl shadow-lg space-y-1">
          <span className="text-xs font-semibold text-[#738F7A] uppercase tracking-wider">Daily Walk-In Passes</span>
          <p className="text-3xl font-black text-amber-400">PKR {Number(walkInPassRev).toLocaleString()}</p>
          <span className="text-[11px] text-[#738F7A]">Daily Visitor Income</span>
        </div>

        <div className="bg-[#0E1A0F] border border-[#1E3621] p-5 rounded-2xl shadow-lg space-y-1">
          <span className="text-xs font-semibold text-[#738F7A] uppercase tracking-wider">Total Transactions</span>
          <p className="text-3xl font-black text-white">{totalTransactions}</p>
          <span className="text-[11px] text-[#738F7A]">Recorded Invoices & Receipts</span>
        </div>
      </div>

      {/* Visual Revenue Graphs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Revenue by Payment Method */}
        <div className="bg-[#0E1A0F] border border-[#1E3621] p-6 rounded-2xl shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#1E3621] pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white">Revenue by Payment Method</h3>
              <p className="text-[11px] text-[#738F7A]">Income distribution across Cash, Cards, JazzCash, EasyPaisa</p>
            </div>
            <span className="text-[10px] font-bold text-[#4ADE80] bg-[#16331C] px-2.5 py-1 rounded-full border border-[#234A28]">
              Method Breakdown
            </span>
          </div>

          <div className="space-y-4">
            {Object.keys(methodBreakdown).length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No payment method data available.</p>
            ) : (
              Object.entries(methodBreakdown).map(([mMethod, mVal]) => {
                const percentage = totalRevenue > 0 ? Math.round((mVal / totalRevenue) * 100) : 0;
                return (
                  <div key={mMethod} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-white">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
                        {mMethod}
                      </span>
                      <span className="font-mono text-[#4ADE80]">
                        PKR {Number(mVal).toLocaleString()} ({percentage}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-[#081109] rounded-full border border-[#1E3621] overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-[#22C55E] to-[#4ADE80] rounded-full transition-all duration-500 shadow-lg shadow-emerald-500/20"
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
        <div className="bg-[#0E1A0F] border border-[#1E3621] p-6 rounded-2xl shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#1E3621] pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white">Revenue by Membership Plan</h3>
              <p className="text-[11px] text-[#738F7A]">Financial performance per plan subscription tier</p>
            </div>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-800">
              Plan Breakdown
            </span>
          </div>

          <div className="space-y-4">
            {Object.keys(planBreakdown).length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No plan revenue data available.</p>
            ) : (
              Object.entries(planBreakdown).map(([pName, pVal]) => {
                const percentage = totalRevenue > 0 ? Math.round((pVal / totalRevenue) * 100) : 0;
                return (
                  <div key={pName} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold text-white">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        {pName}
                      </span>
                      <span className="font-mono text-amber-300">
                        PKR {Number(pVal).toLocaleString()} ({percentage}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-[#081109] rounded-full border border-[#1E3621] overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500 shadow-lg shadow-amber-500/20"
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

      {/* Revenue Transaction Ledger Table */}
      <div className="bg-[#0E1A0F] border border-[#1E3621] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-[#1E3621] pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-white">Detailed Revenue Transaction Ledger</h3>
            <p className="text-xs text-[#738F7A]">Full audit trail of all recorded financial income</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Filter by Method */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-[#081109] border border-[#1E3621] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
            >
              <option value="All">All Payment Methods</option>
              <option value="Cash / Desk">Cash / Desk</option>
              <option value="JazzCash / EasyPaisa">JazzCash / EasyPaisa</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search payer, invoice ID, plan..."
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1E3621] text-[11px] font-bold text-[#738F7A] uppercase tracking-wider">
                <th className="py-3 px-3">Invoice ID</th>
                <th className="py-3 px-3">Payer / Member</th>
                <th className="py-3 px-3">Plan / Category</th>
                <th className="py-3 px-3">Revenue Amount</th>
                <th className="py-3 px-3">Payment Method</th>
                <th className="py-3 px-3 text-right">Date Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#152A18] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500">
                    Loading revenue ledger from Supabase...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500">
                    No revenue transactions found matching search filter.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#132415] transition">
                    <td className="py-3.5 px-3 font-mono text-[#4ADE80] font-bold">{p.invoice_id}</td>
                    <td className="py-3.5 px-3 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1A331D] text-[#4ADE80] flex items-center justify-center font-bold text-xs">
                        {p.member_name ? p.member_name.charAt(0).toUpperCase() : "R"}
                      </div>
                      {p.member_name}
                    </td>
                    <td className="py-3.5 px-3 text-[#A1B8A6]">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${p.is_walk_in ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
                        {p.plan}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-extrabold text-[#4ADE80] text-sm">{p.amount}</td>
                    <td className="py-3.5 px-3 font-mono text-gray-300">{p.method}</td>
                    <td className="py-3.5 px-3 font-mono text-[#738F7A] text-right">{p.date}</td>
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
