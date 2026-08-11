"use client";

import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successCard, setSuccessCard] = useState(null);

  // Form states for new member
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPlan, setNewPlan] = useState("Pro Membership ($50/mo)");
  const [newFeePaid, setNewFeePaid] = useState("50.00");
  const [newPassword, setNewPassword] = useState("12345678");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching profiles from Supabase:", error.message);
          setStatusMsg(`Supabase Notice: ${error.message}`);
        } else if (data) {
          setMembers(data);
        }
      } catch (err) {
        console.error("Supabase fetch exception:", err);
      }
    } else {
      setStatusMsg("Supabase is not configured yet in .env.local");
    }
    setLoading(false);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setFormError("");
    setStatusMsg("");

    if (!newFullName || !newEmail || !newPassword) {
      setFormError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    const cleanEmail = newEmail.trim().toLowerCase();

    try {
      // Call backend API route to register user in auth.users and profiles
      const res = await fetch("/api/admin/create-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: newPassword,
          full_name: newFullName,
          plan: newPlan,
          fee_paid: newFeePaid,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setFormError(result.error || "Failed to create member account.");
        setSubmitting(false);
        return;
      }

      // Reload live data from Supabase profiles
      await fetchMembers();

      // Show Success Credentials Banner
      setSuccessCard({
        name: newFullName,
        email: cleanEmail,
        password: newPassword,
        memberId: result.user?.member_id || "GP-8472-991",
        feePaid: newFeePaid,
      });

      // Reset form
      setNewFullName("");
      setNewEmail("");
      setNewPhone("");
      setNewFeePaid("50.00");
      setNewPassword("12345678");
      setIsModalOpen(false);
    } catch (err) {
      console.error("Member creation process exception:", err);
      setFormError(err.message || "Failed to create member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "Active" ? "Expired" : "Active";
    
    // Optimistic UI update
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: nextStatus } : m))
    );

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("profiles")
          .update({ status: nextStatus })
          .eq("id", id);
        
        await fetchMembers();
      } catch (err) {
        console.error("Supabase update error:", err);
      }
    }
  };

  // Filter logic
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
      {/* Top Header & Register Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Member Management
          </h2>
          <p className="text-xs text-[#829E88]">
            Real-time Supabase member directory, fee collections & mobile app accounts
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#22C55E] hover:bg-[#16A34A] text-black font-bold text-xs px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20"
        >
          + Register New Member & Fee
        </button>
      </div>

      {/* Status Notice */}
      {statusMsg && (
        <div className="p-3 bg-[#182C1C] border border-[#234F2A] rounded-xl text-xs text-[#4ADE80] font-mono">
          {statusMsg}
        </div>
      )}

      {/* Success Credentials Banner */}
      {successCard && (
        <div className="bg-[#122E1A] border border-[#22C55E] rounded-2xl p-5 shadow-xl text-white relative">
          <button
            onClick={() => setSuccessCard(null)}
            className="absolute top-4 right-4 text-xs text-[#829E88] hover:text-white font-bold"
          >
            ✕ Close
          </button>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">🎉</span>
            <h3 className="text-base font-bold text-[#4ADE80]">
              Member & Mobile Account Created in Supabase Successfully!
            </h3>
          </div>
          <p className="text-xs text-[#A1B8A6] mb-3">
            Give these credentials to <span className="text-white font-bold">{successCard.name}</span> to log in on their mobile phone app:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#0A1A0E] p-3.5 rounded-xl border border-[#1E4226] text-xs font-mono">
            <div>
              <span className="text-[#6D8A74] block uppercase text-[10px]">Member ID:</span>
              <span className="text-[#4ADE80] font-bold">{successCard.memberId}</span>
            </div>
            <div>
              <span className="text-[#6D8A74] block uppercase text-[10px]">Mobile Login Email:</span>
              <span className="text-white font-bold">{successCard.email}</span>
            </div>
            <div>
              <span className="text-[#6D8A74] block uppercase text-[10px]">Default Password:</span>
              <span className="text-[#4ADE80] font-bold">{successCard.password}</span>
            </div>
            <div>
              <span className="text-[#6D8A74] block uppercase text-[10px]">Fee Recorded:</span>
              <span className="text-white font-bold">${successCard.feePaid}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-[#0E1B10] border border-[#1C3620] p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search member by name, email, or Member ID..."
            className="w-full bg-[#09120B] border border-[#1E3A22] rounded-xl px-4 py-2.5 pl-10 text-xs text-white placeholder-[#58735E] focus:outline-none focus:border-[#22C55E]"
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

      {/* Real Data Table */}
      <div className="bg-[#0E1B10] border border-[#1C3620] rounded-2xl p-4 sm:p-6 shadow-lg overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#829E88]">
            Loading real data from Supabase profiles table...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#829E88]">
            No members found in Supabase database. Click <span className="text-[#22C55E] font-bold">"+ Register New Member"</span> above to add your first member!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1C3620] text-[11px] font-bold text-[#829E88] uppercase tracking-wider">
                  <th className="py-3 px-3">Member</th>
                  <th className="py-3 px-3">Member ID</th>
                  <th className="py-3 px-3">Plan</th>
                  <th className="py-3 px-3">Days Remaining</th>
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
                      {member.member_id || "GP-8472-991"}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-white">{member.plan || "Pro Membership"}</td>
                    <td className="py-3.5 px-3 font-semibold text-[#A1B8A6]">
                      {member.days_remaining ?? 30} days
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          member.status === "Active"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-red-950 text-red-400 border border-red-800"
                        }`}
                      >
                        {member.status || "Active"}
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
        )}
      </div>

      {/* Add New Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#122216] border border-[#22502E] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-extrabold text-white">Register Member & Mobile Account</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-[#829E88] hover:text-white font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[#829E88] mb-6">
              Enter member details. This will save their profile in Supabase and create their phone app login credentials.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Hamza Malik"
                  className="w-full bg-[#0A140D] border border-[#24472A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                    Member Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. hamza@gmail.com"
                    className="w-full bg-[#0A140D] border border-[#24472A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full bg-[#0A140D] border border-[#24472A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                    Membership Plan
                  </label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    className="w-full bg-[#0A140D] border border-[#24472A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                  >
                    <option value="Pro Membership ($50/mo)">Pro Membership ($50/mo)</option>
                    <option value="Pro Elite Plan ($90/mo)">Pro Elite Plan ($90/mo)</option>
                    <option value="Standard Plan ($30/mo)">Standard Plan ($30/mo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                    Fee Collected ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newFeePaid}
                    onChange={(e) => setNewFeePaid(e.target.value)}
                    className="w-full bg-[#0A140D] border border-[#24472A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4ADE80] uppercase mb-1">
                  Mobile App Password *
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="12345678"
                  className="w-full bg-[#0A140D] border border-[#22C55E] rounded-xl px-4 py-2.5 text-xs text-[#4ADE80] font-mono font-bold focus:outline-none"
                />
                <span className="text-[11px] text-[#829E88] mt-1 block">
                  Member uses this password (`12345678`) to log in on their mobile phone app.
                </span>
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
                  className="bg-[#22C55E] hover:bg-[#16A34A] text-black font-bold text-xs px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20"
                >
                  {submitting ? "SAVING TO SUPABASE..." : "CREATE MEMBER & MOBILE ACCESS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
