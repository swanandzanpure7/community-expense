import { NextRequest, NextResponse } from "next/server";
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

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const CONTRACT_ID = "CASFQD7PXN2EFVQIIDR6BHN5HXHTM3ANIP7GZA5FTGMVPKZITYZGOLQW";
const DUMMY_SOURCE = "GBZQGAKTDD2CC7SAXXPLR457US5XYAQORNIWW7L4YEV5AUTOQLK25YLU";

const server = new SorobanServer(RPC_URL);

// ── Deserialize browser args into XDR ScVal ───────────────────────────────── //
function deserializeArgs(args: Array<{ type: string; value: unknown }>): xdr.ScVal[] {
  return args.map((a) => {
    switch (a.type) {
      case "address": {
        const addrStr = a.value as string;
        if (!addrStr || addrStr.length < 56) {
          throw new Error(`Invalid Stellar address: "${addrStr}"`);
        }
        return new Address(addrStr).toScVal();
      }
      case "string":
        return nativeToScVal(a.value as string, { type: "string" });
      case "i128":
        return nativeToScVal(BigInt(a.value as string), { type: "i128" });
      case "u32":
        return nativeToScVal(Number(a.value), { type: "u32" });
      default:
        return nativeToScVal(a.value);
    }
  });
}

// ── Safely serialise (handles BigInt) ────────────────────────────────────── //
function safeJson(v: unknown): unknown {
  return JSON.parse(JSON.stringify(v, (_k, val) =>
    typeof val === "bigint" ? val.toString() : val
  ));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── 1. SIMULATE (read-only) ───────────────────────────────────────────── //
    if (body.action === "simulate") {
      const { method, args = [] } = body as {
        method: string;
        args: Array<{ type: string; value: unknown }>;
      };

      const contract = new Contract(CONTRACT_ID);
      const account = new Account(DUMMY_SOURCE, "100");

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(method, ...deserializeArgs(args)))
        .setTimeout(30)
        .build();

      const rpcResp = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1,
          method: "simulateTransaction",
          params: { transaction: tx.toXDR() },
        }),
      });

      const rpcData = await rpcResp.json();
      if (rpcData.error) {
        return NextResponse.json(
          { error: rpcData.error.message || JSON.stringify(rpcData.error) },
          { status: 400 }
        );
      }

      const result = rpcData.result;
      if (result?.error) return NextResponse.json({ error: result.error }, { status: 400 });
      if (!result?.results?.length) return NextResponse.json({ value: null });

      const retvalXdr = result.results[0]?.xdr;
      if (!retvalXdr) return NextResponse.json({ value: null });

      const native = scValToNative(xdr.ScVal.fromXDR(retvalXdr, "base64"));
      return NextResponse.json({ value: safeJson(native) });
    }

    // ── 2. PREPARE (write — build + simulate + assemble, return XDR to sign) ─ //
    if (body.action === "prepare") {
      const { caller, method, args = [] } = body as {
        caller: string;
        method: string;
        args: Array<{ type: string; value: unknown }>;
      };

      if (!caller || caller.length < 56) {
        return NextResponse.json({ error: "Invalid caller address" }, { status: 400 });
      }

      const contract = new Contract(CONTRACT_ID);
      const account = await server.getAccount(caller);

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(method, ...deserializeArgs(args)))
        .setTimeout(30)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (SorobanApi.isSimulationError(sim)) {
        return NextResponse.json(
          { error: (sim as SorobanApi.SimulateTransactionErrorResponse).error },
          { status: 400 }
        );
      }

      const assembled = assembleTransaction(tx, sim).build();
      return NextResponse.json({ xdrToSign: assembled.toXDR() });
    }

    // ── 3. SEND (submit signed XDR and wait for confirmation) ────────────── //
    if (body.action === "send") {
      const { signedXdr } = body as { signedXdr: string };

      if (!signedXdr || typeof signedXdr !== "string") {
        return NextResponse.json({ error: "Missing signedXdr" }, { status: 400 });
      }

      const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const sendResult = await server.sendTransaction(tx);

      if (sendResult.status === "ERROR") {
        return NextResponse.json(
          { error: `Transaction failed: ${JSON.stringify(sendResult.errorResult)}` },
          { status: 400 }
        );
      }

      // Poll for result
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
        const value = s.returnValue ? safeJson(scValToNative(s.returnValue)) : null;
        return NextResponse.json({ value });
      }

      return NextResponse.json(
        { error: `Transaction status: ${getResult.status}` },
        { status: 400 }
      );
    }

    // ── 4. RAW JSON-RPC PROXY (fallback) ──────────────────────────────────── //
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

