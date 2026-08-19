"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      const signInRes = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (signInRes?.error) throw new Error("Account created — please log in.");

      toast.success("Welcome to The Novelty Prints!");
      router.push("/account");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container-page max-w-md py-16 md:py-24">
      <h1 className="font-display text-2xl font-semibold text-navy mb-2">Create your account</h1>
      <p className="text-navy/60 text-sm mb-8">Required to check out — lets you track orders and reorder easily.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { key: "name", label: "Full Name", type: "text" },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Mobile Number", type: "tel" },
          { key: "password", label: "Password (min. 8 characters)", type: "password" },
        ].map((f) => (
          <div key={f.key}>
            <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">{f.label}</label>
            <input
              type={f.type}
              required
              minLength={f.key === "password" ? 8 : undefined}
              value={form[f.key as keyof typeof form]}
              onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold text-navy-dark font-semibold py-3 rounded-full hover:brightness-110 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Create Account
        </button>
      </form>

      <p className="text-sm text-navy/60 mt-6 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-gold font-semibold">
          Log in
        </Link>
      </p>
    </div>
  );
}
