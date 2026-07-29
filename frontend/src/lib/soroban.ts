"use client";

import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";
import { signStellarTransaction, STELLAR_NETWORKS } from "./freighter";

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || "";
const NETWORK = STELLAR_NETWORKS.TESTNET;

// ─── Soroban RPC Client ───────────────────────────────────────────────────── //
function getRpcServer() {
  return new SorobanRpc.Server(NETWORK.rpcUrl, { allowHttp: false });
}

// ─── Build + Sign + Send ──────────────────────────────────────────────────── //
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

  // Simulate first
  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  // Assemble transaction with soroban data
  const preparedTx = SorobanRpc.assembleTransaction(tx, sim).build();
  const txXdr = preparedTx.toXDR();

  // Sign with Freighter
  const { signedXdr, error } = await signStellarTransaction(
    txXdr,
    Networks.TESTNET
  );
  if (error) throw new Error(error);

  // Submit
  const sendResult = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET)
  );

  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction failed: ${sendResult.errorResult}`);
  }

  // Poll for result
  let getResult = await server.getTransaction(sendResult.hash);
  let attempts = 0;
  while (
    getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
    attempts < 30
  ) {
    await new Promise((r) => setTimeout(r, 1000));
    getResult = await server.getTransaction(sendResult.hash);
    attempts++;
  }

  if (getResult.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
    return getResult.returnValue ? scValToNative(getResult.returnValue) : null;
  }

  throw new Error(`Transaction ${getResult.status}`);
}

async function readContract(method: string, args: xdr.ScVal[] = []) {
  const server = getRpcServer();
  const contract = new Contract(CONTRACT_ID);

  // Use a dummy account for read-only calls
  const dummyAccount = {
    accountId: () => "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    sequenceNumber: () => "0",
    incrementSequenceNumber: () => {},
  };

  const tx = new TransactionBuilder(dummyAccount as never, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  const simSuccess = sim as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  if (simSuccess.result?.retval) {
    return scValToNative(simSuccess.result.retval);
  }
  return null;
}

// ─── Contract Functions ───────────────────────────────────────────────────── //
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
  return readContract("is_member", [
    nativeToScVal(new Address(address).toBuffer(), { type: "address" }),
  ]);
}

export async function joinGroup(caller: string) {
  return invokeContract(caller, "join_group", [
    nativeToScVal(new Address(caller).toBuffer(), { type: "address" }),
  ]);
}

export async function leaveGroup(caller: string) {
  return invokeContract(caller, "leave_group", [
    nativeToScVal(new Address(caller).toBuffer(), { type: "address" }),
  ]);
}

export async function deposit(caller: string, amount: bigint) {
  return invokeContract(caller, "deposit", [
    nativeToScVal(new Address(caller).toBuffer(), { type: "address" }),
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
    nativeToScVal(new Address(caller).toBuffer(), { type: "address" }),
    nativeToScVal(description, { type: "string" }),
    nativeToScVal(amount, { type: "i128" }),
    nativeToScVal(category, { type: "u32" }),
  ]);
}

export async function approveExpense(caller: string, expenseId: number) {
  return invokeContract(caller, "approve_expense", [
    nativeToScVal(new Address(caller).toBuffer(), { type: "address" }),
    nativeToScVal(expenseId, { type: "u32" }),
  ]);
}

export async function rejectExpense(caller: string, expenseId: number) {
  return invokeContract(caller, "reject_expense", [
    nativeToScVal(new Address(caller).toBuffer(), { type: "address" }),
    nativeToScVal(expenseId, { type: "u32" }),
  ]);
}
