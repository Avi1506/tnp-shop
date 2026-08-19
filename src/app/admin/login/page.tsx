"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid credentials.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm">
        <p className="font-display text-lg font-semibold text-navy mb-1">The Novelty Prints</p>
        <p className="text-xs text-gold tracking-widest uppercase mb-6">Admin Login</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-white font-semibold py-3 rounded-full hover:bg-navy-dark transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}
