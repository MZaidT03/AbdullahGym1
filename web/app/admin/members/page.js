"use client";

import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";

export default function MembersPage() {
  const [members, setMembers] = useState([
    {
      id: "1",
      full_name: "Abdullah Khan",
      email: "member@gmail.com",
      member_id: "GP-8472-991",
      plan: "Pro Membership",
      days_remaining: 30,
      status: "Active",
      created_at: "2024-01-15",
    },
    {
      id: "2",
      full_name: "Zaid Tahir",
      email: "zaid.tahir@example.com",
      member_id: "GP-5510-402",
      plan: "Pro Elite Plan",
      days_remaining: 14,
      status: "Active",
      created_at: "2024-02-01",
    },
    {
      id: "3",
      full_name: "Sara Ahmed",
      email: "sara.ahmed@example.com",
      member_id: "GP-1204-883",
      plan: "Standard Plan",
      days_remaining: 0,
      status: "Expired",
      created_at: "2023-11-10",
    },
    {
      id: "4",
      full_name: "Hamza Ali",
      email: "hamza.ali@example.com",
      member_id: "GP-9031-115",
      plan: "Pro Membership",
      days_remaining: 45,
      status: "Active",
      created_at: "2024-03-12",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for new member
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPlan, setNewPlan] = useState("Pro Membership");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (data && data.length > 0) {
          setMembers(data);
        }
      } catch (err) {
        console.warn("Supabase fetch notice:", err);
      }
    }
    setLoading(false);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newFullName || !newEmail) return;

    setSubmitting(true);
    const generatedId = `GP-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100 + Math.random() * 900)}`;

    const newRecord = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      full_name: newFullName,
      email: newEmail,
      member_id: generatedId,
      plan: newPlan,
      days_remaining: 30,
      status: "Active",
      created_at: new Date().toISOString().split("T")[0],
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("profiles").insert([newRecord]);
      } catch (err) {
        console.error("Supabase member insert notice:", err);
      }
    }

    setMembers([newRecord, ...members]);
    setNewFullName("");
    setNewEmail("");
    setIsModalOpen(false);
    setSubmitting(false);
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "Active" ? "Expired" : "Active";
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: nextStatus } : m))
    );

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("profiles")
          .update({ status: nextStatus })
          .eq("id", id);
      } catch (err) {
        console.error("Supabase update error:", err);
      }
    }
  };

  // Filtering
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.member_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "All" || m.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Add Member Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Member Management
          </h2>
          <p className="text-xs text-[#829E88]">
            Manage member accounts, subscriptions, and status directory
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#22C55E] hover:bg-[#16A34A] text-black font-bold text-xs px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20"
        >
          + Register New Member
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#0E1B10] border border-[#1C3620] p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by member name, email, or Member ID..."
            className="w-full bg-[#09120B] border border-[#1E3A22] rounded-xl px-4 py-2.5 pl-10 text-xs text-white placeholder-[#58735E] focus:outline-none focus:border-[#22C55E] transition"
          />
          <svg
            className="w-4 h-4 text-[#58735E] absolute left-3.5 top-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-[#829E88] whitespace-nowrap">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#09120B] border border-[#1E3A22] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Expired">Expired Only</option>
          </select>
        </div>
      </div>

      {/* Members Data Table */}
      <div className="bg-[#0E1B10] border border-[#1C3620] rounded-2xl p-4 sm:p-6 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1C3620] text-[11px] font-bold text-[#829E88] uppercase tracking-wider">
                <th className="py-3 px-3">Member</th>
                <th className="py-3 px-3">Member ID</th>
                <th className="py-3 px-3">Plan</th>
                <th className="py-3 px-3">Days Left</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172D1B] text-xs">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-[#132616] transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#1B3B20] text-[#4ADE80] font-bold text-xs flex items-center justify-center border border-[#28572F]">
                        {member.full_name?.charAt(0) || "M"}
                      </div>
                      <div>
                        <p className="font-bold text-white leading-tight">{member.full_name}</p>
                        <p className="text-[11px] text-[#78967E]">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-xs text-[#A1B8A6]">
                    {member.member_id}
                  </td>
                  <td className="py-3.5 px-3 font-medium text-white">{member.plan}</td>
                  <td className="py-3.5 px-3 font-semibold text-[#A1B8A6]">
                    {member.days_remaining} days
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        member.status === "Active"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-red-950 text-red-400 border border-red-800"
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => handleToggleStatus(member.id, member.status)}
                      className="text-xs text-[#22C55E] hover:text-[#4ADE80] font-semibold underline underline-offset-2"
                    >
                      Toggle Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#122216] border border-[#22502E] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-white">
            <h3 className="text-xl font-bold mb-1">Register New Member</h3>
            <p className="text-xs text-[#829E88] mb-6">
              Create a new member profile directly in Abdullah Gym 1 directory.
            </p>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Abdullah Khan"
                  className="w-full bg-[#0A140D] border border-[#24472A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. member@gmail.com"
                  className="w-full bg-[#0A140D] border border-[#24472A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                  Subscription Plan
                </label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value)}
                  className="w-full bg-[#0A140D] border border-[#24472A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="Pro Membership">Pro Membership ($50/mo)</option>
                  <option value="Pro Elite Plan">Pro Elite Plan ($90/mo)</option>
                  <option value="Standard Plan">Standard Plan ($30/mo)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1C3D22]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs text-[#829E88] hover:text-white px-4 py-2.5 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#22C55E] hover:bg-[#16A34A] text-black font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-emerald-500/20"
                >
                  {submitting ? "SAVING..." : "REGISTER MEMBER"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
