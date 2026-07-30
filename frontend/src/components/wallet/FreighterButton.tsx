"use client";

import React, { useEffect, useState } from "react";
import { useFreighter } from "@/context/FreighterContext";

function shortenAddress(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function FreighterButton() {
  const {
    address,
    isConnected,
    isConnecting,
    isWrongNetwork,
    network,
    connect,
    disconnect,
    error,
  } = useFreighter();

  // Always render on client — avoids hydration issues
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Wrong network
  if (isConnected && isWrongNetwork) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-400 bg-red-900/20 border border-red-800 px-3 py-1.5 rounded-lg">
          ⚠ Wrong Network ({network})
        </span>
        <button
          onClick={disconnect}
          className="text-xs text-gray-400 hover:text-red-400 px-2 py-1"
        >
          ✕
        </button>
      </div>
    );
  }

  // Connected
  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-xl">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm font-mono text-gray-200">
            {shortenAddress(address)}
          </span>
          <span className="text-xs text-gray-500 border-l border-gray-700 pl-2">
            Testnet
          </span>
        </div>
        <button
          onClick={disconnect}
          className="text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1.5"
          aria-label="Disconnect wallet"
        >
          ✕
        </button>
      </div>
    );
  }

  // Not connected — always show button regardless of install state
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={isConnecting}
        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
      >
        {isConnecting ? (
          <>
            <svg
              className="animate-spin w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <span>🌟</span>
            Connect Freighter
          </>
        )}
      </button>
      {error && (
        <p className="text-xs text-red-400 max-w-xs text-right">{error}</p>
      )}
      {/* Show install hint if error mentions not installed */}
      {error && error.toLowerCase().includes("install") && (
        <a
          href="https://freighter.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-purple-400 underline"
        >
          Install Freighter →
        </a>
      )}
    </div>
  );
}
