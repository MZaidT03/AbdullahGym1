"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";
import LoadingOverlay from "../components/LoadingOverlay";

// Auto-compress image to under maxKb (default 300KB)
async function compressImageFile(file, maxKb = 300) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      return reject(new Error("Please select a valid image file."));
    }

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        const maxDimension = 1024;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        let sizeKb = (dataUrl.length * (3 / 4)) / 1024;

        while (sizeKb > maxKb && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
          sizeKb = (dataUrl.length * (3 / 4)) / 1024;
        }

        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function MemberAvatar({ name, avatar_url, size = "md" }) {
  const sizeClasses = size === "lg" ? "w-16 h-16 text-xl" : "w-9 h-9 text-xs";
  if (avatar_url) {
    return (
      <img
        src={avatar_url}
        alt={name || "Member"}
        className={`${sizeClasses} rounded-full object-cover border-2 border-emerald-500/80 shadow-xs shrink-0`}
      />
    );
  }
  const initial = name ? name.charAt(0).toUpperCase() : "M";
  return (
    <div
      className={`${sizeClasses} rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black shrink-0 shadow-xs border border-emerald-400`}
    >
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
  const isSuspended = status === "Suspended" || status === "Inactive" || status === "Deactivated";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
        isActive
          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
          : isSuspended
          ? "bg-amber-50 text-amber-800 border-amber-200/80"
          : "bg-rose-50 text-rose-700 border-rose-200/80"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive
            ? "bg-emerald-500 animate-pulse"
            : isSuspended
            ? "bg-amber-500"
            : "bg-rose-500"
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
  const [newAvatarUrl, setNewAvatarUrl] = useState("");
  const [newPlan, setNewPlan] = useState("Standard Membership (PKR 1,600/mo)");
  const [baseFee, setBaseFee] = useState(1600);
  const [newFeePaid, setNewFeePaid] = useState("1600");
  const [newPaymentMethod, setNewPaymentMethod] = useState("Cash / Desk");
  const [newCustomBankName, setNewCustomBankName] = useState("");
  const [newPassword, setNewPassword] = useState("12345678");

  // Dynamic Supabase Plans & Add-Ons state
  const [availablePlans, setAvailablePlans] = useState([]);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);

  // Edit / Plan Change Modal State
  const [editingMember, setEditingMember] = useState(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editMemberId, setEditMemberId] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editDaysRemaining, setEditDaysRemaining] = useState("30");
  const [editMemberPassword, setEditMemberPassword] = useState("");
  const [editGender, setEditGender] = useState("Male");
  const [editStatus, setEditStatus] = useState("Active");
  const [editPlan, setEditPlan] = useState("Standard Membership (PKR 1,600/mo)");
  const [editAddonIds, setEditAddonIds] = useState([]);
  const [editBaseFee, setEditBaseFee] = useState(1600);
  const [editTotalFee, setEditTotalFee] = useState("1600");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // View Profile Modal State
  const [viewMemberModal, setViewMemberModal] = useState(null);
  const [viewMemberStats, setViewMemberStats] = useState({ checkIns: 0, totalPaid: 0 });

  // Delete Member Modal State
  const [deleteMemberModal, setDeleteMemberModal] = useState(null);

  // Custom-Date Attendance Modal State
  const [attendanceMemberModal, setAttendanceMemberModal] = useState(null);
  const [attDate, setAttDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attTime, setAttTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const newFileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e, setterFn) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const compressedDataUrl = await compressImageFile(file, 300);
      setterFn(compressedDataUrl);
    } catch (err) {
      console.warn("Photo upload warning:", err);
      alert(err.message || "Failed to process photo.");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

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

        if (data && data.length > 0) {
          setAvailablePlans(data);
          const first = data[0];
          const mPrice = first.monthly_price ?? first.monthlyPrice ?? 0;
          const dPrice = first.daily_price ?? first.dailyPrice ?? 0;
          const firstLabel =
            mPrice > 0
              ? `${first.name} (PKR ${Number(mPrice).toLocaleString()}/mo)`
              : `${first.name} (PKR ${Number(dPrice).toLocaleString()}/day)`;
          setNewPlan(firstLabel);
          const { baseFee: b, totalFee: t } = computePlanFee(firstLabel, []);
          setBaseFee(b);
          setNewFeePaid(String(t));
        }
      } catch (e) {
        console.warn("Failed to fetch gym_plans", e);
      }
    }
  };

  const fetchAddonsFromSupabase = async () => {
    let loaded = false;
    if (isSupabaseConfigured()) {
      try {
        const { data: setObj } = await supabase
          .from("gym_settings")
          .select("value")
          .eq("key", "gym_addons")
          .maybeSingle();

        if (setObj?.value && Array.isArray(setObj.value) && setObj.value.length > 0) {
          setAvailableAddons(setObj.value.filter((a) => a.active !== false));
          loaded = true;
        } else {
          const { data, error } = await supabase
            .from("gym_addons")
            .select("*")
            .eq("active", true)
            .order("created_at", { ascending: true });

          if (!error && data && data.length > 0) {
            setAvailableAddons(data);
            loaded = true;
          }
        }
      } catch (e) {
        // Safe silent fallback
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
            let activePlan = p.plan || "Standard Membership";
            if (activePlan.includes(" [Next: ")) {
              activePlan = activePlan.split(" [Next: ")[0];
            }

            const userPays = payData
              ? payData.filter(
                  (pay) => pay.user_id === p.id && (pay.status === "Paid" || pay.status === "Partial")
                )
              : [];
            const paidSum = userPays.reduce((acc, pay) => {
              const parsed = typeof pay.amount === "number" ? pay.amount : parseFloat(String(pay.amount || 0).replace(/[^\d.]/g, ""));
              return acc + (isNaN(parsed) ? 0 : parsed);
            }, 0);

            const createdAt = p.created_at ? new Date(p.created_at) : null;
            const now = new Date();
            const daysDiff = createdAt ? (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24) : 0;

            const daysLeft = p.days_remaining !== undefined && p.days_remaining !== null ? Number(p.days_remaining) : 30;
            let currentStatus = p.status || "Active";

            if (daysLeft <= 0) {
              currentStatus = "Expired";
            } else if (daysDiff > 7 && userPays.length === 0 && currentStatus === "Active") {
              currentStatus = "Suspended";
              supabase.from("profiles").update({ status: "Suspended" }).eq("id", p.id);
            }

            return {
              ...p,
              days_remaining: daysLeft,
              total_paid: paidSum,
              status: currentStatus,
              plan: activePlan,
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

  const resolveBasePlanFee = (planStr) => {
    if (!planStr) return 1600;
    // Strip add-ons part first so regex doesn't match add-on prices
    const basePart = String(planStr)
      .split(" [Add-ons:")[0]
      .split(" [Next:")[0]
      .trim();

    // 1. Direct match if explicit price is embedded in the BASE plan portion (e.g. "Standard Membership (PKR 1,600/mo)")
    const pkrMatch = basePart.match(/(?:pkr|rs\.?)\s*([\d,]+)/i);
    if (pkrMatch && pkrMatch[1]) {
      const parsed = parseInt(pkrMatch[1].replace(/,/g, ""), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    // 2. Direct match with dynamic plans from Database (gym_plans)
    if (availablePlans && availablePlans.length > 0) {
      const lower = basePart.replace(/\s*\([^)]*\)/g, "").trim().toLowerCase();
      const exactMatch = availablePlans.find(
        (p) => p.name && (lower === p.name.toLowerCase() || p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase()))
      );
      if (exactMatch) {
        const price = exactMatch.monthly_price ?? exactMatch.monthlyPrice ?? exactMatch.daily_price ?? exactMatch.dailyPrice;
        if (price !== undefined && price !== null && !isNaN(Number(price)) && Number(price) > 0) {
          return Number(price);
        }
      }
    }

    // 3. Known default fallbacks
    const lowerClean = basePart.toLowerCase();
    if (lowerClean.includes("pro plus") || lowerClean.includes("pro+")) return 12000;
    if (lowerClean.includes("vip") || lowerClean.includes("champion")) return 9000;
    if (lowerClean.includes("standard")) return 1600;
    if (lowerClean.includes("daily") || lowerClean.includes("visitor")) return 500;
    return 1600;
  };

  const resolveMemberFee = (m) => {
    if (!m) return 1600;

    // Priority 1: If member has total_paid > 0 from payments table
    if (m.total_paid !== undefined && m.total_paid !== null && !isNaN(Number(m.total_paid)) && Number(m.total_paid) > 0) {
      return Number(m.total_paid);
    }

    // Priority 2: If member has explicit fee_paid from profile table
    if (m.fee_paid !== undefined && m.fee_paid !== null && !isNaN(Number(m.fee_paid)) && Number(m.fee_paid) > 0) {
      return Number(m.fee_paid);
    }
    if (m.total_fee !== undefined && m.total_fee !== null && !isNaN(Number(m.total_fee)) && Number(m.total_fee) > 0) {
      return Number(m.total_fee);
    }

    // Priority 3: Parse from plan string + Addons
    const planStr = String(m.plan || "");
    const base = resolveBasePlanFee(planStr);

    let addonsTotal = 0;
    // Check if add-on prices are written in the plan string directly (e.g. (+PKR 3,000))
    const addonPriceMatches = planStr.match(/\(\+PKR\s*([\d,]+)\)/gi);
    if (addonPriceMatches && addonPriceMatches.length > 0) {
      addonPriceMatches.forEach((matchStr) => {
        const num = parseInt(matchStr.replace(/[^\d]/g, ""), 10);
        if (!isNaN(num) && num > 0) {
          addonsTotal += num;
        }
      });
    } else if (availableAddons && availableAddons.length > 0) {
      availableAddons.forEach((a) => {
        if (planStr.includes(a.name) && !planStr.split(" [Add-ons:")[0].includes(a.name)) {
          addonsTotal += Number(a.price || 0);
        }
      });
    }

    return base + addonsTotal;
  };

  const computePlanFee = (selectedPlanStr, addonIdList = []) => {
    const base = resolveBasePlanFee(selectedPlanStr);

    const addonsSum = (addonIdList || []).reduce((acc, id) => {
      const matched = (availableAddons || []).find((a) => a.id === id);
      return acc + (matched ? Number(matched.price || 0) : 0);
    }, 0);

    return { baseFee: base, totalFee: base + addonsSum };
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
    setEditError("");
    setEditingMember(member);
    setEditFullName(member.full_name || "");
    setEditEmail(member.email || "");
    setEditPhone(member.phone || "");
    setEditMemberId(member.member_id || "");
    setEditAvatarUrl(member.avatar_url || "");
    setEditDaysRemaining(String(member.days_remaining ?? 30));
    setEditMemberPassword("");
    setEditGender(member.gender || "Male");
    setEditStatus(member.status || "Active");

    const currentPlanStr = member.plan || "Standard Membership (PKR 1,600/mo)";
    
    let matchedBasePlanLabel = "";
    if (availablePlans && availablePlans.length > 0) {
      const lowerClean = currentPlanStr.toLowerCase();
      const found = availablePlans.find(
        (p) => p.name && (lowerClean.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(lowerClean))
      ) || availablePlans[0];
      const mPrice = found.monthly_price ?? found.monthlyPrice ?? 0;
      const dPrice = found.daily_price ?? found.dailyPrice ?? 0;
      matchedBasePlanLabel = mPrice > 0
        ? `${found.name} (PKR ${Number(mPrice).toLocaleString()}/mo)`
        : `${found.name} (PKR ${Number(dPrice).toLocaleString()}/day)`;
    } else {
      matchedBasePlanLabel = "Standard Membership (PKR 1,600/mo)";
    }
    setEditPlan(matchedBasePlanLabel);

    const detectedAddons = [];
    if (availableAddons && availableAddons.length > 0) {
      availableAddons.forEach((a) => {
        if (currentPlanStr.includes(a.name)) {
          detectedAddons.push(a.id);
        }
      });
    }
    setEditAddonIds(detectedAddons);

    const { baseFee: b, totalFee: t } = computePlanFee(matchedBasePlanLabel, detectedAddons);
    setEditBaseFee(b);
    setEditTotalFee(String(t));
  };

  // Save Plan Change / Upgrade / Downgrade
  const handleSaveMemberPlan = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    setEditError("");
    setEditSaving(true);

    if (editEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
      setEditError("Please enter a valid email address.");
      setEditSaving(false);
      return;
    }

    if (editMemberPassword && editMemberPassword.length < 6) {
      setEditError("Member password must be at least 6 characters long.");
      setEditSaving(false);
      return;
    }

    let finalPlanLabel = editPlan;
    // Strip any old embedded [Add-ons: ...] or [Next: ...] brackets from base plan name
    if (finalPlanLabel.includes(" [Add-ons:")) {
      finalPlanLabel = finalPlanLabel.split(" [Add-ons:")[0];
    }
    if (finalPlanLabel.includes(" [Next:")) {
      finalPlanLabel = finalPlanLabel.split(" [Next:")[0];
    }

    try {
      const dbStatus = (editStatus === "Inactive" || editStatus === "Deactivated") ? "Suspended" : editStatus;
      const numericFee = parseFloat(String(editTotalFee).replace(/,/g, "")) || resolveMemberFee(editingMember);

      // Selected Add-ons
      const selectedAddonObjs = (availableAddons || []).filter((a) => editAddonIds.includes(a.id));

      // Build active_addons with independent 30-day lifecycles
      const existingAddons = Array.isArray(editingMember.active_addons) ? editingMember.active_addons : [];
      const updatedActiveAddons = selectedAddonObjs.map((addon) => {
        const foundExisting = existingAddons.find((a) => a.id === addon.id || a.addon_id === addon.id || a.name === addon.name);
        if (foundExisting && foundExisting.expiry_date && new Date(foundExisting.expiry_date) > new Date()) {
          const diffMs = new Date(foundExisting.expiry_date).getTime() - Date.now();
          const remDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          return {
            ...foundExisting,
            days_remaining: Math.max(0, remDays),
            status: remDays > 0 ? "Active" : "Expired",
          };
        }
        // Newly added Add-on gets a full independent 30-day limit
        return {
          id: addon.id,
          addon_id: addon.id,
          name: addon.name,
          price: addon.price,
          icon: addon.icon || "🏃",
          start_date: new Date().toISOString(),
          expiry_date: new Date(Date.now() + 30 * 86400000).toISOString(),
          days_remaining: 30,
          status: "Active",
        };
      });

      const safeFullUpdates = {
        full_name: editFullName.trim() || editingMember.full_name,
        email: editEmail.trim() || editingMember.email,
        phone: editPhone.trim() || editingMember.phone,
        gender: editGender,
        status: dbStatus,
        plan: finalPlanLabel,
        days_remaining: Number(editDaysRemaining) || 30,
        active_addons: updatedActiveAddons,
        updated_at: new Date().toISOString(),
      };
      if (editMemberId.trim()) safeFullUpdates.member_id = editMemberId.trim();
      if (editAvatarUrl) safeFullUpdates.avatar_url = editAvatarUrl.trim();

      // 1. Password Reset if provided
      if (editMemberPassword.trim()) {
        await fetch("/api/admin/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: editingMember.id,
            email: editEmail || editingMember.email,
            newPassword: editMemberPassword.trim(),
          }),
        });
      }

      if (isSupabaseConfigured()) {
        const { error: fullErr } = await supabase
          .from("profiles")
          .update(safeFullUpdates)
          .eq("id", editingMember.id);

        if (fullErr) {
          console.warn("Full profile update notice, trying core fields:", fullErr.message);
          await supabase
            .from("profiles")
            .update({
              full_name: editFullName.trim() || editingMember.full_name,
              status: dbStatus,
              plan: finalPlanLabel,
              updated_at: new Date().toISOString(),
            })
            .eq("id", editingMember.id);
        }

        // Sync dedicated member_addons table in Supabase
        try {
          const currentAddonIds = selectedAddonObjs.map((a) => a.id);
          const { data: dbExisting } = await supabase
            .from("member_addons")
            .select("id, addon_id")
            .eq("user_id", editingMember.id);

          if (dbExisting) {
            for (const item of dbExisting) {
              if (!currentAddonIds.includes(item.addon_id)) {
                await supabase
                  .from("member_addons")
                  .update({ status: "Cancelled", updated_at: new Date().toISOString() })
                  .eq("id", item.id);
              }
            }
          }

          for (const addon of updatedActiveAddons) {
            const { error: insErr } = await supabase.from("member_addons").insert([
              {
                user_id: editingMember.id,
                addon_id: addon.id,
                name: addon.name,
                price: addon.price,
                icon: addon.icon || "🏃",
                start_date: addon.start_date,
                expiry_date: addon.expiry_date,
                days_remaining: addon.days_remaining,
                status: addon.status || "Active",
              },
            ]);
            if (insErr) {
              await supabase
                .from("member_addons")
                .update({
                  expiry_date: addon.expiry_date,
                  days_remaining: addon.days_remaining,
                  status: addon.status || "Active",
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", editingMember.id)
                .eq("addon_id", addon.id);
            }
          }
        } catch (addonSyncErr) {
          console.warn("Notice syncing member_addons table:", addonSyncErr);
        }

        // Insert notification for member
        try {
          await supabase.from("notifications").insert([
            {
              user_id: editingMember.id,
              title: "Membership Profile Updated 📋",
              message: `Your membership profile was updated by admin. Plan: ${finalPlanLabel}, Status: ${dbStatus}.`,
              type: "profile_updated",
              action: "VIEW_PROFILE",
              created_at: new Date().toISOString(),
            },
          ]);
        } catch (notifErr) {
          console.warn("Notice creating profile update notification:", notifErr);
        }
      }

      // Update local state immediately
      setMembers((prev) =>
        prev.map((m) =>
          m.id === editingMember.id
            ? {
                ...m,
                ...safeFullUpdates,
                total_paid: numericFee,
                plan: finalPlanLabel,
              }
            : m
        )
      );

      setStatusMsg(
        `✓ All profile fields & membership details updated for ${editFullName.trim() || editingMember.full_name}.`
      );

      setEditingMember(null);
      await fetchMembers();
    } catch (err) {
      console.error("Save plan change error:", err);
      setEditError(err.message || "Failed to update member profile.");
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

    const effectivePaymentMethod =
      (newPaymentMethod === "Other Banks" || newPaymentMethod === "Bank Transfer (IBFT)") && newCustomBankName.trim()
        ? `Bank Transfer (${newCustomBankName.trim()})`
        : newPaymentMethod;

    try {
      const res = await fetch("/api/admin/create-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: newPassword,
          full_name: newFullName,
          gender: newGender,
          avatar_url: newAvatarUrl,
          plan: finalPlanLabel,
          fee_paid: newFeePaid,
          payment_method: effectivePaymentMethod,
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
        paymentMethod: effectivePaymentMethod,
        plan: finalPlanLabel,
      });

      setNewFullName("");
      setNewGender("Male");
      setNewEmail("");
      setNewPhone("");
      setNewAvatarUrl("");
      setSelectedAddonIds([]);
      setNewFeePaid("1600");
      setNewPaymentMethod("Cash / Desk");
      setNewCustomBankName("");
      setNewPassword("12345678");
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || "Failed to create member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendFeeReminder = (member) => {
    setStatusMsg(`🔔 Fee deadline reminder push notification dispatched to ${member.full_name} (${member.email})!`);
    setTimeout(() => setStatusMsg(""), 5000);
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const isCurrentlyActive = (currentStatus || "").toLowerCase() === "active";
    const nextStatus = isCurrentlyActive ? "Suspended" : "Active";

    // 1. Update local state immediately so UI changes without waiting
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: nextStatus } : m))
    );

    setStatusMsg(
      nextStatus === "Suspended"
        ? "⏸️ Member account status updated to Suspended."
        : "▶️ Member account status updated to Active."
    );
    setTimeout(() => setStatusMsg(""), 4000);

    // 2. Sync to Supabase Database using valid DB status ("Suspended" / "Active")
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ status: nextStatus })
          .eq("id", id);

        if (error) {
          console.warn("Database status update notice:", error.message);
        }
      } catch (err) {
        console.error("Supabase status update exception:", err);
      }
    }
  };

  // READ (VIEW) PROFILE DETAILS
  const openViewProfileModal = async (member) => {
    setViewMemberModal(member);
    setViewMemberStats({ checkIns: 0, totalPaid: 0 });

    if (isSupabaseConfigured()) {
      try {
        const { count } = await supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("user_id", member.id);

        const { data: payData } = await supabase
          .from("payments")
          .select("amount")
          .eq("user_id", member.id);

        const totalPaid = payData ? payData.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) : 0;
        setViewMemberStats({ checkIns: count || 0, totalPaid });
      } catch (e) {
        console.warn("View stats error:", e);
      }
    }
  };

  // DELETE PROFILE
  const openDeleteModal = (member) => {
    setDeleteMemberModal(member);
  };

  const handleConfirmDeleteMember = async () => {
    if (!deleteMemberModal) return;
    setSubmitting(true);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("attendance").delete().eq("user_id", deleteMemberModal.id);
        await supabase.from("payments").delete().eq("user_id", deleteMemberModal.id);
        await supabase.from("profiles").delete().eq("id", deleteMemberModal.id);
      } catch (err) {
        console.warn("Delete profile notice:", err);
      }
    }

    setMembers((prev) => prev.filter((m) => m.id !== deleteMemberModal.id));
    setStatusMsg(`✓ Member profile "${deleteMemberModal.full_name}" permanently deleted.`);
    setTimeout(() => setStatusMsg(""), 5000);
    setDeleteMemberModal(null);
    setSubmitting(false);
  };

  // MARK ATTENDANCE FOR ANY DATE
  const openAttendanceModal = (member) => {
    setFormError("");
    setAttendanceMemberModal(member);
    setAttDate(new Date().toISOString().split("T")[0]);
    const now = new Date();
    setAttTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
  };

  const handleSaveAttendanceForDate = async (e) => {
    e.preventDefault();
    if (!attendanceMemberModal) return;

    if (!attDate || !attTime) {
      setFormError("Please select both a check-in date and time.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const [year, month, day] = attDate.split("-").map(Number);
      const [hours, minutes] = attTime.split(":").map(Number);
      const checkInIso = new Date(year, month - 1, day, hours, minutes, 0).toISOString();

      if (isSupabaseConfigured()) {
        const { error } = await supabase.from("attendance").insert([
          {
            user_id: attendanceMemberModal.id,
            check_in_time: checkInIso,
          },
        ]);

        if (error) {
          setFormError(`Attendance Error: ${error.message}`);
          setSubmitting(false);
          return;
        }
      }

      const formattedDate = new Date(year, month - 1, day).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      setStatusMsg(
        `📍 Attendance check-in logged for "${attendanceMemberModal.full_name}" on ${formattedDate} at ${attTime}!`
      );
      setTimeout(() => setStatusMsg(""), 6000);
      setAttendanceMemberModal(null);
    } catch (err) {
      setFormError(err.message || "Failed to record attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  const openRegisterModal = () => {
    setFormError("");
    setNewFullName("");
    setNewEmail("");
    setNewPhone("");
    setNewAvatarUrl("");
    setNewGender("Male");
    setNewPaymentMethod("Cash / Desk");
    setNewPassword("12345678");
    setSelectedAddonIds([]);

    let defaultPlanLabel = "Standard Monthly Pass (PKR 3,500/mo)";
    if (availablePlans && availablePlans.length > 0) {
      const first = availablePlans[0];
      const mPrice = first.monthly_price ?? first.monthlyPrice ?? 0;
      const dPrice = first.daily_price ?? first.dailyPrice ?? 0;
      defaultPlanLabel =
        mPrice > 0
          ? `${first.name} (PKR ${Number(mPrice).toLocaleString()}/mo)`
          : `${first.name} (PKR ${Number(dPrice).toLocaleString()}/day)`;
    }
    setNewPlan(defaultPlanLabel);
    const { baseFee: b, totalFee: t } = computePlanFee(defaultPlanLabel, []);
    setBaseFee(b);
    setNewFeePaid(String(t));
    setIsModalOpen(true);
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.member_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.plan?.toLowerCase().includes(searchTerm.toLowerCase());

      const statusLower = (m.status || "Active").toLowerCase();
      const filterLower = statusFilter.toLowerCase();

      let matchesStatus = false;
      if (statusFilter === "All") {
        matchesStatus = true;
      } else if (filterLower === "active") {
        matchesStatus = statusLower === "active";
      } else if (filterLower === "suspended" || filterLower === "inactive") {
        matchesStatus =
          statusLower === "suspended" ||
          statusLower === "inactive" ||
          statusLower === "deactivated" ||
          statusLower.includes("susp") ||
          statusLower.includes("pause");
      } else if (filterLower === "expired") {
        matchesStatus = statusLower === "expired";
      }

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
            Members Directory
          </h1>
        </div>

        <button
          onClick={openRegisterModal}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
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
            {["All", "Active", "Suspended", "Expired"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
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
            {["All", "Male", "Female"].map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
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
                  <tr
                    key={m.id}
                    onDoubleClick={() => openViewProfileModal(m)}
                    title="Double-click to view full member profile & details"
                    className="hover:bg-emerald-50/40 transition-colors cursor-pointer group select-none"
                  >
                    <td className="py-3.5 px-3.5 font-bold text-slate-900 flex items-center gap-3">
                      <MemberAvatar name={m.full_name} avatar_url={m.avatar_url} />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 leading-tight group-hover:text-emerald-700 transition-colors">
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
                      <p className="font-semibold text-slate-900">{m.plan || "Standard Membership"}</p>
                    </td>

                    <td className="py-3.5 px-3.5 font-mono font-bold text-slate-900">
                      PKR {resolveMemberFee(m).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-3.5">
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={m.status || "Active"} />
                        {m.days_remaining !== undefined && m.days_remaining !== null && m.days_remaining <= 3 && m.days_remaining > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                            ⚠️ {m.days_remaining}d left
                          </span>
                        )}
                        {m.days_remaining !== undefined && m.days_remaining !== null && m.days_remaining <= 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                            🔴 Expired
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. EDIT PROFILE & PLAN */}
                        <button
                          onClick={() => openEditModal(m)}
                          title="Edit Profile & Plan"
                          className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200 hover:border-slate-300 transition flex items-center justify-center shadow-2xs cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>

                        {/* 2. TOGGLE ACCOUNT STATUS (PAUSE / ACTIVATE) */}
                        <button
                          onClick={() => handleToggleStatus(m.id, m.status || "Active")}
                          title={m.status === "Active" ? "Pause Account (Set Suspended)" : "Reactivate Account (Set Active)"}
                          className={`w-8 h-8 rounded-xl transition flex items-center justify-center border shadow-2xs cursor-pointer ${
                            m.status === "Active"
                              ? "bg-white text-slate-500 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 border-slate-200"
                              : "bg-white text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 border-slate-200"
                          }`}
                        >
                          {m.status === "Active" ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>

                        {/* 3. DELETE PROFILE */}
                        <button
                          onClick={() => openDeleteModal(m)}
                          title="Delete Member Profile"
                          className="w-8 h-8 rounded-xl bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-300 transition flex items-center justify-center shadow-2xs cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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

      {/* MODAL 2: EDIT MEMBER PROFILE & PLAN */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Edit Member Profile</h3>
                <p className="text-xs text-slate-500">
                  {editingMember.full_name} • {editingMember.member_id || "GP-MEMBER"}
                </p>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm p-1.5 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                ⚠️ {editError}
              </div>
            )}

            <form onSubmit={handleSaveMemberPlan} className="space-y-4">
              {/* Card 1: Personal Profile Attributes */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3.5">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block">
                  👤 Member Personal Information
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Gender *
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-200/60 p-1 rounded-xl">
                      {[
                        { id: "Male", label: "♂ Male" },
                        { id: "Female", label: "♀ Female" },
                      ].map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setEditGender(g.id)}
                          className={`py-1 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                            editGender === g.id
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="03001234567"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Member ID
                    </label>
                    <input
                      type="text"
                      value={editMemberId}
                      onChange={(e) => setEditMemberId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Account Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-bold"
                    >
                      <option value="Active">🟢 Active</option>
                      <option value="Suspended">⏸️ Suspended</option>
                      <option value="Expired">🔴 Expired</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Days Remaining
                    </label>
                    <input
                      type="number"
                      value={editDaysRemaining}
                      onChange={(e) => setEditDaysRemaining(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Profile Photo Upload */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Profile Photo
                  </label>

                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl">
                    <div
                      onClick={() => editFileInputRef.current?.click()}
                      className="relative w-14 h-14 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 hover:border-emerald-500 flex items-center justify-center cursor-pointer overflow-hidden group transition shrink-0 shadow-2xs"
                    >
                      {editAvatarUrl ? (
                        <img
                          src={editAvatarUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl text-slate-400 group-hover:text-emerald-600 transition">📸</span>
                      )}
                      <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition">
                        {editAvatarUrl ? "Replace" : "Upload"}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <input
                        ref={editFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setEditAvatarUrl)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        <span>📸</span>
                        <span>{uploadingImage ? "Compressing..." : editAvatarUrl ? "Replace Photo" : "Upload Picture"}</span>
                      </button>
                      {editAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setEditAvatarUrl("")}
                          className="text-[11px] text-rose-600 hover:underline font-semibold mt-1 block cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    🔒 Change Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={editMemberPassword}
                    onChange={(e) => setEditMemberPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Card 2: Membership Tier & Add-On Passes */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3.5">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block">
                  💳 Membership Plan & Add-Ons
                </span>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Membership Tier *
                  </label>
                  <select
                    value={editPlan}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      setEditPlan(selectedVal);
                      updateEditFeeCalculation(selectedVal, editAddonIds);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
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
                        <option value="Standard Membership (PKR 1,600/mo)">Standard Membership (PKR 1,600/mo)</option>
                        <option value="Pro Membership (PKR 5,000/mo)">Pro Membership (PKR 5,000/mo)</option>
                        <option value="VIP Champion Pass (PKR 9,000/mo)">VIP Champion Pass (PKR 9,000/mo)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Stackable Add-On Options */}
                {availableAddons.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Stackable Add-On Passes
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {availableAddons.map((addon) => {
                        const isChecked = editAddonIds.includes(addon.id);
                        return (
                          <label
                            key={addon.id}
                            className={`flex items-center gap-2.5 p-2 bg-white border rounded-xl cursor-pointer transition-all ${
                              isChecked
                                ? "border-emerald-500 ring-1 ring-emerald-500/20"
                                : "border-slate-200 hover:border-slate-300"
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
                )}

                {/* Total Monthly Subscription Summary */}
                <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Base Tier Fee:</span>
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
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-bold text-sm">
                    <span>Monthly Subscription Fee:</span>
                    <span className="font-mono text-emerald-400 text-base">
                      PKR {Number(editTotalFee).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-4 py-2 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {editSaving ? "Saving Changes..." : "✓ Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: VIEW PROFILE DETAILS (READ) WITH MEMBER AVATAR IMAGE & ALL DATA */}
      {viewMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-4">
                <MemberAvatar name={viewMemberModal.full_name} avatar_url={viewMemberModal.avatar_url} size="lg" />
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight">{viewMemberModal.full_name}</h3>
                  <p className="text-xs text-slate-500 font-mono font-bold mt-0.5">Member ID: {viewMemberModal.member_id || "GP-MEMBER"}</p>
                </div>
              </div>
              <button
                onClick={() => setViewMemberModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm p-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Gender</span>
                <p className="mt-0.5"><GenderBadge gender={viewMemberModal.gender} /></p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Account Status</span>
                <p className="mt-0.5"><StatusBadge status={viewMemberModal.status} /></p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Email Address</span>
                <p className="font-semibold text-slate-800 truncate">{viewMemberModal.email || "N/A"}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Phone Number</span>
                <p className="font-semibold text-slate-800 truncate">{viewMemberModal.phone || "+92 300 1234567"}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Active Membership Tier</span>
                <p className="font-semibold text-emerald-800">{viewMemberModal.plan || "Pro Membership"}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Active Add-Ons</span>
                <p className="font-medium text-slate-700">
                  {viewMemberModal.add_ons ||
                    (viewMemberModal.plan?.includes("[Add-ons:")
                      ? viewMemberModal.plan.split("[Add-ons:")[1].replace(/\]$/, "").trim()
                      : "None")}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Days Remaining</span>
                <p className="font-bold text-slate-900">{viewMemberModal.days_remaining ?? 30} Days</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Total Desk Fee Paid</span>
                <p className="font-mono font-bold text-emerald-700">PKR {resolveMemberFee(viewMemberModal).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 text-xs">
              <div>
                <span className="text-[10px] text-emerald-700 uppercase font-bold">Total Gym Check-Ins</span>
                <p className="text-base font-extrabold text-emerald-950">{viewMemberStats.checkIns} Visits</p>
              </div>
              <div>
                <span className="text-[10px] text-emerald-700 uppercase font-bold">Payments Recorded</span>
                <p className="text-base font-extrabold text-emerald-950">PKR {Number(viewMemberStats.totalPaid || resolveMemberFee(viewMemberModal)).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  const m = viewMemberModal;
                  setViewMemberModal(null);
                  openAttendanceModal(m);
                }}
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs px-4 py-2 rounded-xl border border-emerald-200 transition flex items-center gap-1.5"
              >
                <span>📅</span>
                <span>Mark Attendance</span>
              </button>
              <button
                onClick={() => {
                  const m = viewMemberModal;
                  setViewMemberModal(null);
                  openEditModal(m);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <span>✏️</span>
                <span>Edit Profile & Plan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* MODAL 2: DELETE MEMBER PROFILE (DELETE) */}
      {/* ============================================================================ */}
      {deleteMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center font-bold text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Member Profile?</h3>
                <p className="text-xs text-rose-600 font-medium">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the profile for{" "}
              <strong className="text-slate-900">{deleteMemberModal.full_name}</strong> (Member ID:{" "}
              <span className="font-mono text-emerald-700 font-bold">{deleteMemberModal.member_id || "GP-MEMBER"}</span>)?
              All profile records will be purged.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteMemberModal(null)}
                className="text-xs text-slate-500 hover:text-slate-800 px-4 py-2 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMember}
                disabled={submitting}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs"
              >
                {submitting ? "Deleting..." : "Permanently Delete Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* MODAL 3: MARK DESK ATTENDANCE FOR ANY DATE */}
      {/* ============================================================================ */}
      {attendanceMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Mark Custom-Date Desk Attendance</h3>
                <p className="text-xs text-slate-500">Record check-in log for {attendanceMemberModal.full_name}.</p>
              </div>
              <button
                onClick={() => setAttendanceMemberModal(null)}
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

            <form onSubmit={handleSaveAttendanceForDate} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Member Name:</span>
                  <span className="font-bold text-slate-900">{attendanceMemberModal.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Member ID:</span>
                  <span className="font-mono text-emerald-700 font-bold">{attendanceMemberModal.member_id || "GP-MEMBER"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan:</span>
                  <span className="font-medium text-slate-800">{attendanceMemberModal.plan || "Pro Membership"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Select Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={attDate}
                    onChange={(e) => setAttDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Select Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={attTime}
                    onChange={(e) => setAttTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800">
                💡 Desk Override: Attendance can be recorded for any past, present, or specific date.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAttendanceMemberModal(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-4 py-2 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs"
                >
                  {submitting ? "Saving Log..." : "📍 Submit Attendance Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTER MEMBER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Register New Member</h3>
                <p className="text-xs text-slate-500">
                  Fill in member details, base package & add-on services.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm p-1.5 rounded-lg cursor-pointer"
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
              {/* Card 1: Member Personal Details */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3.5">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block">
                  👤 Personal Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Gender *
                    </label>
                    <div className="grid grid-cols-2 gap-1 bg-slate-200/60 p-1 rounded-xl">
                      {[
                        { id: "Male", label: "♂ Male" },
                        { id: "Female", label: "♀ Female" },
                      ].map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setNewGender(g.id)}
                          className={`py-1 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                            newGender === g.id
                              ? "bg-white text-slate-900 shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="hamza@gmail.com"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
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
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Profile Photo Upload */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Profile Photo
                  </label>

                  <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl">
                    <div
                      onClick={() => newFileInputRef.current?.click()}
                      className="relative w-14 h-14 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 hover:border-emerald-500 flex items-center justify-center cursor-pointer overflow-hidden group transition shrink-0 shadow-2xs"
                    >
                      {newAvatarUrl ? (
                        <img
                          src={newAvatarUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl text-slate-400 group-hover:text-emerald-600 transition">📸</span>
                      )}
                      <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition">
                        {newAvatarUrl ? "Replace" : "Upload"}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <input
                        ref={newFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setNewAvatarUrl)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => newFileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        <span>📸</span>
                        <span>{uploadingImage ? "Compressing..." : newAvatarUrl ? "Replace Photo" : "Upload Picture"}</span>
                      </button>
                      {newAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setNewAvatarUrl("")}
                          className="text-[11px] text-rose-600 hover:underline font-semibold mt-1 block cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Mobile App Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Card 2: Membership Plan & Billing */}
              <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3.5">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block">
                  💳 Membership Tier & Billing
                </span>

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
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
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
                        <option value="Standard Membership (PKR 1,600/mo)">Standard Membership (PKR 1,600/mo)</option>
                        <option value="Pro Membership (PKR 5,000/mo)">Pro Membership (PKR 5,000/mo)</option>
                        <option value="VIP Champion Pass (PKR 9,000/mo)">VIP Champion Pass (PKR 9,000/mo)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Stackable Add-On Options */}
                {availableAddons.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Stackable Add-On Passes (Optional)
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {availableAddons.map((addon) => {
                        const isChecked = selectedAddonIds.includes(addon.id);
                        return (
                          <label
                            key={addon.id}
                            className={`flex items-center gap-2.5 p-2 bg-white border rounded-xl cursor-pointer transition-all ${
                              isChecked
                                ? "border-emerald-500 ring-1 ring-emerald-500/20"
                                : "border-slate-200 hover:border-slate-300"
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
                )}

                {/* Total Calculation */}
                <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs space-y-1.5">
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
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-bold text-sm">
                    <span>Total Payable:</span>
                    <span className="font-mono text-emerald-400 text-base">
                      PKR {Number(newFeePaid).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Payment Method Option */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Initial Payment Method *
                  </label>
                  <select
                    value={newPaymentMethod}
                    onChange={(e) => {
                      setNewPaymentMethod(e.target.value);
                      if (e.target.value !== "Other Banks" && e.target.value !== "Bank Transfer (IBFT)") {
                        setNewCustomBankName("");
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Cash / Desk">💵 Cash / Counter</option>
                    <option value="Bank Transfer (IBFT)">🏦 Bank Transfer (IBFT)</option>
                    <option value="JazzCash">📱 JazzCash</option>
                    <option value="EasyPaisa">📲 EasyPaisa</option>
                    <option value="Other Banks">🏦 Other Banks (Custom)</option>
                  </select>
                </div>

                {(newPaymentMethod === "Other Banks" || newPaymentMethod === "Bank Transfer (IBFT)") && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Bank Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={newCustomBankName}
                      onChange={(e) => setNewCustomBankName(e.target.value)}
                      placeholder="e.g. Bank Alfalah, Meezan Bank, Allied Bank, UBL"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-4 py-2 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {submitting ? "Registering..." : "✓ Register Member"}
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