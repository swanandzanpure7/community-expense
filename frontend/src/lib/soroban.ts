"use client";

// ─── No stellar-sdk imports in this file ─────────────────────────────────── //
// All XDR construction happens server-side via /api/soroban to avoid
// Node.js-only crypto deps (sodium-native) breaking in the browser bundle.

import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Address,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import {
  Server as SorobanServer,
  Api as SorobanApi,
  assembleTransaction,
} from "@stellar/stellar-sdk/rpc";
import { signStellarTransaction, STELLAR_NETWORKS } from "./freighter";

const CONTRACT_ID = "CAD76KKGZVVDXZVYDH2QCQ5SSLZQGNFZXJYXZXOWTIJWVJVO6ZFBV5X2";
const NETWORK = STELLAR_NETWORKS.TESTNET;
const RPC_URL = NETWORK.rpcUrl;

// ── Serialisable arg types sent to server API ─────────────────────────────── //
type SerializedArg =
  | { type: "address"; value: string }
  | { type: "string"; value: string }
  | { type: "i128"; value: string }
  | { type: "u32"; value: number };

// ── Read contract via server-side API (no stellar-sdk in browser) ─────────── //
async function readContract(method: string, args: SerializedArg[] = []) {
  const res = await fetch("/api/soroban", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "simulate", method, args }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.value;
}

// ── Write contract — uses stellar-sdk only for send (account + sign) ──────── //
// Freighter signs the XDR, so stellar-sdk here is fine (it's just used
// client-side for getAccount / assembleTransaction, not crypto key ops).
async function invokeContract(
  caller: string,
  method: string,
  args: xdr.ScVal[]
): Promise<unknown> {
  const server = new SorobanServer(RPC_URL);
  const contract = new Contract(CONTRACT_ID);

  const account = await server.getAccount(caller);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanApi.isSimulationError(sim)) {
    throw new Error((sim as SorobanApi.SimulateTransactionErrorResponse).error);
  }

  const preparedTx = assembleTransaction(tx, sim).build();
  const { signedXdr, error } = await signStellarTransaction(
    preparedTx.toXDR(),
    Networks.TESTNET
  );
  if (error) throw new Error(error);

  const sendResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
  );
  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction failed: ${JSON.stringify(sendResult.errorResult)}`);
  }

  let getResult = await server.getTransaction(sendResult.hash);
  let attempts = 0;
  while (
    getResult.status === SorobanApi.GetTransactionStatus.NOT_FOUND &&
    attempts < 30
  ) {
    await new Promise((r) => setTimeout(r, 1000));
    getResult = await server.getTransaction(sendResult.hash);
    attempts++;
  }

  if (getResult.status === SorobanApi.GetTransactionStatus.SUCCESS) {
    const s = getResult as SorobanApi.GetSuccessfulTransactionResponse;
    return s.returnValue ? scValToNative(s.returnValue) : null;
  }
  throw new Error(`Transaction ${getResult.status}`);
}

// ─── Exported read functions (all via server API — no browser crypto) ─────── //
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
    new Address(caller).toScVal(),
  ]);
}
export async function leaveGroup(caller: string) {
  return invokeContract(caller, "leave_group", [
    new Address(caller).toScVal(),
  ]);
}
export async function deposit(caller: string, amount: bigint) {
  return invokeContract(caller, "deposit", [
    new Address(caller).toScVal(),
    nativeToScVal(amount, { type: "i128" }),
  ]);
}
export async function createExpense(
  caller: string,
  description: string,
  amount: bigint,
  category: number
) {
  return invokeContract(caller, "create_expense", [
    new Address(caller).toScVal(),
    nativeToScVal(description, { type: "string" }),
    nativeToScVal(amount, { type: "i128" }),
    nativeToScVal(category, { type: "u32" }),
  ]);
}
export async function approveExpense(caller: string, expenseId: number) {
  return invokeContract(caller, "approve_expense", [
    new Address(caller).toScVal(),
    nativeToScVal(expenseId, { type: "u32" }),
  ]);
}
export async function rejectExpense(caller: string, expenseId: number) {
  return invokeContract(caller, "reject_expense", [
    new Address(caller).toScVal(),
    nativeToScVal(expenseId, { type: "u32" }),
  ]);
}
