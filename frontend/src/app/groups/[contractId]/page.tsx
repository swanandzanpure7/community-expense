"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useFreighter } from "@/context/FreighterContext";
import {
  getGroupInfo, getAllExpenses, getMembers,
  getTreasuryBalance, isMember,
  joinGroup, leaveGroup, createExpense,
  approveExpense, rejectExpense, deposit,
} from "@/lib/soroban";
import { FreighterButton } from "@/components/wallet/FreighterButton";

type Tab = "expenses" | "members" | "treasury";

interface Expense {
  id: number;
  creator: string;
  description: string;
  amount: bigint;
  category: number;
  status: number; // 0=Pending,1=Approved,2=Rejected,3=Settled
  approvals: number;
  rejections: number;
}

const STATUS = ["Pending", "Approved", "Rejected", "Settled"];
const STATUS_COLOR = [
  "bg-yellow-900/20 text-yellow-400 border-yellow-800",
  "bg-blue-900/20 text-blue-400 border-blue-800",
  "bg-red-900/20 text-red-400 border-red-800",
  "bg-green-900/20 text-green-400 border-green-800",
];
const CATEGORIES = ["General","Food","Transport","Utilities","Entertainment","Rent","Medical","Other"];

export default function GroupDetailPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = use(params);
  const { address, isConnected } = useFreighter();

  const [tab, setTab] = useState<Tab>("expenses");
  const [groupInfo, setGroupInfo] = useState<Record<string, unknown> | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [memberStatus, setMemberStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create expense form
  const [showForm, setShowForm] = useState(false);
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCat, setExpCat] = useState(0);

  // Deposit form
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmt, setDepositAmt] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [info, exps, mems, bal] = await Promise.all([
        getGroupInfo(), getAllExpenses(), getMembers(), getTreasuryBalance(),
      ]);
      setGroupInfo(info as Record<string, unknown>);
      setExpenses((exps as Expense[]) || []);
      setMembers((mems as string[]) || []);
      setBalance(BigInt((bal as bigint | number | string) || 0));
      if (isConnected && address) {
        const m = await isMember(address);
        setMemberStatus(Boolean(m));
      }
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [address, isConnected]);

  const notify = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 4000); };
  const err = (msg: string) => { setError(msg); setTimeout(() => setError(null), 5000); };

  const handleJoin = async () => {
    if (!address) return;
    setTxLoading(true);
    try { await joinGroup(address); setMemberStatus(true); notify("Joined group!"); await load(); }
    catch (e) { err((e as Error).message); } finally { setTxLoading(false); }
  };

  const handleLeave = async () => {
    if (!address) return;
    setTxLoading(true);
    try { await leaveGroup(address); setMemberStatus(false); notify("Left group."); await load(); }
    catch (e) { err((e as Error).message); } finally { setTxLoading(false); }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setTxLoading(true);
    try {
      const amtStroops = BigInt(Math.round(parseFloat(expAmount) * 1e7));
      await createExpense(address, expDesc, amtStroops, expCat);
      notify("Expense created!"); setShowForm(false); setExpDesc(""); setExpAmount("");
      await load();
    } catch (e) { err((e as Error).message); } finally { setTxLoading(false); }
  };

  const handleApprove = async (id: number) => {
    if (!address) return;
    setTxLoading(true);
    try { await approveExpense(address, id); notify("Voted!"); await load(); }
    catch (e) { err((e as Error).message); } finally { setTxLoading(false); }
  };

  const handleReject = async (id: number) => {
    if (!address) return;
    setTxLoading(true);
    try { await rejectExpense(address, id); notify("Rejected."); await load(); }
    catch (e) { err((e as Error).message); } finally { setTxLoading(false); }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setTxLoading(true);
    try {
      const amtStroops = BigInt(Math.round(parseFloat(depositAmt) * 1e7));
      await deposit(address, amtStroops);
      notify(`${depositAmt} XLM deposited!`); setShowDeposit(false); setDepositAmt("");
      await load();
    } catch (e) { err((e as Error).message); } finally { setTxLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/groups" className="text-sm text-purple-400 hover:underline mb-4 inline-block">← Back to Groups</Link>

      {/* Notifications */}
      {error && <div className="mb-4 bg-red-900/20 border border-red-800 text-red-400 rounded-xl p-3 text-sm">{error}</div>}
      {success && <div className="mb-4 bg-green-900/20 border border-green-800 text-green-400 rounded-xl p-3 text-sm">✅ {success}</div>}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{(groupInfo?.name as string) ?? "Group"}</h1>
          <p className="text-xs text-gray-500 mt-0.5 font-mono">{contractId.slice(0, 16)}...{contractId.slice(-8)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isConnected ? (
            memberStatus ? (
              <button onClick={handleLeave} disabled={txLoading}
                className="px-3 py-1.5 bg-red-900/20 border border-red-800 text-red-400 text-sm rounded-xl disabled:opacity-60 hover:bg-red-900/40 transition-colors">
                Leave Group
              </button>
            ) : (
              <button onClick={handleJoin} disabled={txLoading}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-xl disabled:opacity-60 transition-colors">
                {txLoading ? "..." : "Join Group"}
              </button>
            )
          ) : <FreighterButton />}
          {memberStatus && (
            <button onClick={() => setShowForm(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-xl transition-colors">
              + Add Expense
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Members", v: members.length },
          { label: "Expenses", v: expenses.length },
          { label: "Pending", v: expenses.filter(e => e.status === 0).length },
          { label: "Treasury", v: `${Number(balance)/1e7} XLM` },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 rounded-xl border border-gray-800 px-4 py-3">
            <p className="text-lg font-bold text-white">{s.v}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {(["expenses","members","treasury"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              tab === t ? "border-purple-500 text-purple-400" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Create Expense Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={handleCreateExpense} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-white">Add Expense</h2>
            <input value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="Description"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" required />
            <input value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="Amount (XLM)" type="number" step="0.0000001" min="0"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" required />
            <select value={expCat} onChange={e => setExpCat(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              {CATEGORIES.map((c,i) => <option key={i} value={i}>{c}</option>)}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm hover:bg-gray-700">Cancel</button>
              <button type="submit" disabled={txLoading}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm disabled:opacity-60">
                {txLoading ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Content */}
      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>

        {tab === "expenses" && (
          <div className="space-y-3">
            {loading ? <div className="h-24 bg-gray-900 rounded-2xl animate-pulse" /> :
              expenses.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <p className="text-4xl mb-3">📋</p>
                  <p>No expenses yet</p>
                  {memberStatus && <button onClick={() => setShowForm(true)} className="mt-3 text-purple-400 text-sm underline">Add first expense</button>}
                </div>
              ) : [...expenses].reverse().map(exp => (
                <div key={exp.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{exp.description}</p>
                      <p className="text-xs text-gray-500">{CATEGORIES[exp.category]} · {exp.creator.slice(0,8)}...</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-white">{Number(exp.amount)/1e7} XLM</p>
                      <span className={`text-xs border rounded-full px-2 py-0.5 ${STATUS_COLOR[exp.status]}`}>
                        {STATUS[exp.status]}
                      </span>
                    </div>
                  </div>
                  {exp.status === 0 && memberStatus && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
                      <p className="text-xs text-gray-500 flex-1">{exp.approvals} approved · {exp.rejections} rejected</p>
                      <button onClick={() => handleReject(exp.id)} disabled={txLoading}
                        className="px-3 py-1 bg-red-900/20 border border-red-800 text-red-400 text-xs rounded-lg disabled:opacity-60">Reject</button>
                      <button onClick={() => handleApprove(exp.id)} disabled={txLoading}
                        className="px-3 py-1 bg-green-900/20 border border-green-800 text-green-400 text-xs rounded-lg disabled:opacity-60">Approve</button>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        )}

        {tab === "members" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Address</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {members.map(m => (
                  <tr key={m} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-mono text-gray-300 text-xs">{m.slice(0,12)}...{m.slice(-6)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        m === (groupInfo?.admin as string)
                          ? "bg-purple-900/20 text-purple-400 border-purple-800"
                          : "bg-gray-800 text-gray-400 border-gray-700"
                      }`}>{m === (groupInfo?.admin as string) ? "Admin" : "Member"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "treasury" && (
          <div className="max-w-sm space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-3xl font-bold text-white">{Number(balance)/1e7} XLM</p>
              <p className="text-sm text-gray-400 mt-0.5">Treasury Balance</p>
            </div>
            {memberStatus && !showDeposit && (
              <button onClick={() => setShowDeposit(true)}
                className="w-full py-2 border border-gray-700 text-gray-300 text-sm rounded-xl hover:bg-gray-800 transition-colors">
                + Deposit XLM
              </button>
            )}
            {showDeposit && (
              <form onSubmit={handleDeposit} className="space-y-3">
                <input value={depositAmt} onChange={e => setDepositAmt(e.target.value)}
                  type="number" step="0.0000001" min="0" placeholder="Amount (XLM)"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowDeposit(false)}
                    className="flex-1 py-2 bg-gray-800 text-gray-300 rounded-xl text-sm">Cancel</button>
                  <button type="submit" disabled={txLoading}
                    className="flex-1 py-2 bg-purple-600 text-white rounded-xl text-sm disabled:opacity-60">
                    {txLoading ? "..." : "Deposit"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
