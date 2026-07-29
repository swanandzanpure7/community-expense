"use client";

import React from "react";
import Link from "next/link";

export default function CreateGroupPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Link href="/groups" className="text-sm text-purple-400 hover:underline mb-4 inline-block">
        ← Back to Groups
      </Link>
      <h1 className="text-2xl font-bold text-white mb-2">Initialize Group Contract</h1>
      <p className="text-gray-400 text-sm mb-6">
        The Soroban contract is deployed once via the CLI. Use the instructions below.
      </p>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-4 text-sm text-yellow-400">
          ⚠ Contract deployment requires the Stellar CLI. Run these commands in your terminal.
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-gray-400 mb-1">1. Configure testnet identity</p>
            <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-purple-300 text-xs overflow-x-auto">
{`stellar keys generate --global alice --network testnet
stellar keys fund alice --network testnet`}
            </pre>
          </div>

          <div>
            <p className="text-gray-400 mb-1">2. Build contract</p>
            <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-purple-300 text-xs overflow-x-auto">
{`stellar contract build`}
            </pre>
          </div>

          <div>
            <p className="text-gray-400 mb-1">3. Deploy to testnet</p>
            <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-purple-300 text-xs overflow-x-auto">
{`stellar contract deploy \\
  --wasm target/wasm32-unknown-unknown/release/expense_group.wasm \\
  --source alice \\
  --network testnet`}
            </pre>
          </div>

          <div>
            <p className="text-gray-400 mb-1">4. Initialize the contract</p>
            <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-purple-300 text-xs overflow-x-auto">
{`stellar contract invoke \\
  --id <CONTRACT_ID> \\
  --source alice \\
  --network testnet \\
  -- initialize \\
  --admin <YOUR_ADDRESS> \\
  --name "My Group" \\
  --description "Shared expenses" \\
  --approval_threshold 51`}
            </pre>
          </div>

          <div>
            <p className="text-gray-400 mb-1">5. Add to frontend .env.local</p>
            <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-purple-300 text-xs overflow-x-auto">
{`NEXT_PUBLIC_CONTRACT_ID=C...your_contract_id...`}
            </pre>
          </div>
        </div>

        <p className="text-xs text-gray-500 pt-2">
          See the full deployment guide in{" "}
          <code className="text-purple-400">docs/DEPLOYMENT.md</code>
        </p>
      </div>
    </div>
  );
}
