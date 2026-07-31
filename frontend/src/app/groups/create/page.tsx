"use client";

import React from "react";
import Link from "next/link";

const CONTRACT_ID = "CAU5N4QWQ2WSNTFLGT5ABPTBU4JKTWSLTBID4NL4TP72P7CQAEEN56CS";

export default function CreateGroupPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link href="/groups" className="text-sm text-purple-400 hover:underline mb-4 inline-block">
        ← Back to Groups
      </Link>
      <h1 className="text-2xl font-bold text-white mb-2">Group Contract</h1>
      <p className="text-gray-400 text-sm mb-6">
        The community expense group contract is already deployed and initialized on Stellar Testnet.
      </p>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
        {/* Contract info */}
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-4">
          <p className="text-green-400 font-semibold text-sm mb-1">✅ Contract Deployed & Active</p>
          <p className="text-xs text-gray-400 font-mono break-all">{CONTRACT_ID}</p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">Network</span>
            <span className="text-white">Stellar Testnet</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">Group Name</span>
            <span className="text-white">Community Expense Group</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">Approval Threshold</span>
            <span className="text-white">51%</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-800">
            <span className="text-gray-400">Status</span>
            <span className="text-green-400">Active</span>
          </div>
        </div>

        <Link href="/groups"
          className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-colors">
          Go to Group →
        </Link>

        <a
          href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-700 text-gray-400 hover:text-white text-sm rounded-xl transition-colors"
        >
          View on Stellar Explorer ↗
        </a>
      </div>
    </div>
  );
}
