"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";
import LoadingOverlay from "../components/LoadingOverlay";

// ============================================================================
// HELPER UI COMPONENTS
// ============================================================================

function MetricStatCard({
  title,
  value,
  subtext,
  color = "emerald",
}) {
  const textColor = {
    emerald: "text-emerald-700",
    amber: "text-amber-600",
    rose: "text-rose-600",
    slate: "text-slate-900",
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        {title}
      </span>
      <div className="mt-2">
        <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${textColor[color]}`}>
          {value}
        </p>
        <p className="text-[11px] text-slate-500 font-medium mt-1">{subtext}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Paid: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    "Pending Approval": "bg-indigo-50 text-indigo-700 border-indigo-200/80 animate-pulse",
    Rejected: "bg-rose-50 text-rose-700 border-rose-200/80 font-bold",
    Unpaid: "bg-rose-50 text-rose-700 border-rose-200/80",
  };

  const labels = {
    Paid: "✓ Paid",
    "Pending Approval": "⏳ Pending Approval",
    Rejected: "✕ Rejected",
    Unpaid: "🔴 Unpaid",
  };

  const key = status || "Unpaid";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${styles[key] || styles.Unpaid
        }`}
    >
      {labels[key] || labels.Unpaid}
    </span>
  );
}

// ============================================================================
// MAIN PAYMENTS ADMIN PAGE
// ============================================================================

export default function PaymentsAdminPage() {
  const [activeTab, setActiveTab] = useState("logs");
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [availableAddons, setAvailableAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg] = useState("Recording Payment...");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [customGuestName, setCustomGuestName] = useState("");
  const [amount, setAmount] = useState("5000");
  const [totalFee, setTotalFee] = useState("5000");
  const [method, setMethod] = useState("Cash / Desk");
  const [customBankName, setCustomBankName] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const [activeInvoice, setActiveInvoice] = useState(null);
  const [activeProof, setActiveProof] = useState(null);

  useEffect(() => {
    fetchPaymentsAndMembers(false);

    // 1. Supabase Realtime subscription (Instant sync on payment proof submissions & approvals)
    let paymentsChannel = null;
    if (isSupabaseConfigured()) {
      paymentsChannel = supabase
        .channel("admin-payments-realtime-sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "payments" },
          () => {
            fetchPaymentsAndMembers(true);
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          () => {
            fetchPaymentsAndMembers(true);
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "member_addons" },
          () => {
            fetchPaymentsAndMembers(true);
          }
        )
        .subscribe();
    }

    // 2. Silent auto-poll fallback (every 5 seconds) without flickering or reloading the table
    const pollTimer = setInterval(() => {
      fetchPaymentsAndMembers(true);
    }, 5000);

    return () => {
      if (paymentsChannel) supabase.removeChannel(paymentsChannel);
      clearInterval(pollTimer);
    };
  }, []);

  const fetchPaymentsAndMembers = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    let loadedFromSupabase = false;

    if (isSupabaseConfigured()) {
      try {
        let fetchedPlans = [];
        const { data: planData } = await supabase
          .from("gym_plans")
          .select("*")
          .eq("active", true);
        if (planData && planData.length > 0) {
          fetchedPlans = planData;
        } else {
          const { data: setObj } = await supabase
            .from("gym_settings")
            .select("value")
            .eq("key", "gym_plans")
            .maybeSingle();
          if (setObj?.value && Array.isArray(setObj.value)) {
            fetchedPlans = setObj.value.filter((p) => p.active !== false);
          }
        }
        if (fetchedPlans.length === 0) {
          try {
            const saved = localStorage.getItem("abdullah_gym_plans");
            if (saved) fetchedPlans = JSON.parse(saved).filter((p) => p.active !== false);
          } catch (e) { }
        }
        if (fetchedPlans.length > 0) setAvailablePlans(fetchedPlans);

        let fetchedAddons = [];
        try {
          const { data: addonData } = await supabase
            .from("gym_addons")
            .select("*")
            .eq("active", true);
          if (addonData && addonData.length > 0) {
            fetchedAddons = addonData;
          } else {
            const { data: setAddon } = await supabase
              .from("gym_settings")
              .select("value")
              .eq("key", "gym_addons")
              .maybeSingle();
            if (setAddon?.value && Array.isArray(setAddon.value)) {
              fetchedAddons = setAddon.value.filter((a) => a.active !== false);
            }
          }
        } catch (e) {}

        if (fetchedAddons.length === 0) {
          try {
            const saved = localStorage.getItem("abdullah_gym_addons");
            if (saved) fetchedAddons = JSON.parse(saved).filter((a) => a.active !== false);
          } catch (e) {}
        }
        if (fetchedAddons.length > 0) setAvailableAddons(fetchedAddons);

        const { data: profData } = await supabase
          .from("profiles")
          .select("*")
          .order("full_name", { ascending: true });

        const profileMap = new Map();
        if (profData) {
          const registeredOnly = profData.filter(
            (p) =>
              !p.member_id?.startsWith("GP-WALK-") &&
              !p.email?.includes("@abdullahgym.local") &&
              p.role !== "walkin"
          );
          setMembers(registeredOnly);
          profData.forEach((p) => profileMap.set(p.id, p));
        }

        const { data: payData } = await supabase
          .from("payments")
          .select("*")
          .order("date", { ascending: false });

        let addonPayData = [];
        try {
          const { data: aData } = await supabase
            .from("addon_payments")
            .select("*")
            .order("date", { ascending: false });
          if (aData) addonPayData = aData;
        } catch (e) {}

        const activeAddonsList = fetchedAddons.length > 0 ? fetchedAddons : availableAddons;
        const activePlansList = fetchedPlans.length > 0 ? fetchedPlans : availablePlans;

        const formattedGym = (payData || []).map((item) => {
          const prof = profileMap.get(item.user_id);
          const isWalkIn =
            item.invoice_id?.startsWith("INV-WALK") ||
            prof?.member_id?.startsWith("GP-WALK-") ||
            prof?.role === "walkin" ||
            prof?.plan?.toLowerCase().includes("walk-in") ||
            prof?.plan?.toLowerCase().includes("daily") ||
            item.payment_method?.toLowerCase().includes("walk-in");

          let amt = parseFloat(item.amount) || 0;
          let tFee = parseFloat(item.total_fee) || amt;

          const cleanProfPlan = (item.item_name || prof?.plan || "Standard Monthly Pass").split(" [Add-ons:")[0].split(" [Next:")[0];
          const matchedPlan = (activePlansList || []).find(
            (p) =>
              p.name.toLowerCase() === cleanProfPlan.toLowerCase() ||
              cleanProfPlan.toLowerCase().includes(p.name.toLowerCase())
          );

          let displayPlan = cleanProfPlan;
          if (isWalkIn) {
            tFee = amt > 0 ? amt : 500;
            amt = tFee;
            displayPlan = "Daily Walk-In Pass";
          } else {
            const livePlanPrice = matchedPlan ? Number(matchedPlan.monthly_price || matchedPlan.monthlyPrice) : 3500;
            if (tFee <= 0) tFee = livePlanPrice;
            if (amt <= 0) amt = parseFloat(prof?.fee_paid) || tFee;
            displayPlan = matchedPlan?.name || cleanProfPlan;
          }

          let calculatedStatus = "Unpaid";
          if (item.status === "Rejected") {
            calculatedStatus = "Rejected";
          } else if (
            item.status === "Pending Approval" ||
            item.status === "Pending" ||
            (item.status && String(item.status).toLowerCase().includes("pending")) ||
            item.proof_url
          ) {
            calculatedStatus = "Pending Approval";
          } else if (item.status === "Paid" || isWalkIn || amt > 0) {
            calculatedStatus = "Paid";
          } else {
            calculatedStatus = "Unpaid";
          }

          return {
            id: item.id,
            user_id: item.user_id,
            is_addon: false,
            invoice_id: item.invoice_id || `INV-${item.id?.slice(0, 4)}`,
            member_name: prof?.full_name || item.member_name || "Gym Member",
            member_id: prof?.member_id || (isWalkIn ? "GP-WALK-GUEST" : "GP-MEMBER"),
            plan: displayPlan,
            raw_amount: amt,
            raw_total_fee: tFee,
            amount: `PKR ${Number(amt).toLocaleString()}`,
            total_fee: `PKR ${Number(tFee).toLocaleString()}`,
            date: item.date
              ? new Date(item.date).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
              : new Date().toLocaleDateString(),
            method: item.payment_method || item.method || "Cash / Desk",
            status: calculatedStatus,
            proof_url: item.proof_url || null,
            is_walk_in: isWalkIn,
          };
        });

        const formattedAddon = (addonPayData || []).map((item) => {
          const prof = profileMap.get(item.user_id);
          const cleanAddonName = (item.addon_name || item.item_name || item.name || "Cardio Access").replace(/\(Add-on\)/gi, "").trim();
          const matchedAddon = (activeAddonsList || []).find(
            (a) =>
              (item.addon_id && a.id === item.addon_id) ||
              (a.name && cleanAddonName && a.name.toLowerCase().includes(cleanAddonName.toLowerCase()))
          );
          let amt = parseFloat(item.amount) || (matchedAddon ? Number(matchedAddon.price) : 1500);
          const liveAddonPrice = matchedAddon ? Number(matchedAddon.price) : amt;

          let calculatedStatus = "Unpaid";
          if (item.status === "Rejected") {
            calculatedStatus = "Rejected";
          } else if (
            item.status === "Pending Approval" ||
            item.status === "Pending" ||
            (item.status && String(item.status).toLowerCase().includes("pending")) ||
            item.proof_url
          ) {
            calculatedStatus = "Pending Approval";
          } else if (item.status === "Paid") {
            calculatedStatus = "Paid";
          } else {
            calculatedStatus = "Unpaid";
          }

          return {
            id: item.id,
            user_id: item.user_id,
            addon_id: item.addon_id || matchedAddon?.id || null,
            addon_name: matchedAddon?.name || cleanAddonName,
            is_addon: true,
            invoice_id: item.invoice_id || `INV-ADD-${item.id?.slice(0, 4)}`,
            member_name: prof?.full_name || "Gym Member",
            member_id: prof?.member_id || "GP-MEMBER",
            plan: `${matchedAddon?.name || cleanAddonName} (Add-on)`,
            raw_amount: amt,
            raw_total_fee: liveAddonPrice,
            amount: `PKR ${Number(amt).toLocaleString()}`,
            total_fee: `PKR ${Number(liveAddonPrice).toLocaleString()}`,
            date: item.date
              ? new Date(item.date).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
              : new Date().toLocaleDateString(),
            method: item.payment_method || "JazzCash Transfer",
            status: calculatedStatus,
            proof_url: item.proof_url || null,
            is_walk_in: false,
          };
        });

        const allPaymentsCombined = [...formattedGym, ...formattedAddon].sort(
          (a, b) => new Date(b.date || 0) - new Date(a.date || 0)
        );

        setPayments(allPaymentsCombined);
        loadedFromSupabase = true;
      } catch (err) {
        console.warn("Supabase payments fetch exception:", err);
      }
    }

    if (!loadedFromSupabase && !isSupabaseConfigured()) {
      setPayments([
        {
          id: "p-1",
          user_id: "m-1",
          invoice_id: "INV-8492",
          member_name: "Muhammad Hamza",
          member_id: "GP-8472-991",
          plan: "Standard Membership",
          raw_amount: 1600,
          raw_total_fee: 1600,
          amount: "PKR 1,600",
          total_fee: "PKR 1,600",
          date: "Aug 12, 2026",
          method: "Cash / Desk",
          status: "Paid",
        },
      ]);
    }

    setLoading(false);
  };

  const handleApprovePayment = async (targetMember, explicitProofUrl = null, explicitPaymentId = null) => {
    setStatusMsg(`🎉 Approved payment for ${targetMember.full_name || "member"}! Push notification dispatched.`);

    const targetUserId = targetMember.user_id || targetMember.id;
    let targetPaymentId = explicitPaymentId || targetMember.payment_id;

    if (!targetPaymentId) {
      const pendingPay = payments.find(
        (p) => p.user_id === targetUserId && (p.status === "Pending Approval" || p.proof_url)
      );
      targetPaymentId = pendingPay?.id;
    }

    const matchingItem = payments.find((p) => p.id === targetPaymentId);
    const isAddonPayment = matchingItem?.is_addon || targetPaymentId?.startsWith("INV-ADD");

    setPayments((prev) =>
      prev.map((p) =>
        p.id === targetPaymentId
          ? { ...p, status: "Paid", proof_url: null }
          : p
      )
    );

    if (isSupabaseConfigured()) {
      try {
        if (explicitProofUrl && explicitProofUrl.includes("payment-proofs")) {
          try {
            const urlParts = explicitProofUrl.split("/payment-proofs/");
            if (urlParts.length > 1) {
              const filePath = urlParts[1].split("?")[0];
              await supabase.storage.from("payment-proofs").remove([filePath]);
            }
          } catch (storageErr) {
            console.warn("Storage cleanup notice:", storageErr);
          }
        }

        // 1. Approve payment record in both payments and addon_payments tables
        if (targetPaymentId) {
          await Promise.allSettled([
            supabase.from("payments").update({ status: "Paid", proof_url: null }).eq("id", targetPaymentId),
            supabase.from("addon_payments").update({ status: "Paid", proof_url: null }).eq("id", targetPaymentId),
          ]);
        }

        if (isAddonPayment) {
          const targetAddonId = matchingItem?.addon_id || matchingItem?.addonId;
          const rawAddonName = matchingItem?.addon_name || matchingItem?.item_name || matchingItem?.plan || "Cardio Access";
          const cleanAddonName = rawAddonName.replace(/\(Add-on\)/gi, "").trim();

          // 2. Fetch specific member_addon row for this user
          const { data: userAddonsList } = await supabase
            .from("member_addons")
            .select("*")
            .eq("user_id", targetUserId);

          const matchedMemberAddon = (userAddonsList || []).find((ma) => {
            if (targetAddonId && (ma.addon_id === targetAddonId || ma.id === targetAddonId)) return true;
            if (ma.name && cleanAddonName && (ma.name.toLowerCase().includes(cleanAddonName.toLowerCase()) || cleanAddonName.toLowerCase().includes(ma.name.toLowerCase()))) return true;
            return false;
          });

          // 3. Fetch profile active_addons
          const { data: userProf } = await supabase
            .from("profiles")
            .select("active_addons")
            .eq("id", targetUserId)
            .maybeSingle();

          let existingAddons = [];
          if (Array.isArray(userProf?.active_addons)) {
            existingAddons = [...userProf.active_addons];
          } else if (typeof userProf?.active_addons === "string" && userProf.active_addons.trim()) {
            try {
              existingAddons = JSON.parse(userProf.active_addons);
            } catch (e) {}
          }

          const matchedProfileAddonIdx = existingAddons.findIndex((a) => {
            if (targetAddonId && (a.id === targetAddonId || a.addon_id === targetAddonId)) return true;
            if (a.name && cleanAddonName && (a.name.toLowerCase().includes(cleanAddonName.toLowerCase()) || cleanAddonName.toLowerCase().includes(a.name.toLowerCase()))) return true;
            return false;
          });

          const currentExpiryStr = matchedMemberAddon?.expiry_date || (matchedProfileAddonIdx >= 0 ? existingAddons[matchedProfileAddonIdx].expiry_date : null);
          const currentExpiry = currentExpiryStr ? new Date(currentExpiryStr) : null;
          // Check if current add-on is still unexpired (days remaining > 0)
          const isCurrentlyActive = currentExpiry && currentExpiry.getTime() > Date.now();

          // If expired (or not found), start FRESH 30 days from NOW (30 days remaining)!
          // Only if unexpired with days left, add 30 days onto remaining expiry
          const baseTime = isCurrentlyActive ? currentExpiry.getTime() : Date.now();
          const newExpiryDate = new Date(baseTime + 30 * 86400000);
          const newExpiry = newExpiryDate.toISOString();
          const totalDaysRemaining = Math.max(1, Math.ceil((newExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          const originalStartDate = matchedMemberAddon?.start_date || (matchedProfileAddonIdx >= 0 ? existingAddons[matchedProfileAddonIdx].start_date : new Date().toISOString());

          // Update ONLY this specific add-on in member_addons table (never touch other add-ons!)
          if (matchedMemberAddon?.id) {
            await supabase
              .from("member_addons")
              .update({
                start_date: isCurrentlyActive ? originalStartDate : new Date().toISOString(),
                expiry_date: newExpiry,
                days_remaining: totalDaysRemaining,
                status: "Active",
                updated_at: new Date().toISOString(),
              })
              .eq("id", matchedMemberAddon.id);
          } else {
            await supabase
              .from("member_addons")
              .insert([
                {
                  user_id: targetUserId,
                  addon_id: targetAddonId || "addon-1",
                  name: cleanAddonName,
                  price: parseFloat(matchingItem?.amount?.replace(/[^\d.]/g, "")) || 1500,
                  start_date: new Date().toISOString(),
                  expiry_date: newExpiry,
                  days_remaining: totalDaysRemaining,
                  status: "Active",
                },
              ]);
          }

          const updatedAddonRecord = {
            id: targetAddonId || matchedMemberAddon?.addon_id || "addon-1",
            addon_id: targetAddonId || matchedMemberAddon?.addon_id || "addon-1",
            name: cleanAddonName,
            price: parseFloat(matchingItem?.amount?.replace(/[^\d.]/g, "")) || 1500,
            icon: cleanAddonName.toLowerCase().includes("cardio") ? "🏃" : cleanAddonName.toLowerCase().includes("trainer") ? "🏋️" : cleanAddonName.toLowerCase().includes("sauna") ? "♨️" : "✨",
            start_date: isCurrentlyActive ? originalStartDate : new Date().toISOString(),
            expiry_date: newExpiry,
            days_remaining: totalDaysRemaining,
            status: "Active",
          };

          if (matchedProfileAddonIdx >= 0) {
            existingAddons[matchedProfileAddonIdx] = updatedAddonRecord;
          } else {
            existingAddons.push(updatedAddonRecord);
          }

          await supabase.from("profiles").update({ active_addons: existingAddons }).eq("id", targetUserId);

          try {
            await supabase.from("notifications").insert([
              {
                user_id: targetUserId,
                title: `${cleanAddonName} Pass Renewed! 🚀`,
                message: `Your ${cleanAddonName} payment was verified! +30 days added. Total: ${totalDaysRemaining} days active!`,
                type: "payment_approved",
                action: "VIEW_PAYMENT",
                created_at: new Date().toISOString(),
              },
            ]);
          } catch (notifErr) { }
        } else {
          // 2. Approve Monthly Gym Plan payment in payments table
          if (targetPaymentId) {
            await supabase
              .from("payments")
              .update({ status: "Paid", proof_url: null })
              .eq("id", targetPaymentId);
          }

          if (targetUserId) {
            const { data: userProf } = await supabase
              .from("profiles")
              .select("upcoming_plan, next_plan, plan, full_name, days_remaining")
              .eq("id", targetUserId)
              .maybeSingle();

            const currentDaysRemaining = userProf?.days_remaining ? Number(userProf.days_remaining) : 0;
            const newDaysRemaining = currentDaysRemaining > 0 ? currentDaysRemaining + 30 : 30;

            const profileUpdates = {
              status: "Active",
              days_remaining: newDaysRemaining,
              updated_at: new Date().toISOString(),
            };

            let finalPlan = (userProf?.plan || "Pro Membership").split(" [Add-ons:")[0];
            if (userProf?.upcoming_plan || userProf?.next_plan) {
              finalPlan = (userProf.upcoming_plan || userProf.next_plan).split(" [Add-ons:")[0];
              profileUpdates.plan = finalPlan;
              profileUpdates.upcoming_plan = null;
              profileUpdates.next_plan = null;
            }

            await supabase.from("profiles").update(profileUpdates).eq("id", targetUserId);

            try {
              await supabase.from("notifications").insert([
                {
                  user_id: targetUserId,
                  title: "Monthly Pass Approved! 🎉",
                  message: `Your renewal payment has been verified and approved by admin. 30 days added to your ${finalPlan} pass!`,
                  type: "payment_approved",
                  action: "VIEW_PAYMENT",
                  created_at: new Date().toISOString(),
                },
              ]);
            } catch (notifErr) { }
          }
        }

        await fetchPaymentsAndMembers();
      } catch (err) {
        console.error("Supabase approve error:", err);
      }
    }

    setActiveProof(null);
    setTimeout(() => setStatusMsg(""), 5000);
  };

  const handleRejectPayment = async (targetMember, explicitProofUrl = null, explicitPaymentId = null) => {
    if (!confirm(`Are you sure you want to reject the payment proof for ${targetMember.full_name || "this member"}?`)) {
      return;
    }

    setStatusMsg(`Payment proof rejected for ${targetMember.full_name || "member"}. Screenshot deleted from storage.`);

    const targetUserId = targetMember.user_id || targetMember.id;
    let targetPaymentId = explicitPaymentId || targetMember.payment_id;

    if (!targetPaymentId) {
      const pendingPay = payments.find(
        (p) => p.user_id === targetUserId && (p.status === "Pending Approval" || p.proof_url)
      );
      targetPaymentId = pendingPay?.id;
    }

    setPayments((prev) =>
      prev.map((p) =>
        (targetPaymentId && p.id === targetPaymentId) || (!targetPaymentId && p.user_id === targetUserId && p.status === "Pending Approval")
          ? { ...p, status: "Rejected", proof_url: null }
          : p
      )
    );

    if (isSupabaseConfigured()) {
      try {
        if (explicitProofUrl && explicitProofUrl.includes("payment-proofs")) {
          try {
            const urlParts = explicitProofUrl.split("/payment-proofs/");
            if (urlParts.length > 1) {
              const filePath = urlParts[1].split("?")[0];
              await supabase.storage.from("payment-proofs").remove([filePath]);
            }
          } catch (storageErr) {
            console.warn("Storage cleanup notice on reject:", storageErr);
          }
        }

        // Update targeted payment record in both tables
        if (targetPaymentId) {
          await Promise.allSettled([
            supabase.from("payments").update({ status: "Rejected", proof_url: null }).eq("id", targetPaymentId),
            supabase.from("addon_payments").update({ status: "Rejected", proof_url: null }).eq("id", targetPaymentId),
          ]);
        } else {
          // Fallback: update only pending approval payments for this user
          await Promise.allSettled([
            supabase.from("payments").update({ status: "Rejected", proof_url: null }).eq("user_id", targetUserId).eq("status", "Pending Approval"),
            supabase.from("addon_payments").update({ status: "Rejected", proof_url: null }).eq("user_id", targetUserId).eq("status", "Pending Approval"),
          ]);
        }

        // Insert notification for member about rejection
        if (targetUserId) {
          try {
            await supabase.from("notifications").insert([
              {
                user_id: targetUserId,
                title: "Payment Proof Rejected ❌",
                message: "Your payment transfer proof was rejected by admin. Please submit a valid receipt in the Payments tab.",
                type: "expired",
                action: "PAY_FEE",
                created_at: new Date().toISOString(),
              },
            ]);
          } catch (notifErr) {
            console.warn("Notice creating rejection notification:", notifErr);
          }
        }

        await fetchPaymentsAndMembers();
      } catch (err) {
        console.error("Supabase reject error:", err);
      }
    }

    setActiveProof(null);
    setTimeout(() => setStatusMsg(""), 5000);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();

    if (!selectedMemberId) {
      alert("Please select a registered member or walk-in guest.");
      return;
    }

    if (selectedMemberId && selectedMemberId !== "custom") {
      const info = getMemberPaymentInfo(selectedMemberId);
      if (info.status === "Paid" || info.remaining <= 0) {
        alert("This member has already paid their full subscription fee for this month.");
        return;
      }
    }

    const numericAmount = parseFloat(amount) || 0;
    if (numericAmount <= 0) {
      alert("Amount collected must be greater than 0 PKR.");
      return;
    }

    setSubmitting(true);
    const numericTotalFee = parseFloat(totalFee) || numericAmount;
    const invId = `INV-${Math.floor(1000 + Math.random() * 9000)}`;

    let targetUserId = selectedMemberId;
    let targetName = customGuestName || "Walk-In Guest";
    let targetMemberId = `GP-WALK-${Math.floor(1000 + Math.random() * 9000)}`;
    let targetPlan = "Walk-in Pass";

    if (selectedMemberId && selectedMemberId !== "custom") {
      const found = members.find((m) => m.id === selectedMemberId);
      if (found) {
        targetName = found.full_name;
        targetMemberId = found.member_id || "GP-MEM";
        targetPlan = found.plan || "Pro Membership";
      }
    } else {
      targetUserId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    }

    const isWalkInPayment = !selectedMemberId || selectedMemberId === "custom";
    const actualTotalFee = isWalkInPayment ? numericAmount : numericTotalFee;
    const remainingDue = isWalkInPayment ? 0 : Math.max(0, actualTotalFee - numericAmount);
    const finalStatus = isWalkInPayment ? "Paid" : remainingDue === 0 ? "Paid" : "Partial";

    const effectiveMethod =
      (method === "Other Banks" || method === "Other Bank" || method === "Bank Transfer") && customBankName.trim()
        ? `Bank Transfer (${customBankName.trim()})`
        : method;

    if (isSupabaseConfigured()) {
      try {
        if (isWalkInPayment) {
          await supabase.from("profiles").insert([
            {
              id: targetUserId,
              email: `guest.${Date.now()}@abdullahgym.local`,
              full_name: targetName,
              member_id: targetMemberId,
              plan: "Daily Visitor Pass",
              role: "walkin",
              status: "Active",
            },
          ]);
        }

        await supabase.from("payments").insert([
          {
            user_id: targetUserId,
            amount: numericAmount,
            total_fee: actualTotalFee,
            status: finalStatus,
            payment_method: effectiveMethod,
            payment_type: "membership",
            item_name: targetPlan,
            invoice_id: isWalkInPayment ? `INV-WALK-${Math.floor(1000 + Math.random() * 9000)}` : invId,
            date: new Date().toISOString(),
          },
        ]);

        if (finalStatus === "Paid") {
          if (!isWalkInPayment) {
            const { data: targetProf } = await supabase
              .from("profiles")
              .select("days_remaining")
              .eq("id", targetUserId)
              .maybeSingle();
            const currDays = targetProf?.days_remaining ? Number(targetProf.days_remaining) : 0;
            const updatedDays = currDays > 0 ? currDays + 30 : 30;
            await supabase
              .from("profiles")
              .update({
                status: "Active",
                days_remaining: updatedDays,
                updated_at: new Date().toISOString(),
              })
              .eq("id", targetUserId);
          } else {
            await supabase.from("profiles").update({ status: "Active" }).eq("id", targetUserId);
          }
        }

        await fetchPaymentsAndMembers();
      } catch (err) {
        console.error("Payment insert exception:", err);
      }
    } else {
      const newPaymentLog = {
        id: String(Date.now()),
        user_id: targetUserId,
        invoice_id: invId,
        member_name: targetName,
        member_id: targetMemberId,
        plan: targetPlan,
        raw_amount: numericAmount,
        raw_total_fee: numericTotalFee,
        raw_remaining: remainingDue,
        amount: `PKR ${Number(numericAmount).toLocaleString()}`,
        total_fee: `PKR ${Number(numericTotalFee).toLocaleString()}`,
        remaining: `PKR ${Number(remainingDue).toLocaleString()}`,
        date: new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
        method: effectiveMethod,
        status: finalStatus,
      };

      setPayments([newPaymentLog, ...payments]);
    }

    setCustomBankName("");

    setStatusMsg(
      `✓ Payment of PKR ${Number(numericAmount).toLocaleString()} recorded for ${targetName}!`
    );
    setTimeout(() => setStatusMsg(""), 5000);

    setSubmitting(false);
    setIsModalOpen(false);
  };

  const handleCollectRemainingBalance = (member) => {
    const info = getMemberPaymentInfo(member.id);
    setSelectedMemberId(member.id);
    setTotalFee(String(info.total_fee));
    setAmount(String(info.remaining > 0 ? info.remaining : info.total_fee));
    setIsModalOpen(true);
  };

  const resolveBasePlanFee = (planStr) => {
    if (!planStr) return 1600;
    const cleanStr = String(planStr).trim().toLowerCase();

    if (availablePlans && availablePlans.length > 0) {
      const exactMatch = availablePlans.find(
        (p) => p.name && cleanStr === p.name.toLowerCase()
      );
      if (exactMatch) {
        return Number(exactMatch.monthly_price || exactMatch.monthlyPrice || exactMatch.daily_price || exactMatch.dailyPrice || 1600);
      }

      const subMatch = availablePlans.find(
        (p) => p.name && (cleanStr.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(cleanStr))
      );
      if (subMatch) {
        return Number(subMatch.monthly_price || subMatch.monthlyPrice || subMatch.daily_price || subMatch.dailyPrice || 1600);
      }
    }

    const pkrMatch = cleanStr.match(/(?:pkr|rs\.?)\s*([\d,]+)/i);
    if (pkrMatch && pkrMatch[1]) {
      const parsed = parseInt(pkrMatch[1].replace(/,/g, ""), 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }

    if (cleanStr.includes("pro plus") || cleanStr.includes("pro+")) return 12000;
    if (cleanStr.includes("vip") || cleanStr.includes("champion")) return 9000;
    if (cleanStr.includes("standard")) return 1600;
    if (cleanStr.includes("daily") || cleanStr.includes("visitor")) return 500;
    return 1600;
  };

  const getMemberPaymentInfo = (memberId) => {
    const member = members.find((m) => m.id === memberId);
    const cleanPlan = (member?.plan || "Standard Membership").split(" [Add-ons:")[0];

    let basePlanFee = (member?.fee_paid && Number(member.fee_paid) > 0)
      ? Number(member.fee_paid)
      : (member?.total_fee && Number(member.total_fee) > 0)
        ? Number(member.total_fee)
        : resolveBasePlanFee(cleanPlan);

    const userPayments = payments.filter((p) => p.user_id === memberId);
    const gymPayments = userPayments.filter((p) => !p.is_addon);
    const addonPayments = userPayments.filter((p) => p.is_addon);

    const paidGymPayments = gymPayments.filter((p) => p.status === "Paid");
    const sumPaidGym = paidGymPayments.reduce((acc, p) => acc + (p.raw_amount || 0), 0);

    const pendingGymPay = gymPayments.find((p) => p.status === "Pending Approval" || p.proof_url);
    const pendingAddonPay = addonPayments.find((p) => p.status === "Pending Approval" || p.proof_url);

    const isPendingAddon = !pendingGymPay && !!pendingAddonPay;
    const activePending = pendingGymPay || pendingAddonPay;

    const isExpired =
      member?.status === "Expired" ||
      (member?.days_remaining !== undefined && member?.days_remaining !== null && Number(member.days_remaining) <= 0);

    let st = "Unpaid";
    if (activePending) {
      st = "Pending Approval";
    } else if (isExpired) {
      st = "Unpaid";
    } else if (paidGymPayments.length > 0 || member?.status === "Active") {
      st = "Paid";
    }

    const proofUrl = activePending?.proof_url || userPayments.find((p) => p.proof_url)?.proof_url || member?.proof_url || null;

    return {
      status: st,
      paid: sumPaidGym > 0 ? sumPaidGym : (st === "Paid" ? basePlanFee : 0),
      total_fee: isPendingAddon ? (pendingAddonPay?.raw_amount || 1500) : basePlanFee,
      base_plan_fee: basePlanFee,
      pending_item_name: isPendingAddon ? (pendingAddonPay?.plan || "Cardio Access Pass (Add-on)") : cleanPlan,
      is_pending_addon: isPendingAddon,
      proof_url: proofUrl,
      payment_id: activePending?.id || paidGymPayments[0]?.id || userPayments[0]?.id || null,
      method: activePending?.method || paidGymPayments[0]?.method || userPayments[0]?.method || "Cash / Desk",
      invoice_id: activePending?.invoice_id || paidGymPayments[0]?.invoice_id || userPayments[0]?.invoice_id || "INV-MEM",
      is_expired: isExpired,
    };
  };

  const pendingApprovalsList = useMemo(
    () => payments.filter((p) => p.status === "Pending Approval"),
    [payments]
  );
  const pendingApprovalsCount = pendingApprovalsList.length;

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.invoice_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.method?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (statusFilter !== "All" && p.status !== statusFilter) return false;
      return true;
    });
  }, [payments, searchTerm, statusFilter]);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        !searchTerm ||
        m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.member_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const info = getMemberPaymentInfo(m.id);
      if (statusFilter === "Paid" && info.status !== "Paid") return false;
      if (statusFilter === "Unpaid" && info.status !== "Unpaid") return false;
      if (statusFilter === "Pending Approval" && info.status !== "Pending Approval") return false;
      if (statusFilter === "Rejected" && info.status !== "Rejected") return false;
      return true;
    });
  }, [members, searchTerm, statusFilter, payments, availablePlans]);

  const totalRevenue = useMemo(
    () =>
      payments
        .filter((p) => p.status === "Paid")
        .reduce((acc, p) => acc + (p.raw_amount || 0), 0),
    [payments]
  );

  const paidCount = useMemo(() => payments.filter((p) => p.status === "Paid").length, [payments]);
  const unpaidCount = useMemo(
    () => members.filter((m) => getMemberPaymentInfo(m.id).status === "Unpaid").length,
    [members, payments]
  );

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Payments & Billing
          </h1>
        </div>

        <button
          onClick={() => {
            setSelectedMemberId("");
            setAmount("1600");
            setTotalFee("1600");
            setMethod("Cash / Desk");
            setCustomBankName("");
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
        >
          <span>＋</span>
          <span>Record Payment</span>
        </button>
      </div>

      {/* PENDING APPROVAL ALERT BANNER */}
      {pendingApprovalsCount > 0 && (
        <div className="p-4 bg-indigo-50 border border-indigo-200/80 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base shrink-0">
              📱
            </div>
            <div>
              <h4 className="font-bold text-xs text-indigo-950">
                Pending App Screenshots ({pendingApprovalsCount} Awaiting Review)
              </h4>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                Members have submitted payment transfer screenshots requiring admin verification.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTab("members");
              setStatusFilter("Pending Approval");
            }}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
          >
            Review ({pendingApprovalsCount}) →
          </button>
        </div>
      )}

      {/* SUCCESS NOTIFICATION */}
      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between shadow-2xs">
          <span>{statusMsg}</span>
          <button
            onClick={() => setStatusMsg("")}
            className="text-emerald-600 hover:text-emerald-800 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* FINANCIAL OVERVIEW METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricStatCard
          title="Total Revenue"
          value={`PKR ${Number(totalRevenue).toLocaleString()}`}
          subtext="Total collected revenue"
          color="emerald"
        />
        <MetricStatCard
          title="Fully Paid"
          value={`${paidCount} Members`}
          subtext="Active cleared passes"
          color="slate"
        />
        <MetricStatCard
          title="Overdue / Unpaid"
          value={`${unpaidCount} Members`}
          subtext="Awaiting fee payment"
          color="rose"
        />
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Tab Switcher */}
          <div className="sm:col-span-6 lg:col-span-5 flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              onClick={() => {
                setActiveTab("logs");
                setStatusFilter("All");
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === "logs" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
            >
              Transactions ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === "members" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
            >
              Member Fees ({members.length})
              {pendingApprovalsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </button>
          </div>

          {/* Search Input */}
          <div className="sm:col-span-6 lg:col-span-7 relative">
            <input
              type="text"
              placeholder={activeTab === "logs" ? "Search transactions by member, invoice..." : "Search member by name or ID..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="pt-2.5 border-t border-slate-100 flex gap-1.5 overflow-x-auto">
          {[
            { key: "All", label: "Show All" },
            { key: "Paid", label: "✓ Fully Paid" },
            { key: "Pending Approval", label: "📱 App Proofs" },
            { key: "Rejected", label: "✕ Rejected" },
            { key: "Unpaid", label: "🔴 Unpaid" },
          ].map((st) => (
            <button
              key={st.key}
              onClick={() => setStatusFilter(st.key)}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${statusFilter === st.key
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-500 hover:text-slate-800"
                }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: TRANSACTIONS LOG TABLE */}
      {activeTab === "logs" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-auto max-h-[calc(100vh-320px)] rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-md z-10">
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Loading payment records...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No payment records found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-emerald-700 font-bold">
                        {p.invoice_id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {p.member_name}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        {p.amount}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">{p.date}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{p.method}</td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {p.status === "Pending Approval" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {p.proof_url && (
                              <button
                                onClick={() =>
                                  setActiveProof({
                                    member: { id: p.user_id, full_name: p.member_name },
                                    info: {
                                      proof_url: p.proof_url,
                                      payment_id: p.id,
                                      total_fee: p.raw_total_fee || p.raw_amount,
                                      is_pending_addon: p.is_addon,
                                      pending_item_name: p.plan,
                                    },
                                  })
                                }
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg border border-indigo-200 transition cursor-pointer"
                                title="View submitted proof screenshot"
                              >
                                🖼️ Proof
                              </button>
                            )}
                            <button
                              onClick={() =>
                                handleApprovePayment(
                                  {
                                    id: p.user_id,
                                    full_name: p.member_name,
                                    payment_id: p.id,
                                    is_addon: p.is_addon,
                                    addon_id: p.addon_id,
                                    addon_name: p.addon_name,
                                    plan: p.plan,
                                  },
                                  p.proof_url,
                                  p.id
                                )
                              }
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition shadow-2xs cursor-pointer"
                              title="Approve this payment"
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() =>
                                handleRejectPayment(
                                  { id: p.user_id, full_name: p.member_name, payment_id: p.id },
                                  p.proof_url,
                                  p.id
                                )
                              }
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg border border-rose-200 transition cursor-pointer"
                              title="Reject this payment proof"
                            >
                              ✕
                            </button>
                          </div>
                        ) : p.status === "Paid" ? (
                          <button
                            onClick={() => {
                              const memberPaidRecords = payments.filter(
                                (item) =>
                                  (item.user_id === p.user_id || (p.member_id && item.member_id === p.member_id)) &&
                                  (item.status === "Paid" || item.raw_amount > 0)
                              );
                              const totalPaidSum = memberPaidRecords.reduce((sum, item) => sum + (Number(item.raw_amount) || 0), 0);
                              const totalMembershipSum = memberPaidRecords
                                .filter((item) => !item.is_addon)
                                .reduce((sum, item) => sum + (Number(item.raw_amount) || 0), 0);
                              const totalAddonSum = memberPaidRecords
                                .filter((item) => item.is_addon)
                                .reduce((sum, item) => sum + (Number(item.raw_amount) || 0), 0);

                              setActiveInvoice({
                                ...p,
                                total_membership_paid: totalMembershipSum || p.raw_amount,
                                total_addon_paid: totalAddonSum,
                                total_paid_sum: totalPaidSum || p.raw_amount,
                                member_history: memberPaidRecords.length > 0 ? memberPaidRecords : [p],
                              });
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg transition cursor-pointer"
                          >
                            Print Slip
                          </button>
                        ) : p.status === "Rejected" ? (
                          <span className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                            ✕ Rejected
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">No Slip</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: REGISTERED MEMBERS PAYMENT ROSTER */}
      {activeTab === "members" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-auto max-h-[calc(100vh-320px)] rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-md z-10">
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Plan Fee</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">App Screenshot</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Loading registered members...
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No members match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => {
                    const info = getMemberPaymentInfo(m.id);
                    const isFullyPaid = info.status === "Paid";
                    const isPendingApproval = info.status === "Pending Approval";

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <p className="text-xs font-bold leading-tight">{m.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{m.email}</p>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-emerald-700 font-bold">
                          {m.member_id || "GP-0000"}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          <p className="text-xs font-semibold text-slate-800">
                            {info.is_pending_addon ? (
                              <span className="inline-flex items-center gap-1 text-indigo-700 font-bold">
                                🏃 {info.pending_item_name}
                              </span>
                            ) : (
                              m.plan || "Standard Membership"
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono font-bold">
                            PKR {Number(info.total_fee).toLocaleString()}
                            {info.is_pending_addon && (
                              <span className="text-slate-400 font-normal ml-1.5">
                                (Main Pass: PKR {Number(info.base_plan_fee).toLocaleString()} • Paid)
                              </span>
                            )}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <StatusBadge status={info.status} />
                        </td>

                        <td className="py-3.5 px-4">
                          {info.proof_url ? (
                            <button
                              onClick={() => setActiveProof({ member: m, info })}
                              className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold rounded border border-indigo-200 transition cursor-pointer"
                            >
                              View Proof
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">None</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isPendingApproval ? (
                            <button
                              onClick={() =>
                                handleApprovePayment(
                                  { id: m.id, full_name: m.full_name, payment_id: info.payment_id },
                                  info.proof_url,
                                  info.payment_id
                                )
                              }
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                            >
                              Approve
                            </button>
                          ) : isFullyPaid ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg">
                                ✓ Cleared
                              </span>
                              <button
                                onClick={() => {
                                  const memberPaidRecords = payments.filter(
                                    (p) =>
                                      (p.user_id === m.id || p.member_id === m.member_id || p.member_name?.toLowerCase() === m.full_name?.toLowerCase()) &&
                                      (p.status === "Paid" || p.raw_amount > 0)
                                  );

                                  const totalPaidSum = memberPaidRecords.reduce((sum, p) => sum + (Number(p.raw_amount) || 0), 0);
                                  const totalMembershipSum = memberPaidRecords
                                    .filter((p) => !p.is_addon)
                                    .reduce((sum, p) => sum + (Number(p.raw_amount) || 0), 0);
                                  const totalAddonSum = memberPaidRecords
                                    .filter((p) => p.is_addon)
                                    .reduce((sum, p) => sum + (Number(p.raw_amount) || 0), 0);

                                  setActiveInvoice({
                                    id: `stmt-${m.id}`,
                                    invoice_id: info.invoice_id || (memberPaidRecords[0]?.invoice_id) || `INV-${m.member_id || "000"}`,
                                    user_id: m.id,
                                    member_name: m.full_name,
                                    member_id: m.member_id || "GP-MEMBER",
                                    plan: m.plan || "Standard Membership",
                                    amount: `PKR ${Number(totalPaidSum || info.paid || info.total_fee).toLocaleString()}`,
                                    total_membership_paid: totalMembershipSum || Number(info.paid || info.total_fee),
                                    total_addon_paid: totalAddonSum,
                                    total_paid_sum: totalPaidSum || Number(info.paid || info.total_fee),
                                    date: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
                                    method: info.method || (memberPaidRecords[0]?.method) || "Cash / Desk",
                                    status: "Paid",
                                    is_member_statement: true,
                                    member_history: memberPaidRecords.length > 0 ? memberPaidRecords : [
                                      {
                                        id: info.payment_id || `pay-${m.id}`,
                                        invoice_id: info.invoice_id || `INV-${m.member_id || "000"}`,
                                        item_name: m.plan || "Standard Monthly Pass",
                                        plan: m.plan || "Standard Monthly Pass",
                                        date: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
                                        method: info.method || "Cash / Desk",
                                        amount: `PKR ${Number(info.paid || info.total_fee).toLocaleString()}`,
                                        raw_amount: Number(info.paid || info.total_fee),
                                        is_addon: false,
                                        status: "Paid",
                                      },
                                    ],
                                  });
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                                title="Print Official Payment Slip"
                              >
                                Print Slip
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedMemberId(m.id);
                                setTotalFee(String(info.total_fee));
                                setAmount(String(info.total_fee));
                                setIsModalOpen(true);
                              }}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition shadow-2xs cursor-pointer"
                            >
                              Collect Fee
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECORD MANUAL PAYMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Record Payment</h3>
                <p className="text-xs text-slate-500">Record membership fee payment.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm p-1.5 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Select Member *
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedMemberId(val);
                    if (val === "custom") {
                      setCustomGuestName("");
                      setTotalFee("500");
                      setAmount("500");
                    } else if (val) {
                      const found = members.find((m) => m.id === val);
                      if (found) {
                        const mPlan = found.plan || "";
                        const feeRate = resolveBasePlanFee(mPlan);
                        setTotalFee(String(feeRate));
                        setAmount(String(feeRate));
                      }
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                >
                  <option value="">-- Select Member --</option>
                  {members.map((m) => {
                    const info = getMemberPaymentInfo(m.id);
                    const isFullyPaid = info.status === "Paid";
                    return (
                      <option key={m.id} value={m.id} disabled={isFullyPaid}>
                        {m.full_name} ({m.plan || "Standard Membership"}){" "}
                        {isFullyPaid ? "— Cleared" : `(Fee: PKR ${Number(info.total_fee).toLocaleString()})`}
                      </option>
                    );
                  })}
                  <option value="custom">🚶 Walk-In Visitor</option>
                </select>
              </div>

              {(!selectedMemberId || selectedMemberId === "custom") && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Visitor Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customGuestName}
                    onChange={(e) => setCustomGuestName(e.target.value)}
                    placeholder="e.g. Ahmad Ali"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Payment Amount (PKR) *
                </label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setTotalFee(e.target.value);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={method}
                  onChange={(e) => {
                    setMethod(e.target.value);
                    if (e.target.value !== "Other Banks" && e.target.value !== "Other Bank") {
                      setCustomBankName("");
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                >
                  <option value="Cash / Desk">💵 Cash at Desk</option>
                  <option value="EasyPaisa">📲 EasyPaisa</option>
                  <option value="JazzCash">📱 JazzCash</option>
                  <option value="Meezan Bank">🏦 Meezan Bank</option>
                  <option value="HBL Bank">🏦 HBL Bank</option>
                  <option value="Bank Transfer">🏦 Bank Transfer</option>
                  <option value="Other Banks">🏦 Other Banks (Custom)</option>
                </select>
              </div>

              {(method === "Other Banks" || method === "Other Bank") && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                    placeholder="e.g. Bank Alfalah, Allied Bank, UBL, Faysal Bank"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                >
                  {submitting ? "Saving..." : "✓ Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE RECEIPT & MEMBER STATEMENT MODAL */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-800 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveInvoice(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-sm p-1.5 rounded-lg cursor-pointer"
            >
              ✕
            </button>

            <div className="border-b border-slate-100 pb-3 text-center space-y-1">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-lg mx-auto shadow-xs mb-1">
                AG
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">ABDULLAH GYM</h3>
              <p className="text-xs font-bold text-emerald-700">Official Member Payment Statement & Slip</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Statement / Inv</span>
                  <p className="font-bold text-slate-900">{activeInvoice.invoice_id}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Issued Date</span>
                  <p className="font-medium text-slate-700">{activeInvoice.date}</p>
                </div>
              </div>

              <div className="space-y-1.5 p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Member Name:</span>
                  <span className="font-bold text-slate-900">{activeInvoice.member_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Member ID:</span>
                  <span className="font-mono font-bold text-emerald-800">{activeInvoice.member_id || "GP-MEMBER"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Assigned Plan:</span>
                  <span className="font-semibold text-slate-800">{activeInvoice.plan}</span>
                </div>
              </div>

              {/* All Monthly & Add-On Payments History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Payment History ({activeInvoice.member_history?.length || 1} Paid)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Verified Ledger
                  </span>
                </div>

                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/40">
                  {(activeInvoice.member_history && activeInvoice.member_history.length > 0
                    ? activeInvoice.member_history
                    : [activeInvoice]
                  ).map((hist, idx) => (
                    <div key={hist.id || idx} className="p-2.5 flex items-center justify-between hover:bg-white transition">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                              hist.is_addon
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : hist.is_walk_in
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {hist.is_addon ? "Add-On" : hist.is_walk_in ? "Walk-In" : "Membership"}
                          </span>
                          <p className="font-bold text-slate-900 text-xs leading-tight">
                            {hist.plan || hist.item_name || "Monthly Fee"}
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {hist.invoice_id} • {hist.date} • {hist.method || "Cash / Desk"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-slate-900 text-xs block">
                          {hist.amount || `PKR ${Number(hist.raw_amount || 0).toLocaleString()}`}
                        </span>
                        <span className="text-[9px] font-bold text-emerald-600">✓ Paid</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown & Grand Total */}
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-1.5 shadow-inner">
                {activeInvoice.total_addon_paid > 0 && (
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Monthly Membership Total:</span>
                    <span className="font-mono text-slate-300 font-bold">
                      PKR {Number(activeInvoice.total_membership_paid || 0).toLocaleString()}
                    </span>
                  </div>
                )}
                {activeInvoice.total_addon_paid > 0 && (
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Add-On Services Total:</span>
                    <span className="font-mono text-purple-300 font-bold">
                      PKR {Number(activeInvoice.total_addon_paid || 0).toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-200">Grand Total Paid:</span>
                  <span className="font-mono text-emerald-400 font-black text-base">
                    PKR {Number(activeInvoice.total_paid_sum || activeInvoice.raw_amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Developer Attribution Footer */}
              <div className="pt-2 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-400">
                  Powered by <strong className="text-slate-700">CodeInn Tech</strong> |{" "}
                  <a
                    href="mailto:contact@codeinntech.com"
                    className="underline text-emerald-600 font-semibold"
                  >
                    contact@codeinntech.com
                  </a>
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => setActiveInvoice(null)}
                className="text-xs text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl font-semibold cursor-pointer"
              >
                Close
              </button>
              {activeInvoice.status === "Paid" ? (
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>🖨️</span> Print Slip / Statement
                </button>
              ) : (
                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                  ⚠️ Slip Unavailable (Unpaid / Rejected)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROOF SCREENSHOT REVIEW MODAL */}
      {activeProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-800 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setActiveProof(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-sm p-1.5 rounded-lg cursor-pointer"
            >
              ✕
            </button>

            {(() => {
              const memberObj = activeProof.member || activeProof || {};
              const infoObj = activeProof.info || activeProof || {};
              const proofUrl =
                infoObj.proof_url ||
                activeProof.proof_url ||
                (typeof activeProof === "string" ? activeProof : null);
              const feeAmount =
                Number(infoObj.total_fee || infoObj.raw_total_fee || infoObj.raw_amount || infoObj.paid || 0);
              const planTitle =
                infoObj.pending_item_name || infoObj.plan || infoObj.item_name || "Payment Verification";
              const targetPaymentId = infoObj.payment_id || infoObj.id || memberObj.payment_id;

              return (
                <>
                  <div className="border-b border-slate-100 pb-2 flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">Payment Screenshot</h3>
                      <p className="text-xs text-slate-500">
                        From: <strong className="text-slate-800 font-bold">{memberObj.full_name || memberObj.member_name || "Gym Member"}</strong>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg font-mono">
                        PKR {feeAmount.toLocaleString()}
                      </span>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        {planTitle}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 max-h-96 overflow-auto flex items-center justify-center">
                    {proofUrl ? (
                      <a href={proofUrl} target="_blank" rel="noopener noreferrer" title="Click to view full size">
                        <img
                          src={proofUrl}
                          alt="Payment Screenshot"
                          className="max-h-88 w-full object-contain rounded-xl"
                          onError={(e) => {
                            console.warn("Screenshot failed to load:", proofUrl);
                          }}
                        />
                      </a>
                    ) : (
                      <div className="py-12 text-center text-slate-400 text-xs">
                        <span className="text-3xl block mb-1">🖼️</span>
                        No proof screenshot attached.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveProof(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl font-semibold mr-auto cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectPayment(memberObj, proofUrl, targetPaymentId)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-rose-200 transition-all cursor-pointer"
                    >
                      Reject Proof
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleApprovePayment(
                          {
                            id: memberObj.id || memberObj.user_id,
                            full_name: memberObj.full_name || memberObj.member_name,
                            payment_id: targetPaymentId,
                            is_addon: infoObj.is_addon || infoObj.is_pending_addon,
                            addon_id: infoObj.addon_id,
                            addon_name: infoObj.addon_name,
                            plan: infoObj.plan,
                          },
                          proofUrl,
                          targetPaymentId
                        )
                      }
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      ✓ Approve (PKR {feeAmount.toLocaleString()})
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      <LoadingOverlay isLoading={submitting} message={submitMsg} />
    </div>
  );
}