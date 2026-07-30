"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useFreighter } from "@/context/FreighterContext";
import { getGroupInfo, isMember, joinGroup } from "@/lib/soroban";
import { FreighterButton } from "@/components/wallet/FreighterButton";

interface GroupInfo {
  name: string;
  description: string;
  member_count: number;
  expense_count: number;
  treasury_balance: bigint;
  admin: string;
}

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "CAD76KKGZVVDXZVYDH2QCQ5SSLZQGNFZXJYXZXOWTIJWVJVO6ZFBV5X2";

export default function GroupsPage() {
  const { address, isConnected } = useFreighter();
  const [info, setInfo] = useState<GroupInfo | null>(null);
  const [memberStatus, setMemberStatus] = useState(false);
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getGroupInfo();
        setInfo(data as GroupInfo);
        if (isConnected && address) {
          const m = await isMember(address);
          setMemberStatus(Boolean(m));
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [address, isConnected]);

  const handleJoin = async () => {
    if (!address) return;
    setJoining(true);
    setError(null);
    try {
      await joinGroup(address);
      setMemberStatus(true);
      setJoinSuccess(true);
      const data = await getGroupInfo();
      setInfo(data as GroupInfo);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Groups</h1>
          <p className="text-sm text-gray-400 mt-0.5">Community expense groups on Stellar</p>
        </div>
        {isConnected && (
          <Link href="/groups/create"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors">
            + Create Group
          </Link>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-800 text-red-400 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}
      {joinSuccess && (
        <div className="mb-4 bg-green-900/20 border border-green-800 text-green-400 rounded-xl p-4 text-sm">
          ✅ Successfully joined the group!
        </div>
      )}

      {loading ? (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 animate-pulse h-48" />
      ) : !CONTRACT_ID ? (
        <div className="bg-gray-900 rounded-2xl border border-yellow-800 p-8 text-center">
          <p className="text-yellow-400 mb-2">⚠ No contract deployed yet</p>
          <p className="text-gray-400 text-sm">Deploy the Soroban contract first and set NEXT_PUBLIC_CONTRACT_ID</p>
          <Link href="/groups/create" className="mt-4 inline-block text-purple-400 underline text-sm">
            Deploy & Initialize →
          </Link>
        </div>
      ) : info ? (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-xl mb-3">
                {info.name?.charAt(0) ?? "G"}
              </div>
              <h2 className="text-xl font-bold text-white">{info.name}</h2>
              {info.description && <p className="text-gray-400 text-sm mt-1">{info.description}</p>}
            </div>
            <div className="text-right">
              {memberStatus ? (
                <span className="inline-flex items-center gap-1 bg-green-900/20 text-green-400 border border-green-800 text-xs px-2 py-1 rounded-full">
                  ✓ Member
                </span>
              ) : isConnected ? (
                <button onClick={handleJoin} disabled={joining}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm rounded-xl transition-colors">
                  {joining ? "Joining..." : "Join Group"}
                </button>
              ) : (
                <FreighterButton />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
            {[
              { label: "Members", value: info.member_count },
              { label: "Expenses", value: info.expense_count },
              { label: "Treasury", value: `${Number(info.treasury_balance ?? 0) / 1e7} XLM` },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-bold text-white">{s.value?.toString()}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {memberStatus && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <Link href={`/groups/${CONTRACT_ID}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-xl transition-colors">
                Open Group →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center text-gray-400">
          No groups found
        </div>
      )}
    </div>
  );
}
