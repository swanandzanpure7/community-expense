"use client";

// ─── ALL stellar-sdk XDR work happens server-side via /api/soroban ──────── //
// Browser only: calls fetch(), signs with Freighter, sends signed XDR back.

import { signStellarTransaction, STELLAR_NETWORKS } from "./freighter";

const NETWORK = STELLAR_NETWORKS.TESTNET;

// ── Serialisable arg types ────────────────────────────────────────────────── //
type SerializedArg =
  | { type: "address"; value: string }
  | { type: "string"; value: string }
  | { type: "i128"; value: string }
  | { type: "u32"; value: number };

// ── POST helper ───────────────────────────────────────────────────────────── //
async function api(body: Record<string, unknown>) {
  const res = await fetch("/api/soroban", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ── Read: simulate on server, return native value ─────────────────────────── //
async function readContract(method: string, args: SerializedArg[] = []) {
  const data = await api({ action: "simulate", method, args });
  return data.value;
}

// ── Write: prepare on server → sign in browser → send via server ──────────── //
async function invokeContract(
  caller: string,
  method: string,
  args: SerializedArg[]
): Promise<unknown> {
  // 1. Server builds + simulates, returns assembled XDR ready to sign
  const prepared = await api({ action: "prepare", caller, method, args });
  const { xdrToSign } = prepared as { xdrToSign: string };

  // 2. Browser signs with Freighter
  const { signedXdr, error } = await signStellarTransaction(
    xdrToSign,
    NETWORK.passphrase
  );
  if (error || !signedXdr) throw new Error(error || "Signing failed");

  // 3. Server submits signed XDR and waits for confirmation
  const result = await api({ action: "send", signedXdr });
  return result.value ?? null;
}

// ─── Exported read functions ──────────────────────────────────────────────── //
export async function getGroupInfo() {
  return readContract("get_group_info");
}
export async function getMembers() {
  return readContract("get_members");
}
export async function getAllExpenses() {
  return readContract("get_all_expenses");
}
export async function getTreasuryBalance() {
  return readContract("get_treasury_balance");
}
export async function isMember(address: string) {
  return readContract("is_member", [{ type: "address", value: address }]);
}

// ─── Exported write functions (require Freighter wallet) ──────────────────── //
export async function joinGroup(caller: string) {
  return invokeContract(caller, "join_group", [
    { type: "address", value: caller },
  ]);
}
export async function leaveGroup(caller: string) {
  return invokeContract(caller, "leave_group", [
    { type: "address", value: caller },
  ]);
}
export async function deposit(caller: string, amount: bigint) {
  return invokeContract(caller, "deposit", [
    { type: "address", value: caller },
    { type: "i128", value: amount.toString() },
  ]);
}
export async function createExpense(
  caller: string,
  description: string,
  amount: bigint,
  category: number
) {
  return invokeContract(caller, "create_expense", [
    { type: "address", value: caller },
    { type: "string", value: description },
    { type: "i128", value: amount.toString() },
    { type: "u32", value: category },
  ]);
}
export async function approveExpense(caller: string, expenseId: number) {
  return invokeContract(caller, "approve_expense", [
    { type: "address", value: caller },
    { type: "u32", value: expenseId },
  ]);
}
export async function rejectExpense(caller: string, expenseId: number) {
  return invokeContract(caller, "reject_expense", [
    { type: "address", value: caller },
    { type: "u32", value: expenseId },
  ]);
}
