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
  Keypair,
} from "@stellar/stellar-sdk";
import {
  Server as SorobanServer,
  Api as SorobanApi,
  assembleTransaction,
} from "@stellar/stellar-sdk/rpc";
import { signStellarTransaction, STELLAR_NETWORKS } from "./freighter";

const CONTRACT_ID = "CAD76KKGZVVDXZVYDH2QCQ5SSLZQGNFZXJYXZXOWTIJWVJVO6ZFBV5X2";
const NETWORK = STELLAR_NETWORKS.TESTNET;

function getRpcServer() {
  // Use our Next.js API proxy to avoid CORS issues in production
  const rpcUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/soroban`
    : NETWORK.rpcUrl;
  return new SorobanServer(rpcUrl);
}

// ── Read-only simulation (no signing required) ─────────────────────────── //
async function readContract(method: string, args: xdr.ScVal[] = []) {
  const server = getRpcServer();
  const contract = new Contract(CONTRACT_ID);

  // Generate a random keypair just for simulation — no funding needed
  const simKeypair = Keypair.random();

  const tx = new TransactionBuilder(
    {
      accountId: () => simKeypair.publicKey(),
      sequenceNumber: () => "0",
      incrementSequenceNumber: () => {},
    } as never,
    {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    }
  )
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  try {
    const sim = await server.simulateTransaction(tx);

    if (SorobanApi.isSimulationError(sim)) {
      const errSim = sim as SorobanApi.SimulateTransactionErrorResponse;
      throw new Error(`Contract call failed: ${errSim.error}`);
    }

    const simSuccess = sim as SorobanApi.SimulateTransactionSuccessResponse;
    if (simSuccess.result?.retval) {
      return scValToNative(simSuccess.result.retval);
    }
    return null;
  } catch (e) {
    const msg = (e as Error).message || String(e);
    // Ignore "account not found" — simulation still works
    if (msg.includes("account") && msg.includes("not found")) {
      // Retry with the raw error ignored
      const sim2 = await server.simulateTransaction(tx);
      const s2 = sim2 as SorobanApi.SimulateTransactionSuccessResponse;
      if (s2.result?.retval) return scValToNative(s2.result.retval);
      return null;
    }
    throw e;
  }
}

// ── Write (requires Freighter signing) ────────────────────────────────── //
async function invokeContract(
  caller: string,
  method: string,
  args: xdr.ScVal[]
): Promise<unknown> {
  const server = getRpcServer();
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
    throw new Error(`Simulation failed: ${(sim as SorobanApi.SimulateTransactionErrorResponse).error}`);
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

// ─── Exports ──────────────────────────────────────────────────────────── //
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
