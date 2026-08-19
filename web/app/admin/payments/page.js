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
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
        styles[key] || styles.Unpaid
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
    fetchPaymentsAndMembers();
  }, []);

  const fetchPaymentsAndMembers = async () => {
    setLoading(true);
    let loadedFromSupabase = false;

    if (isSupabaseConfigured()) {
      try {
        const { data: planData } = await supabase
          .from("gym_plans")
          .select("*")
          .eq("active", true);
        if (planData) setAvailablePlans(planData);

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

        const { data: payData, error } = await supabase
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

        const formattedGym = (!error && payData ? payData : []).map((item) => {
          const prof = profileMap.get(item.user_id);
          const isWalkIn =
            item.invoice_id?.startsWith("INV-WALK") ||
            prof?.member_id?.startsWith("GP-WALK-") ||
            prof?.role === "walkin" ||
            prof?.plan?.toLowerCase().includes("walk-in") ||
            prof?.plan?.toLowerCase().includes("daily") ||
            item.payment_method?.toLowerCase().includes("walk-in");

          let amt = parseFloat(item.amount) || 0;
          const cleanProfPlan = (prof?.plan || "Pro Membership").split(" [Add-ons:")[0].split(" [Next:")[0];
          const matchedPlan = (planData || availablePlans || []).find(
            (p) =>
              p.name.toLowerCase() === cleanProfPlan.toLowerCase() ||
              cleanProfPlan.toLowerCase().includes(p.name.toLowerCase())
          );

          let tFee = 5000;
          if (isWalkIn) {
            tFee = amt > 0 ? amt : 500;
            amt = tFee;
          } else {
            if (item.total_fee && parseFloat(item.total_fee) > 0) {
              tFee = parseFloat(item.total_fee);
            } else if (matchedPlan) {
              tFee = parseFloat(matchedPlan.monthly_price || matchedPlan.monthlyPrice) || 5000;
            }

            if (amt <= 0) {
              amt = parseFloat(prof?.fee_paid) || tFee;
            }
          }

          let calculatedStatus = "Unpaid";
          if (item.status === "Rejected") calculatedStatus = "Rejected";
          else if (item.status === "Pending Approval" || item.proof_url) calculatedStatus = "Pending Approval";
          else if (item.status === "Paid" || amt > 0 || isWalkIn) calculatedStatus = "Paid";
          else calculatedStatus = "Unpaid";

          return {
            id: item.id,
            user_id: item.user_id,
            is_addon: false,
            invoice_id: item.invoice_id || `INV-${item.id.slice(0, 4)}`,
            member_name: prof?.full_name || item.member_name || "Gym Member",
            member_id: prof?.member_id || (isWalkIn ? "GP-WALK-GUEST" : "GP-MEMBER"),
            plan: isWalkIn ? "Daily Walk-In Pass" : cleanProfPlan,
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

        const formattedAddon = addonPayData.map((item) => {
          const prof = profileMap.get(item.user_id);
          let amt = parseFloat(item.amount) || 1500;
          let calculatedStatus = "Unpaid";
          if (item.status === "Rejected") calculatedStatus = "Rejected";
          else if (item.status === "Pending Approval" || item.proof_url) calculatedStatus = "Pending Approval";
          else if (item.status === "Paid") calculatedStatus = "Paid";

          return {
            id: item.id,
            user_id: item.user_id,
            is_addon: true,
            invoice_id: item.invoice_id || `INV-ADD-${item.id.slice(0, 4)}`,
            member_name: prof?.full_name || "Gym Member",
            member_id: prof?.member_id || "GP-MEMBER",
            plan: `${item.addon_name || "Cardio Access Pass"} (Add-on)`,
            raw_amount: amt,
            raw_total_fee: amt,
            amount: `PKR ${Number(amt).toLocaleString()}`,
            total_fee: `PKR ${Number(amt).toLocaleString()}`,
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

        setPayments([...formattedGym, ...formattedAddon]);
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

        if (isAddonPayment) {
          // 1. Approve Add-on payment in addon_payments table ONLY
          await supabase
            .from("addon_payments")
            .update({ status: "Paid", proof_url: null })
            .eq("id", targetPaymentId);

          // 2. Fetch existing member_addons & profile to check unexpired remaining days
          const { data: existingMemberAddon } = await supabase
            .from("member_addons")
            .select("start_date, expiry_date, days_remaining")
            .eq("user_id", targetUserId)
            .maybeSingle();

          const { data: userProf } = await supabase
            .from("profiles")
            .select("active_addons")
            .eq("id", targetUserId)
            .maybeSingle();

          let existingAddons = Array.isArray(userProf?.active_addons) ? [...userProf.active_addons] : [];
          const cardioIdx = existingAddons.findIndex((a) => a.name?.toLowerCase().includes("cardio") || a.id === "addon-1" || a.addon_id === "addon-1");
          const existingAddonObj = cardioIdx >= 0 ? existingAddons[cardioIdx] : null;

          const currentExpiryStr = existingMemberAddon?.expiry_date || existingAddonObj?.expiry_date;
          const currentExpiry = currentExpiryStr ? new Date(currentExpiryStr) : null;
          const isCurrentlyActive = currentExpiry && currentExpiry.getTime() > Date.now();

          // If current cycle still has days remaining (e.g. 5 days), stack +30 days on top of existing expiry (5 + 30 = 35 days)
          const baseTime = isCurrentlyActive ? currentExpiry.getTime() : Date.now();
          const newExpiryDate = new Date(baseTime + 30 * 86400000);
          const newExpiry = newExpiryDate.toISOString();
          const totalDaysRemaining = Math.max(1, Math.ceil((newExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          const originalStartDate = existingMemberAddon?.start_date || existingAddonObj?.start_date || new Date().toISOString();

          try {
            await supabase
              .from("member_addons")
              .update({
                start_date: originalStartDate,
                expiry_date: newExpiry,
                days_remaining: totalDaysRemaining,
                status: "Active",
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", targetUserId);
          } catch (e) {}

          const updatedAddonRecord = {
            id: existingAddonObj?.id || "addon-1",
            addon_id: existingAddonObj?.addon_id || "addon-1",
            name: existingAddonObj?.name || "Cardio Access Plan",
            price: existingAddonObj?.price || 1500,
            icon: existingAddonObj?.icon || "🏃",
            start_date: originalStartDate,
            expiry_date: newExpiry,
            days_remaining: totalDaysRemaining,
            status: "Active",
          };

          if (cardioIdx >= 0) {
            existingAddons[cardioIdx] = updatedAddonRecord;
          } else {
            existingAddons.push(updatedAddonRecord);
          }
          await supabase.from("profiles").update({ active_addons: existingAddons }).eq("id", targetUserId);

          try {
            await supabase.from("notifications").insert([
              {
                user_id: targetUserId,
                title: "Cardio Pass Renewed! 🏃",
                message: `Your Cardio Access payment was verified! +30 days added on top of remaining days. Total: ${totalDaysRemaining} days active!`,
                type: "payment_approved",
                action: "VIEW_PAYMENT",
                created_at: new Date().toISOString(),
              },
            ]);
          } catch (notifErr) {}
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
              .select("upcoming_plan, next_plan, plan, full_name")
              .eq("id", targetUserId)
              .maybeSingle();

            const profileUpdates = { status: "Active" };
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
            } catch (notifErr) {}
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

        // Update ONLY this single targeted payment record
        if (targetPaymentId) {
          await supabase
            .from("payments")
            .update({ status: "Rejected", proof_url: null })
            .eq("id", targetPaymentId);
        } else {
          // Fallback: update only pending approval payments for this user
          await supabase
            .from("payments")
            .update({ status: "Rejected", proof_url: null })
            .eq("user_id", targetUserId)
            .eq("status", "Pending Approval");
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
          await supabase.from("profiles").update({ status: "Active" }).eq("id", targetUserId);
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
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === "logs" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Transactions ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "members" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
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
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === st.key
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
                        {p.status === "Paid" ? (
                          <button
                            onClick={() => setActiveInvoice(p)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg transition cursor-pointer"
                          >
                            Print Slip
                          </button>
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
                                onClick={() =>
                                  setActiveInvoice({
                                    id: info.payment_id || `pay-${m.id}`,
                                    invoice_id: info.invoice_id || `INV-${m.member_id || "000"}`,
                                    member_name: m.full_name,
                                    plan: m.plan || "Standard Membership",
                                    amount: `PKR ${Number(info.paid || info.total_fee).toLocaleString()}`,
                                    date: new Date().toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
                                    method: info.method || "Cash / Desk",
                                    status: "Paid",
                                  })
                                }
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

      {/* INVOICE RECEIPT MODAL */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl text-slate-800 relative">
            <button
              onClick={() => setActiveInvoice(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-sm p-1.5 rounded-lg"
            >
              ✕
            </button>

            <div className="border-b border-slate-100 pb-4 text-center space-y-1">
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black text-lg mx-auto shadow-xs mb-1">
                AG
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">ABDULLAH GYM</h3>
              <p className="text-xs font-bold text-emerald-700">Official Payment Receipt</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Invoice</span>
                  <p className="font-bold text-slate-900">{activeInvoice.invoice_id}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Date</span>
                  <p className="font-medium text-slate-700">{activeInvoice.date}</p>
                </div>
              </div>

              <div className="space-y-2 p-3.5 bg-slate-50/60 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Member:</span>
                  <span className="font-bold text-slate-900">{activeInvoice.member_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan:</span>
                  <span className="font-semibold text-slate-800">{activeInvoice.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Method:</span>
                  <span className="font-semibold text-slate-800">{activeInvoice.method}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-900 text-white rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Total Paid:</span>
                  <span className="font-mono text-emerald-400 font-bold text-base">
                    {activeInvoice.amount}
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
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Print Slip / Receipt
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

      {/* PROOF SCREENSHOT MODAL */}
      {activeProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-800 relative">
            <button
              onClick={() => setActiveProof(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 font-bold text-sm p-1.5 rounded-lg"
            >
              ✕
            </button>

            <div className="border-b border-slate-100 pb-2 flex justify-between items-start">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">App Screenshot Review</h3>
                <p className="text-xs text-slate-500">Submitted by {activeProof.member.full_name}</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg font-mono">
                  PKR {Number(activeProof.info?.total_fee || activeProof.info?.paid || 0).toLocaleString()}
                </span>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  {activeProof.info?.pending_item_name || activeProof.info?.plan || "Membership Fee"}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2 max-h-72 overflow-hidden flex items-center justify-center">
              <img
                src={
                  activeProof.info.proof_url ||
                  "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80"
                }
                alt="Payment Proof"
                className="max-h-64 w-full object-contain rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveProof(null)}
                className="text-xs text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl font-semibold mr-auto"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleRejectPayment(activeProof.member, activeProof.info?.proof_url, activeProof.info?.payment_id)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-rose-200 transition-all cursor-pointer"
              >
                Reject Proof
              </button>
              <button
                type="button"
                onClick={() => handleApprovePayment(activeProof.member, activeProof.info?.proof_url, activeProof.info?.payment_id)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Approve {activeProof.info?.is_pending_addon ? "Add-on" : "Transfer"} (PKR {Number(activeProof.info?.total_fee || 0).toLocaleString()})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      <LoadingOverlay isLoading={submitting} message={submitMsg} />
    </div>
  );
}