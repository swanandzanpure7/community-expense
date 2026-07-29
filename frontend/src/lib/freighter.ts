"use client";

import {
  isConnected,
  isAllowed,
  getAddress,
  getNetwork,
  setAllowed,
  signTransaction,
  requestAccess,
} from "@stellar/freighter-api";

// ─── Freighter Helpers ────────────────────────────────────────────────────── //

export async function checkFreighterInstalled(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}

export async function checkFreighterAllowed(): Promise<boolean> {
  try {
    const result = await isAllowed();
    return result.isAllowed;
  } catch {
    return false;
  }
}

export async function connectFreighter(): Promise<{
  address: string;
  network: string;
  error?: string;
}> {
  try {
    const installed = await checkFreighterInstalled();
    if (!installed) {
      return {
        address: "",
        network: "",
        error: "Freighter wallet not installed. Please install it from https://freighter.app",
      };
    }

    // Request access
    const accessResult = await requestAccess();
    if (accessResult.error) {
      return { address: "", network: "", error: accessResult.error };
    }

    // Get address and network
    const [addressResult, networkResult] = await Promise.all([
      getAddress(),
      getNetwork(),
    ]);

    if (addressResult.error) {
      return { address: "", network: "", error: addressResult.error };
    }

    return {
      address: addressResult.address,
      network: networkResult.network || "TESTNET",
    };
  } catch (err) {
    return {
      address: "",
      network: "",
      error: (err as Error).message || "Failed to connect Freighter",
    };
  }
}

export async function getFreighterAddress(): Promise<string> {
  try {
    const result = await getAddress();
    return result.address || "";
  } catch {
    return "";
  }
}

export async function getFreighterNetwork(): Promise<string> {
  try {
    const result = await getNetwork();
    return result.network || "";
  } catch {
    return "";
  }
}

export async function signStellarTransaction(
  xdr: string,
  networkPassphrase: string
): Promise<{ signedXdr: string; error?: string }> {
  try {
    const result = await signTransaction(xdr, {
      networkPassphrase,
    });
    if (result.error) {
      return { signedXdr: "", error: result.error };
    }
    return { signedXdr: result.signedTxXdr };
  } catch (err) {
    return {
      signedXdr: "",
      error: (err as Error).message || "Failed to sign transaction",
    };
  }
}

export const STELLAR_NETWORKS = {
  TESTNET: {
    name: "TESTNET",
    passphrase: "Test SDF Network ; September 2015",
    rpcUrl: "https://soroban-testnet.stellar.org",
    horizonUrl: "https://horizon-testnet.stellar.org",
  },
  MAINNET: {
    name: "PUBLIC",
    passphrase: "Public Global Stellar Network ; September 2015",
    rpcUrl: "https://soroban-mainnet.stellar.org",
    horizonUrl: "https://horizon.stellar.org",
  },
};
