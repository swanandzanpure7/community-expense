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

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
const NETWORK = STELLAR_NETWORKS.TESTNET;

function getRpcServer() {
  return new SorobanServer(NETWORK.rpcUrl);
}

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
    const success = getResult as SorobanApi.GetSuccessfulTransactionResponse;
    return success.returnValue ? scValToNative(success.returnValue) : null;
  }
  throw new Error(`Transaction ${getResult.status}`);
}

async function readContract(method: string, args: xdr.ScVal[] = []) {
  const server = getRpcServer();
  const contract = new Contract(CONTRACT_ID);

  // Use a fixed dummy account for read-only simulation
  const dummyKey = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";
  let account;
  try {
    account = await server.getAccount(dummyKey);
  } catch {
    // If dummy account doesn't exist on testnet, create minimal object
    account = { accountId: () => dummyKey, sequenceNumber: () => "0", incrementSequenceNumber: () => {} };
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
    throw new Error(`Read failed: ${(sim as SorobanApi.SimulateTransactionErrorResponse).error}`);
  }

  const simSuccess = sim as SorobanApi.SimulateTransactionSuccessResponse;
  if (simSuccess.result?.retval) {
    return scValToNative(simSuccess.result.retval);
  }
  return null;
}

// ─── Exported Contract Functions ─────────────────────────────────────────── //
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
