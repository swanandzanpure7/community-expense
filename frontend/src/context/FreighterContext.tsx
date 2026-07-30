"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { STELLAR_NETWORKS } from "@/lib/freighter";

// Dynamic import to avoid SSR issues
async function getFreighterApi() {
  const mod = await import("@stellar/freighter-api");
  return mod;
}

interface FreighterState {
  address: string;
  network: string;
  isConnected: boolean;
  isInstalled: boolean;
  isConnecting: boolean;
  isWrongNetwork: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const FreighterContext = createContext<FreighterState | null>(null);

export function FreighterProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("");
  const [isInstalled, setIsInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConnected = Boolean(address);
  const isWrongNetwork =
    isConnected &&
    network !== STELLAR_NETWORKS.TESTNET.name &&
    network !== "TESTNET" &&
    network !== "Test SDF Network ; September 2015";

  useEffect(() => {
    // Check if already connected on mount
    const init = async () => {
      try {
        const api = await getFreighterApi();
        const connResult = await api.isConnected();
        setIsInstalled(connResult.isConnected);

        if (connResult.isConnected) {
          const addrResult = await api.getAddress();
          const netResult = await api.getNetwork();
          if (addrResult.address) {
            setAddress(addrResult.address);
            setNetwork(netResult.network || "");
          }
        }
      } catch {
        // Freighter not installed — button still shows
      }
    };
    init();
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const api = await getFreighterApi();

      // Check if installed
      const connResult = await api.isConnected();
      if (!connResult.isConnected) {
        setError("Freighter not installed. Please install from https://freighter.app");
        setIsConnecting(false);
        return;
      }

      // Request access
      const accessResult = await api.requestAccess();
      if (accessResult.error) {
        setError(accessResult.error);
        setIsConnecting(false);
        return;
      }

      const [addrResult, netResult] = await Promise.all([
        api.getAddress(),
        api.getNetwork(),
      ]);

      if (addrResult.error) {
        setError(addrResult.error);
      } else {
        setAddress(addrResult.address);
        setNetwork(netResult.network || "");
        setIsInstalled(true);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to connect Freighter");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress("");
    setNetwork("");
    setError(null);
  }, []);

  return (
    <FreighterContext.Provider
      value={{
        address,
        network,
        isConnected,
        isInstalled,
        isConnecting,
        isWrongNetwork,
        error,
        connect,
        disconnect,
      }}
    >
      {children}
    </FreighterContext.Provider>
  );
}

export function useFreighter(): FreighterState {
  const ctx = useContext(FreighterContext);
  if (!ctx) throw new Error("useFreighter must be used inside FreighterProvider");
  return ctx;
}
