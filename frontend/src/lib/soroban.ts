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

// ── Read-only simulation ──────────────────────────────────────────────── //
async function readContract(method: string, args: xdr.ScVal[] = []) {
  const server = getRpcServer();
  const contract = new Contract(CONTRACT_ID);

  // Use a valid Stellar testnet account that exists — Stellar Laboratory's test account
  const FUNDED_DUMMY = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

  let account;
  try {
    account = await server.getAccount(FUNDED_DUMMY);
  } catch {
    // If that account is gone, use sequence 0 manually
    account = {
      accountId: () => FUNDED_DUMMY,
      sequenceNumber: () => "100",
      incrementSequenceNumber: () => {},
    };
  }

  const tx = new TransactionBuilder(account as never, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (SorobanApi.isSimulationError(sim)) {
    const errSim = sim as SorobanApi.SimulateTransactionErrorResponse;
    throw new Error(errSim.error);
  }

  const simSuccess = sim as SorobanApi.SimulateTransactionSuccessResponse;
  if (simSuccess.result?.retval) {
    return scValToNative(simSuccess.result.retval);
  }
  return null;
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
