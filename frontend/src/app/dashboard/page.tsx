"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useFreighter } from "@/context/FreighterContext";
import { getGroupInfo, getMembers, getAllExpenses, getTreasuryBalance, isMember } from "@/lib/soroban";
import { FreighterButton } from "@/components/wallet/FreighterButton";

interface GroupData {
  name: string;
  member_count: number;
  expense_count: number;
  treasury_balance: bigint;
  approval_threshold: number;
  admin: string;
}

export default function DashboardPage() {
  const { address, isConnected } = useFreighter();
  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [memberStatus, setMemberStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const info = await getGroupInfo();
        setGroupData(info as GroupData);
        if (isConnected && address) {
          const memberCheck = await isMember(address);
          setMemberStatus(Boolean(memberCheck));
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [address, isConnected]);

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-white mb-2">Connect Freighter Wallet</h2>
        <p className="text-gray-400 mb-6">Connect your Freighter wallet to view your dashboard.</p>
        <FreighterButton />
      </div>
    );
  }

  const stats = [
    { label: "Members", value: groupData?.member_count ?? "—", icon: "👥", color: "text-purple-400" },
    { label: "Expenses", value: groupData?.expense_count ?? "—", icon: "📋", color: "text-blue-400" },
    { label: "Treasury (XLM)", value: groupData ? `${Number(groupData.treasury_balance) / 1e7} XLM` : "—", icon: "💰", color: "text-green-400" },
    { label: "Threshold", value: groupData ? `${groupData.approval_threshold}%` : "—", icon: "✅", color: "text-yellow-400" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {address.slice(0, 8)}...{address.slice(-4)} · Stellar Testnet
          </p>
        </div>
        <Link href="/groups/create"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors">
          + New Group
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-900/20 border border-red-800 text-red-400 rounded-xl p-4 text-sm">
          ⚠ {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-gray-900 rounded-2xl border border-gray-800 p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div key={s.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value?.toString()}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Member status */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
        <h2 className="text-base font-semibold text-white mb-3">Your Status</h2>
        {memberStatus ? (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            You are a member of this group
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">You are not a member yet</span>
            <Link href="/groups"
              className="text-sm text-purple-400 hover:text-purple-300 underline">
              Join a group →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
