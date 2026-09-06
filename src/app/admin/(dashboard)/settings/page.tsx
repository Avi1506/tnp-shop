"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface CodSettings {
  enabled: boolean;
  minAmount?: number;
  maxAmount?: number;
  note?: string;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cod, setCod] = useState<CodSettings>({
    enabled: true,
    minAmount: 0,
    maxAmount: 10000,
    note: "Pay cash upon delivery. Please keep exact change ready.",
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.cod) {
            setCod(data.cod);
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cod }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update settings");
      }
      toast.success("Settings saved successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-navy/40" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-navy">Store Settings</h1>
        <p className="text-sm text-navy/60 mt-1">
          Manage checkout options, payment gateways, and store-wide rules.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* COD Configuration Section */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
          <div className="flex items-center justify-between pb-5 border-b border-border">
            <div>
              <h2 className="text-base font-semibold text-navy">Cash on Delivery (COD)</h2>
              <p className="text-xs text-navy/60 mt-0.5">
                Enable or disable Cash on Delivery as a payment option for your customers.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={cod.enabled}
                onChange={(e) => setCod((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
              <span className="ml-3 text-xs font-semibold text-navy uppercase tracking-wider">
                {cod.enabled ? "Enabled" : "Disabled"}
              </span>
            </label>
          </div>

          <div className={`pt-6 space-y-4 transition-opacity ${cod.enabled ? "opacity-100" : "opacity-50"}`}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                  Minimum Order Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cod.minAmount ?? 0}
                  disabled={!cod.enabled}
                  onChange={(e) =>
                    setCod((prev) => ({ ...prev, minAmount: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="0"
                  className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold disabled:bg-offwhite"
                />
                <p className="text-[11px] text-navy/40 mt-1">Orders below this won't qualify for COD.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                  Maximum Order Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cod.maxAmount ?? 10000}
                  disabled={!cod.enabled}
                  onChange={(e) =>
                    setCod((prev) => ({ ...prev, maxAmount: parseFloat(e.target.value) || 0 }))
                  }
                  placeholder="10000"
                  className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold disabled:bg-offwhite"
                />
                <p className="text-[11px] text-navy/40 mt-1">Orders above this must pay online.</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                Customer Note / Instruction
              </label>
              <input
                type="text"
                value={cod.note ?? ""}
                disabled={!cod.enabled}
                onChange={(e) => setCod((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="e.g. Pay cash upon delivery."
                className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold disabled:bg-offwhite"
              />
              <p className="text-[11px] text-navy/40 mt-1">Displayed to customer when choosing COD at checkout.</p>
            </div>
          </div>
        </div>

        {/* Email System Status Section */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
          <h2 className="text-base font-semibold text-navy mb-1">Email System Status</h2>
          <p className="text-xs text-navy/60 mb-4">
            Automated transactional emails for customer registration, order placement, dispatch, and delivery.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-offwhite border border-border/80">
              <CheckCircle2 size={16} className="text-teal shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-navy">Welcome on Registration</p>
                <p className="text-navy/60 text-[11px]">Sent instantly when a customer creates an account</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-offwhite border border-border/80">
              <CheckCircle2 size={16} className="text-teal shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-navy">Order Confirmation</p>
                <p className="text-navy/60 text-[11px]">Sent for both online payments &amp; COD orders</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-offwhite border border-border/80">
              <CheckCircle2 size={16} className="text-teal shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-navy">Order Shipped (with Tracking)</p>
                <p className="text-navy/60 text-[11px]">Sent with tracking number &amp; courier tracking URL</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-offwhite border border-border/80">
              <CheckCircle2 size={16} className="text-teal shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-navy">Order Delivered</p>
                <p className="text-navy/60 text-[11px]">Sent when package is marked delivered</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-gold/10 border border-gold/30 flex items-start gap-2.5 text-xs text-navy">
            <AlertCircle size={16} className="text-gold shrink-0 mt-0.5" />
            <p>
              To deliver live emails to customer inboxes, configure your SMTP password in <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[11px]">.env.local</code>. If left empty, emails are logged in the database table <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[11px]">email_logs</code> without disrupting your store.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-gold text-navy font-semibold px-6 py-3 rounded-full hover:brightness-110 transition flex items-center gap-2 shadow-xs disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
