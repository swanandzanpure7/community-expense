import type { Metadata } from "next";
import "./globals.css";
import { FreighterProvider } from "@/context/FreighterContext";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Community Expense Manager | Stellar Soroban",
  description: "Decentralized expense sharing on the Stellar blockchain using Soroban smart contracts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white min-h-screen">
        <FreighterProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </FreighterProvider>
      </body>
    </html>
  );
}
