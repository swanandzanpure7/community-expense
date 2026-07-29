"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FreighterButton } from "@/components/wallet/FreighterButton";

export function Navbar() {
  const pathname = usePathname();
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/groups", label: "Groups" },
  ];

  return (
    <nav className="sticky top-0 z-30 bg-gray-950/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
          <span className="text-2xl">💸</span>
          <span className="hidden sm:block text-purple-400">ExpenseDAO</span>
          <span className="hidden sm:block text-xs text-gray-500 ml-1">Stellar</span>
        </Link>
        <div className="hidden md:flex gap-1">
          {links.map(({ href, label }) => (
            <Link key={href} href={href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(href)
                  ? "bg-purple-900/30 text-purple-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}>
              {label}
            </Link>
          ))}
        </div>
        <FreighterButton />
      </div>
    </nav>
  );
}
