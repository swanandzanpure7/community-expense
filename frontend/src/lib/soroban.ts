"use client";

import {
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  Account,
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

// ── Direct JSON-RPC call — bypasses stellar-sdk XDR issues ──────────────── //
async function rpcCall(method: string, params: Record<string, unknown>) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  return json.result;
}

// ── Build simulation tx XDR ───────────────────────────────────────────────── //
function buildSimTx(method: string, args: xdr.ScVal[]): string {
  const contract = new Contract(CONTRACT_ID);
  const account = new Account(
    "GBZQGAKTDD2CC7SAXXPLR457US5XYAQORNIWW7L4YEV5AUTOQLK25YLU",
    "100"
  );
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();
  return tx.toXDR();
}

// ── Read contract (simulation) ────────────────────────────────────────────── //
async function readContract(method: string, args: xdr.ScVal[] = []) {
  try {
    const txXdr = buildSimTx(method, args);
    const result = await rpcCall("simulateTransaction", { transaction: txXdr });

    if (result.error) throw new Error(result.error);
    if (!result.results || result.results.length === 0) return null;

    const retvalXdr = result.results[0]?.xdr;
    if (!retvalXdr) return null;

    const scVal = xdr.ScVal.fromXDR(retvalXdr, "base64");
    return scValToNative(scVal);
  } catch (e) {
    throw new Error(`Contract read failed: ${(e as Error).message}`);
  }
}

// ── Write contract (requires Freighter) ──────────────────────────────────── //
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

// ─── Exported functions ───────────────────────────────────────────────────── //
export async function getGroupInfo() { return readContract("get_group_info"); }
export async function getMembers() { return readContract("get_members"); }
export async function getAllExpenses() { return readContract("get_all_expenses"); }
export async function getTreasuryBalance() { return readContract("get_treasury_balance"); }
export async function isMember(address: string) {
  return readContract("is_member", [new Address(address).toScVal()]);
}
export async function joinGroup(caller: string) {
  return invokeContract(caller, "join_group", [new Address(caller).toScVal()]);
}
export async function leaveGroup(caller: string) {
  return invokeContract(caller, "leave_group", [new Address(caller).toScVal()]);
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
