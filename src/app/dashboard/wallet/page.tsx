// app/wallet/page.tsx
"use client";
import Link from "next/link";
export default function Wallet() {
  return (
    <div className="p-8">
      <h1 className="text-2xl">Wallet</h1>
      <p className="mt-4">This is your wallet page. Add withdraw / deposit flows here.</p>
      <Link href="/dashboard" className="text-blue-400 mt-4 block">Back to Dashboard</Link>
    </div>
  );
}
