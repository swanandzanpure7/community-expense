"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useFreighter } from "@/context/FreighterContext";
import { FreighterButton } from "@/components/wallet/FreighterButton";

const features = [
  { icon: "🔒", title: "Trustless on Stellar", desc: "Soroban smart contracts enforce all rules — no middlemen." },
  { icon: "💰", title: "Shared Treasury", desc: "Pool XLM in an on-chain treasury controlled by the group." },
  { icon: "✅", title: "Approval Workflows", desc: "Multi-vote expense approvals settle automatically." },
  { icon: "🌟", title: "Freighter Wallet", desc: "Native Stellar wallet integration via Freighter browser extension." },
  { icon: "⚡", title: "Real-time Updates", desc: "Soroban events update the UI instantly." },
  { icon: "📱", title: "Mobile Responsive", desc: "Works on all screen sizes." },
];

export default function LandingPage() {
  const { isConnected } = useFreighter();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 bg-purple-900/20 text-purple-400 text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-purple-800">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
            Live on Stellar Testnet · Soroban Smart Contracts
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight mb-6">
            Shared Expenses,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              On Stellar
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            The trustless way to split expenses with roommates, travel groups, startup teams —
            powered by Soroban smart contracts on the Stellar blockchain.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isConnected ? (
              <Link href="/dashboard"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors">
                Go to Dashboard →
              </Link>
            ) : (
              <div className="scale-110">
                <FreighterButton />
              </div>
            )}
          </div>

          {/* Network badge */}
          <div className="mt-6 inline-flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-400">
            <span>🌐 Stellar Testnet</span>
            <span className="text-gray-700">|</span>
            <span>🦀 Soroban Rust Contracts</span>
            <span className="text-gray-700">|</span>
            <span>🌟 Freighter Wallet</span>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-purple-700 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-base font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Install guide */}
      {!isConnected && (
        <section className="py-12">
          <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-800 rounded-3xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Get Started with Freighter</h2>
            <p className="text-gray-400 mb-6">You need the Freighter browser extension to use this app.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="https://freighter.app" target="_blank" rel="noopener noreferrer"
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                1. Install Freighter →
              </a>
              <FreighterButton />
            </div>
          </div>
        </section>
      )}

      <footer className="py-8 text-center text-sm text-gray-600">
        <p>Community Expense Manager · Stellar Soroban · Open Source</p>
      </footer>
    </div>
  );
}
