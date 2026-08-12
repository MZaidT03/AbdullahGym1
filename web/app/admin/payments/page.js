"use client";

import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";

export default function PaymentsAdminPage() {
  const [activeTab, setActiveTab] = useState("logs"); // 'logs' | 'members'
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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

            const amt = parseFloat(item.amount) || 0;

            // Resolve plan fee dynamically matching member's assigned plan
            const mPlanName = prof?.plan || "Pro Membership";
            const matchedPlan = (planData || availablePlans || []).find(
              (p) => p.name.toLowerCase() === mPlanName.toLowerCase() || mPlanName.toLowerCase().includes(p.name.toLowerCase())
            );

            let fee = 5000;
            if (isWalkIn) {
              fee = parseFloat(item.total_fee) || amt;
            } else if (matchedPlan) {
              fee = parseFloat(matchedPlan.monthly_price || matchedPlan.monthlyPrice) || 5000;
            } else if (parseFloat(item.total_fee) > 0) {
              fee = parseFloat(item.total_fee);
            }
            fee = Math.max(fee, amt);

            const userCumulativePaid = isWalkIn ? amt : (userCumulativePaidMap.get(item.user_id) || amt);
            const remaining = isWalkIn ? 0 : Math.max(0, fee - userCumulativePaid);

            let calculatedStatus = item.status || "Paid";
            if (isWalkIn) {
              calculatedStatus = "Paid";
            } else if (item.status !== "Pending Approval") {
              if (userCumulativePaid >= fee) calculatedStatus = "Paid";
              else if (userCumulativePaid > 0) calculatedStatus = "Partial";
              else calculatedStatus = "Unpaid";
            }

            return {
              id: item.id,
              user_id: item.user_id,
              invoice_id: item.invoice_id || `INV-2026-${item.id.slice(0, 4)}`,
              member_name: prof?.full_name || "Guest / Walk-In",
              member_id: prof?.member_id || "GP-GUEST",
              plan: prof?.plan || (isWalkIn ? "Daily Walk-In Pass" : "Gym Subscription"),
              raw_amount: amt,
              raw_total_fee: fee,
              raw_remaining: remaining,
              amount: `PKR ${Number(amt).toLocaleString()}`,
              total_fee: `PKR ${Number(fee).toLocaleString()}`,
              remaining: remaining === 0 ? "PKR 0 Cleared" : `PKR ${Number(remaining).toLocaleString()}`,
              date: item.date ? new Date(item.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : new Date().toLocaleDateString(),
              raw_date: item.date || new Date().toISOString(),
              method: item.payment_method || "Cash / Desk",
              status: calculatedStatus,
              proof_url: item.proof_url || null,
            };
          });
          setPayments(formatted);
          loadedFromSupabase = true;
        }
      } catch (err) {
        console.warn("Payments fetch notice:", err);
      }
    }

    if (!loadedFromSupabase && !isSupabaseConfigured()) {
      // Demo fallback with exceptional partial payment case (CodeInn Tech)
      setMembers([
        {
          id: "m-1",
          full_name: "CodeInn Tech",
          email: "codeinn@example.com",
          member_id: "GP-9367-960",
          plan: "Pro Membership",
          status: "Active",
          payment_status: "Partial",
          total_fee: 5000,
          paid_amount: 50,
          remaining_balance: 4950,
          proof_url: null,
        },
        {
          id: "m-2",
          full_name: "Abdullah Khan",
          email: "abdullah@example.com",
          member_id: "GP-8472-991",
          plan: "Pro Membership",
          status: "Active",
          payment_status: "Paid",
          total_fee: 5000,
          paid_amount: 5000,
          remaining_balance: 0,
          proof_url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
        },
        {
          id: "m-3",
          full_name: "Zaid Tahir",
          email: "zaid@example.com",
          member_id: "GP-5510-402",
          plan: "VIP Champion Pass",
          status: "Active",
          payment_status: "Paid",
          total_fee: 9000,
          paid_amount: 9000,
          remaining_balance: 0,
          proof_url: null,
        },
        {
          id: "m-4",
          full_name: "Sara Ahmed",
          email: "sara@example.com",
          member_id: "GP-1204-883",
          plan: "Standard Monthly Pass",
          status: "Pending",
          payment_status: "Pending Approval",
          total_fee: 3500,
          paid_amount: 3500,
          remaining_balance: 0,
          proof_url: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=600&q=80",
        },
        {
          id: "m-5",
          full_name: "Hamza Sheikh",
          email: "hamza@example.com",
          member_id: "GP-9031-115",
          plan: "Pro Membership",
          status: "Inactive",
          payment_status: "Unpaid",
          total_fee: 5000,
          paid_amount: 0,
          remaining_balance: 5000,
          proof_url: null,
        },
      ]);

      setPayments([
        {
          id: "1",
          user_id: "m-1",
          invoice_id: "INV-2024-7305",
          member_name: "CodeInn Tech",
          member_id: "GP-9367-960",
          plan: "Pro Membership",
          raw_amount: 50,
          raw_total_fee: 5000,
          raw_remaining: 4950,
          amount: "PKR 50",
          total_fee: "PKR 5,000",
          remaining: "PKR 4,950",
          date: "Aug 11, 2026",
          method: "Cash / Desk",
          status: "Partial",
          proof_url: null,
        },
        {
          id: "2",
          user_id: "m-2",
          invoice_id: "INV-2026-001",
          member_name: "Abdullah Khan",
          member_id: "GP-8472-991",
          plan: "Pro Membership",
          raw_amount: 5000,
          raw_total_fee: 5000,
          raw_remaining: 0,
          amount: "PKR 5,000",
          total_fee: "PKR 5,000",
          remaining: "PKR 0",
          date: "Aug 01, 2026",
          method: "Credit Card",
          status: "Paid",
          proof_url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
        },
        {
          id: "3",
          user_id: "m-3",
          invoice_id: "INV-2026-002",
          member_name: "Zaid Tahir",
          member_id: "GP-5510-402",
          plan: "VIP Champion Pass",
          raw_amount: 9000,
          raw_total_fee: 9000,
          raw_remaining: 0,
          amount: "PKR 9,000",
          total_fee: "PKR 9,000",
          remaining: "PKR 0",
          date: "Aug 03, 2026",
          method: "JazzCash / EasyPaisa",
          status: "Paid",
          proof_url: null,
        },
        {
          id: "4",
          user_id: "m-4",
          invoice_id: "INV-2026-003",
          member_name: "Sara Ahmed",
          member_id: "GP-1204-883",
          plan: "Standard Monthly Pass",
          raw_amount: 3500,
          raw_total_fee: 3500,
          raw_remaining: 0,
          amount: "PKR 3,500",
          total_fee: "PKR 3,500",
          remaining: "PKR 0",
          date: "Aug 11, 2026",
          method: "EasyPaisa Screenshot",
          status: "Pending Approval",
          proof_url: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=600&q=80",
        },
      ]);
    }

    setLoading(false);
  };

  // Record Payment Submit
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    let targetUserId = selectedMemberId;
    let targetName = customGuestName;

    if (selectedMemberId && selectedMemberId !== "custom") {
      const found = members.find((m) => m.id === selectedMemberId);
      if (found) targetName = found.full_name;
    } else if (!customGuestName.trim()) {
      alert("Please select a registered member or enter guest name.");
      setSubmitting(false);
      return;
    }

    const isWalkInEntry = !selectedMemberId || selectedMemberId === "custom";
    const collectedNow = parseFloat(amount) || 0;
    const numericFee = isWalkInEntry ? collectedNow : (parseFloat(totalFee) || collectedNow || 5000);

    // Calculate cumulative paid total
    const existingPayments = payments.filter((p) => p.user_id === targetUserId);
    const prevPaidSum = existingPayments.reduce((acc, p) => acc + (p.raw_amount || 0), 0);
    const cumulativePaid = isWalkInEntry ? collectedNow : prevPaidSum + collectedNow;
    const remainingDue = isWalkInEntry ? 0 : Math.max(0, numericFee - cumulativePaid);

    let determinedStatus = "Paid";
    if (isWalkInEntry || cumulativePaid >= numericFee) {
      determinedStatus = "Paid";
    } else if (cumulativePaid > 0) {
      determinedStatus = "Partial";
    } else {
      determinedStatus = "Unpaid";
    }

    const generatedInvoiceId = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowIso = new Date().toISOString();

    let savedToSupabase = false;

    if (isSupabaseConfigured()) {
      try {
        if (!targetUserId || targetUserId === "custom") {
          targetUserId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
          await supabase.from("profiles").insert([
            {
              id: targetUserId,
              email: `payment.${Date.now()}@abdullahgym.local`,
              full_name: targetName.trim(),
              member_id: `GP-PAY-${Math.floor(1000 + Math.random() * 9000)}`,
              plan: "Gym Pass",
              status: "Active",
              created_at: nowIso,
            },
          ]);
        }

        // Insert new payment transaction record into Supabase (safe standard columns)
        const { error: payErr } = await supabase.from("payments").insert([
          {
            user_id: targetUserId,
            amount: collectedNow,
            status: "Paid",
            payment_method: method,
            invoice_id: generatedInvoiceId,
            date: nowIso,
          },
        ]);

        if (!payErr) {
          savedToSupabase = true;
          // Update member profile status in Supabase
          await supabase
            .from("profiles")
            .update({
              status: determinedStatus === "Paid" ? "Active" : "Pending",
              days_remaining: 30,
            })
            .eq("id", targetUserId);

          await fetchPaymentsAndMembers();
        } else {
          console.error("Payment insert error:", payErr.message);
        }
      } catch (err) {
        console.warn("Supabase record payment exception:", err);
      }
    }

    if (!savedToSupabase) {
      // Local fallback insert
      const newPayment = {
        id: String(Date.now()),
        user_id: targetUserId,
        invoice_id: generatedInvoiceId,
        member_name: targetName,
        member_id: "GP-PAY",
        plan: "Gym Subscription",
        raw_amount: collectedNow,
        raw_total_fee: numericFee,
        raw_remaining: remainingDue,
        amount: `PKR ${Number(collectedNow).toLocaleString()}`,
        total_fee: `PKR ${Number(numericFee).toLocaleString()}`,
        remaining: `PKR ${Number(remainingDue).toLocaleString()}`,
        date: new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
        method: method,
        status: determinedStatus,
      };
      setPayments((prev) => [newPayment, ...prev]);
    }

    const toastText =
      determinedStatus === "Paid"
        ? `✓ Full payment of PKR ${Number(collectedNow).toLocaleString()} recorded for ${targetName}!`
        : `⚡ Partial payment of PKR ${Number(collectedNow).toLocaleString()} recorded for ${targetName}. Remaining Balance: PKR ${Number(remainingDue).toLocaleString()}.`;

    setStatusMsg(toastText);
    setTimeout(() => setStatusMsg(""), 6000);

    setIsModalOpen(false);
    setSelectedMemberId("");
    setCustomGuestName("");
    setAmount("5000");
    setSubmitting(false);
  };

  // ADMIN ACTION: Approve App Screenshot Payment
  const handleApprovePayment = async (memberOrPayment) => {
    const targetUserId = memberOrPayment.user_id || memberOrPayment.id;
    const targetName = memberOrPayment.full_name || memberOrPayment.member_name || "Member";

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("payments")
          .update({ status: "Paid" })
          .eq("user_id", targetUserId);

        await supabase
          .from("profiles")
          .update({ status: "Active", days_remaining: 30 })
          .eq("id", targetUserId);

        await fetchPaymentsAndMembers();
      } catch (err) {
        console.warn("Approve payment exception:", err);
      }
    }

    setPayments((prev) =>
      prev.map((p) => (p.user_id === targetUserId || p.id === targetUserId ? { ...p, status: "Paid", raw_remaining: 0, remaining: "PKR 0" } : p))
    );
    setMembers((prev) =>
      prev.map((m) => (m.id === targetUserId ? { ...m, payment_status: "Paid", status: "Active", remaining_balance: 0 } : m))
    );

    setStatusMsg(`🎉 Payment for ${targetName} approved & marked as FULLY PAID! Account activated.`);
    setTimeout(() => setStatusMsg(""), 5000);

    if (activeProof) setActiveProof(null);
  };

  // ADMIN ACTION: Collect Remaining Balance Quick Button
  const handleCollectRemainingBalance = (member) => {
    const info = getMemberPaymentInfo(member.id);
    setSelectedMemberId(member.id);
    setTotalFee(String(info.total_fee));
    setAmount(String(info.remaining));
    setIsModalOpen(true);
  };

  // ADMIN ACTION: Attach / Upload Payment Screenshot (Simulates Member App Screenshot Upload)
  const handleAttachProofScreenshot = async (e) => {
    e.preventDefault();
    if (!uploadProofMember || !proofUrlInput.trim()) return;

    const targetUserId = uploadProofMember.id;
    const proofUrl = proofUrlInput.trim();

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("payments").upsert([
          {
            user_id: targetUserId,
            amount: 5000,
            total_fee: 5000,
            status: "Pending Approval",
            payment_method: "Online Screenshot Transfer",
            proof_url: proofUrl,
            invoice_id: `INV-PROOF-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toISOString(),
          },
        ]);
        await fetchPaymentsAndMembers();
      } catch (err) {
        console.warn("Attach proof exception:", err);
      }
    }

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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1E3621] pb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Payments & Billing Portal</h1>
          <p className="text-xs text-[#9EB5A3] mt-1">
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
          className="bg-[#22C55E] hover:bg-[#1ea850] text-black font-extrabold text-xs px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          + Record Manual Payment
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PENDING APPROVAL NOTIFICATION ALERT BANNER (ONLY FOR APP SCREENSHOTS) */}
      {/* ========================================================================= */}
      {pendingApprovalsCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-indigo-950/80 via-[#191D38] to-[#0F1226] border border-indigo-500/60 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center font-black text-indigo-300 shrink-0 text-lg">
              📱
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-indigo-300">
                Pending App Screenshot Approval Notice: {pendingApprovalsCount} Member Request(s) Awaiting Review!
              </h4>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Members have submitted online transfer screenshots from the app requiring admin verification.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTab("members");
              setStatusFilter("Pending Approval");
            }}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-black font-extrabold text-xs rounded-xl transition shadow-md shadow-indigo-500/20 shrink-0"
          >
            Review App Screenshots ({pendingApprovalsCount}) →
          </button>
        </div>
      )}

      {/* Success Notification */}
      {statusMsg && (
        <div className="p-4 bg-[#16331C] border border-[#22C55E] text-[#4ADE80] text-xs font-bold rounded-2xl shadow-lg flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-gray-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Financial Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#0E1A0F] border border-[#1E3621] p-4 rounded-2xl shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-[#738F7A] uppercase tracking-wider">Total Revenue Collected</span>
          <p className="text-2xl font-black text-white">PKR {Number(totalRevenue).toLocaleString()}</p>
          <span className="text-[10px] text-[#4ADE80] font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            Live Supabase Balance
          </span>
        </div>

        <div className="bg-[#0E1A0F] border border-[#1E3621] p-4 rounded-2xl shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-[#738F7A] uppercase tracking-wider">Fully Paid Members</span>
          <p className="text-2xl font-black text-[#4ADE80]">{paidCount} Members</p>
          <span className="text-[10px] text-[#738F7A]">100% cleared</span>
        </div>

        <div className="bg-[#0E1A0F] border border-[#1E3621] p-4 rounded-2xl shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-[#738F7A] uppercase tracking-wider">Partial Payments</span>
          <p className="text-2xl font-black text-amber-400">{partialCount} Members</p>
          <span className="text-[10px] text-amber-300/80">Has remaining balance</span>
        </div>

        <div className="bg-[#0E1A0F] border border-[#1E3621] p-4 rounded-2xl shadow-lg space-y-1">
          <span className="text-[11px] font-semibold text-[#738F7A] uppercase tracking-wider">Unpaid / Fee Overdue</span>
          <p className="text-2xl font-black text-rose-400">{unpaidCount} Members</p>
          <span className="text-[10px] text-rose-300/80">Awaiting desk payment</span>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex gap-2 bg-[#0E1A0F] p-1.5 rounded-xl border border-[#1E3621]">
          <button
            onClick={() => {
              setActiveTab("logs");
              setStatusFilter("All");
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === "logs" ? "bg-[#22C55E] text-black" : "text-[#9EB5A3] hover:text-white"
            }`}
          >
            Transaction History Logs ({payments.length})
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "members" ? "bg-[#22C55E] text-black" : "text-[#9EB5A3] hover:text-white"
            }`}
          >
            Registered Member Monthly Payments ({members.length})
            {pendingApprovalsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-400 text-black">
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
            className="w-full bg-[#081109] border border-[#1E3621] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#22C55E]"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex gap-2 bg-[#0E1A0F] p-2 rounded-xl border border-[#1E3621] self-start overflow-x-auto">
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
                ? "bg-[#16331C] text-[#4ADE80] border border-[#22C55E]"
                : "text-gray-400 hover:text-white"
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
        <div className="bg-[#0E1A0F] border border-[#1E3621] rounded-2xl p-4 sm:p-6 shadow-xl overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white">All Payments & Invoices Activity Stream</h3>
            <span className="text-[11px] text-[#4ADE80] bg-[#16331C] px-3 py-1 rounded-full border border-[#234A28]">
              ● {payments.length} Transactions Recorded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E3621] text-[11px] font-bold text-[#738F7A] uppercase tracking-wider">
                  <th className="py-3 px-3">Invoice ID</th>
                  <th className="py-3 px-3">Member / Payer</th>
                  <th className="py-3 px-3">Paid / Total Fee</th>
                  <th className="py-3 px-3">Remaining Due</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Payment Method</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Invoice Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152A18] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-500">
                      Loading payments from Supabase...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-500">
                      No payment records found.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#132415] transition">
                      <td className="py-3.5 px-3 font-mono text-[#4ADE80] font-bold">{p.invoice_id}</td>
                      <td className="py-3.5 px-3 font-bold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#1A331D] text-[#4ADE80] flex items-center justify-center font-bold text-xs">
                          {p.member_name ? p.member_name.charAt(0).toUpperCase() : "P"}
                        </div>
                        {p.member_name}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-extrabold text-emerald-300">{p.amount}</span>
                        <span className="text-[10px] text-gray-400 block font-mono">Total: {p.total_fee}</span>
                      </td>

                      <td className="py-3.5 px-3 font-mono">
                        {p.raw_remaining > 0 ? (
                          <span className="font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800 text-[11px]">
                            {p.remaining} Due
                          </span>
                        ) : (
                          <span className="text-[#4ADE80] font-bold">PKR 0 Cleared</span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-[#738F7A]">{p.date}</td>
                      <td className="py-3.5 px-3 text-[#A1B8A6]">{p.method}</td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            p.status === "Paid"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : p.status === "Partial"
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : p.status === "Pending Approval"
                              ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                              : "bg-rose-950 text-rose-400 border border-rose-800"
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

                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => setActiveInvoice(p)}
                          className="px-3 py-1.5 bg-[#162D19] hover:bg-[#1E3E22] border border-[#28502F] text-xs font-bold text-[#4ADE80] rounded-xl transition flex items-center gap-1.5 ml-auto"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="bg-[#0E1A0F] border border-[#1E3621] rounded-2xl p-4 sm:p-6 shadow-xl overflow-hidden space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E3621] pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white">Registered Members Monthly Payment Roster</h3>
              <p className="text-xs text-[#738F7A]">
                Track member subscription payments, partial balances due, and app transfer screenshots.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E3621] text-[11px] font-bold text-[#738F7A] uppercase tracking-wider">
                  <th className="py-3 px-3">Member Details</th>
                  <th className="py-3 px-3">Member ID</th>
                  <th className="py-3 px-3">Monthly Plan & Total Fee</th>
                  <th className="py-3 px-3">Paid vs Remaining Due</th>
                  <th className="py-3 px-3">Payment Status</th>
                  <th className="py-3 px-3">Proof / Screenshot</th>
                  <th className="py-3 px-3 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152A18] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-500">
                      Loading registered members...
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-500">
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
                      <tr key={m.id} className="hover:bg-[#132415] transition">
                        {/* Member Details */}
                        <td className="py-3.5 px-3 font-bold text-white flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#1A331D] border border-[#28502F] text-[#4ADE80] flex items-center justify-center font-extrabold text-xs shrink-0">
                            {m.full_name ? m.full_name.charAt(0).toUpperCase() : "M"}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white leading-tight">{m.full_name}</p>
                            <p className="text-[10px] text-[#738F7A]">{m.email}</p>
                          </div>
                        </td>

                        {/* Member ID */}
                        <td className="py-3.5 px-3 font-mono text-[#4ADE80]">{m.member_id || "GP-0000-000"}</td>

                        {/* Monthly Plan & Total Fee */}
                        <td className="py-3.5 px-3 text-[#A1B8A6] font-medium">
                          <p className="text-xs font-bold text-white">{m.plan || "Pro Membership"}</p>
                          <p className="text-[10px] text-[#738F7A] font-mono">Fee: PKR {Number(info.total_fee).toLocaleString()}</p>
                        </td>

                        {/* Paid vs Remaining Due */}
                        <td className="py-3.5 px-3 font-mono">
                          <p className="text-xs font-extrabold text-emerald-400">Paid: PKR {Number(info.paid).toLocaleString()}</p>
                          {info.remaining > 0 ? (
                            <p className="text-[11px] font-bold text-amber-400">Due: PKR {Number(info.remaining).toLocaleString()}</p>
                          ) : (
                            <p className="text-[10px] text-gray-500">No Balance Due</p>
                          )}
                        </td>

                        {/* Payment Status Badge */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isFullyPaid
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : isPartial
                                ? "bg-amber-950 text-amber-300 border border-amber-800"
                                : isPendingApproval
                                ? "bg-indigo-950 text-indigo-300 border border-indigo-800 animate-pulse"
                                : "bg-rose-950 text-rose-400 border border-rose-800"
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
                        <td className="py-3.5 px-3">
                          {info.proof_url ? (
                            <button
                              onClick={() => setActiveProof({ member: m, info })}
                              className="px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 text-[11px] font-bold rounded-lg transition flex items-center gap-1.5"
                            >
                              📸 View App Screenshot
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-gray-400 italic">Desk Collection</span>
                              <button
                                onClick={() => setUploadProofMember(m)}
                                title="Attach Screenshot (Admin Mock)"
                                className="text-[10px] text-[#4ADE80] hover:underline"
                              >
                                + Attach Screenshot
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Admin Action */}
                        <td className="py-3.5 px-3 text-right space-x-2">
                          {isPendingApproval ? (
                            <button
                              onClick={() => handleApprovePayment({ user_id: m.id, full_name: m.full_name })}
                              className="px-3.5 py-1.5 bg-[#22C55E] hover:bg-[#1ea850] text-black font-extrabold text-xs rounded-xl transition shadow-md shadow-emerald-500/20"
                            >
                              ✓ Approve App Transfer
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCollectRemainingBalance(m)}
                              className="px-3 py-1.5 bg-[#162D19] hover:bg-[#1E3E22] border border-[#28502F] text-xs font-bold text-[#4ADE80] rounded-xl transition"
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
      {/* MODAL 1: RECORD MANUAL OFFLINE PAYMENT (WITH PARTIAL BALANCE CALCULATOR) */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0E1A0F] border border-[#22C55E]/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E3621] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">Record Payment / Collect Fee</h3>
                <p className="text-[11px] text-[#738F7A]">Record full or partial payments directly in Supabase.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
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
                  className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
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
                  <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                    Walk-In Guest Payer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customGuestName}
                    onChange={(e) => setCustomGuestName(e.target.value)}
                    placeholder="e.g. Ahmad Ali"
                    className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                    Total Plan Fee (PKR) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={totalFee}
                    onChange={(e) => setTotalFee(e.target.value)}
                    placeholder="5000"
                    className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                    Amount Collected Now *
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 50 or 5000"
                    className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                  />
                </div>
              </div>

              {/* Real-time Partial Balance Calculator Preview */}
              {parseFloat(totalFee) > 0 && (
                <div className="p-3 bg-[#081209] border border-[#162D19] rounded-xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#738F7A]">Collected Now:</span>
                    <span className="font-extrabold text-[#4ADE80]">PKR {Number(parseFloat(amount) || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#162D19]">
                    <span className="text-[#738F7A]">Remaining Balance Due:</span>
                    <span
                      className={`font-black ${
                        (parseFloat(totalFee) || 0) - (parseFloat(amount) || 0) > 0
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      PKR {Number(Math.max(0, (parseFloat(totalFee) || 0) - (parseFloat(amount) || 0))).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="Cash / Desk">Cash at Desk</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card Terminal">POS Card Terminal</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#1E3621] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#122414] text-xs font-bold text-gray-300 rounded-xl hover:bg-[#1a331c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#22C55E] text-xs font-bold text-black rounded-xl hover:bg-[#1ca64f] shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Payment Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INVOICE RECEIPT VIEWER WITH REMAINING BALANCE HIGHLIGHT */}
      {/* ========================================================================= */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0A140B] border border-[#22C55E]/50 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl text-white relative">
            <button
              onClick={() => setActiveInvoice(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white font-bold text-base"
            >
              ✕
            </button>

            <div className="border-b border-[#1E3621] pb-5 text-center space-y-1">
              <div className="w-12 h-12 bg-[#22C55E] rounded-2xl flex items-center justify-center font-black text-black text-xl mx-auto shadow-lg shadow-emerald-500/20 mb-2">
                AG
              </div>
              <h2 className="text-xl font-black tracking-tight">ABDULLAH GYM 1</h2>
              <p className="text-xs text-[#4ADE80] font-semibold uppercase tracking-wider">
                Official Payment Receipt & Invoice
              </p>
              <p className="text-[11px] text-[#738F7A]">Rajput Colony, Gujranwala • WhatsApp: 0320 8313000</p>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="flex justify-between items-center bg-[#060D07] p-3 rounded-xl border border-[#162D19]">
                <div>
                  <p className="text-[10px] text-[#738F7A] uppercase">Invoice Number</p>
                  <p className="font-extrabold text-[#4ADE80] text-sm">{activeInvoice.invoice_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[#738F7A] uppercase">Date Paid</p>
                  <p className="font-extrabold text-white">{activeInvoice.date}</p>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-[#0E1A0F] rounded-2xl border border-[#1E3621]">
                <div className="flex justify-between">
                  <span className="text-[#738F7A]">Member / Payer:</span>
                  <span className="font-bold text-white">{activeInvoice.member_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#738F7A]">Member ID:</span>
                  <span className="font-bold text-[#4ADE80]">{activeInvoice.member_id || "GP-MEMBER"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#738F7A]">Plan / Description:</span>
                  <span className="font-bold text-white">{activeInvoice.plan || "Gym Subscription"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#738F7A]">Payment Method:</span>
                  <span className="font-bold text-white">{activeInvoice.method}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#1C3620]">
                  <span className="text-[#738F7A]">Status:</span>
                  <span
                    className={`font-bold uppercase ${
                      activeInvoice.status === "Paid"
                        ? "text-[#4ADE80]"
                        : activeInvoice.status === "Partial"
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  >
                    ● {activeInvoice.status}
                  </span>
                </div>
              </div>

              {/* Amount & Remaining Balance Breakdown */}
              <div className="p-4 bg-emerald-950/40 border border-[#22C55E] rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-xs">Total Plan Fee:</span>
                  <span className="font-mono text-sm text-gray-200">{activeInvoice.total_fee}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-white text-sm">TOTAL AMOUNT PAID:</span>
                  <span className="font-black text-xl text-[#4ADE80]">{activeInvoice.amount}</span>
                </div>

                {activeInvoice.raw_remaining > 0 && (
                  <div className="pt-2 border-t border-amber-800/60 flex justify-between items-center text-amber-300 font-extrabold">
                    <span>REMAINING BALANCE DUE:</span>
                    <span className="text-lg">{activeInvoice.remaining}</span>
                  </div>
                )}
              </div>

              {/* Developer Attribution Footer */}
              <div className="pt-2 border-t border-[#1E3621] text-center">
                <p className="text-[11px] text-[#738F7A] font-sans">
                  Powered by <strong className="text-[#4ADE80]">CodeInn Tech</strong> | <a href="mailto:contact@codeinntech.com" className="underline text-gray-300 hover:text-white">contact@codeinntech.com</a>
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1E3621] flex justify-between gap-3">
              <button
                onClick={() => setActiveInvoice(null)}
                className="px-5 py-2.5 bg-[#122414] text-xs font-bold text-gray-300 rounded-xl hover:bg-[#1a331c]"
              >
                Close Receipt
              </button>

              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-[#22C55E] hover:bg-[#1ea850] text-black font-extrabold text-xs rounded-xl transition shadow-md shadow-emerald-500/20 flex items-center gap-2"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#0E1A0F] border border-indigo-500/50 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-white relative">
            <button
              onClick={() => setActiveProof(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white font-bold text-base"
            >
              ✕
            </button>

            <div className="border-b border-[#1E3621] pb-3">
              <h3 className="text-base font-extrabold text-white">App Screenshot Proof Review</h3>
              <p className="text-[11px] text-[#738F7A]">
                Submitted by {activeProof.member.full_name} ({activeProof.member.member_id || "GP-MEMBER"})
              </p>
            </div>

            <div className="bg-[#081109] border border-[#1E3621] rounded-2xl p-2 max-h-80 overflow-hidden flex items-center justify-center">
              <img
                src={activeProof.info.proof_url || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80"}
                alt="Payment Proof Screenshot"
                className="max-h-72 w-full object-contain rounded-xl"
              />
            </div>

            <div className="p-3 bg-[#081209] border border-[#162D19] rounded-xl text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-[#738F7A]">Member Name:</span>
                <span className="font-bold text-white">{activeProof.member.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#738F7A]">Assigned Plan:</span>
                <span className="font-bold text-white">{activeProof.member.plan || "Pro Membership"}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1E3621] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveProof(null)}
                className="px-4 py-2 bg-[#122414] text-xs font-bold text-gray-300 rounded-xl hover:bg-[#1a331c]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleApprovePayment(activeProof.member)}
                className="px-5 py-2.5 bg-[#22C55E] hover:bg-[#1ea850] text-black font-extrabold text-xs rounded-xl transition shadow-md shadow-emerald-500/20"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0E1A0F] border border-[#22C55E]/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E3621] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">Attach Payment Screenshot (Mock)</h3>
                <p className="text-[11px] text-[#738F7A]">Simulate member uploading app payment proof.</p>
              </div>
              <button
                onClick={() => setUploadProofMember(null)}
                className="text-gray-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAttachProofScreenshot} className="space-y-4">
              <div className="p-3 bg-[#081209] border border-[#173019] rounded-xl text-xs space-y-1">
                <p className="text-[#738F7A]">Target Member:</p>
                <p className="font-extrabold text-white">{uploadProofMember.full_name}</p>
                <p className="text-[11px] text-[#4ADE80] font-mono">{uploadProofMember.member_id || "GP-MEM"}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                  Payment Screenshot Image URL
                </label>
                <input
                  type="url"
                  required
                  value={proofUrlInput}
                  onChange={(e) => setProofUrlInput(e.target.value)}
                  className="w-full bg-[#081109] border border-[#1E3621] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div className="pt-3 border-t border-[#1E3621] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUploadProofMember(null)}
                  className="px-4 py-2 bg-[#122414] text-xs font-bold text-gray-300 rounded-xl hover:bg-[#1a331c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#22C55E] text-xs font-bold text-black rounded-xl hover:bg-[#1ca64f] shadow-md shadow-emerald-500/20"
                >
                  Attach & Trigger Pending Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
