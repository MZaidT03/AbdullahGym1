"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    todayCheckIns: 0,
    monthlyRevenue: "$0.00",
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

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

        // 4. Fetch Payments & Monthly Revenue
        const { data: paymentsData } = await supabase
          .from("payments")
          .select("amount");

        let totalRev = 0;
        if (paymentsData && paymentsData.length > 0) {
          totalRev = paymentsData.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
        }

        setStats({
          totalMembers: memberCount || 0,
          activeMembers: activeCount || 0,
          todayCheckIns: checkInCount || 0,
          monthlyRevenue: `$${totalRev.toFixed(2)}`,
        });

        // 5. Fetch Recent Members / Activity
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

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-[#122917] via-[#17381E] to-[#0D1F11] border border-[#224A28] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Welcome Back, Abdullah Manager 👋
          </h2>
          <p className="text-xs sm:text-sm text-[#A1B8A6] mt-1">
            Real-time live operations overview connected to Supabase database.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <Link
            href="/admin/members"
            className="bg-[#22C55E] hover:bg-[#16A34A] text-black font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-500/20"
          >
            + Register New Member
          </Link>
          <Link
            href="/admin/attendance"
            className="bg-[#1D3B22] hover:bg-[#254A2C] border border-[#2D5B32] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
          >
            Check-In Log
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Members */}
        <div className="bg-[#0E1B10] border border-[#1C3620] p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#829E88] uppercase tracking-wider">
              Total Members
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#17361D] text-[#4ADE80] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-white">{loading ? "..." : stats.totalMembers}</p>
            <span className="text-[11px] font-medium text-[#22C55E] mt-1 inline-block">
              Live Supabase profiles count
            </span>
          </div>
        </div>

        {/* Card 2: Active Members */}
        <div className="bg-[#0E1B10] border border-[#1C3620] p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#829E88] uppercase tracking-wider">
              Active Subscriptions
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#17361D] text-[#4ADE80] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-white">{loading ? "..." : stats.activeMembers}</p>
            <span className="text-[11px] font-medium text-[#4ADE80] mt-1 inline-block">
              Active members in gym
            </span>
          </div>
        </div>

        {/* Card 3: Today's Check-ins */}
        <div className="bg-[#0E1B10] border border-[#1C3620] p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#829E88] uppercase tracking-wider">
              Today's Check-Ins
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#17361D] text-[#4ADE80] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-white">{loading ? "..." : stats.todayCheckIns}</p>
            <span className="text-[11px] font-medium text-[#829E88] mt-1 inline-block">
              Live attendance entries
            </span>
          </div>
        </div>

        {/* Card 4: Monthly Revenue */}
        <div className="bg-[#0E1B10] border border-[#1C3620] p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#829E88] uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#17361D] text-[#4ADE80] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-white">{loading ? "..." : stats.monthlyRevenue}</p>
            <span className="text-[11px] font-medium text-[#22C55E] mt-1 inline-block">
              Recorded payments sum
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Activity & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Container: Recent Members / Activity */}
        <div className="lg:col-span-2 bg-[#0E1B10] border border-[#1C3620] rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Recent Registered Members</h3>
              <p className="text-xs text-[#829E88]">Live members directory from Supabase</p>
            </div>
            <Link
              href="/admin/members"
              className="text-xs text-[#22C55E] hover:underline font-semibold"
            >
              View All Members →
            </Link>
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs text-[#829E88]">Loading database activity...</div>
          ) : recentActivity.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#829E88]">
              No members registered yet. Click <span className="text-[#22C55E] font-bold">"+ Register New Member"</span> above to add your first member!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1C3620] text-[11px] font-bold text-[#829E88] uppercase tracking-wider">
                    <th className="py-3 px-3">Member Name</th>
                    <th className="py-3 px-3">Plan</th>
                    <th className="py-3 px-3">Joined Date</th>
                    <th className="py-3 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#172D1B] text-xs">
                  {recentActivity.map((row) => (
                    <tr key={row.id} className="hover:bg-[#122415] transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-white flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#1D3D23] text-[#4ADE80] font-bold text-xs flex items-center justify-center">
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

        {/* Side Panel: Quick Actions & Management */}
        <div className="space-y-6">
          <div className="bg-[#0E1B10] border border-[#1C3620] rounded-2xl p-6 shadow-lg">
            <h3 className="text-base font-bold text-white mb-1">Quick Admin Actions</h3>
            <p className="text-xs text-[#829E88] mb-5">Frequent management workflows</p>

            <div className="space-y-3">
              <Link
                href="/admin/members"
                className="w-full flex items-center justify-between p-3.5 bg-[#142918] hover:bg-[#1B3821] border border-[#234A28] rounded-xl text-xs font-bold text-white transition group"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-[#22C55E]/10 text-[#4ADE80]">
                    👥
                  </span>
                  <span>Manage Gym Members</span>
                </div>
                <span className="text-[#829E88] group-hover:text-white transition">→</span>
              </Link>

              <Link
                href="/admin/attendance"
                className="w-full flex items-center justify-between p-3.5 bg-[#142918] hover:bg-[#1B3821] border border-[#234A28] rounded-xl text-xs font-bold text-white transition group"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-[#22C55E]/10 text-[#4ADE80]">
                    ⏱️
                  </span>
                  <span>Attendance Monitor</span>
                </div>
                <span className="text-[#829E88] group-hover:text-white transition">→</span>
              </Link>

              <Link
                href="/admin/payments"
                className="w-full flex items-center justify-between p-3.5 bg-[#142918] hover:bg-[#1B3821] border border-[#234A28] rounded-xl text-xs font-bold text-white transition group"
              >
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-lg bg-[#22C55E]/10 text-[#4ADE80]">
                    💳
                  </span>
                  <span>Record Payments</span>
                </div>
                <span className="text-[#829E88] group-hover:text-white transition">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
