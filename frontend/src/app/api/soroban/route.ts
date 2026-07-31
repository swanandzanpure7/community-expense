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

const RPC_URL = "https://soroban-testnet.stellar.org";
const CONTRACT_ID = "CAD76KKGZVVDXZVYDH2QCQ5SSLZQGNFZXJYXZXOWTIJWVJVO6ZFBV5X2";
const DUMMY_SOURCE = "GBZQGAKTDD2CC7SAXXPLR457US5XYAQORNIWW7L4YEV5AUTOQLK25YLU";

// Build args from JSON-serializable form
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

// POST /api/soroban
// Body can be:
//   { action: "simulate", method: string, args: SerializedArg[] }  → simulate and return native result
//   { action: "proxy", ...jsonrpc }                                → raw JSON-RPC proxy
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Simulation helper (runs on server — stellar-sdk works here) ── //
    if (body.action === "simulate") {
      const { method, args = [] } = body as {
        method: string;
        args: Array<{ type: string; value: unknown }>;
      };

      const contract = new Contract(CONTRACT_ID);
      const account = new Account(DUMMY_SOURCE, "100");

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call(method, ...deserializeArgs(args)))
        .setTimeout(30)
        .build();

      const txXdr = tx.toXDR();

      const rpcResponse = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "simulateTransaction",
          params: { transaction: txXdr },
        }),
      });

      const rpcData = await rpcResponse.json();

      if (rpcData.error) {
        return NextResponse.json({ error: rpcData.error.message || JSON.stringify(rpcData.error) }, { status: 400 });
      }

      const result = rpcData.result;
      if (result?.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      if (!result?.results || result.results.length === 0) {
        return NextResponse.json({ value: null });
      }

      const retvalXdr = result.results[0]?.xdr;
      if (!retvalXdr) {
        return NextResponse.json({ value: null });
      }

      const scVal = xdr.ScVal.fromXDR(retvalXdr, "base64");
      const native = scValToNative(scVal);

      // BigInt needs special serialisation
      return NextResponse.json({ value: JSON.parse(JSON.stringify(native, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v
      )) });
    }

    // ── Raw JSON-RPC proxy (fallback) ── //
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
