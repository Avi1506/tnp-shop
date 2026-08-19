"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { formatINR } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";

type Result = {
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  items: { name: string; quantity: number }[];
};

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    const res = await fetch("/api/track-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setResult(data);
  }

  return (
    <div className="container-page py-10 md:py-16 max-w-lg">
      <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">Order Status</p>
      <h1 className="font-display text-3xl font-semibold text-navy mb-8">Track Your Order</h1>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <input
          required
          placeholder="Order Number (e.g. TNP-260814-4821)"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
        />
        <input
          required
          type="email"
          placeholder="Email used at checkout"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-navy text-white font-semibold py-3 rounded-full hover:bg-navy-dark transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Track Order
        </button>
      </form>

      {error && <p className="text-red text-sm mb-6">{error}</p>}

      {result && (
        <div className="bg-white border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-navy">{result.orderNumber}</p>
            <StatusBadge status={result.status} />
          </div>
          <div className="space-y-1.5 text-sm text-navy/70 mb-4">
            {result.items.map((it, i) => (
              <p key={i}>
                {it.name} × {it.quantity}
              </p>
            ))}
          </div>
          <div className="flex justify-between font-semibold text-navy pt-3 border-t border-border">
            <span>Total</span>
            <span>{formatINR(result.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
