"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";
import LoadingOverlay from "../components/LoadingOverlay";

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function MemberAvatar({ name }) {
  const initial = name ? name.charAt(0).toUpperCase() : "M";
  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 border border-emerald-200/80 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
      {initial}
    </div>
  );
}

function GenderBadge({ gender }) {
  const styles = {
    Female: "bg-purple-50 text-purple-700 border-purple-200/80",
    Other: "bg-teal-50 text-teal-700 border-teal-200/80",
    Male: "bg-blue-50 text-blue-700 border-blue-200/80",
  };

  const icons = {
    Female: "♀",
    Other: "⚧",
    Male: "♂",
  };

  const currentGender = gender || "Male";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${styles[currentGender] || styles.Male
        }`}
    >
      <span>{icons[currentGender] || icons.Male}</span>
      <span>{gender || "Male"}</span>
    </span>
  );
}

function StatusBadge({ status }) {
  const isActive = status === "Active";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${isActive
          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
          : "bg-rose-50 text-rose-700 border-rose-200/80"
        }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
          }`}
      />
      {status || "Active"}
    </span>
  );
}

// ============================================================================
// MAIN MEMBERS PAGE
// ============================================================================

export default function MembersPage() {
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successCard, setSuccessCard] = useState(null);

  // Form states for new member
  const [newFullName, setNewFullName] = useState("");
  const [newGender, setNewGender] = useState("Male");
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
    { id: "addon-1", name: "Cardio Access Plan", price: 1500, icon: "🏃" },
    { id: "addon-2", name: "Personal Trainer Guidance", price: 3500, icon: "🏋️" },
    { id: "addon-3", name: "VIP Locker & Shower Access", price: 1000, icon: "🔐" },
    { id: "addon-4", name: "Sauna & Steam Pass", price: 2000, icon: "♨️" },
  ];

  useEffect(() => {
    fetchMembers();
    fetchPlansFromSupabase();
    fetchAddonsFromSupabase();
  }, []);

  const fetchPlansFromSupabase = async () => {
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from("gym_plans")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: true });

        if (data && data.length > 0) setAvailablePlans(data);
      } catch (e) {
        console.warn("Failed to fetch gym_plans", e);
      }
    }
  };

  const fetchAddonsFromSupabase = async () => {
    let loaded = false;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("gym_addons")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
          setAvailableAddons(data);
          loaded = true;
        } else {
          const { data: setObj } = await supabase
            .from("gym_settings")
            .select("value")
            .eq("key", "gym_addons")
            .single();

          if (setObj?.value && Array.isArray(setObj.value)) {
            setAvailableAddons(setObj.value.filter((a) => a.active !== false));
            loaded = true;
          }
        }
      } catch (e) {
        console.warn("Failed to fetch gym_addons", e);
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
          setStatusMsg(`Supabase Notice: ${error.message}`);
        } else if (profData) {
          const registeredOnly = profData.filter(
            (p) =>
              !p.member_id?.startsWith("GP-WALK-") &&
              !p.email?.includes("@abdullahgym.local") &&
              p.role !== "walkin"
          );

          const evaluated = registeredOnly.map((p) => {
            const userPays = payData
              ? payData.filter(
                (pay) => pay.user_id === p.id && (pay.status === "Paid" || pay.status === "Partial")
              )
              : [];
            const createdAt = p.created_at ? new Date(p.created_at) : null;
            const now = new Date();
            const daysDiff = createdAt ? (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24) : 0;

            if (daysDiff > 7 && userPays.length === 0) {
              p.status = "Deactivated";
              supabase.from("profiles").update({ status: "Deactivated" }).eq("id", p.id).then(() => { });
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

    setNewFeePaid(String(b + addonsSum));
  };

  const handleToggleAddonCheck = (addonId) => {
    const updated = selectedAddonIds.includes(addonId)
      ? selectedAddonIds.filter((id) => id !== addonId)
      : [...selectedAddonIds, addonId];

    setSelectedAddonIds(updated);
    updateFeeCalculation(newPlan, updated);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setFormError("");
    setStatusMsg("");

    if (!newFullName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFormError("Please fill in all mandatory fields (*).");
      return;
    }

    const cleanEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setFormError("Please enter a valid email address (e.g. member@domain.com).");
      return;
    }

    const digitsOnlyPhone = newPhone.replace(/\D/g, "");
    if (newPhone.trim() && digitsOnlyPhone.length !== 11) {
      setFormError("Phone number must be exactly 11 digits (e.g. 03001234567).");
      return;
    }

    if (newPassword.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);

    let finalPlanLabel = newPlan;
    const selectedAddonObjs = availableAddons.filter((a) => selectedAddonIds.includes(a.id));
    if (selectedAddonObjs.length > 0) {
      const addonTitles = selectedAddonObjs.map(
        (a) => `${a.name} (+PKR ${Number(a.price).toLocaleString()})`
      );
      finalPlanLabel = `${newPlan} [Add-ons: ${addonTitles.join(" + ")}]`;
    }

    try {
      const res = await fetch("/api/admin/create-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: newPassword,
          full_name: newFullName,
          gender: newGender,
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

      await fetchMembers();

      setSuccessCard({
        name: newFullName,
        email: cleanEmail,
        password: newPassword,
        gender: newGender,
        memberId: result.user?.member_id || "GP-8472-991",
        feePaid: newFeePaid,
        plan: finalPlanLabel,
      });

      setNewFullName("");
      setNewGender("Male");
      setNewEmail("");
      setNewPhone("");
      setSelectedAddonIds([]);
      setNewFeePaid("5000");
      setNewPassword("12345678");
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || "Failed to create member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === "Active" ? "Expired" : "Active";

    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: nextStatus } : m))
    );

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("profiles").update({ status: nextStatus }).eq("id", id);
        await fetchMembers();
      } catch (err) {
        console.error("Supabase update error:", err);
      }
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.member_id?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "All" || m.status === statusFilter;
      const matchesGender = genderFilter === "All" || (m.gender || "Male") === genderFilter;

      return matchesSearch && matchesStatus && matchesGender;
    });
  }, [members, searchTerm, statusFilter, genderFilter]);

  const stats = useMemo(() => {
    const activeCount = members.filter((m) => m.status === "Active").length;
    return {
      total: members.length,
      active: activeCount,
      expired: members.length - activeCount,
    };
  }, [members]);

  return (
    <div className="space-y-6 font-sans p-2 sm:p-4 text-slate-800">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Members Directory
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {stats.total} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage profiles, register new registrations, assign add-ons, and issue access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
            <span className="text-emerald-700 font-bold">{stats.active} Active</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">{stats.expired} Inactive</span>
          </div>

          <button
            onClick={() => {
              setFormError("");
              setSuccessCard(null);
              setIsModalOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 shadow-xs hover:scale-[1.02] flex items-center gap-2"
          >
            <span className="text-base font-normal">＋</span>
            <span>Register Member</span>
          </button>
        </div>
      </div>

      {/* STATUS BANNER */}
      {statusMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between shadow-xs">
          <span>{statusMsg}</span>
          <button
            onClick={() => setStatusMsg("")}
            className="text-slate-400 hover:text-slate-700 font-bold text-xs p-1 rounded-lg"
          >
            ✕
          </button>
        </div>
      )}

      {/* SUCCESS CREDENTIALS BANNER */}
      {successCard && (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 shadow-xs space-y-3 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                ✓
              </span>
              <div>
                <h3 className="font-bold text-sm text-emerald-950">
                  Member Profile Created Successfully
                </h3>
                <p className="text-xs text-emerald-700">
                  Pass these login credentials to the member for mobile access.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSuccessCard(null)}
              className="text-slate-400 hover:text-slate-700 font-bold text-xs p-1 rounded-lg"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-emerald-200/80 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Member</span>
              <p className="font-bold text-slate-900 truncate">{successCard.name}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Gender</span>
              <p className="font-semibold text-slate-700">{successCard.gender}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">ID</span>
              <p className="font-mono font-bold text-emerald-700">{successCard.memberId}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">Email</span>
              <p className="font-medium text-slate-800 truncate">{successCard.email}</p>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold">App Password</span>
              <p className="font-mono font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                {successCard.password}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FILTER TOOLBAR */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or ID..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Gender Filter */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs">
            <span className="text-[10px] font-bold text-slate-400 px-1 uppercase">Gender</span>
            {["All", "Male", "Female", "Other"].map((gen) => (
              <button
                key={gen}
                onClick={() => setGenderFilter(gen)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${genderFilter === gen
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                {gen}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 text-xs">
            <span className="text-[10px] font-bold text-slate-400 px-1 uppercase">Status</span>
            {["All", "Active", "Expired"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${statusFilter === st
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MEMBERS TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-auto max-h-[calc(100vh-280px)] rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3.5">Member</th>
                <th className="py-3 px-3.5">Gender</th>
                <th className="py-3 px-3.5">ID</th>
                <th className="py-3 px-3.5">Plan & Add-Ons</th>
                <th className="py-3 px-3.5">Fee Paid</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading registered members...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3.5 font-bold text-slate-900 flex items-center gap-3">
                      <MemberAvatar name={m.full_name} />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 leading-tight">
                          {m.full_name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-normal">{m.email}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-3.5">
                      <GenderBadge gender={m.gender} />
                    </td>

                    <td className="py-3.5 px-3.5 font-mono text-emerald-700 font-bold">
                      {m.member_id || "GP-MEMBER"}
                    </td>

                    <td className="py-3.5 px-3.5 text-slate-600 font-medium max-w-xs truncate">
                      {m.plan || "Pro Membership"}
                    </td>

                    <td className="py-3.5 px-3.5 font-mono font-bold text-slate-900">
                      PKR {Number(m.fee_paid || 5000).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-3.5">
                      <StatusBadge status={m.status || "Active"} />
                    </td>

                    <td className="py-3.5 px-3.5 text-right">
                      <button
                        onClick={() => handleToggleStatus(m.id, m.status || "Active")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition border ${m.status === "Active"
                            ? "bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                          }`}
                      >
                        {m.status === "Active" ? "Deactivate" : "Reactivate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTER MEMBER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Register New Member</h3>
                <p className="text-xs text-slate-500">
                  Assign base package & stackable add-on passes.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Muhammad Hamza"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Gender *
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                    {[
                      { id: "Male", label: "♂ Male" },
                      { id: "Female", label: "♀ Female" },
                      { id: "Other", label: "⚧ Other" },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setNewGender(g.id)}
                        className={`py-1 rounded-lg text-xs font-bold transition text-center ${newGender === g.id
                            ? "bg-white text-slate-900 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                          }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. hamza@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    maxLength={11}
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="03001234567"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Base Membership Plan Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Base Membership Tier *
                </label>
                <select
                  value={newPlan}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    setNewPlan(selectedVal);
                    updateFeeCalculation(selectedVal, selectedAddonIds);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                >
                  {availablePlans.length > 0 ? (
                    availablePlans.map((p) => {
                      const mPrice = p.monthly_price ?? p.monthlyPrice ?? 0;
                      const dPrice = p.daily_price ?? p.dailyPrice ?? 0;
                      const label =
                        mPrice > 0
                          ? `${p.name} (PKR ${Number(mPrice).toLocaleString()}/mo)`
                          : `${p.name} (PKR ${Number(dPrice).toLocaleString()}/day)`;
                      return (
                        <option key={p.id} value={label}>
                          {label}
                        </option>
                      );
                    })
                  ) : (
                    <>
                      <option value="Pro Membership (PKR 5,000/mo)">
                        Pro Membership (PKR 5,000/mo)
                      </option>
                      <option value="Standard Monthly Pass (PKR 3,500/mo)">
                        Standard Monthly Pass (PKR 3,500/mo)
                      </option>
                      <option value="VIP Champion Pass (PKR 9,000/mo)">
                        VIP Champion Pass (PKR 9,000/mo)
                      </option>
                    </>
                  )}
                </select>
              </div>

              {/* Stackable Add-On Options */}
              <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    Stackable Add-On Passes
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Optional
                  </span>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {availableAddons.map((addon) => {
                    const isChecked = selectedAddonIds.includes(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className={`flex items-center gap-2.5 p-2 bg-white border rounded-xl cursor-pointer transition-all ${isChecked
                            ? "border-emerald-500/80 ring-1 ring-emerald-500/20"
                            : "border-slate-200/80 hover:border-slate-300"
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleAddonCheck(addon.id)}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <div className="flex-1 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span>{addon.icon || "🏃"}</span>
                            {addon.name}
                          </span>
                          <span className="font-mono text-emerald-700 font-bold">
                            +PKR {Number(addon.price || 0).toLocaleString()}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-1">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Base Fee:</span>
                  <span className="font-mono">PKR {Number(baseFee).toLocaleString()}</span>
                </div>
                {selectedAddonIds.length > 0 && (
                  <div className="flex justify-between items-center text-emerald-400">
                    <span>Add-ons Total ({selectedAddonIds.length}):</span>
                    <span className="font-mono">
                      +PKR{" "}
                      {Number(
                        selectedAddonIds.reduce((acc, id) => {
                          const m = availableAddons.find((a) => a.id === id);
                          return acc + (m ? Number(m.price || 0) : 0);
                        }, 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 font-bold text-sm">
                  <span>Total Payable:</span>
                  <span className="font-mono text-emerald-400 text-base">
                    PKR {Number(newFeePaid).toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Mobile App Default Password *
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-4 py-2 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs"
                >
                  {submitting ? "Saving..." : "Create Member Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      <LoadingOverlay
        isLoading={submitting}
        message="Registering Member & Creating Mobile Pass..."
      />
    </div>
  );
}