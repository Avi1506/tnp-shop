"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/account";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="container-page max-w-md py-16 md:py-24">
      <h1 className="font-display text-2xl font-semibold text-navy mb-2">Welcome back</h1>
      <p className="text-navy/60 text-sm mb-8">Log in to check out and track your orders.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
          />
        </div>
        <div>
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">Password</label>
            <Link href="/forgot-password" className="text-xs text-gold font-semibold">
              Forgot?
            </Link>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-navy text-white font-semibold py-3 rounded-full hover:bg-navy-dark transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Log In
        </button>
      </form>

      <p className="text-sm text-navy/60 mt-6 text-center">
        New here?{" "}
        <Link href="/register" className="text-gold font-semibold">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
