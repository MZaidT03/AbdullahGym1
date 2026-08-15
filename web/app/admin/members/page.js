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
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
        styles[currentGender] || styles.Male
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
        isActive
          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
          : "bg-rose-50 text-rose-700 border-rose-200/80"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
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
  const [newPaymentMethod, setNewPaymentMethod] = useState("Cash / Desk");
  const [newPassword, setNewPassword] = useState("12345678");

  // Dynamic Supabase Plans & Add-Ons state
  const [availablePlans, setAvailablePlans] = useState([]);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);

  // Edit / Plan Change Modal State
  const [editingMember, setEditingMember] = useState(null);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGender, setEditGender] = useState("Male");
  const [editStatus, setEditStatus] = useState("Active");
  const [editPlan, setEditPlan] = useState("Pro Membership (PKR 5,000/mo)");
  const [editAddonIds, setEditAddonIds] = useState([]);
  const [editTiming, setEditTiming] = useState("NEXT_CYCLE"); // 'NEXT_CYCLE' | 'IMMEDIATE'
  const [editBaseFee, setEditBaseFee] = useState(5000);
  const [editTotalFee, setEditTotalFee] = useState("5000");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

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
            let activePlan = p.plan || "Pro Membership";
            let upcomingPlan = p.upcoming_plan || null;

            if (!upcomingPlan && activePlan.includes(" [Next: ")) {
              const parts = activePlan.split(" [Next: ");
              activePlan = parts[0];
              upcomingPlan = parts[1].replace(/\]$/, "");
            }

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
              supabase.from("profiles").update({ status: "Deactivated" }).eq("id", p.id).then(() => {});
            }
            return {
              ...p,
              plan: activePlan,
              upcoming_plan: upcomingPlan,
            };
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

  const computePlanFee = (selectedPlanStr, addonIdList) => {
    let b = 5000;
    const foundPlan = availablePlans.find((p) => selectedPlanStr.includes(p.name));
    if (foundPlan) {
      b = foundPlan.monthly_price || foundPlan.monthlyPrice || foundPlan.daily_price || foundPlan.dailyPrice || 5000;
    } else if (selectedPlanStr.includes("12,000") || selectedPlanStr.includes("12000") || selectedPlanStr.includes("Pro Plus")) {
      b = 12000;
    } else if (selectedPlanStr.includes("9,000") || selectedPlanStr.includes("9000") || selectedPlanStr.includes("VIP")) {
      b = 9000;
    } else if (selectedPlanStr.includes("3,500") || selectedPlanStr.includes("3500") || selectedPlanStr.includes("Standard")) {
      b = 3500;
    } else if (selectedPlanStr.includes("500") || selectedPlanStr.includes("Daily")) {
      b = 500;
    }

    const addonsSum = addonIdList.reduce((acc, id) => {
      const matched = availableAddons.find((a) => a.id === id);
      return acc + (matched ? Number(matched.price || 0) : 0);
    }, 0);

    return { baseFee: b, totalFee: b + addonsSum };
  };

  const updateFeeCalculation = (selectedPlanStr, addonIdList) => {
    const { baseFee: b, totalFee: t } = computePlanFee(selectedPlanStr, addonIdList);
    setBaseFee(b);
    setNewFeePaid(String(t));
  };

  const updateEditFeeCalculation = (selectedPlanStr, addonIdList) => {
    const { baseFee: b, totalFee: t } = computePlanFee(selectedPlanStr, addonIdList);
    setEditBaseFee(b);
    setEditTotalFee(String(t));
  };

  const handleToggleAddonCheck = (addonId) => {
    const updated = selectedAddonIds.includes(addonId)
      ? selectedAddonIds.filter((id) => id !== addonId)
      : [...selectedAddonIds, addonId];

    setSelectedAddonIds(updated);
    updateFeeCalculation(newPlan, updated);
  };

  const handleToggleEditAddonCheck = (addonId) => {
    const updated = editAddonIds.includes(addonId)
      ? editAddonIds.filter((id) => id !== addonId)
      : [...editAddonIds, addonId];

    setEditAddonIds(updated);
    updateEditFeeCalculation(editPlan, updated);
  };

  // Open Edit / Plan Change Modal
  const openEditModal = (member) => {
    setEditingMember(member);
    setEditFullName(member.full_name || "");
    setEditPhone(member.phone || "");
    setEditGender(member.gender || "Male");
    setEditStatus(member.status || "Active");
    setEditError("");
    setEditTiming("NEXT_CYCLE");

    // Detect base plan from member plan string or upcoming_plan
    const currentPlanStr = member.upcoming_plan || member.plan || "Pro Membership (PKR 5,000/mo)";
    let matchedBasePlan = "Pro Membership (PKR 5,000/mo)";

    if (currentPlanStr.includes("Pro Plus")) {
      matchedBasePlan = "Pro Plus Membership (PKR 12,000/mo)";
    } else if (currentPlanStr.includes("VIP") || currentPlanStr.includes("Champion")) {
      matchedBasePlan = "VIP Champion Pass (PKR 9,000/mo)";
    } else if (currentPlanStr.includes("Standard")) {
      matchedBasePlan = "Standard Monthly Pass (PKR 3,500/mo)";
    } else if (currentPlanStr.includes("Daily") || currentPlanStr.includes("Visitor")) {
      matchedBasePlan = "Daily Visitor Pass (PKR 500/day)";
    }

    setEditPlan(matchedBasePlan);

    // Detect active addon IDs in member plan string
    const detectedAddons = [];
    availableAddons.forEach((a) => {
      if (currentPlanStr.includes(a.name)) {
        detectedAddons.push(a.id);
      }
    });
    setEditAddonIds(detectedAddons);

    const { baseFee: b, totalFee: t } = computePlanFee(matchedBasePlan, detectedAddons);
    setEditBaseFee(b);
    setEditTotalFee(String(t));
  };

  // Save Plan Change / Upgrade / Downgrade
  const handleSaveMemberPlan = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    setEditError("");
    setEditSaving(true);

    let finalPlanLabel = editPlan;
    const selectedAddonObjs = availableAddons.filter((a) => editAddonIds.includes(a.id));
    if (selectedAddonObjs.length > 0) {
      const addonTitles = selectedAddonObjs.map(
        (a) => `${a.name} (+PKR ${Number(a.price).toLocaleString()})`
      );
      finalPlanLabel = `${editPlan} [Add-ons: ${addonTitles.join(" + ")}]`;
    }

    try {
      const baseUpdates = {
        full_name: editFullName.trim() || editingMember.full_name,
        gender: editGender,
        status: editStatus,
      };

      if (editTiming === "NEXT_CYCLE") {
        baseUpdates.upcoming_plan = finalPlanLabel;
      } else {
        baseUpdates.plan = finalPlanLabel;
        baseUpdates.upcoming_plan = null;
      }

      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from("profiles")
          .update(baseUpdates)
          .eq("id", editingMember.id);

        if (error) {
          // If upcoming_plan column doesn't exist in Supabase schema, fallback safely without crashing
          if (error.code === "PGRST204" || error.message.includes("upcoming_plan")) {
            const fallbackUpdates = {
              full_name: editFullName.trim() || editingMember.full_name,
              gender: editGender,
              status: editStatus,
            };
            if (editTiming === "IMMEDIATE") {
              fallbackUpdates.plan = finalPlanLabel;
            } else {
              const currentCleanPlan = (editingMember.plan || "Pro Membership").split(" [Next:")[0];
              fallbackUpdates.plan = `${currentCleanPlan} [Next: ${finalPlanLabel}]`;
            }

            const { error: fbErr } = await supabase
              .from("profiles")
              .update(fallbackUpdates)
              .eq("id", editingMember.id);

            if (fbErr) throw fbErr;
          } else {
            throw error;
          }
        }
      }

      // Update local state immediately
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingMember.id
            ? {
                ...m,
                full_name: editFullName.trim() || m.full_name,
                gender: editGender,
                status: editStatus,
                plan: editTiming === "IMMEDIATE" ? finalPlanLabel : m.plan,
                upcoming_plan: editTiming === "NEXT_CYCLE" ? finalPlanLabel : null,
              }
            : m
        )
      );

      setStatusMsg(
        editTiming === "NEXT_CYCLE"
          ? `✓ Plan change scheduled for next billing cycle for ${editingMember.full_name}.`
          : `✓ Plan & Add-ons updated immediately for ${editingMember.full_name}.`
      );

      setEditingMember(null);
      await fetchMembers();
    } catch (err) {
      console.error("Save plan change error:", err);
      setEditError(err.message || "Failed to update member plan.");
    } finally {
      setEditSaving(false);
    }
  };

  // Cancel scheduled upcoming plan
  const handleCancelUpcomingPlan = async (memberId) => {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from("profiles")
          .update({ upcoming_plan: null })
          .eq("id", memberId);

        if (error && (error.code === "PGRST204" || error.message.includes("upcoming_plan"))) {
          const currentMem = members.find((m) => m.id === memberId);
          if (currentMem?.plan && currentMem.plan.includes(" [Next:")) {
            const cleanPlan = currentMem.plan.split(" [Next:")[0];
            await supabase.from("profiles").update({ plan: cleanPlan }).eq("id", memberId);
          }
        }
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, upcoming_plan: null } : m))
      );
      if (editingMember?.id === memberId) {
        setEditingMember((prev) => ({ ...prev, upcoming_plan: null }));
      }
      setStatusMsg("✓ Scheduled plan change cancelled. Member will remain on current plan.");
    } catch (err) {
      console.error("Error cancelling upcoming plan:", err);
    }
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
          payment_method: newPaymentMethod,
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
        paymentMethod: newPaymentMethod,
        plan: finalPlanLabel,
      });

      setNewFullName("");
      setNewGender("Male");
      setNewEmail("");
      setNewPhone("");
      setSelectedAddonIds([]);
      setNewFeePaid("5000");
      setNewPaymentMethod("Cash / Desk");
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
        m.member_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.plan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.upcoming_plan?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && m.status === "Active") ||
        (statusFilter === "Expired" && m.status !== "Active") ||
        (statusFilter === "Upcoming Plan" && Boolean(m.upcoming_plan));

      const matchesGender = genderFilter === "All" || m.gender === genderFilter;

      return matchesSearch && matchesStatus && matchesGender;
    });
  }, [members, searchTerm, statusFilter, genderFilter]);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Members & Membership Plans
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage registered gym members, active plans, add-ons & upcoming cycle plan changes.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95"
        >
          <span>＋</span>
          <span>Register New Member</span>
        </button>
      </div>

      {statusMsg ? (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-emerald-600 font-bold ml-2">
            ✕
          </button>
        </div>
      ) : null}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, member ID, plan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>

          {/* Status Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            {["All", "Active", "Expired", "Upcoming Plan"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  statusFilter === st
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Gender Filter */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            {["All", "Male", "Female", "Other"].map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  genderFilter === g
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {g}
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
                <th className="py-3 px-3.5 text-right">Actions</th>
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

                    <td className="py-3.5 px-3.5 text-slate-700 font-medium max-w-sm">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{m.plan || "Pro Membership"}</p>
                        {m.upcoming_plan ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span>⏳ Next Cycle:</span>
                            <span className="font-medium truncate max-w-[180px]">
                              {m.upcoming_plan}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td className="py-3.5 px-3.5 font-mono font-bold text-slate-900">
                      PKR {Number(m.fee_paid || 5000).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-3.5">
                      <StatusBadge status={m.status || "Active"} />
                    </td>

                    <td className="py-3.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(m)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition border bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 inline-flex items-center gap-1"
                          title="Change Plan, Add-ons or Schedule for Next Cycle"
                        >
                          <span>⚙️</span>
                          <span>Manage Plan</span>
                        </button>

                        <button
                          onClick={() => handleToggleStatus(m.id, m.status || "Active")}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition border ${
                            m.status === "Active"
                              ? "bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200"
                              : "bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200"
                          }`}
                        >
                          {m.status === "Active" ? "Deactivate" : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT / MANAGE PLAN & ADD-ONS MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <MemberAvatar name={editingMember.full_name} />
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Manage Plan & Add-ons
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingMember.full_name} • <span className="font-mono text-emerald-700 font-bold">{editingMember.member_id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                ⚠️ {editError}
              </div>
            )}

            {/* Current Active Plan Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Current Active Plan
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Active Now
                </span>
              </div>
              <p className="text-xs font-extrabold text-slate-900">{editingMember.plan || "Pro Membership"}</p>

              {editingMember.upcoming_plan ? (
                <div className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                      <span>⏳</span> Scheduled for Next Cycle:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCancelUpcomingPlan(editingMember.id)}
                      className="text-[10px] font-bold text-rose-600 hover:underline"
                    >
                      Cancel Scheduled Change
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-amber-800">{editingMember.upcoming_plan}</p>
                </div>
              ) : null}
            </div>

            <form onSubmit={handleSaveMemberPlan} className="space-y-4">
              {/* Select Target Plan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Target Membership Tier *
                </label>
                <select
                  value={editPlan}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    setEditPlan(selectedVal);
                    updateEditFeeCalculation(selectedVal, editAddonIds);
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
                      <option value="Pro Plus Membership (PKR 12,000/mo)">
                        Pro Plus Membership (PKR 12,000/mo)
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

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {availableAddons.map((addon) => {
                    const isChecked = editAddonIds.includes(addon.id);
                    return (
                      <label
                        key={addon.id}
                        className={`flex items-center gap-2.5 p-2 bg-white border rounded-xl cursor-pointer transition-all ${
                          isChecked
                            ? "border-emerald-500/80 ring-1 ring-emerald-500/20"
                            : "border-slate-200/80 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEditAddonCheck(addon.id)}
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

              {/* Implementation Timing Choice (Next Cycle vs Immediate) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  When Should This Change Take Effect? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      editTiming === "NEXT_CYCLE"
                        ? "bg-amber-50/80 border-amber-400 ring-1 ring-amber-400/30"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="editTiming"
                        value="NEXT_CYCLE"
                        checked={editTiming === "NEXT_CYCLE"}
                        onChange={() => setEditTiming("NEXT_CYCLE")}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          🗓️ Next Payment Cycle
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          Member continues current plan this month. New plan and fee apply on next renewal payment.
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded mt-2 self-start">
                      Recommended
                    </span>
                  </label>

                  <label
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      editTiming === "IMMEDIATE"
                        ? "bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-400/30"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="editTiming"
                        value="IMMEDIATE"
                        checked={editTiming === "IMMEDIATE"}
                        onChange={() => setEditTiming("IMMEDIATE")}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          ⚡ Apply Immediately
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          Instantly overwrites active membership plan and fee effective today.
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded mt-2 self-start">
                      Immediate Effect
                    </span>
                  </label>
                </div>
              </div>

              {/* Total Calculation Preview */}
              <div className="p-3 bg-slate-900 text-white rounded-xl text-xs space-y-1">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Base Fee:</span>
                  <span className="font-mono">PKR {Number(editBaseFee).toLocaleString()}</span>
                </div>
                {editAddonIds.length > 0 && (
                  <div className="flex justify-between items-center text-emerald-400">
                    <span>Add-ons Total ({editAddonIds.length}):</span>
                    <span className="font-mono">
                      +PKR{" "}
                      {Number(
                        editAddonIds.reduce((acc, id) => {
                          const m = availableAddons.find((a) => a.id === id);
                          return acc + (m ? Number(m.price || 0) : 0);
                        }, 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 font-bold text-sm">
                  <span>New Monthly Subscription Fee:</span>
                  <span className="font-mono text-emerald-400 text-base">
                    PKR {Number(editTotalFee).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Member Profile Quick Edits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Gender
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Male">♂ Male</option>
                    <option value="Female">♀ Female</option>
                    <option value="Other">⚧ Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Account Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Active">🟢 Active</option>
                    <option value="Expired">🔴 Expired</option>
                    <option value="Deactivated">⚪ Deactivated</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-4 py-2 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs"
                >
                  {editSaving
                    ? "Saving Changes..."
                    : editTiming === "NEXT_CYCLE"
                    ? "Schedule for Next Cycle"
                    : "Apply Changes Immediately"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                        className={`py-1 rounded-lg text-xs font-bold transition text-center ${
                          newGender === g.id
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
                      <option value="Pro Plus Membership (PKR 12,000/mo)">
                        Pro Plus Membership (PKR 12,000/mo)
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
                        className={`flex items-center gap-2.5 p-2 bg-white border rounded-xl cursor-pointer transition-all ${
                          isChecked
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

              {/* Payment Method Option */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Payment Method *
                </label>
                <select
                  value={newPaymentMethod}
                  onChange={(e) => setNewPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                >
                  <option value="Cash / Desk">💵 Cash / Counter</option>
                  <option value="Bank Transfer (IBFT)">🏦 Bank Transfer (IBFT)</option>
                  <option value="JazzCash">📱 JazzCash</option>
                  <option value="EasyPaisa">📲 EasyPaisa</option>
                  <option value="Credit / Debit Card">💳 Credit / Debit Card</option>
                  <option value="Other">💼 Other</option>
                </select>
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

      {/* SUCCESS MODAL */}
      {successCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-800">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-xs">
              ✓
            </div>
            <div className="text-center">
              <h3 className="text-base font-extrabold text-slate-900">Member Registered!</h3>
              <p className="text-xs text-slate-500 mt-0.5">Account has been activated with login pass.</p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Member Name:</span>
                <span className="font-bold text-slate-900">{successCard.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Member ID:</span>
                <span className="font-mono font-bold text-emerald-700">{successCard.memberId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plan Assigned:</span>
                <span className="font-bold text-slate-900">{successCard.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fee Received:</span>
                <span className="font-mono font-bold text-slate-900">PKR {Number(successCard.feePaid).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold text-slate-700">{successCard.paymentMethod}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500">Login Email:</span>
                <span className="font-mono font-bold text-slate-900">{successCard.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Default Password:</span>
                <span className="font-mono font-bold text-emerald-600">{successCard.password}</span>
              </div>
            </div>

            <button
              onClick={() => setSuccessCard(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      <LoadingOverlay
        isLoading={submitting || editSaving}
        message={editSaving ? "Updating Plan & Add-ons..." : "Registering Member & Creating Mobile Pass..."}
      />
    </div>
  );
}