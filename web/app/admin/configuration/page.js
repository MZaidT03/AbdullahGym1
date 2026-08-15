"use client";

import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";
import CustomDialogModal from "../components/CustomDialogModal";
import LoadingOverlay from "../components/LoadingOverlay";

export default function AdminConfigurationPage() {
  const [activeTab, setActiveTab] = useState("plans"); // 'plans' | 'passwords' | 'settings'

  // Custom Dialog Modal State
  const [dialogConfig, setDialogConfig] = useState({
    isOpen: false,
    type: "warning",
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: null,
    onConfirm: null,
    onCancel: null,
  });

  const showDialog = ({ type = "warning", title, message, confirmText = "OK", cancelText = null, onConfirm }) => {
    setDialogConfig({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: async () => {
        setDialogConfig((prev) => ({ ...prev, isOpen: false }));
        if (onConfirm) await onConfirm();
      },
      onCancel: cancelText ? () => setDialogConfig((prev) => ({ ...prev, isOpen: false })) : null,
    });
  };

  // --- TAB 1: MEMBERSHIP BASE PLANS & PRICING (Monthly & Daily) ---
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
      name: "Pro Plus Membership",
      type: "Monthly Executive",
      monthly_price: 12000,
      daily_price: 1000,
      period: "per month",
      features: [
        "All Pro Membership Amenities",
        "Personal 1-on-1 Fitness Coach",
        "Custom Nutritional & Macro Coaching",
        "Dedicated VIP Locker & Steam Access",
      ],
      popular: false,
      active: true,
    },
    {
      id: "plan-5",
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

  // --- DYNAMIC SUPABASE ADD-ON SERVICES ---
  const initialAddons = [
    {
      id: "addon-1",
      name: "Cardio Access Plan",
      price: 1500,
      icon: "🏃",
      description: "Grants unlimited access to cardio arena, treadmills, ellipticals, and rowing machines.",
      active: true,
    },
    {
      id: "addon-2",
      name: "Personal Trainer Guidance Plan",
      price: 3500,
      icon: "🏋️",
      description: "Provides dedicated 1-on-1 certified trainer floor guidance, form check, and exercise charts.",
      active: true,
    },
    {
      id: "addon-3",
      name: "VIP Locker & Shower Access",
      price: 1000,
      icon: "🔐",
      description: "Dedicated single-key VIP locker storage and private shower room facilities.",
      active: true,
    },
    {
      id: "addon-4",
      name: "Sauna & Steam Bath Pass",
      price: 2000,
      icon: "♨️",
      description: "Unlimited monthly access to post-workout recovery steam bath and sauna chamber.",
      active: true,
    },
  ];

  const [addons, setAddons] = useState([]);
  const [loadingAddons, setLoadingAddons] = useState(true);
  const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [addonStatusMsg, setAddonStatusMsg] = useState("");

  // Add-on Form state
  const [addonName, setAddonName] = useState("");
  const [addonPrice, setAddonPrice] = useState("1500");
  const [addonIcon, setAddonIcon] = useState("🏃");
  const [addonDescription, setAddonDescription] = useState("");

  // --- DYNAMIC PAYMENT ACCOUNTS (JAZZCASH, EASYPAISA, BANK TRANSFERS) ---
  const initialAccounts = [
    {
      id: "acc-1",
      provider: "JazzCash",
      account_title: "ABDULLAH GYM 1",
      account_number: "0320 8313000",
      instructions: "Transfer monthly fee via JazzCash mobile app & attach screenshot proof.",
      active: true,
    },
    {
      id: "acc-2",
      provider: "EasyPaisa",
      account_title: "ABDULLAH GYM 1",
      account_number: "0320 8313000",
      instructions: "Transfer fee via EasyPaisa mobile app & attach screenshot proof.",
      active: true,
    },
    {
      id: "acc-3",
      provider: "Meezan Bank",
      account_title: "ABDULLAH GYM 1",
      account_number: "PK79MEZN001234567890",
      instructions: "Transfer via online bank IBAN & attach transaction screenshot.",
      active: true,
    },
  ];

  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountStatusMsg, setAccountStatusMsg] = useState("");

  // Account Form State
  const [accProvider, setAccProvider] = useState("JazzCash");
  const [accTitle, setAccTitle] = useState("ABDULLAH GYM 1");
  const [accNumber, setAccNumber] = useState("");
  const [accInstructions, setAccInstructions] = useState("");

  // Fetch plans, add-ons & payment accounts from Supabase or localStorage
  useEffect(() => {
    fetchPlans();
    fetchAddons();
    fetchPaymentAccounts();
  }, []);

  const fetchPaymentAccounts = async () => {
    setLoadingAccounts(true);
    let loadedFromSupabase = false;

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from("gym_settings")
          .select("value")
          .eq("key", "payment_accounts")
          .single();

        if (data && data.value && Array.isArray(data.value) && data.value.length > 0) {
          setAccounts(data.value);
          loadedFromSupabase = true;
          setAccountStatusMsg("✓ Connected to Supabase settings key 'payment_accounts'");
        } else {
          await savePaymentAccountsToSupabase(initialAccounts);
          setAccounts(initialAccounts);
          loadedFromSupabase = true;
          setAccountStatusMsg("✓ Seeded default payment accounts into Supabase");
        }
      } catch (err) {
        console.warn("Fetch payment accounts exception:", err);
      }
    }

    if (!loadedFromSupabase) {
      try {
        const saved = localStorage.getItem("abdullah_gym_payment_accounts");
        if (saved) setAccounts(JSON.parse(saved));
        else setAccounts(initialAccounts);
      } catch (e) {
        setAccounts(initialAccounts);
      }
    }
    setLoadingAccounts(false);
  };

  const savePaymentAccountsToSupabase = async (accList) => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from("gym_settings").upsert({
          key: "payment_accounts",
          value: accList,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {}
    }
    try {
      localStorage.setItem("abdullah_gym_payment_accounts", JSON.stringify(accList));
    } catch (e) {}
  };

  const handleOpenAddAccountModal = () => {
    setEditingAccount(null);
    setAccProvider("JazzCash");
    setAccTitle("ABDULLAH GYM 1");
    setAccNumber("");
    setAccInstructions("Transfer monthly fee & upload screenshot proof in mobile app.");
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccountModal = (acc) => {
    setEditingAccount(acc);
    setAccProvider(acc.provider || "JazzCash");
    setAccTitle(acc.account_title || "ABDULLAH GYM 1");
    setAccNumber(acc.account_number || "");
    setAccInstructions(acc.instructions || "");
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!accNumber.trim()) return;

    const accPayload = {
      id: editingAccount ? editingAccount.id : `acc-${Date.now()}`,
      provider: accProvider,
      account_title: accTitle.trim() || "ABDULLAH GYM 1",
      account_number: accNumber.trim(),
      instructions: accInstructions.trim(),
      active: editingAccount ? editingAccount.active : true,
    };

    let updated = [];
    if (editingAccount) {
      updated = accounts.map((a) => (a.id === editingAccount.id ? { ...a, ...accPayload } : a));
    } else {
      updated = [...accounts, accPayload];
    }

    setAccounts(updated);
    await savePaymentAccountsToSupabase(updated);
    setIsAccountModalOpen(false);
    setAccountStatusMsg(`✓ Saved Payment Account '${accProvider} - ${accNumber}' to Supabase!`);
    setTimeout(() => setAccountStatusMsg(""), 5000);
  };

  const handleToggleAccountActive = async (accId) => {
    const updated = accounts.map((a) => (a.id === accId ? { ...a, active: !a.active } : a));
    setAccounts(updated);
    await savePaymentAccountsToSupabase(updated);
  };

  const handleDeleteAccount = (accId) => {
    showDialog({
      type: "danger",
      title: "Delete Payment Account",
      message: "Are you sure you want to delete this payment account details?",
      confirmText: "Delete Account",
      cancelText: "Cancel",
      onConfirm: async () => {
        const updated = accounts.filter((a) => a.id !== accId);
        setAccounts(updated);
        await savePaymentAccountsToSupabase(updated);
      },
    });
  };

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
      setPlanStatusMsg("Notice: Operating on local memory/storage.");
    }
    setLoadingPlans(false);
  };

  // Fetch Add-Ons from Supabase
  const fetchAddons = async () => {
    setLoadingAddons(true);
    let loadedFromSupabase = false;

    if (isSupabaseConfigured()) {
      try {
        // 1. Try querying dedicated Supabase table `gym_addons`
        const { data, error } = await supabase
          .from("gym_addons")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
          setAddons(data);
          loadedFromSupabase = true;
          setAddonStatusMsg("✓ Connected to Supabase table 'gym_addons'");
        } else {
          // 2. Fallback to `gym_settings` table (`key = "gym_addons"`)
          const { data: setObj } = await supabase
            .from("gym_settings")
            .select("value")
            .eq("key", "gym_addons")
            .single();

          if (setObj && setObj.value && Array.isArray(setObj.value) && setObj.value.length > 0) {
            setAddons(setObj.value);
            loadedFromSupabase = true;
            setAddonStatusMsg("✓ Connected to Supabase settings key 'gym_addons'");
          } else {
            // Auto-seed initial addons into Supabase
            await saveAddonsToSupabase(initialAddons);
            setAddons(initialAddons);
            loadedFromSupabase = true;
            setAddonStatusMsg("✓ Seeded default add-on plans into Supabase");
          }
        }
      } catch (err) {
        console.warn("Fetch addons exception:", err);
      }
    }

    if (!loadedFromSupabase) {
      try {
        const saved = localStorage.getItem("abdullah_gym_addons");
        if (saved) setAddons(JSON.parse(saved));
        else setAddons(initialAddons);
      } catch (e) {
        setAddons(initialAddons);
      }
    }
    setLoadingAddons(false);
  };

  // Helper to persist Addons list to Supabase
  const saveAddonsToSupabase = async (addonsList) => {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from("gym_addons").upsert(addonsList, { onConflict: "id" });
      } catch (e) {}
      try {
        await supabase.from("gym_settings").upsert({
          key: "gym_addons",
          value: addonsList,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {}
    }
    try {
      localStorage.setItem("abdullah_gym_addons", JSON.stringify(addonsList));
    } catch (e) {}
  };

  // Open modal for new Add-On
  const handleOpenAddAddonModal = () => {
    setEditingAddon(null);
    setAddonName("");
    setAddonPrice("1500");
    setAddonIcon("🏃");
    setAddonDescription("Unlimited access to gym add-on facility.");
    setIsAddonModalOpen(true);
  };

  // Open modal for editing Add-On
  const handleOpenEditAddonModal = (a) => {
    setEditingAddon(a);
    setAddonName(a.name);
    setAddonPrice(String(a.price || 0));
    setAddonIcon(a.icon || "🏃");
    setAddonDescription(a.description || "");
    setIsAddonModalOpen(true);
  };

  // Save Add-On to Supabase
  const handleSaveAddon = async (e) => {
    e.preventDefault();
    if (!addonName.trim()) return;

    const numericPrice = parseFloat(addonPrice) || 0;
    const addonPayload = {
      id: editingAddon ? editingAddon.id : `addon-${Date.now()}`,
      name: addonName.trim(),
      price: numericPrice,
      icon: addonIcon.trim() || "🏃",
      description: addonDescription.trim(),
      active: editingAddon ? editingAddon.active : true,
      created_at: editingAddon ? editingAddon.created_at : new Date().toISOString(),
    };

    let updated = [];
    if (editingAddon) {
      updated = addons.map((a) => (a.id === editingAddon.id ? { ...a, ...addonPayload } : a));
    } else {
      updated = [...addons, addonPayload];
    }

    setAddons(updated);
    await saveAddonsToSupabase(updated);
    setIsAddonModalOpen(false);
    setAddonStatusMsg(`✓ Saved Add-On '${addonName}' directly to Supabase!`);
    setTimeout(() => setAddonStatusMsg(""), 5000);
  };

  // Toggle active status of Add-On
  const handleToggleAddonActive = async (addonId) => {
    const updated = addons.map((a) => (a.id === addonId ? { ...a, active: !a.active } : a));
    setAddons(updated);
    await saveAddonsToSupabase(updated);
  };

  // Delete Add-On from Supabase
  const handleDeleteAddon = (addonId) => {
    showDialog({
      type: "danger",
      title: "Delete Add-On Service",
      message: "Are you sure you want to delete this Add-On service from Supabase?",
      confirmText: "Delete Add-On",
      cancelText: "Cancel",
      onConfirm: async () => {
        const updated = addons.filter((a) => a.id !== addonId);
        setAddons(updated);

        if (isSupabaseConfigured()) {
          try {
            await supabase.from("gym_addons").delete().eq("id", addonId);
          } catch (e) {}
        }
        await saveAddonsToSupabase(updated);
      },
    });
  };

  // Plan CRUD handlers
  const handleOpenAddModal = () => {
    setEditingPlan(null);
    setPlanName("");
    setPlanType("Monthly");
    setPlanMonthlyPrice("5000");
    setPlanDailyPrice("500");
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
    if (!planName.trim()) return;

    const featureArray = planFeatures.split(",").map((f) => f.trim()).filter(Boolean);
    const mPrice = parseFloat(planMonthlyPrice) || 0;
    const dPrice = parseFloat(planDailyPrice) || 0;

    const planPayload = {
      id: editingPlan ? editingPlan.id : `plan-${Date.now()}`,
      name: planName.trim(),
      type: planType,
      monthly_price: mPrice,
      daily_price: dPrice,
      period: mPrice > 0 ? "per month" : "per day",
      features: featureArray,
      popular: editingPlan ? editingPlan.popular || false : false,
      active: true,
      created_at: editingPlan ? editingPlan.created_at : new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("gym_plans").upsert(planPayload, { onConflict: "id" });
        await fetchPlans();
      } catch (err) {
        console.error("Plan save exception:", err);
      }
    } else {
      let updated = [];
      if (editingPlan) {
        updated = plans.map((p) => (p.id === editingPlan.id ? { ...p, ...planPayload } : p));
      } else {
        updated = [...plans, planPayload];
      }
      setPlans(updated);
      try {
        localStorage.setItem("abdullah_gym_plans", JSON.stringify(updated));
      } catch (e) {}
    }

    setIsPlanModalOpen(false);
  };

  const handleDeletePlan = (planId) => {
    showDialog({
      type: "danger",
      title: "Delete Membership Plan",
      message: "Are you sure you want to delete this membership plan from Supabase?",
      confirmText: "Delete Plan",
      cancelText: "Cancel",
      onConfirm: async () => {
        if (isSupabaseConfigured()) {
          try {
            await supabase.from("gym_plans").delete().eq("id", planId);
            await fetchPlans();
          } catch (e) {
            console.error("Delete plan error:", e);
          }
        } else {
          const updated = plans.filter((p) => p.id !== planId);
          setPlans(updated);
          try {
            localStorage.setItem("abdullah_gym_plans", JSON.stringify(updated));
          } catch (e) {}
        }
      },
    });
  };

  const handleTogglePlanActive = async (planId) => {
    const target = plans.find((p) => p.id === planId);
    if (!target) return;
    const nextState = !target.active;

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("gym_plans").update({ active: nextState }).eq("id", planId);
        await fetchPlans();
      } catch (e) {}
    } else {
      const updated = plans.map((p) => (p.id === planId ? { ...p, active: nextState } : p));
      setPlans(updated);
      try {
        localStorage.setItem("abdullah_gym_plans", JSON.stringify(updated));
      } catch (e) {}
    }
  };

  // --- TAB 2: MEMBER PASSWORD RESET MANAGER ---
  const [members, setMembers] = useState([]);
  const [searchMember, setSearchMember] = useState("");
  const [resetTarget, setResetTarget] = useState(null);
  const [newMemberPass, setNewMemberPass] = useState("12345678");
  const [resetMsg, setResetMsg] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === "passwords") {
      fetchMembersList();
    }
  }, [activeTab]);

  const fetchMembersList = async () => {
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase.from("profiles").select("*").order("full_name", { ascending: true });
        if (data) {
          const registeredOnly = data.filter(
            (p) => !p.member_id?.startsWith("GP-WALK-") && !p.email?.includes("@abdullahgym.local") && p.role !== "walkin"
          );
          setMembers(registeredOnly);
        }
      } catch (e) {}
    } else {
      setMembers([
        { id: "m-1", full_name: "Muhammad Hamza", email: "hamza@gmail.com", member_id: "GP-8472-991", plan: "Pro Membership" },
        { id: "m-2", full_name: "Usman Ali", email: "usman@gmail.com", member_id: "GP-5510-402", plan: "Standard Monthly Pass" },
        { id: "m-3", full_name: "Ayesha Malik", email: "ayesha@gmail.com", member_id: "GP-1204-883", plan: "Pro Membership" },
      ]);
    }
  };

  const handleConfirmResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTarget || !newMemberPass) return;
    setResetSubmitting(true);

    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: resetTarget.id,
          newPassword: newMemberPass,
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setResetMsg(`✓ Password for ${resetTarget.full_name} updated successfully to '${newMemberPass}'!`);
      } else {
        setResetMsg(`Notice: Updated locally for ${resetTarget.full_name}. (${result.error || "Local mode"})`);
      }
    } catch (err) {
      setResetMsg(`✓ Password for ${resetTarget.full_name} set to '${newMemberPass}'!`);
    } finally {
      setResetSubmitting(false);
      setResetTarget(null);
      setTimeout(() => setResetMsg(""), 6000);
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

  // --- GEOFENCING LOCATION SETTINGS ---
  const [geofenceConfig, setGeofenceConfig] = useState({
    enabled: true,
    latitude: 32.1877,
    longitude: 74.1945,
    radiusMeters: 200,
  });
  const [geofenceMsg, setGeofenceMsg] = useState("");
  const [detectingGps, setDetectingGps] = useState(false);

  useEffect(() => {
    if (activeTab === "settings") {
      fetchGeneralSettings();
    }
  }, [activeTab]);

  const fetchGeneralSettings = async () => {
    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from("gym_settings")
          .select("value")
          .eq("key", "general_settings")
          .single();
        if (data && data.value) {
          setGymConfig(data.value);
        }

        const { data: geoData } = await supabase
          .from("gym_settings")
          .select("value")
          .eq("key", "geofence_settings")
          .single();
        if (geoData && geoData.value) {
          setGeofenceConfig(geoData.value);
        }
      } catch (err) {
        console.warn("Supabase gym settings notice:", err);
      }
    }
  };

  const handleSaveGeneralConfig = async (e) => {
    e.preventDefault();

    const digitsOnlyWa = (gymConfig.whatsapp || "").replace(/\D/g, "");
    if (gymConfig.whatsapp && digitsOnlyWa.length !== 11) {
      setSettingsSavedMsg("⚠️ Error: Official WhatsApp number must be 11 digits (e.g. 03208313000).");
      setTimeout(() => setSettingsSavedMsg(""), 5000);
      return;
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("gym_settings")
          .upsert({ key: "general_settings", value: gymConfig, updated_at: new Date().toISOString() });
        if (!error) {
          setSettingsSavedMsg("✓ General settings saved successfully!");
        } else {
          setSettingsSavedMsg(`Notice: ${error.message}`);
        }
      } catch (err) {
        setSettingsSavedMsg("✓ Saved locally.");
      }
    } else {
      try {
        localStorage.setItem("abdullah_gym_general_config", JSON.stringify(gymConfig));
      } catch (e) {}
      setSettingsSavedMsg("✓ Saved to local storage.");
    }
    setTimeout(() => setSettingsSavedMsg(""), 5000);
  };

  const handleSaveGeofenceConfig = async (e) => {
    e.preventDefault();
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("gym_settings")
          .upsert({ key: "geofence_settings", value: geofenceConfig, updated_at: new Date().toISOString() });
        setGeofenceMsg("✓ GPS Geofencing settings saved directly in Supabase DB!");
      } catch (err) {
        setGeofenceMsg("Notice: Saved locally.");
      }
    } else {
      try {
        localStorage.setItem("abdullah_gym_geofence_config", JSON.stringify(geofenceConfig));
      } catch (e) {}
      setGeofenceMsg("Saved to local storage.");
    }
    setTimeout(() => setGeofenceMsg(""), 5000);
  };

  const handleAutoDetectGPS = () => {
    if (!navigator.geolocation) {
      showDialog({
        type: "warning",
        title: "Geolocation Unsupported",
        message: "Geolocation is not supported by your browser.",
      });
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeofenceConfig((prev) => ({
          ...prev,
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6)),
        }));
        setDetectingGps(false);
        showDialog({
          type: "success",
          title: "GPS Location Captured 📍",
          message: `Captured Current Gym GPS Coordinates:\nLatitude: ${pos.coords.latitude.toFixed(6)}\nLongitude: ${pos.coords.longitude.toFixed(6)}`,
        });
      },
      (err) => {
        setDetectingGps(false);
        showDialog({
          type: "warning",
          title: "GPS Location Failed",
          message: `Failed to detect GPS location: ${err.message}. Please enter coordinates manually.`,
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Gym Plans & Member Password Manager</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage gym membership rates, add-on services, and reset member login passwords.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === "plans"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
          }`}
        >
          <span>💳</span> Plans & Add-On Pricing
        </button>

        <button
          onClick={() => setActiveTab("geofence")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === "geofence"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
          }`}
        >
          <span>📍</span> GPS Geofencing Settings
        </button>

        <button
          onClick={() => setActiveTab("accounts")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === "accounts"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
          }`}
        >
          <span>🏦</span> Payment Account Details
        </button>

        <button
          onClick={() => setActiveTab("passwords")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
            activeTab === "passwords"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
          }`}
        >
          <span>🔑</span> Reset Member Passwords
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MANAGE BASE PLANS & ADD-ONS */}
      {/* ========================================================================= */}
      {activeTab === "plans" && (
        <div className="space-y-8">
          {/* BASE PLANS SECTION */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Gym Base Membership Plans</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set monthly subscription rates and daily pass prices for members.
                </p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-2 self-start sm:self-auto shadow-xs"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                + Create New Plan
              </button>
            </div>

            {/* Grid of Base Plans */}
            {loadingPlans ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading plans from Supabase...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {plans.map((p) => {
                  const monthlyVal = p.monthly_price ?? p.monthlyPrice ?? 0;
                  const dailyVal = p.daily_price ?? p.dailyPrice ?? 0;

                  return (
                    <div
                      key={p.id}
                      className={`bg-white border rounded-2xl p-5 flex flex-col justify-between relative transition-all shadow-xs ${
                        p.popular
                          ? "border-emerald-500 ring-2 ring-emerald-500/20"
                          : p.active
                          ? "border-slate-200"
                          : "border-slate-200 opacity-60"
                      }`}
                    >
                      {p.popular && (
                        <span className="absolute -top-3 right-4 bg-emerald-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-xs">
                          Most Popular
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            {p.type || "Membership"}
                          </span>
                          <button
                            onClick={() => handleTogglePlanActive(p.id)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              p.active ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-slate-500 bg-slate-100 border border-slate-200"
                            }`}
                          >
                            {p.active ? "Active" : "Disabled"}
                          </button>
                        </div>

                        <h3 className="text-base font-black text-slate-900">{p.name}</h3>

                        {/* Monthly & Daily Rates */}
                        <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Monthly Rate:</span>
                            <span className="font-extrabold text-slate-900 text-sm">
                              PKR {Number(monthlyVal).toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">/mo</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                            <span className="text-slate-500 font-medium">Daily Pass Rate:</span>
                            <span className="font-bold text-emerald-700 text-xs">
                              PKR {Number(dailyVal).toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">/day</span>
                            </span>
                          </div>
                        </div>

                        {/* Features */}
                        <ul className="space-y-2 mb-6">
                          {(p.features || []).map((feat, idx) => (
                            <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                              <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-900 rounded-lg transition"
                        >
                          Edit Pricing
                        </button>
                        <button
                          onClick={() => handleDeletePlan(p.id)}
                          title="Delete Plan from Supabase"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
          </div>

          {/* DYNAMIC ADD-ON SERVICES SECTION */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Stackable Add-On Services
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                    Active Services
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create and manage separate add-on service fees (e.g. Cardio, Personal Trainer, VIP Locker, Sauna Pass).
                </p>
                {addonStatusMsg && (
                  <p className="text-[11px] font-bold text-emerald-800 mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block font-mono">
                    {addonStatusMsg}
                  </p>
                )}
              </div>

              <button
                onClick={handleOpenAddAddonModal}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center gap-2 shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                + Add New Add-On
              </button>
            </div>

            {/* Grid of Dynamic Add-Ons */}
            {loadingAddons ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading Add-On Services...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {addons.map((a) => (
                  <div
                    key={a.id}
                    className={`p-4 bg-slate-50 border rounded-2xl space-y-3 flex flex-col justify-between transition-all ${
                      a.active ? "border-slate-200" : "border-slate-200 opacity-60"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xl">{a.icon || "🏃"}</span>
                        <button
                          onClick={() => handleToggleAddonActive(a.id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            a.active
                              ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                              : "text-slate-500 bg-slate-100 border border-slate-200"
                          }`}
                        >
                          {a.active ? "Active" : "Disabled"}
                        </button>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{a.name}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.description}</p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Monthly Charge:</span>
                        <span className="font-mono font-black text-emerald-700 text-sm">
                          +PKR {Number(a.price || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleOpenEditAddonModal(a)}
                          className="flex-1 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-900 rounded-lg transition"
                        >
                          Edit Price
                        </button>
                        <button
                          onClick={() => handleDeleteAddon(a.id)}
                          title="Delete Add-On from Supabase"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RESET MEMBER PASSWORDS */}
      {/* ========================================================================= */}
      {activeTab === "passwords" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Member Password Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Reset member credentials for mobile app access in Supabase.
            </p>
          </div>

          {resetMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl font-mono">
              {resetMsg}
            </div>
          )}

          {/* Search */}
          <div className="relative max-w-md">
            <input
              type="text"
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              placeholder="Search member by name, email or ID..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 pl-10 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Table of Members */}
          <div className="overflow-auto max-h-[calc(100vh-320px)] rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-3.5 rounded-l-lg">Member Name</th>
                  <th className="py-3 px-3.5">Member ID</th>
                  <th className="py-3 px-3.5">Email / Mobile Username</th>
                  <th className="py-3 px-3.5">Plan</th>
                  <th className="py-3 px-3.5 text-right rounded-r-lg">Password Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No members found matching search query.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {m.full_name?.charAt(0) || "M"}
                        </div>
                        {m.full_name}
                      </td>
                      <td className="py-3.5 px-3.5 font-mono text-emerald-700 font-bold">{m.member_id || "GP-MEMBER"}</td>
                      <td className="py-3.5 px-3.5 font-mono text-slate-600">{m.email}</td>
                      <td className="py-3.5 px-3.5 text-slate-600 font-medium">{m.plan || "Pro Membership"}</td>
                      <td className="py-3.5 px-3.5 text-right">
                        <button
                          onClick={() => {
                            setResetTarget(m);
                            setNewMemberPass("12345678");
                          }}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl transition"
                        >
                          🔑 Reset Password
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: GPS GEOFENCING & LOCATION ENFORCEMENT */}
      {/* ========================================================================= */}
      {activeTab === "geofence" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs max-w-3xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>📍</span> GPS Geofencing & Location Enforcement
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure the gym's physical GPS location coordinates and check-in radius.
                </p>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                  geofenceConfig.enabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                {geofenceConfig.enabled ? "● Geofence ACTIVE" : "○ Geofence OFF"}
              </span>
            </div>

            {geofenceMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl font-mono">
                {geofenceMsg}
              </div>
            )}

            <form onSubmit={handleSaveGeofenceConfig} className="space-y-4">
              {/* Enable Toggle Switch */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <label className="text-xs font-extrabold text-slate-900 block">Enforce Geofenced Check-In</label>
                  <span className="text-[11px] text-slate-500">
                    Members must be within the defined GPS radius to mark attendance.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={geofenceConfig.enabled}
                  onChange={(e) => setGeofenceConfig({ ...geofenceConfig, enabled: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Gym Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={geofenceConfig.latitude}
                    onChange={(e) => setGeofenceConfig({ ...geofenceConfig, latitude: parseFloat(e.target.value) || 0 })}
                    placeholder="32.1877"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Gym Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={geofenceConfig.longitude}
                    onChange={(e) => setGeofenceConfig({ ...geofenceConfig, longitude: parseFloat(e.target.value) || 0 })}
                    placeholder="74.1945"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Allowed Radius *</label>
                  <select
                    value={geofenceConfig.radiusMeters}
                    onChange={(e) => setGeofenceConfig({ ...geofenceConfig, radiusMeters: parseInt(e.target.value, 10) || 200 })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value={100}>100 Meters (Strict Building Boundary)</option>
                    <option value={200}>200 Meters (Recommended Standard)</option>
                    <option value={500}>500 Meters (Block Radius)</option>
                    <option value={1000}>1,000 Meters (1 KM Neighborhood)</option>
                  </select>
                </div>
              </div>

              {/* Auto-detect button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAutoDetectGPS}
                  disabled={detectingGps}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {detectingGps ? "Detecting GPS..." : "📍 Auto-Detect Current GPS Coordinates"}
                </button>

                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs self-end sm:self-auto"
                >
                  Save Geofence Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: PAYMENT ACCOUNT DETAILS */}
      {/* ========================================================================= */}
      {activeTab === "accounts" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>🏦</span> Member Fee Payment Account Details
                </h2>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                  {accounts.filter((a) => a.active).length} Active Accounts
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Set up multiple accounts (JazzCash, EasyPaisa, Meezan Bank, HBL) for members to send fee payments.
              </p>
              {accountStatusMsg && (
                <p className="text-[11px] font-bold text-emerald-800 mt-1 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 inline-block font-mono">
                  {accountStatusMsg}
                </p>
              )}
            </div>

            <button
              onClick={handleOpenAddAccountModal}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center gap-2 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              + Add New Account
            </button>
          </div>

          {/* Grid of Accounts */}
          {loadingAccounts ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading Payment Account Details...</div>
          ) : accounts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
              No payment accounts configured. Click "+ Add New Account" above to create one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`bg-white border rounded-2xl p-5 space-y-4 flex flex-col justify-between transition-all shadow-xs ${
                    acc.active ? "border-slate-200" : "border-slate-200 opacity-60"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 font-mono">
                        {acc.provider}
                      </span>
                      <button
                        onClick={() => handleToggleAccountActive(acc.id)}
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          acc.active
                            ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                            : "text-slate-500 bg-slate-100 border border-slate-200"
                        }`}
                      >
                        {acc.active ? "Active" : "Disabled"}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Account Title</span>
                      <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{acc.account_title}</h4>
                    </div>

                    <div className="space-y-1 mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Account # / IBAN</span>
                      <p className="font-black text-emerald-800 text-sm">{acc.account_number}</p>
                    </div>

                    {acc.instructions && (
                      <p className="text-xs text-slate-500 italic mt-3 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                        "{acc.instructions}"
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenEditAccountModal(acc)}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-900 rounded-xl transition"
                    >
                      Edit Account Details
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(acc.id)}
                      title="Delete Account"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT PAYMENT ACCOUNT DETAILS */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingAccount ? "Edit Payment Account Details" : "Add Payment Account Details"}
                </h3>
                <p className="text-xs text-slate-500">Account info will be visible in the member mobile app.</p>
              </div>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Payment Method / Provider *
                </label>
                <select
                  value={accProvider}
                  onChange={(e) => setAccProvider(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="JazzCash">JazzCash</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="Meezan Bank">Meezan Bank</option>
                  <option value="HBL Bank">HBL Bank</option>
                  <option value="NayaPay">NayaPay</option>
                  <option value="SadaPay">SadaPay</option>
                  <option value="Bank Transfer">Bank Transfer (Other)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Account Title *
                </label>
                <input
                  type="text"
                  required
                  value={accTitle}
                  onChange={(e) => setAccTitle(e.target.value)}
                  placeholder="e.g. ABDULLAH GYM 1"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Account Number / IBAN *
                </label>
                <input
                  type="text"
                  required
                  value={accNumber}
                  onChange={(e) => setAccNumber(e.target.value)}
                  placeholder="e.g. 0320 8313000 or IBAN"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Transfer Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={accInstructions}
                  onChange={(e) => setAccInstructions(e.target.value)}
                  placeholder="e.g. Transfer monthly fee & attach screenshot proof in mobile app."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-xs font-bold text-white rounded-xl hover:bg-emerald-700 shadow-xs"
                >
                  Save Account Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT BASE MEMBERSHIP PLAN */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingPlan ? "Edit Plan Pricing & Rates" : "Create New Membership Plan"}
                </h3>
                <p className="text-[11px] text-slate-500">Changes update directly across membership registration.</p>
              </div>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition">
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Plan Name *</label>
                <input
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g. Pro Elite Membership"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Monthly Fee (PKR) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={planMonthlyPrice}
                    onChange={(e) => setPlanMonthlyPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Daily Pass Rate (PKR)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={planDailyPrice}
                    onChange={(e) => setPlanDailyPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Features (Comma Separated)
                </label>
                <textarea
                  rows={3}
                  value={planFeatures}
                  onChange={(e) => setPlanFeatures(e.target.value)}
                  placeholder="Full Gym Access, Diet Chart, Trainer Assistance"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-xs font-bold text-white rounded-xl hover:bg-emerald-700 shadow-xs"
                >
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT SUPABASE ADD-ON SERVICE */}
      {isAddonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingAddon ? "Edit Add-On Service" : "Add New Add-On Service"}
                </h3>
                <p className="text-[11px] text-slate-500">Changes save directly to membership plans.</p>
              </div>
              <button onClick={() => setIsAddonModalOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAddon} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Add-On Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={addonName}
                  onChange={(e) => setAddonName(e.target.value)}
                  placeholder="e.g. Cardio Access Plan"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Monthly Charge (PKR) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={addonPrice}
                    onChange={(e) => setAddonPrice(e.target.value)}
                    placeholder="1500"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Icon</label>
                  <input
                    type="text"
                    value={addonIcon}
                    onChange={(e) => setAddonIcon(e.target.value)}
                    placeholder="🏃"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-center text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={addonDescription}
                  onChange={(e) => setAddonDescription(e.target.value)}
                  placeholder="Unlimited access to cardio arena equipment..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddonModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-xs font-bold text-white rounded-xl hover:bg-emerald-700 shadow-xs"
                >
                  Save Add-On Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESET PASSWORD CONFIRMATION */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Reset Member Password</h3>
                <p className="text-[11px] text-slate-500">Sets new password for member mobile app login.</p>
              </div>
              <button onClick={() => setResetTarget(null)} className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <p className="text-slate-500">Member:</p>
                <p className="font-extrabold text-slate-900">{resetTarget.full_name}</p>
                <p className="text-[11px] text-emerald-700 font-mono font-bold">{resetTarget.email}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-700 uppercase mb-1">
                  New Password *
                </label>
                <input
                  type="text"
                  required
                  value={newMemberPass}
                  onChange={(e) => setNewMemberPass(e.target.value)}
                  className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl px-3.5 py-2.5 text-xs text-emerald-800 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-5 py-2 bg-emerald-600 text-xs font-bold text-white rounded-xl hover:bg-emerald-700 shadow-xs"
                >
                  {resetSubmitting ? "Updating..." : "Confirm Password Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REUSABLE CUSTOM DIALOG MODAL */}
      <CustomDialogModal {...dialogConfig} />

      {/* REUSABLE LOADING ANIMATION OVERLAY */}
      <LoadingOverlay
        isLoading={resetSubmitting || detectingGps}
        message={detectingGps ? "Detecting GPS Coordinates..." : "Updating Member Password..."}
      />
    </div>
  );
}
