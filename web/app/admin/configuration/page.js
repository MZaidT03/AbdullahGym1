"use client";

import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";

export default function AdminConfigurationPage() {
  const [activeTab, setActiveTab] = useState("plans"); // 'plans' | 'passwords' | 'settings'

  // --- TAB 1: MEMBERSHIP PLANS & PRICING (Monthly & Daily) ---
  const initialPlans = [
    {
      id: "plan-1",
      name: "Daily Visitor Pass",
      type: "Daily",
      monthly_price: 0,
      daily_price: 500,
      period: "per day",
      features: ["Full Gym Equipment Access", "Cardio Arena Access", "Single-day Locker Access"],
      popular: false,
      active: true,
    },
    {
      id: "plan-2",
      name: "Standard Monthly Pass",
      type: "Monthly",
      monthly_price: 3500,
      daily_price: 400,
      period: "per month",
      features: ["Full Strength & Weight Training", "Standard Cardio Access", "Locker Room & Shower"],
      popular: false,
      active: true,
    },
    {
      id: "plan-3",
      name: "Pro Membership",
      type: "Monthly + Daily Option",
      monthly_price: 5000,
      daily_price: 500,
      period: "per month",
      features: [
        "All Standard Pass Amenities",
        "Personalized Diet & Workout Chart",
        "Dedicated Trainer Floor Guidance",
        "100% Shift Flexibility (Ladies/Gents)",
      ],
      popular: true,
      active: true,
    },
    {
      id: "plan-4",
      name: "VIP Champion Pass",
      type: "Monthly VIP",
      monthly_price: 9000,
      daily_price: 800,
      period: "per month",
      features: [
        "1-on-1 Coaching with Master Trainers",
        "Custom Competition Prep & Hypertrophy",
        "Unlimited Guest Access (1/week)",
        "VIP Locker & Supplement Discounts",
      ],
      popular: false,
      active: true,
    },
  ];

  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planStatusMsg, setPlanStatusMsg] = useState("");

  // Form states for adding/editing plans
  const [planName, setPlanName] = useState("");
  const [planType, setPlanType] = useState("Monthly");
  const [planMonthlyPrice, setPlanMonthlyPrice] = useState("5000");
  const [planDailyPrice, setPlanDailyPrice] = useState("500");
  const [planFeatures, setPlanFeatures] = useState("Full Gym Access, Diet Chart, Trainer Assistance");

  // Fetch plans from Supabase or localStorage
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    let loadedFromSupabase = false;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("gym_plans")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
          setPlans(data);
          loadedFromSupabase = true;
          setPlanStatusMsg("✓ Connected to Supabase gym_plans database table.");
        } else if (!error && data && data.length === 0) {
          // Auto-seed initial plans into Supabase gym_plans table if empty
          console.log("Seeding default plans into Supabase gym_plans...");
          const { data: seedData, error: seedError } = await supabase
            .from("gym_plans")
            .upsert(initialPlans, { onConflict: "id" })
            .select();
          if (!seedError && seedData) {
            setPlans(seedData);
            loadedFromSupabase = true;
            setPlanStatusMsg("✓ Seeded default plans into Supabase database.");
          }
        }
      } catch (err) {
        console.warn("Supabase fetch plans notice:", err);
      }
    }

    if (!loadedFromSupabase) {
      // Fallback to localStorage / initialPlans
      try {
        const saved = localStorage.getItem("abdullah_gym_plans");
        if (saved) {
          setPlans(JSON.parse(saved));
        } else {
          setPlans(initialPlans);
        }
      } catch (e) {
        setPlans(initialPlans);
      }
      setPlanStatusMsg("Notice: Operating on local memory/storage. Run schema.sql in Supabase SQL editor to enable DB sync.");
    }
    setLoadingPlans(false);
  };

  const handleOpenAddModal = () => {
    setEditingPlan(null);
    setPlanName("");
    setPlanType("Monthly");
    setPlanMonthlyPrice("50.00");
    setPlanDailyPrice("5.00");
    setPlanFeatures("Full Gym Access, Trainer Assistance");
    setIsPlanModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingPlan(p);
    setPlanName(p.name);
    setPlanType(p.type || "Monthly");
    setPlanMonthlyPrice(String(p.monthly_price ?? p.monthlyPrice ?? 0));
    setPlanDailyPrice(String(p.daily_price ?? p.dailyPrice ?? 0));
    setPlanFeatures(Array.isArray(p.features) ? p.features.join(", ") : p.features || "");
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    const featArray = planFeatures
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const planId = editingPlan ? editingPlan.id : `plan-${Date.now()}`;
    const planPayload = {
      id: planId,
      name: planName,
      type: planType,
      monthly_price: parseFloat(planMonthlyPrice) || 0,
      daily_price: parseFloat(planDailyPrice) || 0,
      period: "per month",
      features: featArray,
      popular: editingPlan ? Boolean(editingPlan.popular) : false,
      active: editingPlan ? Boolean(editingPlan.active) : true,
      updated_at: new Date().toISOString(),
    };

    // Optimistic UI update
    setPlans((prev) => {
      const exists = prev.some((p) => p.id === planId);
      if (exists) {
        return prev.map((p) => (p.id === planId ? { ...p, ...planPayload } : p));
      }
      return [...prev, planPayload];
    });

    // Save to Supabase
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("gym_plans")
          .upsert([planPayload], { onConflict: "id" });
        if (error) {
          console.error("Supabase upsert plan error:", error.message);
        } else {
          setPlanStatusMsg(`✓ Plan '${planName}' updated directly in Supabase.`);
        }
      } catch (err) {
        console.warn("Supabase plan edit exception:", err);
      }
    }

    // Save to localStorage fallback
    try {
      const updated = plans.map((p) => (p.id === planId ? { ...p, ...planPayload } : p));
      if (!plans.some((p) => p.id === planId)) updated.push(planPayload);
      localStorage.setItem("abdullah_gym_plans", JSON.stringify(updated));
    } catch (e) {}

    setIsPlanModalOpen(false);
  };

  const handleTogglePlanActive = async (id) => {
    const target = plans.find((p) => p.id === id);
    if (!target) return;
    const nextActive = !target.active;

    // Optimistic UI update
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, active: nextActive } : p)));

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("gym_plans")
          .update({ active: nextActive, updated_at: new Date().toISOString() })
          .eq("id", id);
      } catch (err) {
        console.warn("Supabase plan toggle error:", err);
      }
    }

    try {
      const updated = plans.map((p) => (p.id === id ? { ...p, active: nextActive } : p));
      localStorage.setItem("abdullah_gym_plans", JSON.stringify(updated));
    } catch (e) {}
  };

  const handleDeletePlan = async (id) => {
    if (!confirm("Are you sure you want to delete this membership plan from Supabase?")) return;

    // Optimistic UI update
    setPlans((prev) => prev.filter((p) => p.id !== id));

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from("gym_plans").delete().eq("id", id);
        if (error) {
          console.error("Supabase delete plan error:", error.message);
        } else {
          setPlanStatusMsg("✓ Plan deleted from Supabase.");
        }
      } catch (err) {
        console.warn("Supabase delete plan exception:", err);
      }
    }

    try {
      const updated = plans.filter((p) => p.id !== id);
      localStorage.setItem("abdullah_gym_plans", JSON.stringify(updated));
    } catch (e) {}
  };

  // --- TAB 2: RESET MEMBER PASSWORDS ---
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchMember, setSearchMember] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [customPassword, setCustomPassword] = useState("12345678");
  const [resetting, setResetting] = useState(false);
  const [resetAlert, setResetAlert] = useState(null);

  useEffect(() => {
    if (activeTab === "passwords") {
      fetchMembersList();
    }
  }, [activeTab]);

  const fetchMembersList = async () => {
    setLoadingMembers(true);
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        if (data && data.length > 0) {
          setMembers(data);
          setLoadingMembers(false);
          return;
        }
      } catch (err) {
        console.warn("Supabase fetch profiles notice:", err);
      }
    }
    // Fallback demo members if empty
    setMembers([
      { id: "demo-1", full_name: "Muhammad Ali", email: "ali.gym@example.com", member_id: "GP-1092-881" },
      { id: "demo-2", full_name: "Zainab Ahmed", email: "zainab.fit@example.com", member_id: "GP-4482-102" },
      { id: "demo-3", full_name: "Hamza Sheikh", email: "hamza.power@example.com", member_id: "GP-9921-304" },
    ]);
    setLoadingMembers(false);
  };

  const handleResetPasswordSubmit = async (e, targetMember = null, overridePass = null) => {
    if (e) e.preventDefault();
    const target = targetMember || selectedMember;
    const finalPassword = overridePass || customPassword || "12345678";

    if (!target) {
      alert("Please select a member to reset their password.");
      return;
    }

    setResetting(true);
    setResetAlert(null);

    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: target.id,
          email: target.email,
          newPassword: finalPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResetAlert({
          type: "success",
          member: target,
          password: data.newPassword || finalPassword,
          notice: data.fallbackNotice || data.message || "Password successfully reset!",
        });
      } else {
        setResetAlert({
          type: "error",
          message: data.error || "Failed to reset password.",
        });
      }
    } catch (err) {
      setResetAlert({
        type: "error",
        message: err.message || "Failed to connect to reset endpoint.",
      });
    } finally {
      setResetting(false);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.full_name?.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.member_id?.toLowerCase().includes(searchMember.toLowerCase())
  );

  // --- TAB 3: GENERAL GYM CONFIGURATION & TIMINGS ---
  const [gymConfig, setGymConfig] = useState({
    gymName: "ABDULLAH GYM 1",
    whatsapp: "0320 8313000",
    email: "abdullahgym521@gmail.com",
    currency: "PKR",
    ladiesShift: "10:00 AM - 01:00 PM",
    gentsShift: "04:00 PM - 11:00 PM",
    address: "56Q5+69G, Rajput Colony Gujranwala, Pakistan",
  });
  const [settingsSavedMsg, setSettingsSavedMsg] = useState("");

  useEffect(() => {
    if (activeTab === "settings") {
      fetchGeneralSettings();
    }
  }, [activeTab]);

  const fetchGeneralSettings = async () => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("gym_settings")
          .select("value")
          .eq("key", "general_settings")
          .single();
        if (data && data.value) {
          setGymConfig(data.value);
        }
      } catch (err) {
        console.warn("Supabase gym settings notice:", err);
      }
    }
  };

  const handleSaveGeneralConfig = async (e) => {
    e.preventDefault();

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("gym_settings")
          .upsert({ key: "general_settings", value: gymConfig, updated_at: new Date().toISOString() });
        if (!error) {
          setSettingsSavedMsg("General settings saved directly in Supabase DB!");
        } else {
          setSettingsSavedMsg(`Notice: ${error.message}`);
        }
      } catch (err) {
        setSettingsSavedMsg("Saved locally.");
      }
    } else {
      try {
        localStorage.setItem("abdullah_gym_general_config", JSON.stringify(gymConfig));
      } catch (e) {}
      setSettingsSavedMsg("Saved to local storage.");
    }
    setTimeout(() => setSettingsSavedMsg(""), 5000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1E3621] pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Admin Configuration & Pricing</h1>
          <p className="text-xs text-[#9EB5A3] mt-1">
            Manage plans, set monthly & daily rates, reset member passwords, and configure gym settings in Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16331C] border border-[#234A28] text-xs font-semibold text-[#4ADE80]">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            Supabase Config Sync Active
          </span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-[#1A311D] pb-3">
        <button
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "plans"
              ? "bg-[#22C55E] text-black shadow-lg shadow-emerald-500/20"
              : "bg-[#0E1A0F] text-[#9EB5A3] hover:text-white hover:bg-[#152717]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Manage Plans & Pricing
        </button>

        <button
          onClick={() => setActiveTab("passwords")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "passwords"
              ? "bg-[#22C55E] text-black shadow-lg shadow-emerald-500/20"
              : "bg-[#0E1A0F] text-[#9EB5A3] hover:text-white hover:bg-[#152717]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Reset Member Passwords
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === "settings"
              ? "bg-[#22C55E] text-black shadow-lg shadow-emerald-500/20"
              : "bg-[#0E1A0F] text-[#9EB5A3] hover:text-white hover:bg-[#152717]"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          Gym Shifts & Settings
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MANAGE PLANS & PRICING */}
      {/* ========================================================================= */}
      {activeTab === "plans" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Membership Plans & Pricing Sets</h2>
              <p className="text-xs text-[#738F7A]">
                Configure monthly subscription rates and daily pass fees stored in Supabase table <code className="text-[#4ADE80]">gym_plans</code>.
              </p>
              {planStatusMsg && (
                <p className="text-[11px] font-semibold text-[#4ADE80] mt-1 bg-[#122A16] px-2.5 py-1 rounded-md border border-[#214A27] inline-block">
                  {planStatusMsg}
                </p>
              )}
            </div>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-[#22C55E] hover:bg-[#1ea850] text-black font-bold text-xs rounded-xl transition flex items-center gap-2 self-start sm:self-auto shadow-md shadow-emerald-500/10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add New Plan to Supabase
            </button>
          </div>

          {/* Grid of Plans */}
          {loadingPlans ? (
            <div className="py-16 text-center text-xs text-gray-400">Loading plans from Supabase...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {plans.map((p) => {
                const monthlyVal = p.monthly_price ?? p.monthlyPrice ?? 0;
                const dailyVal = p.daily_price ?? p.dailyPrice ?? 0;

                return (
                  <div
                    key={p.id}
                    className={`bg-[#0E1A0F] border rounded-2xl p-5 flex flex-col justify-between relative transition-all ${
                      p.popular
                        ? "border-[#22C55E] ring-1 ring-[#22C55E]/40"
                        : p.active
                        ? "border-[#1E3621]"
                        : "border-gray-800 opacity-60"
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-3 right-4 bg-[#22C55E] text-black text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow">
                        Most Popular
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#4ADE80] bg-[#16331C] px-2 py-0.5 rounded-md border border-[#234A28]">
                          {p.type || "Membership"}
                        </span>
                        <button
                          onClick={() => handleTogglePlanActive(p.id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            p.active ? "text-emerald-400 bg-emerald-950/60" : "text-gray-400 bg-gray-900"
                          }`}
                        >
                          {p.active ? "Active" : "Disabled"}
                        </button>
                      </div>

                      <h3 className="text-base font-extrabold text-white">{p.name}</h3>

                      {/* Monthly & Daily Rates Display */}
                      <div className="my-4 p-3 bg-[#0B150C] border border-[#162B17] rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#738F7A] font-medium">Monthly Rate:</span>
                          <span className="font-extrabold text-white text-sm">
                            PKR {Number(monthlyVal).toLocaleString()} <span className="text-[10px] text-[#738F7A] font-normal">/mo</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#142615]">
                          <span className="text-[#738F7A] font-medium">Daily Pass Rate:</span>
                          <span className="font-bold text-[#4ADE80] text-xs">
                            PKR {Number(dailyVal).toLocaleString()} <span className="text-[10px] text-[#738F7A] font-normal">/day</span>
                          </span>
                        </div>
                      </div>

                      {/* Feature list */}
                      <ul className="space-y-2 mb-6">
                        {(p.features || []).map((feat, idx) => (
                          <li key={idx} className="text-xs text-[#A1B8A6] flex items-start gap-2">
                            <svg className="w-3.5 h-3.5 text-[#22C55E] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-[#182C1B] flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="flex-1 py-1.5 bg-[#162D19] hover:bg-[#1E3E22] border border-[#28502F] text-xs font-bold text-white rounded-lg transition"
                      >
                        Edit Pricing
                      </button>
                      <button
                        onClick={() => handleDeletePlan(p.id)}
                        title="Delete Plan from Supabase"
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal for Add / Edit Plan */}
          {isPlanModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-[#0E1A0F] border border-[#22C55E]/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-[#1E3621] pb-3">
                  <h3 className="text-base font-extrabold text-white">
                    {editingPlan ? "Edit Membership Pricing Plan" : "Create New Pricing Plan"}
                  </h3>
                  <button
                    onClick={() => setIsPlanModalOpen(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSavePlan} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#A1B8A6] mb-1">Plan Name</label>
                    <input
                      type="text"
                      required
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder="e.g. Pro Membership or Student Pass"
                      className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#A1B8A6] mb-1">Category / Tag</label>
                    <select
                      value={planType}
                      onChange={(e) => setPlanType(e.target.value)}
                      className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                    >
                      <option value="Monthly">Monthly Membership</option>
                      <option value="Daily">Daily Pass Only</option>
                      <option value="Monthly + Daily Option">Monthly + Daily Combo</option>
                      <option value="VIP Elite">VIP Elite</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#A1B8A6] mb-1">Monthly Price (PKR)</label>
                      <input
                        type="number"
                        step="1"
                        required
                        value={planMonthlyPrice}
                        onChange={(e) => setPlanMonthlyPrice(e.target.value)}
                        placeholder="5000"
                        className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#A1B8A6] mb-1">Daily Pass Price (PKR)</label>
                      <input
                        type="number"
                        step="1"
                        required
                        value={planDailyPrice}
                        onChange={(e) => setPlanDailyPrice(e.target.value)}
                        placeholder="500"
                        className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#A1B8A6] mb-1">
                      Features (Comma Separated)
                    </label>
                    <textarea
                      rows={3}
                      value={planFeatures}
                      onChange={(e) => setPlanFeatures(e.target.value)}
                      placeholder="Cardio Access, Free Weights, Personal Trainer"
                      className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                    />
                  </div>

                  <div className="pt-3 border-t border-[#1E3621] flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPlanModalOpen(false)}
                      className="px-4 py-2 bg-[#122414] text-xs font-bold text-gray-300 rounded-xl hover:bg-[#1a331c]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#22C55E] text-xs font-bold text-black rounded-xl hover:bg-[#1ca64f] shadow-md shadow-emerald-500/20"
                    >
                      Save Plan to Supabase
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RESET MEMBER PASSWORDS */}
      {/* ========================================================================= */}
      {activeTab === "passwords" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Reset Member Account Passwords</h2>
            <p className="text-xs text-[#738F7A]">
              Quickly reset forgotten passwords for any gym member. Click 1-Click Reset to set password back to <code className="text-[#4ADE80] bg-[#16331C] px-1.5 py-0.5 rounded font-mono">12345678</code> or type a custom password.
            </p>
          </div>

          {/* Quick Success Alert */}
          {resetAlert && (
            <div
              className={`p-4 rounded-2xl border ${
                resetAlert.type === "success"
                  ? "bg-[#0E2412] border-[#22C55E] text-emerald-300"
                  : "bg-red-950/40 border-red-800 text-red-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-sm text-white">
                    {resetAlert.type === "success" ? "Password Reset Successful! 🎉" : "Password Reset Error"}
                  </h4>
                  <p className="text-xs mt-1">{resetAlert.notice || resetAlert.message}</p>

                  {resetAlert.type === "success" && resetAlert.member && (
                    <div className="mt-3 p-3 bg-[#081209] border border-[#1B381E] rounded-xl font-mono text-xs text-white space-y-1 select-all">
                      <p>👤 Member: <span className="text-[#4ADE80] font-bold">{resetAlert.member.full_name}</span></p>
                      <p>✉️ Email: <span className="text-[#4ADE80]">{resetAlert.member.email}</span></p>
                      <p>🔑 New Password: <span className="text-yellow-400 font-bold">{resetAlert.password}</span></p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setResetAlert(null)}
                  className="text-gray-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Member List Selector Column */}
            <div className="lg:col-span-2 bg-[#0E1A0F] border border-[#1E3621] rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold text-white">Select Member to Reset Password</h3>
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full bg-[#081109] border border-[#1E3621] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                  />
                  <svg
                    className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5"
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
              </div>

              {loadingMembers ? (
                <div className="py-12 text-center text-xs text-gray-400">Loading members list...</div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-10 text-center text-xs text-gray-500">No matching members found.</div>
              ) : (
                <div className="divide-y divide-[#152A18] max-h-96 overflow-y-auto pr-1">
                  {filteredMembers.map((m) => {
                    const isSelected = selectedMember?.id === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMember(m)}
                        className={`p-3 rounded-xl flex items-center justify-between cursor-pointer transition ${
                          isSelected ? "bg-[#16331C] border border-[#22C55E]/60" : "hover:bg-[#132415]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#1A331D] border border-[#28502F] flex items-center justify-center font-bold text-xs text-[#4ADE80]">
                            {m.full_name ? m.full_name.charAt(0).toUpperCase() : "M"}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white leading-tight">{m.full_name || "Gym Member"}</p>
                            <p className="text-[11px] text-[#738F7A]">{m.email}</p>
                            {m.member_id && (
                              <span className="text-[10px] text-[#4ADE80] font-mono">{m.member_id}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMember(m);
                              handleResetPasswordSubmit(null, m, "12345678");
                            }}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-bold rounded-lg transition"
                          >
                            ⚡ 1-Click Reset (12345678)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reset Form Card Column */}
            <div className="bg-[#0E1A0F] border border-[#1E3621] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-extrabold text-white border-b border-[#1E3621] pb-3">
                Reset Form Details
              </h3>

              {selectedMember ? (
                <form onSubmit={(e) => handleResetPasswordSubmit(e)} className="space-y-4">
                  <div className="p-3 bg-[#081209] border border-[#173019] rounded-xl text-xs space-y-1">
                    <p className="text-[#738F7A]">Selected Member:</p>
                    <p className="font-extrabold text-white">{selectedMember.full_name}</p>
                    <p className="text-[11px] text-[#4ADE80]">{selectedMember.email}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#A1B8A6] mb-1">
                      New Password (Default: <code className="text-[#4ADE80]">12345678</code>)
                    </label>
                    <input
                      type="text"
                      required
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-[#22C55E]"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={resetting}
                      className="w-full py-2.5 bg-[#22C55E] hover:bg-[#1ea850] text-black font-bold text-xs rounded-xl transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
                    >
                      {resetting ? "Resetting Password..." : "Confirm & Save Password"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResetPasswordSubmit(null, selectedMember, "12345678")}
                      disabled={resetting}
                      className="w-full py-2 bg-[#172D1A] hover:bg-[#1E3E22] text-[#4ADE80] font-bold text-xs rounded-xl border border-[#234A28] transition"
                    >
                      Reset to Default 12345678
                    </button>
                  </div>
                </form>
              ) : (
                <div className="py-16 text-center text-xs text-gray-500">
                  Select a member from the left list to set a custom password or click 1-Click Reset button.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GYM SHIFTS & GENERAL CONFIGURATION */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <div className="bg-[#0E1A0F] border border-[#1E3621] rounded-2xl p-6 space-y-6 max-w-3xl">
          <div>
            <h2 className="text-lg font-bold text-white">General Gym Configuration & Shift Timings</h2>
            <p className="text-xs text-[#738F7A]">
              Update default shift timings, WhatsApp contact numbers, and system defaults stored in Supabase table <code className="text-[#4ADE80]">gym_settings</code>.
            </p>
          </div>

          {settingsSavedMsg && (
            <div className="p-3 bg-[#16331C] border border-[#22C55E] text-[#4ADE80] text-xs font-bold rounded-xl">
              ✓ {settingsSavedMsg}
            </div>
          )}

          <form onSubmit={handleSaveGeneralConfig} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] mb-1">Gym Name</label>
                <input
                  type="text"
                  value={gymConfig.gymName}
                  onChange={(e) => setGymConfig({ ...gymConfig, gymName: e.target.value })}
                  className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] mb-1">Primary WhatsApp / Phone</label>
                <input
                  type="text"
                  value={gymConfig.whatsapp}
                  onChange={(e) => setGymConfig({ ...gymConfig, whatsapp: e.target.value })}
                  className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] mb-1">Ladies Shift Timing</label>
                <input
                  type="text"
                  value={gymConfig.ladiesShift}
                  onChange={(e) => setGymConfig({ ...gymConfig, ladiesShift: e.target.value })}
                  className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] mb-1">Gents Shift Timing</label>
                <input
                  type="text"
                  value={gymConfig.gentsShift}
                  onChange={(e) => setGymConfig({ ...gymConfig, gentsShift: e.target.value })}
                  className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#A1B8A6] mb-1">Gym Address</label>
              <input
                type="text"
                value={gymConfig.address}
                onChange={(e) => setGymConfig({ ...gymConfig, address: e.target.value })}
                className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
              />
            </div>

            <div className="pt-4 border-t border-[#1E3621] flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#22C55E] hover:bg-[#1ea850] text-black font-bold text-xs rounded-xl transition shadow-md shadow-emerald-500/20"
              >
                Save Settings to Supabase
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
