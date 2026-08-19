"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
      toast.success("Password updated! You can log in now.");
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="container-page max-w-md py-16 md:py-24">
        <p className="text-navy/70">
          Missing reset token. Please use the link from your email, or{" "}
          <Link href="/forgot-password" className="text-gold font-semibold">
            request a new one
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="container-page max-w-md py-16 md:py-24">
      <h1 className="font-display text-2xl font-semibold text-navy mb-6">Choose a new password</h1>
      {done ? (
        <p className="text-teal font-medium">Password updated — redirecting to login…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min. 8 characters)"
            className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-navy-dark font-semibold py-3 rounded-full hover:brightness-110 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Update Password
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
