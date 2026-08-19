"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="container-page max-w-md py-16 md:py-24">
      <h1 className="font-display text-2xl font-semibold text-navy mb-2">Reset your password</h1>

      {sent ? (
        <div className="mt-6 flex items-start gap-3 bg-offwhite border border-border rounded-xl p-4">
          <CheckCircle2 size={18} className="text-teal shrink-0 mt-0.5" />
          <p className="text-sm text-navy/70">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
          </p>
        </div>
      ) : (
        <>
          <p className="text-navy/60 text-sm mb-8">Enter your email and we&apos;ll send you a reset link.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-white font-semibold py-3 rounded-full hover:bg-navy-dark transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Send Reset Link
            </button>
          </form>
        </>
      )}
    </div>
  );
}
