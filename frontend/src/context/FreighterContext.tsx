"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  connectFreighter,
  checkFreighterInstalled,
  getFreighterAddress,
  getFreighterNetwork,
  STELLAR_NETWORKS,
} from "@/lib/freighter";

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
    network !== "TESTNET";

  // Check if already connected on mount
  useEffect(() => {
    async function init() {
      const installed = await checkFreighterInstalled();
      setIsInstalled(installed);
      if (installed) {
        const addr = await getFreighterAddress();
        const net = await getFreighterNetwork();
        if (addr) {
          setAddress(addr);
          setNetwork(net);
        }
      }
    }
    init();
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    const result = await connectFreighter();
    if (result.error) {
      setError(result.error);
    } else {
      setAddress(result.address);
      setNetwork(result.network);
    }
    setIsConnecting(false);
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
