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
    Partial: "bg-amber-50 text-amber-800 border-amber-200/80",
    "Pending Approval": "bg-indigo-50 text-indigo-700 border-indigo-200/80 animate-pulse",
    Unpaid: "bg-rose-50 text-rose-700 border-rose-200/80",
  };

  const labels = {
    Paid: "✓ Fully Paid",
    Partial: "⚡ Partial",
    "Pending Approval": "⏳ Pending Approval",
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

        if (!error && payData) {
          const formatted = payData.map((item) => {
            const prof = profileMap.get(item.user_id);
            const isWalkIn =
              item.invoice_id?.startsWith("INV-WALK") ||
              prof?.member_id?.startsWith("GP-WALK-") ||
              prof?.role === "walkin" ||
              prof?.plan?.toLowerCase().includes("walk-in") ||
              prof?.plan?.toLowerCase().includes("daily") ||
              item.payment_method?.toLowerCase().includes("walk-in");

            let amt = parseFloat(item.amount) || 0;
            const mPlanName = prof?.plan || "Pro Membership";
            const matchedPlan = (planData || availablePlans || []).find(
              (p) =>
                p.name.toLowerCase() === mPlanName.toLowerCase() ||
                mPlanName.toLowerCase().includes(p.name.toLowerCase())
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

            let remainingDue = isWalkIn ? 0 : Math.max(0, tFee - amt);
            let calculatedStatus = item.status || "Paid";

            if (isWalkIn) {
              calculatedStatus = "Paid";
              remainingDue = 0;
            } else if (item.status === "Pending Approval" || item.proof_url) {
              calculatedStatus = item.status || "Pending Approval";
            } else if (remainingDue === 0 || amt >= tFee || prof?.status === "Active") {
              calculatedStatus = "Paid";
              remainingDue = 0;
            } else if (amt > 0) {
              calculatedStatus = "Partial";
            } else {
              calculatedStatus = "Unpaid";
            }

            return {
              id: item.id,
              user_id: item.user_id,
              invoice_id: item.invoice_id || `INV-${item.id.slice(0, 4)}`,
              member_name: prof?.full_name || item.member_name || "Gym Member",
              member_id: prof?.member_id || (isWalkIn ? "GP-WALK-GUEST" : "GP-MEMBER"),
              plan: isWalkIn ? "Daily Walk-In Pass" : prof?.plan || "Pro Membership",
              raw_amount: amt,
              raw_total_fee: tFee,
              raw_remaining: remainingDue,
              amount: `PKR ${Number(amt).toLocaleString()}`,
              total_fee: `PKR ${Number(tFee).toLocaleString()}`,
              remaining: `PKR ${Number(remainingDue).toLocaleString()}`,
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

          setPayments(formatted);
          loadedFromSupabase = true;
        }
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
          plan: "Pro Membership",
          raw_amount: 5000,
          raw_total_fee: 5000,
          raw_remaining: 0,
          amount: "PKR 5,000",
          total_fee: "PKR 5,000",
          remaining: "PKR 0",
          date: "Aug 12, 2026",
          method: "Cash / Desk",
          status: "Paid",
        },
        {
          id: "p-2",
          user_id: "m-2",
          invoice_id: "INV-3310",
          member_name: "Usman Ali",
          member_id: "GP-5510-402",
          plan: "Standard Pass",
          raw_amount: 2000,
          raw_total_fee: 3500,
          raw_remaining: 1500,
          amount: "PKR 2,000",
          total_fee: "PKR 3,500",
          remaining: "PKR 1,500",
          date: "Aug 11, 2026",
          method: "Bank Transfer",
          status: "Partial",
        },
      ]);
    }

    setLoading(false);
  };

  const handleApprovePayment = async (targetMember, explicitProofUrl = null) => {
    setStatusMsg(`✓ Approved online payment transfer for ${targetMember.full_name || "member"}! (Proof screenshot deleted from Storage to save space)`);

    setPayments((prev) =>
      prev.map((p) =>
        p.user_id === targetMember.id || p.member_name === targetMember.full_name
          ? { ...p, status: "Paid", proof_url: null, remaining: "PKR 0", raw_remaining: 0 }
          : p
      )
    );

    setMembers((prev) =>
      prev.map((m) =>
        m.id === targetMember.id ? { ...m, payment_status: "Paid", status: "Active" } : m
      )
    );

    if (isSupabaseConfigured()) {
      try {
        // 1. Collect all proof_urls to delete from Supabase Storage bucket 'payment-proofs'
        const { data: memberPayments } = await supabase
          .from("payments")
          .select("id, proof_url")
          .eq("user_id", targetMember.id);

        const urlsToDelete = [];
        if (explicitProofUrl) urlsToDelete.push(explicitProofUrl);
        if (memberPayments && memberPayments.length > 0) {
          memberPayments.forEach((p) => {
            if (p.proof_url) urlsToDelete.push(p.proof_url);
          });
        }

        const deletedPaths = new Set();
        for (const url of urlsToDelete) {
          if (url && url.includes("payment-proofs")) {
            try {
              const urlParts = url.split("/payment-proofs/");
              if (urlParts.length > 1) {
                const filePath = urlParts[1].split("?")[0];
                if (!deletedPaths.has(filePath)) {
                  deletedPaths.add(filePath);
                  await supabase.storage.from("payment-proofs").remove([filePath]);
                }
              }
            } catch (storageErr) {
              console.warn("Storage cleanup notice:", storageErr);
            }
          }
        }

        // 2. Update status to 'Paid' and clear proof_url in database
        const targetUserId = targetMember.user_id || targetMember.id;

        await supabase
          .from("payments")
          .update({ status: "Paid", proof_url: null })
          .or(`user_id.eq.${targetUserId},id.eq.${targetMember.id}`);

        if (targetUserId) {
          // Check if user had a scheduled upcoming plan to apply on payment renewal
          const { data: userProf } = await supabase
            .from("profiles")
            .select("upcoming_plan, next_plan")
            .eq("id", targetUserId)
            .maybeSingle();

          const profileUpdates = { status: "Active" };
          if (userProf?.upcoming_plan || userProf?.next_plan) {
            profileUpdates.plan = userProf.upcoming_plan || userProf.next_plan;
            profileUpdates.upcoming_plan = null;
            profileUpdates.next_plan = null;
          }

          await supabase.from("profiles").update(profileUpdates).eq("id", targetUserId);
        }
        await fetchPaymentsAndMembers();
      } catch (err) {
        console.error("Supabase approve error:", err);
      }
    }

    setActiveProof(null);
    setTimeout(() => setStatusMsg(""), 5000);
  };

  const handleRejectPayment = async (targetMember, explicitProofUrl = null) => {
    if (!confirm(`Are you sure you want to reject the payment proof for ${targetMember.full_name || "this member"}?`)) {
      return;
    }

    setStatusMsg(`Payment proof rejected for ${targetMember.full_name || "member"}. Screenshot deleted from storage.`);

    setPayments((prev) =>
      prev.map((p) =>
        p.user_id === targetMember.id || p.member_name === targetMember.full_name || p.id === targetMember.id
          ? { ...p, status: "Rejected", proof_url: null }
          : p
      )
    );

    if (isSupabaseConfigured()) {
      try {
        const targetUserId = targetMember.user_id || targetMember.id;
        const { data: memberPayments } = await supabase
          .from("payments")
          .select("id, proof_url")
          .or(`user_id.eq.${targetUserId},id.eq.${targetMember.id}`);

        const urlsToDelete = [];
        if (explicitProofUrl) urlsToDelete.push(explicitProofUrl);
        if (memberPayments && memberPayments.length > 0) {
          memberPayments.forEach((p) => {
            if (p.proof_url) urlsToDelete.push(p.proof_url);
          });
        }

        const deletedPaths = new Set();
        for (const url of urlsToDelete) {
          if (url && url.includes("payment-proofs")) {
            try {
              const urlParts = url.split("/payment-proofs/");
              if (urlParts.length > 1) {
                const filePath = urlParts[1].split("?")[0];
                if (!deletedPaths.has(filePath)) {
                  deletedPaths.add(filePath);
                  await supabase.storage.from("payment-proofs").remove([filePath]);
                }
              }
            } catch (storageErr) {
              console.warn("Storage cleanup notice on reject:", storageErr);
            }
          }
        }

        await supabase
          .from("payments")
          .update({ status: "Rejected", proof_url: null })
          .or(`user_id.eq.${targetUserId},id.eq.${targetMember.id}`);

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
            payment_method: method,
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
        method: method,
        status: finalStatus,
      };

      setPayments([newPaymentLog, ...payments]);
    }

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

  const getMemberPaymentInfo = (memberId) => {
    const member = members.find((m) => m.id === memberId);
    const mPlanName = member?.plan || "Pro Membership";
    const matchedPlan = availablePlans.find(
      (p) => p.name.toLowerCase() === mPlanName.toLowerCase() || mPlanName.toLowerCase().includes(p.name.toLowerCase())
    );

    const userPayments = payments.filter((p) => p.user_id === memberId);
    const sumPaid = userPayments.reduce((acc, p) => acc + (p.raw_amount || 0), 0);

    let fee = 5000;
    if (matchedPlan) {
      fee = parseFloat(matchedPlan.monthly_price || matchedPlan.monthlyPrice) || 5000;
    } else if (member?.total_fee) {
      fee = member.total_fee;
    } else if (userPayments.length > 0 && userPayments[0].raw_total_fee) {
      fee = userPayments[0].raw_total_fee;
    }
    fee = Math.max(fee, sumPaid);

    const remaining = Math.max(0, fee - sumPaid);

    const hasPendingApproval = userPayments.some((p) => p.status === "Pending Approval");
    let st = "Paid";
    if (hasPendingApproval) st = "Pending Approval";
    else if (sumPaid >= fee) st = "Paid";
    else if (sumPaid > 0) st = "Partial";
    else st = "Unpaid";

    const proofUrl = userPayments.find((p) => p.proof_url)?.proof_url || member?.proof_url || null;

    return {
      status: st,
      paid: sumPaid,
      total_fee: fee,
      remaining: remaining,
      proof_url: proofUrl,
      method: userPayments[0]?.method || "Desk Collection",
      invoice_id: userPayments[0]?.invoice_id || "INV-MEM",
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
      if (statusFilter === "Partial" && info.status !== "Partial") return false;
      if (statusFilter === "Unpaid" && info.status !== "Unpaid") return false;
      if (statusFilter === "Pending Approval" && info.status !== "Pending Approval") return false;
      return true;
    });
  }, [members, searchTerm, statusFilter, payments, availablePlans]);

  const totalRevenue = useMemo(
    () =>
      payments
        .filter((p) => p.status === "Paid" || p.status === "Partial")
        .reduce((acc, p) => acc + (p.raw_amount || 0), 0),
    [payments]
  );

  const paidCount = useMemo(() => payments.filter((p) => p.status === "Paid").length, [payments]);
  const partialCount = useMemo(() => payments.filter((p) => p.status === "Partial").length, [payments]);
  const unpaidCount = useMemo(
    () => members.filter((m) => getMemberPaymentInfo(m.id).status === "Unpaid").length,
    [members, payments]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans p-2 sm:p-4 text-slate-800">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Payments & Billing
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track subscription revenue, collect partial balances, and approve mobile app transfers.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedMemberId("");
            setAmount("5000");
            setTotalFee("5000");
            setIsModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all duration-150 shadow-xs hover:scale-[1.02] flex items-center gap-2"
        >
          <span className="text-base font-normal">＋</span>
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
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs shrink-0"
          >
            Review ({pendingApprovalsCount}) →
          </button>
        </div>
      )}

      {/* SUCCESS NOTIFICATION */}
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

      {/* FINANCIAL OVERVIEW METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricStatCard
          title="Total Revenue"
          value={`PKR ${Number(totalRevenue).toLocaleString()}`}
          subtext="Total collected revenue"
          color="emerald"
        />
        <MetricStatCard
          title="Fully Paid"
          value={`${paidCount} Members`}
          subtext="Cleared passes"
          color="slate"
        />
        <MetricStatCard
          title="Partial Payments"
          value={`${partialCount} Members`}
          subtext="Has balance due"
          color="amber"
        />
        <MetricStatCard
          title="Overdue / Unpaid"
          value={`${unpaidCount} Members`}
          subtext="Awaiting desk payment"
          color="rose"
        />
      </div>

      {/* NAVIGATION TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shrink-0">
          <button
            onClick={() => {
              setActiveTab("logs");
              setStatusFilter("All");
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "logs" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Transactions ({payments.length})
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${activeTab === "members" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Members Roster ({members.length})
            {pendingApprovalsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search member name or ID..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 transition-all"
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
      </div>

      {/* FILTER CHIPS BAR */}
      <div className="flex gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shrink-0 overflow-x-auto">
        {[
          { key: "All", label: "Show All" },
          { key: "Paid", label: "✓ Fully Paid" },
          { key: "Partial", label: "⚡ Partial" },
          { key: "Unpaid", label: "🔴 Unpaid" },
          { key: "Pending Approval", label: "📱 App Proofs" },
        ].map((st) => (
          <button
            key={st.key}
            onClick={() => setStatusFilter(st.key)}
            className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${statusFilter === st.key
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* TAB 1: TRANSACTIONS LOG TABLE */}
      {activeTab === "logs" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-auto max-h-[calc(100vh-320px)] rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3.5">Invoice</th>
                  <th className="py-3 px-3.5">Member</th>
                  <th className="py-3 px-3.5">Amount / Fee</th>
                  <th className="py-3 px-3.5">Remaining</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Method</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading payment records...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No payment records found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3.5 font-mono text-emerald-700 font-bold">
                        {p.invoice_id}
                      </td>
                      <td className="py-3.5 px-3.5 font-bold text-slate-900">
                        {p.member_name}
                      </td>
                      <td className="py-3.5 px-3.5">
                        <span className="font-extrabold text-slate-900">{p.amount}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Total: {p.total_fee}
                        </span>
                      </td>
                      <td className="py-3.5 px-3.5 font-mono">
                        {p.raw_remaining > 0 ? (
                          <span className="font-bold text-amber-700">{p.remaining} Due</span>
                        ) : (
                          <span className="text-slate-400 font-medium">Cleared</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5 font-mono text-slate-500">{p.date}</td>
                      <td className="py-3.5 px-3.5 text-slate-600 font-medium">{p.method}</td>
                      <td className="py-3.5 px-3.5">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3.5 px-3.5 text-right">
                        <button
                          onClick={() => setActiveInvoice(p)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                        >
                          View
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

      {/* TAB 2: REGISTERED MEMBERS PAYMENT ROSTER */}
      {activeTab === "members" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-auto max-h-[calc(100vh-320px)] rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse relative">
              <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10">
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3.5">Member</th>
                  <th className="py-3 px-3.5">ID</th>
                  <th className="py-3 px-3.5">Plan Fee</th>
                  <th className="py-3 px-3.5">Paid / Due</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5">App Screenshot</th>
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
                  filteredMembers.map((m) => {
                    const info = getMemberPaymentInfo(m.id);
                    const isFullyPaid = info.status === "Paid";
                    const isPendingApproval = info.status === "Pending Approval";

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3.5 font-bold text-slate-900">
                          <p className="text-xs font-bold leading-tight">{m.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-normal">{m.email}</p>
                        </td>

                        <td className="py-3.5 px-3.5 font-mono text-emerald-700 font-bold">
                          {m.member_id || "GP-0000"}
                        </td>

                        <td className="py-3.5 px-3.5 text-slate-600 font-medium">
                          <p className="text-xs font-semibold text-slate-800">{m.plan || "Pro Membership"}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            PKR {Number(info.total_fee).toLocaleString()}
                          </p>
                        </td>

                        <td className="py-3.5 px-3.5 font-mono">
                          <p className="text-xs font-bold text-emerald-700">
                            Paid: PKR {Number(info.paid).toLocaleString()}
                          </p>
                          {info.remaining > 0 ? (
                            <p className="text-[10px] font-semibold text-amber-700">
                              Due: PKR {Number(info.remaining).toLocaleString()}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400">No Due</p>
                          )}
                        </td>

                        <td className="py-3.5 px-3.5">
                          <StatusBadge status={info.status} />
                        </td>

                        <td className="py-3.5 px-3.5">
                          {info.proof_url ? (
                            <button
                              onClick={() => setActiveProof({ member: m, info })}
                              className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold rounded border border-indigo-200 transition"
                            >
                              View Proof
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400">None</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3.5 text-right">
                          {isPendingApproval ? (
                            <button
                              onClick={() => handleApprovePayment({ id: m.id, full_name: m.full_name })}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition"
                            >
                              Approve
                            </button>
                          ) : isFullyPaid ? (
                            <button
                              disabled
                              className="px-3 py-1 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-semibold rounded-lg cursor-not-allowed"
                            >
                              Cleared
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCollectRemainingBalance(m)}
                              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg transition"
                            >
                              Collect PKR {Number(info.remaining).toLocaleString()}
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
                <p className="text-xs text-slate-500">Collect full or partial monthly fees.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm p-1.5 rounded-lg"
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
                        const matched = availablePlans.find((p) => mPlan.includes(p.name));
                        const mRate = matched
                          ? matched.monthly_price || matched.monthlyPrice || 5000
                          : 5000;
                        setTotalFee(String(mRate));

                        const info = getMemberPaymentInfo(found.id);
                        if (info.remaining > 0) setAmount(String(info.remaining));
                        else setAmount(String(mRate));
                      }
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Member --</option>
                  {members.map((m) => {
                    const info = getMemberPaymentInfo(m.id);
                    const isFullyPaid = info.status === "Paid" || info.remaining <= 0;
                    return (
                      <option key={m.id} value={m.id} disabled={isFullyPaid}>
                        {m.full_name} ({m.plan || "Pro Membership"}){" "}
                        {isFullyPaid ? "— Cleared" : `(Due: PKR ${Number(info.remaining).toLocaleString()})`}
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Plan Total (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    value={totalFee}
                    onChange={(e) => setTotalFee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Amount Paid *
                  </label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="Cash / Desk">Cash Desk</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-3.5 py-2 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs"
                >
                  {submitting ? "Saving..." : "Save Payment"}
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

              <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Paid:</span>
                  <span className="font-mono text-emerald-400 font-bold text-base">
                    {activeInvoice.amount}
                  </span>
                </div>
                {activeInvoice.raw_remaining > 0 && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-amber-400">
                    <span>Remaining Due:</span>
                    <span className="font-mono font-bold">{activeInvoice.remaining}</span>
                  </div>
                )}
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
                className="text-xs text-slate-500 hover:text-slate-800 px-3 py-2 rounded-xl font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs"
              >
                Print Receipt
              </button>
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

            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-base font-extrabold text-slate-900">App Screenshot Review</h3>
              <p className="text-xs text-slate-500">Submitted by {activeProof.member.full_name}</p>
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
                onClick={() => handleRejectPayment(activeProof.member, activeProof.info?.proof_url)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-rose-200 transition-all"
              >
                Reject Proof
              </button>
              <button
                type="button"
                onClick={() => handleApprovePayment(activeProof.member, activeProof.info?.proof_url)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-xs"
              >
                Approve Transfer
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