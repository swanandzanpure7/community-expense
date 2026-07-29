"use client";

import React from "react";
import { useFreighter } from "@/context/FreighterContext";
import { FreighterButton } from "@/components/wallet/FreighterButton";

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "";

export default function SettingsPage() {
  const { address, network, isConnected, disconnect } = useFreighter();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Wallet */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          🌟 Freighter Wallet
        </h2>
        {isConnected ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 mb-0.5">Address</p>
                <p className="font-mono text-gray-300 text-xs break-all">{address}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Network</p>
                <p className="text-gray-300">{network || "Unknown"}</p>
              </div>
            </div>
            <button onClick={disconnect}
              className="px-4 py-2 bg-red-900/20 border border-red-800 text-red-400 text-sm rounded-xl hover:bg-red-900/40 transition-colors">
              Disconnect Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">No wallet connected</p>
            <FreighterButton />
          </div>
        )}
      </div>

      {/* Contract Info */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
        <h2 className="text-base font-semibold text-white mb-4">📜 Contract Info</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Contract ID</span>
            <span className="font-mono text-purple-400 text-xs">
              {CONTRACT_ID ? `${CONTRACT_ID.slice(0,16)}...` : "Not configured"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Network</span>
            <span className="text-gray-300">Stellar Testnet</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">SDK</span>
            <span className="text-gray-300">soroban-sdk v21</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Language</span>
            <span className="text-gray-300">Rust (WASM)</span>
          </div>
        </div>
      </div>

      {/* Install Freighter */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
        <h2 className="text-base font-semibold text-white mb-2">🔧 Setup Guide</h2>
        <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
          <li>Install <a href="https://freighter.app" className="text-purple-400 underline" target="_blank">Freighter wallet</a></li>
          <li>Open Freighter → Settings → Network → Select <strong className="text-white">Testnet</strong></li>
          <li>Get free testnet XLM from <a href="https://laboratory.stellar.org/#account-creator?network=test" className="text-purple-400 underline" target="_blank">Stellar Friendbot</a></li>
          <li>Click &quot;Connect Freighter&quot; above</li>
        </ol>
      </div>
    </div>
  );
}
