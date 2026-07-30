import { NextRequest, NextResponse } from "next/server";

const RPC_URL = "https://soroban-testnet.stellar.org";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
