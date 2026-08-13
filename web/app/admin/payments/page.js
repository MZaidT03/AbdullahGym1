"use client";

import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";
import LoadingOverlay from "../components/LoadingOverlay";

export default function PaymentsAdminPage() {
  const [activeTab, setActiveTab] = useState("logs"); // 'logs' | 'members'
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("Recording Payment in Supabase...");

  // Record Payment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [customGuestName, setCustomGuestName] = useState("");
  const [amount, setAmount] = useState("5000");
  const [totalFee, setTotalFee] = useState("5000");
  const [method, setMethod] = useState("Cash / Desk");
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Invoice Viewer Modal State
  const [activeInvoice, setActiveInvoice] = useState(null);

  // Proof Screenshot Modal State
  const [activeProof, setActiveProof] = useState(null);

  // Admin Mock Upload Proof Modal State
  const [uploadProofMember, setUploadProofMember] = useState(null);
  const [proofUrlInput, setProofUrlInput] = useState(
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80"
  );

  useEffect(() => {
    fetchPaymentsAndMembers();
  }, []);

  const fetchPaymentsAndMembers = async () => {
    setLoading(true);
    let loadedFromSupabase = false;

    if (isSupabaseConfigured()) {
      try {
        // 1. Fetch active gym plans
        const { data: planData } = await supabase
          .from("gym_plans")
          .select("*")
          .eq("active", true);
        if (planData) setAvailablePlans(planData);

        // 2. Fetch registered profiles
        const { data: profData } = await supabase
          .from("profiles")
          .select("*")
          .order("full_name", { ascending: true });

        const profileMap = new Map();
        if (profData) {
          const registeredOnly = profData.filter(
            (p) => !p.member_id?.startsWith("GP-WALK-") && !p.email?.includes("@abdullahgym.local") && p.role !== "walkin"
          );
          setMembers(registeredOnly);
          profData.forEach((p) => profileMap.set(p.id, p));
        }

        // 3. Fetch payments
        const { data: payData, error } = await supabase
          .from("payments")
          .select("*")
          .order("date", { ascending: false });

        if (!error && payData) {
          // Pre-calculate cumulative paid totals per user
          const userCumulativePaidMap = new Map();
          payData.forEach((item) => {
            const prev = userCumulativePaidMap.get(item.user_id) || 0;
            userCumulativePaidMap.set(item.user_id, prev + (parseFloat(item.amount) || 0));
          });

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

            // Resolve plan fee dynamically matching member's assigned plan
            const mPlanName = prof?.plan || "Pro Membership";
            const matchedPlan = (planData || availablePlans || []).find(
              (p) => p.name.toLowerCase() === mPlanName.toLowerCase() || mPlanName.toLowerCase().includes(p.name.toLowerCase())
            );

            let tFee = 5000;
            if (isWalkIn) {
              // WALK-IN VISITORS: Fee equals paid amount, NO remaining due, NO monthly plan!
              tFee = amt > 0 ? amt : 500;
              amt = tFee;
            } else {
              if (item.total_fee && parseFloat(item.total_fee) > 0) {
                tFee = parseFloat(item.total_fee);
              } else if (matchedPlan) {
                tFee = parseFloat(matchedPlan.monthly_price || matchedPlan.monthlyPrice) || 5000;
              }

              // Fix for registered member zero paid bug (e.g. INV-2026-7521)
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
              plan: isWalkIn ? "Daily Walk-In Pass" : (prof?.plan || "Pro Membership"),
              raw_amount: amt,
              raw_total_fee: tFee,
              raw_remaining: remainingDue,
              amount: `PKR ${Number(amt).toLocaleString()}`,
              total_fee: `PKR ${Number(tFee).toLocaleString()}`,
              remaining: `PKR ${Number(remainingDue).toLocaleString()}`,
              date: item.date
                ? new Date(item.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
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
          plan: "Standard Monthly Pass",
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
        {
          id: "p-3",
          user_id: "m-3",
          invoice_id: "INV-1104",
          member_name: "Ayesha Malik",
          member_id: "GP-1204-883",
          plan: "Pro Membership",
          raw_amount: 5000,
          raw_total_fee: 5000,
          raw_remaining: 0,
          amount: "PKR 5,000",
          total_fee: "PKR 5,000",
          remaining: "PKR 0",
          date: "Aug 10, 2026",
          method: "JazzCash Screenshot App",
          status: "Pending Approval",
          proof_url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
        },
      ]);
    }

    setLoading(false);
  };

  // Admin approves app payment proof screenshot
  const handleApprovePayment = async (targetMember) => {
    setStatusMsg(`✓ Approved online payment transfer screenshot for ${targetMember.full_name || "member"}!`);

    setPayments((prev) =>
      prev.map((p) =>
        p.user_id === targetMember.id || p.member_name === targetMember.full_name
          ? { ...p, status: "Paid", remaining: "PKR 0", raw_remaining: 0 }
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
        await supabase
          .from("payments")
          .update({ status: "Paid" })
          .eq("user_id", targetMember.id);
        
        await supabase
          .from("profiles")
          .update({ status: "Active" })
          .eq("id", targetMember.id);

        await fetchPaymentsAndMembers();
      } catch (err) {
        console.error("Supabase approve error:", err);
      }
    }

    setActiveProof(null);
    setTimeout(() => setStatusMsg(""), 5000);
  };

  // Submit Manual / Partial Payment Receipt
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const numericAmount = parseFloat(amount) || 0;
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
    const finalStatus = isWalkInPayment ? "Paid" : (remainingDue === 0 ? "Paid" : "Partial");

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
      `✓ Payment of PKR ${Number(numericAmount).toLocaleString()} recorded for ${targetName}! Status: ${finalStatus} (${
        remainingDue > 0 ? `PKR ${Number(remainingDue).toLocaleString()} Due` : "Fully Cleared"
      })`
    );
    setTimeout(() => setStatusMsg(""), 5000);

    setSubmitting(false);
    setIsModalOpen(false);
  };

  // Open Record Payment pre-filled for a specific member
  const handleCollectRemainingBalance = (member) => {
    const info = getMemberPaymentInfo(member.id);
    setSelectedMemberId(member.id);
    setTotalFee(String(info.total_fee));
    setAmount(String(info.remaining > 0 ? info.remaining : info.total_fee));
    setIsModalOpen(true);
  };

  // Admin Mock Upload Screenshot Action
  const handleAttachProofScreenshot = (e) => {
    e.preventDefault();
    if (!uploadProofMember) return;

    const proofUrl = proofUrlInput.trim() || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80";
    const targetUserId = uploadProofMember.id;

    setMembers((prev) =>
      prev.map((m) =>
        m.id === targetUserId ? { ...m, payment_status: "Pending Approval", proof_url: proofUrl } : m
      )
    );

    setPayments((prev) => {
      const exists = prev.some((p) => p.user_id === targetUserId);
      if (exists) {
        return prev.map((p) =>
          p.user_id === targetUserId ? { ...p, status: "Pending Approval", proof_url: proofUrl } : p
        );
      }
      return [
        {
          id: String(Date.now()),
          user_id: targetUserId,
          invoice_id: `INV-PROOF-${Math.floor(1000 + Math.random() * 9000)}`,
          member_name: uploadProofMember.full_name,
          member_id: uploadProofMember.member_id || "GP-MEM",
          plan: uploadProofMember.plan || "Pro Membership",
          raw_amount: 5000,
          raw_total_fee: 5000,
          raw_remaining: 0,
          amount: "PKR 5,000",
          total_fee: "PKR 5,000",
          remaining: "PKR 0",
          date: new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
          method: "Online Screenshot Transfer",
          status: "Pending Approval",
          proof_url: proofUrl,
        },
        ...prev,
      ];
    });

    setStatusMsg(`📸 Payment proof screenshot attached for ${uploadProofMember.full_name}! Pending approval notification triggered.`);
    setTimeout(() => setStatusMsg(""), 5000);
    setUploadProofMember(null);
  };

  // Helper: Resolve member payment info including cumulative partial balance
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
    if (hasPendingApproval) {
      st = "Pending Approval";
    } else if (sumPaid >= fee) {
      st = "Paid";
    } else if (sumPaid > 0) {
      st = "Partial";
    } else {
      st = "Unpaid";
    }

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

  // Pending Approvals Count (ONLY APP SCREENSHOT REQUESTS)
  const pendingApprovalsList = payments.filter((p) => p.status === "Pending Approval");
  const pendingApprovalsCount = pendingApprovalsList.length;

  // Filtered Payments for Tab 1
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.member_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.invoice_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.method?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter !== "All" && p.status !== statusFilter) return false;
    return true;
  });

  // Filtered Members for Tab 2
  const filteredMembers = members.filter((m) => {
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

  // Financial Stats
  const totalRevenue = payments
    .filter((p) => p.status === "Paid" || p.status === "Partial")
    .reduce((acc, p) => acc + (p.raw_amount || 0), 0);

  const paidCount = payments.filter((p) => p.status === "Paid").length;
  const partialCount = payments.filter((p) => p.status === "Partial").length;
  const unpaidCount = members.filter((m) => getMemberPaymentInfo(m.id).status === "Unpaid").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payments & Billing Portal</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage member monthly subscriptions, handle partial payments & remaining balances, and approve app screenshot requests.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedMemberId("");
            setAmount("5000");
            setTotalFee("5000");
            setIsModalOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition shadow-xs flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Record Manual Payment
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PENDING APPROVAL NOTIFICATION ALERT BANNER (ONLY FOR APP SCREENSHOTS) */}
      {/* ========================================================================= */}
      {pendingApprovalsCount > 0 && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center font-black text-indigo-700 shrink-0 text-lg">
              📱
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-indigo-900">
                Pending App Screenshot Approval Notice: {pendingApprovalsCount} Member Request(s) Awaiting Review!
              </h4>
              <p className="text-xs text-indigo-700/90 mt-0.5">
                Members have submitted online transfer screenshots from the app requiring admin verification.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTab("members");
              setStatusFilter("Pending Approval");
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs shrink-0"
          >
            Review App Screenshots ({pendingApprovalsCount}) →
          </button>
        </div>
      )}

      {/* Success Notification */}
      {statusMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl shadow-xs flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-slate-400 hover:text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition">
            ✕
          </button>
        </div>
      )}

      {/* Financial Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue Collected</span>
          <p className="text-2xl font-black text-slate-900">PKR {Number(totalRevenue).toLocaleString()}</p>
          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Supabase Balance
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fully Paid Members</span>
          <p className="text-2xl font-black text-emerald-700">{paidCount} Members</p>
          <span className="text-[10px] text-slate-500 font-medium">100% cleared</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Partial Payments</span>
          <p className="text-2xl font-black text-amber-600">{partialCount} Members</p>
          <span className="text-[10px] text-amber-700 font-medium">Has remaining balance</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unpaid / Fee Overdue</span>
          <p className="text-2xl font-black text-rose-600">{unpaidCount} Members</p>
          <span className="text-[10px] text-rose-700 font-medium">Awaiting desk payment</span>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => {
              setActiveTab("logs");
              setStatusFilter("All");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "logs" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Transaction History Logs ({payments.length})
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "members" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Registered Member Monthly Payments ({members.length})
            {pendingApprovalsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search member name or ID..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
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
      </div>

      {/* Filter Chips Bar */}
      <div className="flex gap-2 bg-white p-2 rounded-xl border border-slate-200 self-start overflow-x-auto shadow-xs">
        {[
          { key: "All", label: "Show All" },
          { key: "Paid", label: "✓ Fully Paid" },
          { key: "Partial", label: "⚡ Partial Payment" },
          { key: "Unpaid", label: "🔴 Unpaid / Due" },
          { key: "Pending Approval", label: "📱 App Screenshot Pending" },
        ].map((st) => (
          <button
            key={st.key}
            onClick={() => setStatusFilter(st.key)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              statusFilter === st.key
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TRANSACTION HISTORY LOGS */}
      {/* ========================================================================= */}
      {activeTab === "logs" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">All Payments & Invoices Activity Stream</h3>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              ● {payments.length} Transactions Recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3 px-3.5 rounded-l-lg">Invoice ID</th>
                  <th className="py-3 px-3.5">Member / Payer</th>
                  <th className="py-3 px-3.5">Paid / Total Fee</th>
                  <th className="py-3 px-3.5">Remaining Due</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Payment Method</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right rounded-r-lg">Invoice Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      Loading payments from Supabase...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-3.5 font-mono text-emerald-700 font-bold">{p.invoice_id}</td>
                      <td className="py-3.5 px-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {p.member_name ? p.member_name.charAt(0).toUpperCase() : "P"}
                        </div>
                        {p.member_name}
                      </td>

                      <td className="py-3.5 px-3.5">
                        <span className="font-extrabold text-slate-900">{p.amount}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Total: {p.total_fee}</span>
                      </td>

                      <td className="py-3.5 px-3.5 font-mono">
                        {p.raw_remaining > 0 ? (
                          <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                            {p.remaining} Due
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold">PKR 0 Cleared</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3.5 font-mono text-slate-500">{p.date}</td>
                      <td className="py-3.5 px-3.5 text-slate-600 font-medium">{p.method}</td>

                      <td className="py-3.5 px-3.5">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            p.status === "Paid"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : p.status === "Partial"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : p.status === "Pending Approval"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {p.status === "Paid"
                            ? "✓ Fully Paid"
                            : p.status === "Partial"
                            ? "⚡ Partial"
                            : p.status === "Pending Approval"
                            ? "⏳ Pending Approval"
                            : "🔴 Unpaid"}
                        </span>
                      </td>

                      <td className="py-3.5 px-3.5 text-right">
                        <button
                          onClick={() => setActiveInvoice(p)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl transition flex items-center gap-1.5 ml-auto"
                        >
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Receipt
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
      {/* TAB 2: REGISTERED MEMBERS MONTHLY PAYMENT ROSTER & PARTIAL BALANCES */}
      {/* ========================================================================= */}
      {activeTab === "members" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs overflow-hidden space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Registered Members Monthly Payment Roster</h3>
              <p className="text-xs text-slate-500">
                Track member subscription payments, partial balances due, and app transfer screenshots.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/80">
                  <th className="py-3 px-3.5 rounded-l-lg">Member Details</th>
                  <th className="py-3 px-3.5">Member ID</th>
                  <th className="py-3 px-3.5">Monthly Plan & Total Fee</th>
                  <th className="py-3 px-3.5">Paid vs Remaining Due</th>
                  <th className="py-3 px-3.5">Payment Status</th>
                  <th className="py-3 px-3.5">Proof / Screenshot</th>
                  <th className="py-3 px-3.5 text-right rounded-r-lg">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      Loading registered members...
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      No members match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => {
                    const info = getMemberPaymentInfo(m.id);
                    const isFullyPaid = info.status === "Paid";
                    const isPartial = info.status === "Partial";
                    const isUnpaid = info.status === "Unpaid";
                    const isPendingApproval = info.status === "Pending Approval";

                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        {/* Member Details */}
                        <td className="py-3.5 px-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center font-extrabold text-xs shrink-0">
                            {m.full_name ? m.full_name.charAt(0).toUpperCase() : "M"}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 leading-tight">{m.full_name}</p>
                            <p className="text-[10px] text-slate-500">{m.email}</p>
                          </div>
                        </td>

                        {/* Member ID */}
                        <td className="py-3.5 px-3.5 font-mono text-emerald-700 font-bold">{m.member_id || "GP-0000-000"}</td>

                        {/* Monthly Plan & Total Fee */}
                        <td className="py-3.5 px-3.5 text-slate-600 font-medium">
                          <p className="text-xs font-bold text-slate-900">{m.plan || "Pro Membership"}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Fee: PKR {Number(info.total_fee).toLocaleString()}</p>
                        </td>

                        {/* Paid vs Remaining Due */}
                        <td className="py-3.5 px-3.5 font-mono">
                          <p className="text-xs font-extrabold text-emerald-700">Paid: PKR {Number(info.paid).toLocaleString()}</p>
                          {info.remaining > 0 ? (
                            <p className="text-[11px] font-bold text-amber-700">Due: PKR {Number(info.remaining).toLocaleString()}</p>
                          ) : (
                            <p className="text-[10px] text-slate-400">No Balance Due</p>
                          )}
                        </td>

                        {/* Payment Status Badge */}
                        <td className="py-3.5 px-3.5">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isFullyPaid
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : isPartial
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : isPendingApproval
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {isFullyPaid
                              ? "✓ Fully Paid"
                              : isPartial
                              ? `⚡ Partial (PKR ${Number(info.remaining).toLocaleString()} Due)`
                              : isPendingApproval
                              ? "⏳ Pending App Approval"
                              : "🔴 Unpaid / Due"}
                          </span>
                        </td>

                        {/* Proof / Screenshot */}
                        <td className="py-3.5 px-3.5">
                          {info.proof_url ? (
                            <button
                              onClick={() => setActiveProof({ member: m, info })}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-bold rounded-lg transition flex items-center gap-1.5"
                            >
                              📸 View App Screenshot
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 italic">Desk Collection</span>
                              <button
                                onClick={() => setUploadProofMember(m)}
                                title="Attach Screenshot (Admin Mock)"
                                className="text-[10px] text-emerald-700 font-bold hover:underline"
                              >
                                + Attach
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Admin Action */}
                        <td className="py-3.5 px-3.5 text-right space-x-2">
                          {isPendingApproval ? (
                            <button
                              onClick={() => handleApprovePayment({ user_id: m.id, full_name: m.full_name })}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs"
                            >
                              ✓ Approve App Transfer
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCollectRemainingBalance(m)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl transition"
                            >
                              {info.remaining > 0 ? `+ Collect PKR ${Number(info.remaining).toLocaleString()}` : "Record Payment"}
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

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD MANUAL OFFLINE PAYMENT */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Record Payment / Collect Fee</h3>
                <p className="text-[11px] text-slate-500">Record full or partial payments directly in Supabase.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Select Registered Member OR Guest
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
                        const mRate = matched ? (matched.monthly_price || matched.monthlyPrice || 5000) : 5000;
                        setTotalFee(String(mRate));

                        // Pre-fill remaining balance if partial
                        const info = getMemberPaymentInfo(found.id);
                        if (info.remaining > 0) {
                          setAmount(String(info.remaining));
                        } else {
                          setAmount(String(mRate));
                        }
                      }
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Select Registered Member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name} ({m.plan || "Pro Membership"})
                    </option>
                  ))}
                  <option value="custom">🚶 Walk-in Guest (Per-Day Payment Rate)</option>
                </select>
              </div>

              {(!selectedMemberId || selectedMemberId === "custom") && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Walk-In Guest Payer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customGuestName}
                    onChange={(e) => setCustomGuestName(e.target.value)}
                    placeholder="e.g. Ahmad Ali"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Total Plan Fee (PKR) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={totalFee}
                    onChange={(e) => setTotalFee(e.target.value)}
                    placeholder="5000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Amount Collected Now *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 50 or 5000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Real-time Partial Balance Calculator Preview */}
              {parseFloat(totalFee) > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Collected Now:</span>
                    <span className="font-extrabold text-emerald-700">PKR {Number(parseFloat(amount) || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Remaining Balance Due:</span>
                    <span
                      className={`font-black ${
                        (parseFloat(totalFee) || 0) - (parseFloat(amount) || 0) > 0
                          ? "text-amber-700"
                          : "text-emerald-700"
                      }`}
                    >
                      PKR {Number(Math.max(0, (parseFloat(totalFee) || 0) - (parseFloat(amount) || 0))).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Cash / Desk">Cash at Desk</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card Terminal">POS Card Terminal</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 text-xs font-bold text-white rounded-xl hover:bg-emerald-700 shadow-xs disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Payment Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INVOICE RECEIPT VIEWER */}
      {/* ========================================================================= */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl text-slate-900 relative">
            <button
              onClick={() => setActiveInvoice(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 font-bold text-base cursor-pointer hover:bg-slate-100 w-8 h-8 rounded-lg flex items-center justify-center transition"
            >
              ✕
            </button>

            <div className="border-b border-slate-200 pb-5 text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center font-black text-white text-xl mx-auto shadow-md shadow-emerald-600/20 mb-2">
                AG
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900">ABDULLAH GYM 1</h2>
              <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">
                Official Payment Receipt & Invoice
              </p>
              <p className="text-[11px] text-slate-500">Rajput Colony, Gujranwala • WhatsApp: 0320 8313000</p>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Invoice Number</p>
                  <p className="font-extrabold text-emerald-700 text-sm">{activeInvoice.invoice_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Date Paid</p>
                  <p className="font-extrabold text-slate-900">{activeInvoice.date}</p>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-slate-50/70 rounded-2xl border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Member / Payer:</span>
                  <span className="font-bold text-slate-900">{activeInvoice.member_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Member ID:</span>
                  <span className="font-bold text-emerald-700">{activeInvoice.member_id || "GP-MEMBER"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan / Description:</span>
                  <span className="font-bold text-slate-800">{activeInvoice.plan || "Gym Subscription"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-bold text-slate-800">{activeInvoice.method}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Status:</span>
                  <span
                    className={`font-bold uppercase ${
                      activeInvoice.status === "Paid"
                        ? "text-emerald-700"
                        : activeInvoice.status === "Partial"
                        ? "text-amber-700"
                        : "text-rose-700"
                    }`}
                  >
                    ● {activeInvoice.status}
                  </span>
                </div>
              </div>

              {/* Amount & Remaining Balance Breakdown */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-xs font-sans">
                    {activeInvoice.is_walk_in ? "Day Pass Fee:" : "Total Plan Fee:"}
                  </span>
                  <span className="font-mono text-sm text-slate-700">{activeInvoice.total_fee}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-slate-900 text-sm font-sans">TOTAL AMOUNT PAID:</span>
                  <span className="font-black text-xl text-emerald-700">
                    {activeInvoice.raw_amount > 0 ? activeInvoice.amount : activeInvoice.total_fee}
                  </span>
                </div>

                {!activeInvoice.is_walk_in && activeInvoice.raw_remaining > 0 && (
                  <div className="pt-2 border-t border-amber-200 flex justify-between items-center text-amber-800 font-extrabold">
                    <span>REMAINING BALANCE DUE:</span>
                    <span className="text-lg">{activeInvoice.remaining}</span>
                  </div>
                )}
              </div>

              {/* Developer Attribution Footer */}
              <div className="pt-2 border-t border-slate-200 text-center">
                <p className="text-[11px] text-slate-500 font-sans">
                  Powered by <strong className="text-slate-800">CodeInn Tech</strong> | <a href="mailto:contact@codeinntech.com" className="underline text-emerald-700 font-semibold">contact@codeinntech.com</a>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-between gap-3">
              <button
                onClick={() => setActiveInvoice(null)}
                className="px-5 py-2.5 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200"
              >
                Close Receipt
              </button>

              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Save PDF Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PAYMENT PROOF SCREENSHOT VIEWER & APPROVAL */}
      {/* ========================================================================= */}
      {activeProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-900 relative">
            <button
              onClick={() => setActiveProof(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 font-bold text-base cursor-pointer hover:bg-slate-100 w-8 h-8 rounded-lg flex items-center justify-center transition"
            >
              ✕
            </button>

            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">App Screenshot Proof Review</h3>
              <p className="text-[11px] text-slate-500">
                Submitted by {activeProof.member.full_name} ({activeProof.member.member_id || "GP-MEMBER"})
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 max-h-80 overflow-hidden flex items-center justify-center">
              <img
                src={activeProof.info.proof_url || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80"}
                alt="Payment Proof Screenshot"
                className="max-h-72 w-full object-contain rounded-xl"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Member Name:</span>
                <span className="font-bold text-slate-900">{activeProof.member.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Plan:</span>
                <span className="font-bold text-slate-900">{activeProof.member.plan || "Pro Membership"}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveProof(null)}
                className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleApprovePayment(activeProof.member)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs"
              >
                ✓ Approve App Transfer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADMIN MOCK ATTACH SCREENSHOT */}
      {/* ========================================================================= */}
      {uploadProofMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Attach Payment Screenshot (Mock)</h3>
                <p className="text-[11px] text-slate-500">Simulate member uploading app payment proof.</p>
              </div>
              <button
                onClick={() => setUploadProofMember(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAttachProofScreenshot} className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <p className="text-slate-500">Target Member:</p>
                <p className="font-extrabold text-slate-900">{uploadProofMember.full_name}</p>
                <p className="text-[11px] text-emerald-700 font-mono font-bold">{uploadProofMember.member_id || "GP-MEM"}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Payment Screenshot Image URL
                </label>
                <input
                  type="url"
                  required
                  value={proofUrlInput}
                  onChange={(e) => setProofUrlInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUploadProofMember(null)}
                  className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-xs font-bold text-white rounded-xl hover:bg-emerald-700 shadow-xs"
                >
                  Attach & Trigger Pending Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REUSABLE LOADING ANIMATION OVERLAY */}
      <LoadingOverlay isLoading={submitting || isSubmitting} message={submitMsg} />
    </div>
  );
}
