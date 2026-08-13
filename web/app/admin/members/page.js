"use client";

import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";
import LoadingOverlay from "../components/LoadingOverlay";

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
  const [newPlan, setNewPlan] = useState("Pro Membership (PKR 5,000/mo)");
  const [baseFee, setBaseFee] = useState(5000);
  const [newFeePaid, setNewFeePaid] = useState("5000");
  const [newPassword, setNewPassword] = useState("12345678");

  // Dynamic Supabase Plans & Add-Ons state
  const [availablePlans, setAvailablePlans] = useState([]);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const initialDefaultAddons = [
    { id: "addon-1", name: "Cardio Access Plan", price: 1500, icon: "🏃", description: "Unlimited cardio arena access" },
    { id: "addon-2", name: "Personal Trainer Guidance Plan", price: 3500, icon: "🏋️", description: "1-on-1 trainer guidance" },
    { id: "addon-3", name: "VIP Locker & Shower Access", price: 1000, icon: "🔐", description: "Single-key VIP locker storage" },
    { id: "addon-4", name: "Sauna & Steam Bath Pass", price: 2000, icon: "♨️", description: "Post-workout steam recovery" },
  ];

  useEffect(() => {
    fetchMembers();
    fetchPlansFromSupabase();
    fetchAddonsFromSupabase();
  }, []);

  // Fetch Base Plans from Supabase
  const fetchPlansFromSupabase = async () => {
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from("gym_plans")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: true });

        if (data && data.length > 0) {
          setAvailablePlans(data);
        }
      } catch (e) {
        console.warn("Failed to fetch gym_plans from Supabase", e);
      }
    }
  };

  // Fetch Add-On Services from Supabase
  const fetchAddonsFromSupabase = async () => {
    let loaded = false;
    if (isSupabaseConfigured()) {
      try {
        // 1. Try querying dedicated Supabase table `gym_addons`
        const { data, error } = await supabase
          .from("gym_addons")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
          setAvailableAddons(data);
          loaded = true;
        } else {
          // 2. Fallback to `gym_settings` key `gym_addons`
          const { data: setObj } = await supabase
            .from("gym_settings")
            .select("value")
            .eq("key", "gym_addons")
            .single();

          if (setObj && setObj.value && Array.isArray(setObj.value) && setObj.value.length > 0) {
            setAvailableAddons(setObj.value.filter((a) => a.active !== false));
            loaded = true;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch gym_addons from Supabase", e);
      }
    }

    if (!loaded) {
      try {
        const saved = localStorage.getItem("abdullah_gym_addons");
        if (saved) setAvailableAddons(JSON.parse(saved).filter((a) => a.active !== false));
        else setAvailableAddons(initialDefaultAddons);
      } catch (e) {
        setAvailableAddons(initialDefaultAddons);
      }
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    if (isSupabaseConfigured()) {
      try {
        const { data: profData, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        const { data: payData } = await supabase
          .from("payments")
          .select("user_id, status, amount");

        if (error) {
          console.error("Error fetching profiles from Supabase:", error.message);
          setStatusMsg(`Supabase Notice: ${error.message}`);
        } else if (profData) {
          const registeredOnly = profData.filter(
            (p) => !p.member_id?.startsWith("GP-WALK-") && !p.email?.includes("@abdullahgym.local") && p.role !== "walkin"
          );

          const evaluated = registeredOnly.map((p) => {
            const userPays = payData ? payData.filter((pay) => pay.user_id === p.id && (pay.status === "Paid" || pay.status === "Partial")) : [];
            const createdAt = p.created_at ? new Date(p.created_at) : null;
            const now = new Date();
            const daysDiff = createdAt ? (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24) : 0;

            if (daysDiff > 7 && userPays.length === 0) {
              p.status = "Deactivated";
              supabase.from("profiles").update({ status: "Deactivated" }).eq("id", p.id).then(() => {});
            }
            return p;
          });

          setMembers(evaluated);
        }
      } catch (err) {
        console.error("Supabase fetch exception:", err);
      }
    } else {
      setStatusMsg("Supabase is not configured yet in .env.local");
    }
    setLoading(false);
  };

  // Recalculate Total Fee dynamically based on Base Plan + Selected Supabase Add-ons
  const updateFeeCalculation = (selectedPlanStr, addonIdList) => {
    let b = 5000;
    const foundPlan = availablePlans.find((p) => selectedPlanStr.includes(p.name));
    if (foundPlan) {
      b = foundPlan.monthly_price || foundPlan.monthlyPrice || foundPlan.daily_price || foundPlan.dailyPrice || 5000;
    } else if (selectedPlanStr.includes("3,500")) {
      b = 3500;
    } else if (selectedPlanStr.includes("9,000")) {
      b = 9000;
    }
    setBaseFee(b);

    const addonsSum = addonIdList.reduce((acc, id) => {
      const matched = availableAddons.find((a) => a.id === id);
      return acc + (matched ? Number(matched.price || 0) : 0);
    }, 0);

    const total = b + addonsSum;
    setNewFeePaid(String(total));
  };

  const handleToggleAddonCheck = (addonId) => {
    let updated = [];
    if (selectedAddonIds.includes(addonId)) {
      updated = selectedAddonIds.filter((id) => id !== addonId);
    } else {
      updated = [...selectedAddonIds, addonId];
    }
    setSelectedAddonIds(updated);
    updateFeeCalculation(newPlan, updated);
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

    // Construct final plan string with selected Supabase add-ons
    let finalPlanLabel = newPlan;
    const selectedAddonObjs = availableAddons.filter((a) => selectedAddonIds.includes(a.id));
    if (selectedAddonObjs.length > 0) {
      const addonTitles = selectedAddonObjs.map((a) => `${a.name} (+PKR ${Number(a.price).toLocaleString()})`);
      finalPlanLabel = `${newPlan} [Add-ons: ${addonTitles.join(" + ")}]`;
    }

    try {
      // Call backend API route to register user in auth.users and profiles
      const res = await fetch("/api/admin/create-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: newPassword,
          full_name: newFullName,
          plan: finalPlanLabel,
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
        plan: finalPlanLabel,
      });

      // Reset form
      setNewFullName("");
      setNewEmail("");
      setNewPhone("");
      setSelectedAddonIds([]);
      setNewFeePaid("5000");
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
    <div className="space-y-6 font-sans">
      {/* Top Header & Register Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Member Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Register new members, select base plans + dynamic Supabase Add-On Services, and manage accounts.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError("");
            setSuccessCard(null);
            setIsModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition shadow-xs flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Register New Member
        </button>
      </div>

      {/* Supabase Status Banner */}
      {statusMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-slate-400 hover:text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition">
            ✕
          </button>
        </div>
      )}

      {/* Success Credentials Card */}
      {successCard && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs space-y-3 relative text-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                ✓
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-emerald-900">
                  Member Successfully Registered in Supabase!
                </h3>
                <p className="text-xs text-emerald-700">
                  Give these login details to the member for their mobile app.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSuccessCard(null)}
              className="text-slate-400 hover:text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-emerald-200/80 font-mono text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Member Name</span>
              <p className="font-bold text-slate-900">{successCard.name}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Member ID</span>
              <p className="font-extrabold text-emerald-700">{successCard.memberId}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">App Email</span>
              <p className="font-bold text-slate-900">{successCard.email}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">App Password</span>
              <p className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                {successCard.password}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email or Member ID..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 self-start sm:self-auto overflow-x-auto">
          {["All", "Active", "Expired"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === st
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Member List Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                <th className="py-3 px-3.5 rounded-l-lg">Member</th>
                <th className="py-3 px-3.5">Member ID</th>
                <th className="py-3 px-3.5">Membership Plan & Add-ons</th>
                <th className="py-3 px-3.5">Fee Paid</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Loading registered members from Supabase...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No members found matching filter.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    {/* Member Details */}
                    <td className="py-3.5 px-3.5 font-bold text-slate-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center font-extrabold text-xs shrink-0">
                        {m.full_name ? m.full_name.charAt(0).toUpperCase() : "M"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">{m.full_name}</p>
                        <p className="text-[10px] text-slate-500">{m.email}</p>
                      </div>
                    </td>

                    {/* Member ID */}
                    <td className="py-3.5 px-3.5 font-mono text-emerald-700 font-bold">{m.member_id || "GP-MEMBER"}</td>

                    {/* Plan */}
                    <td className="py-3.5 px-3.5 text-slate-700 font-medium max-w-xs truncate">
                      {m.plan || "Pro Membership"}
                    </td>

                    {/* Fee Paid */}
                    <td className="py-3.5 px-3.5 font-mono font-bold text-slate-900">
                      PKR {Number(m.fee_paid || 5000).toLocaleString()}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3.5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          m.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        ● {m.status || "Active"}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-3.5 text-right">
                      <button
                        onClick={() => handleToggleStatus(m.id, m.status || "Active")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition border ${
                          m.status === "Active"
                            ? "bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                        }`}
                      >
                        {m.status === "Active" ? "Set Expired" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: REGISTER NEW MEMBER WITH DYNAMIC SUPABASE ADD-ONS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Register New Member</h3>
                <p className="text-[11px] text-slate-500">Create profile & select base plan + Supabase Add-On Services.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Muhammad Hamza"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Member Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. hamza@gmail.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Base Membership Plan Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Select Base Membership Plan *
                </label>
                <select
                  value={newPlan}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    setNewPlan(selectedVal);
                    updateFeeCalculation(selectedVal, selectedAddonIds);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-bold"
                >
                  {availablePlans.length > 0 ? (
                    availablePlans.map((p) => {
                      const mPrice = p.monthly_price ?? p.monthlyPrice ?? 0;
                      const dPrice = p.daily_price ?? p.dailyPrice ?? 0;
                      const label = mPrice > 0 ? `${p.name} (PKR ${Number(mPrice).toLocaleString()}/mo)` : `${p.name} (PKR ${Number(dPrice).toLocaleString()}/day)`;
                      return (
                        <option key={p.id} value={label}>
                          {label}
                        </option>
                      );
                    })
                  ) : (
                    <>
                      <option value="Pro Membership (PKR 5,000/mo)">Pro Membership (PKR 5,000/mo)</option>
                      <option value="Standard Monthly Pass (PKR 3,500/mo)">Standard Monthly Pass (PKR 3,500/mo)</option>
                      <option value="VIP Champion Pass (PKR 9,000/mo)">VIP Champion Pass (PKR 9,000/mo)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Dynamic Stackable Add-On Options fetched from Supabase */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Stackable Add-On Services (Fetched from Supabase)
                  </span>
                  <span className="text-[10px] text-emerald-700 font-mono font-bold">Live Supabase</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Select optional service add-ons to stack onto the base plan:
                </p>

                <div className="space-y-2 pt-1 max-h-48 overflow-y-auto pr-1">
                  {availableAddons.map((addon) => {
                    const isChecked = selectedAddonIds.includes(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className={`flex items-center gap-2.5 p-2 bg-white border rounded-lg cursor-pointer transition ${
                          isChecked ? "border-emerald-500 ring-1 ring-emerald-500/20" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleAddonCheck(addon.id)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <div className="flex-1 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{addon.icon || "🏃"}</span>
                            {addon.name}
                          </span>
                          <span className="font-mono text-emerald-700 font-extrabold">
                            +PKR {Number(addon.price || 0).toLocaleString()}/mo
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Total Fee Collected Calculation */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Base Plan Fee:</span>
                  <span className="font-mono font-bold text-slate-800">PKR {Number(baseFee).toLocaleString()}</span>
                </div>
                {selectedAddonIds.length > 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Selected Supabase Add-ons ({selectedAddonIds.length}):</span>
                    <span className="font-mono font-bold text-emerald-700">
                      +PKR {Number(
                        selectedAddonIds.reduce((acc, id) => {
                          const m = availableAddons.find((a) => a.id === id);
                          return acc + (m ? Number(m.price || 0) : 0);
                        }, 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-emerald-200 text-slate-900 font-extrabold text-sm">
                  <span>Total Fee Collected Now:</span>
                  <span className="font-mono text-emerald-700 font-black text-base">PKR {Number(newFeePaid).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">
                  Mobile App Password *
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="12345678"
                  className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl px-4 py-2.5 text-xs text-emerald-800 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Member uses this password (`12345678`) to log in on their mobile phone app.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-4 py-2.5 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition shadow-xs"
                >
                  {submitting ? "SAVING TO SUPABASE..." : "CREATE MEMBER & MOBILE ACCESS"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REUSABLE LOADING ANIMATION OVERLAY */}
      <LoadingOverlay isLoading={submitting} message="Registering Member Profile & Provisioning Mobile Credentials..." />
    </div>
  );
}
