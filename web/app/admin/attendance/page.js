"use client";

import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";

export default function AttendanceAdminPage() {
  const [logs, setLogs] = useState([
    {
      id: "1",
      full_name: "Abdullah Khan",
      member_id: "GP-8472-991",
      check_in_time: "10:15 AM - Today",
      check_out_time: "--",
      status: "Checked In",
    },
    {
      id: "2",
      full_name: "Zaid Tahir",
      member_id: "GP-5510-402",
      check_in_time: "09:40 AM - Today",
      check_out_time: "--",
      status: "Checked In",
    },
    {
      id: "3",
      full_name: "Sara Ahmed",
      member_id: "GP-1204-883",
      check_in_time: "08:30 AM - Today",
      check_out_time: "09:45 AM - Today",
      status: "Checked Out",
    },
    {
      id: "4",
      full_name: "Hamza Ali",
      member_id: "GP-9031-115",
      check_in_time: "07:15 AM - Today",
      check_out_time: "08:30 AM - Today",
      status: "Checked Out",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("attendance")
          .select("id, check_in_time, check_out_time, status, profiles(full_name, member_id)")
          .order("check_in_time", { ascending: false });

        if (data && data.length > 0) {
          const formatted = data.map((item) => ({
            id: item.id,
            full_name: item.profiles?.full_name || "Member",
            member_id: item.profiles?.member_id || "GP-0000-000",
            check_in_time: new Date(item.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            check_out_time: item.check_out_time ? new Date(item.check_out_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--",
            status: item.status || "Checked In",
          }));
          setLogs(formatted);
        }
      } catch (err) {
        console.warn("Attendance fetch notice:", err);
      }
    }
    setLoading(false);
  };

  const handleManualCheckIn = () => {
    const newLog = {
      id: String(Date.now()),
      full_name: "Walk-in Guest",
      member_id: "GP-9999-000",
      check_in_time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " - Today",
      check_out_time: "--",
      status: "Checked In",
    };
    setLogs([newLog, ...logs]);
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.member_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Live Attendance Monitoring
          </h2>
          <p className="text-xs text-[#829E88]">
            Real-time member entry and exit activity logs from Supabase
          </p>
        </div>

        <button
          onClick={handleManualCheckIn}
          className="bg-[#22C55E] hover:bg-[#16A34A] text-black font-bold text-xs px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20"
        >
          + Manual Walk-in Check-In
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-[#0E1B10] border border-[#1C3620] p-4 rounded-2xl">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter logs by member name or Member ID..."
          className="w-full bg-[#09120B] border border-[#1E3A22] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#58735E] focus:outline-none focus:border-[#22C55E]"
        />
      </div>

      {/* Attendance Table */}
      <div className="bg-[#0E1B10] border border-[#1C3620] rounded-2xl p-4 sm:p-6 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1C3620] text-[11px] font-bold text-[#829E88] uppercase tracking-wider">
                <th className="py-3 px-3">Member Name</th>
                <th className="py-3 px-3">Member ID</th>
                <th className="py-3 px-3">Check-In Time</th>
                <th className="py-3 px-3">Check-Out Time</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172D1B] text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#132616] transition-colors">
                  <td className="py-3.5 px-3 font-bold text-white flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#1B3D21] text-[#4ADE80] flex items-center justify-center font-bold text-xs">
                      {log.full_name.charAt(0)}
                    </div>
                    {log.full_name}
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[#A1B8A6]">{log.member_id}</td>
                  <td className="py-3.5 px-3 text-[#A1B8A6]">{log.check_in_time}</td>
                  <td className="py-3.5 px-3 text-[#A1B8A6]">{log.check_out_time}</td>
                  <td className="py-3.5 px-3 text-right">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        log.status === "Checked In"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-slate-900 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
