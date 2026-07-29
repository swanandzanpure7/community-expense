"use client";
import React from "react";
import Link from "next/link";
export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center text-center px-4">
      <div>
        <div className="text-8xl mb-4">🌌</div>
        <h1 className="text-5xl font-bold text-white mb-2">404</h1>
        <p className="text-gray-400 mb-6">This page doesn&apos;t exist on-chain or off-chain.</p>
        <Link href="/" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
