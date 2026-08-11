"use client";

import React, { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured } from "../../../lib/supabaseClient";

export default function PaymentsAdminPage() {
  const [payments, setPayments] = useState([
    {
      id: "1",
      invoice_id: "INV-2024-001",
      member_name: "Abdullah Khan",
      amount: "$50.00",
      date: "2024-08-01",
      method: "Credit Card",
      status: "Paid",
    },
    {
      id: "2",
      invoice_id: "INV-2024-002",
      member_name: "Zaid Tahir",
      amount: "$90.00",
      date: "2024-08-03",
      method: "Stripe Online",
      status: "Paid",
    },
    {
      id: "3",
      invoice_id: "INV-2024-003",
      member_name: "Hamza Ali",
      amount: "$50.00",
      date: "2024-08-10",
      method: "Cash / Desk",
      status: "Paid",
    },
    {
      id: "4",
      invoice_id: "INV-2024-004",
      member_name: "Sara Ahmed",
      amount: "$30.00",
      date: "2024-08-11",
      method: "Pending Invoice",
      status: "Pending",
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [amount, setAmount] = useState("50.00");
  const [method, setMethod] = useState("Cash / Desk");

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("payments")
          .select("id, amount, status, invoice_id, payment_method, date, profiles(full_name)")
          .order("date", { ascending: false });

        if (data && data.length > 0) {
          const formatted = data.map((item) => ({
            id: item.id,
            invoice_id: item.invoice_id || `INV-2024-${item.id.slice(0, 4)}`,
            member_name: item.profiles?.full_name || "Member",
            amount: `$${Number(item.amount).toFixed(2)}`,
            date: new Date(item.date).toISOString().split("T")[0],
            method: item.payment_method || "Online",
            status: item.status || "Paid",
          }));
          setPayments(formatted);
        }
      } catch (err) {
        console.warn("Payments fetch notice:", err);
      }
    }
  };

  const handleRecordPayment = (e) => {
    e.preventDefault();
    if (!memberName) return;

    const newPayment = {
      id: String(Date.now()),
      invoice_id: `INV-2024-${Math.floor(100 + Math.random() * 900)}`,
      member_name: memberName,
      amount: `$${Number(amount).toFixed(2)}`,
      date: new Date().toISOString().split("T")[0],
      method: method,
      status: "Paid",
    };

    setPayments([newPayment, ...payments]);
    setMemberName("");
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Payments & Billing Administration
          </h2>
          <p className="text-xs text-[#829E88]">
            Manage member transactions, invoices, and renewal income
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#22C55E] hover:bg-[#16A34A] text-black font-bold text-xs px-5 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20"
        >
          + Record Manual Payment
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#0E1B10] border border-[#1C3620] p-5 rounded-2xl">
          <span className="text-xs font-semibold text-[#829E88] uppercase">Total Revenue</span>
          <p className="text-2xl font-black text-white mt-1">$2,450.00</p>
          <span className="text-[11px] text-[#22C55E] font-medium">↑ 18% growth this month</span>
        </div>
        <div className="bg-[#0E1B10] border border-[#1C3620] p-5 rounded-2xl">
          <span className="text-xs font-semibold text-[#829E88] uppercase">Paid Invoices</span>
          <p className="text-2xl font-black text-[#4ADE80] mt-1">48 Payments</p>
          <span className="text-[11px] text-[#738F7A]">100% processed successfully</span>
        </div>
        <div className="bg-[#0E1B10] border border-[#1C3620] p-5 rounded-2xl">
          <span className="text-xs font-semibold text-[#829E88] uppercase">Pending Renewals</span>
          <p className="text-2xl font-black text-amber-400 mt-1">3 Invoices</p>
          <span className="text-[11px] text-[#738F7A]">Reminders sent via app</span>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-[#0E1B10] border border-[#1C3620] rounded-2xl p-4 sm:p-6 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1C3620] text-[11px] font-bold text-[#829E88] uppercase tracking-wider">
                <th className="py-3 px-3">Invoice ID</th>
                <th className="py-3 px-3">Member Name</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#172D1B] text-xs">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-[#132616] transition-colors">
                  <td className="py-3.5 px-3 font-mono text-[#A1B8A6]">{p.invoice_id}</td>
                  <td className="py-3.5 px-3 font-bold text-white">{p.member_name}</td>
                  <td className="py-3.5 px-3 font-extrabold text-[#4ADE80]">{p.amount}</td>
                  <td className="py-3.5 px-3 text-[#A1B8A6]">{p.date}</td>
                  <td className="py-3.5 px-3 text-[#A1B8A6]">{p.method}</td>
                  <td className="py-3.5 px-3 text-right">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        p.status === "Paid"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                          : "bg-amber-950 text-amber-400 border border-amber-800"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#122216] border border-[#22502E] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-white">
            <h3 className="text-xl font-bold mb-1">Record Offline Payment</h3>
            <p className="text-xs text-[#829E88] mb-6">
              Record cash or card payments collected at the front desk.
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                  Member Name
                </label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="e.g. Abdullah Khan"
                  className="w-full bg-[#0A140D] border border-[#24472A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0A140D] border border-[#24472A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#A1B8A6] uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full bg-[#0A140D] border border-[#24472A] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#22C55E]"
                >
                  <option value="Cash / Desk">Cash at Desk</option>
                  <option value="Card Terminal">POS Card Terminal</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1C3D22]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs text-[#829E88] hover:text-white px-4 py-2.5 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#22C55E] hover:bg-[#16A34A] text-black font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-md shadow-emerald-500/20"
                >
                  SAVE PAYMENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
