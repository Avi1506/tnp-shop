"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, AlertCircle, Mail, Code, Server, Key, Send } from "lucide-react";
import toast from "react-hot-toast";

interface CodSettings {
  enabled: boolean;
  minAmount?: number;
  maxAmount?: number;
  note?: string;
}

interface EmailTemplateItem {
  subject: string;
  body: string;
}

interface EmailTemplates {
  welcome: EmailTemplateItem;
  orderConfirmed: EmailTemplateItem;
  orderShipped: EmailTemplateItem;
  orderDelivered: EmailTemplateItem;
  adminAlert: EmailTemplateItem;
}

interface EmailSettings {
  emailFrom: string;
  adminEmail: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
}

const TEMPLATE_KEYS: { key: keyof EmailTemplates; name: string; description: string; tags: string[] }[] = [
  {
    key: "welcome",
    name: "Welcome Email",
    description: "Sent to customers when they register a new account",
    tags: ["{customerName}", "{email}"],
  },
  {
    key: "orderConfirmed",
    name: "Order Confirmation",
    description: "Sent after a customer places an order (Online or COD)",
    tags: ["{customerName}", "{orderNumber}", "{total}"],
  },
  {
    key: "orderShipped",
    name: "Order Shipped",
    description: "Sent when order is dispatched with courier tracking info",
    tags: ["{customerName}", "{orderNumber}", "{trackingId}", "{trackingUrl}"],
  },
  {
    key: "orderDelivered",
    name: "Order Delivered",
    description: "Sent when package status is marked as Delivered",
    tags: ["{customerName}", "{orderNumber}"],
  },
  {
    key: "adminAlert",
    name: "Admin New Order Alert",
    description: "Sent to admin when a new order is received",
    tags: ["{orderNumber}", "{customerName}", "{customerEmail}", "{total}"],
  },
];

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof EmailTemplates>("welcome");

  const [cod, setCod] = useState<CodSettings>({
    enabled: true,
    minAmount: 0,
    maxAmount: 10000,
    note: "Pay cash upon delivery. Please keep exact change ready.",
  });

  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    emailFrom: "The Novelty Prints <thenoveltyprints@gmail.com>",
    adminEmail: "thenoveltyprints@gmail.com",
    smtpHost: "",
    smtpPort: 465,
    smtpUser: "",
    smtpPassword: "",
  });

  const [emailTemplates, setEmailTemplates] = useState<EmailTemplates>({
    welcome: {
      subject: "Welcome to The Novelty Prints!",
      body: `<p style="color:#3A3A3A;font-size:14px;">Hi {customerName},</p>\n<p style="color:#3A3A3A;font-size:14px;line-height:1.6;">\n  Welcome to <strong>The Novelty Prints</strong>! Your account has been created successfully.\n</p>`,
    },
    orderConfirmed: {
      subject: "Your order {orderNumber} has been confirmed!",
      body: `<p style="color:#3A3A3A;font-size:14px;">Hi {customerName}, thank you for your order!</p>\n<p style="color:#3A3A3A;font-size:14px;">We have received your order <strong>{orderNumber}</strong> for total <strong>{total}</strong>.</p>`,
    },
    orderShipped: {
      subject: "Your order {orderNumber} has been shipped! 🚀",
      body: `<p style="color:#3A3A3A;font-size:14px;">Hi {customerName},</p>\n<p style="color:#3A3A3A;font-size:14px;line-height:1.6;">\n  Great news! Your customized order <strong>{orderNumber}</strong> has been carefully packed and handed over to our courier partner.\n</p>`,
    },
    orderDelivered: {
      subject: "Your order {orderNumber} has been delivered! 🎉",
      body: `<p style="color:#3A3A3A;font-size:14px;">Hi {customerName},</p>\n<p style="color:#3A3A3A;font-size:14px;line-height:1.6;">\n  Your order <strong>{orderNumber}</strong> has been marked as <strong>Delivered</strong>! We hope you love your customized prints.\n</p>`,
    },
    adminAlert: {
      subject: "New Customized Order Received — {orderNumber}",
      body: `<p style="color:#3A3A3A;font-size:14px;">A new order <strong>{orderNumber}</strong> for <strong>{total}</strong> has been placed by {customerName} ({customerEmail}).</p>`,
    },
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.cod) setCod(data.cod);
          if (data.emailTemplates) setEmailTemplates(data.emailTemplates);
          if (data.emailSettings) setEmailSettings((prev) => ({ ...prev, ...data.emailSettings }));
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
        body: JSON.stringify({ cod, emailTemplates, emailSettings }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update settings");
      }
      toast.success("All Settings & Email Configurations saved!");
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
    <div className="max-w-4xl pb-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-navy">Store Settings &amp; Email Configurations</h1>
        <p className="text-sm text-navy/60 mt-1">
          Manage COD payment rules, email sender addresses, SMTP server credentials, and templates.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* COD Configuration Section */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs">
          <div className="flex items-center justify-between pb-5 border-b border-border">
            <div>
              <h2 className="text-base font-semibold text-navy">Cash on Delivery (COD)</h2>
              <p className="text-xs text-navy/60 mt-0.5">
                Enable or disable Cash on Delivery globally. (You can also toggle COD per product in Product Edit).
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

        {/* Email Addresses & SMTP Credentials Section */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <Server className="text-gold shrink-0" size={20} />
            <div>
              <h2 className="text-base font-semibold text-navy">Email Sender &amp; SMTP Server Credentials</h2>
              <p className="text-xs text-navy/60 mt-0.5">
                Configure your Sender (From) Email, Admin Alert Email, and SMTP credentials for delivering live emails.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                Sender Email ("From" Address shown to customers)
              </label>
              <input
                type="text"
                value={emailSettings.emailFrom}
                onChange={(e) => setEmailSettings((prev) => ({ ...prev, emailFrom: e.target.value }))}
                placeholder="The Novelty Prints <thenoveltyprints@gmail.com>"
                className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
              />
              <p className="text-[11px] text-navy/40 mt-1">
                Name &amp; address customer sees in their inbox header.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                Admin Notification Email (Recipient)
              </label>
              <input
                type="email"
                value={emailSettings.adminEmail}
                onChange={(e) => setEmailSettings((prev) => ({ ...prev, adminEmail: e.target.value }))}
                placeholder="thenoveltyprints@gmail.com"
                className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
              />
              <p className="text-[11px] text-navy/40 mt-1">
                Where admin receives new order alerts &amp; inquiries.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60">
            <h3 className="text-xs font-semibold text-navy uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Key size={14} className="text-gold" /> SMTP Dispatch Credentials
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                  SMTP Host Server
                </label>
                <input
                  type="text"
                  value={emailSettings.smtpHost ?? ""}
                  onChange={(e) => setEmailSettings((prev) => ({ ...prev, smtpHost: e.target.value }))}
                  placeholder="e.g. smtp.gmail.com or smtp.resend.com"
                  className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={emailSettings.smtpPort ?? 465}
                  onChange={(e) => setEmailSettings((prev) => ({ ...prev, smtpPort: parseInt(e.target.value) || 465 }))}
                  placeholder="465"
                  className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                  SMTP Username / Email
                </label>
                <input
                  type="text"
                  value={emailSettings.smtpUser ?? ""}
                  onChange={(e) => setEmailSettings((prev) => ({ ...prev, smtpUser: e.target.value }))}
                  placeholder="e.g. thenoveltyprints@gmail.com or resend"
                  className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                  SMTP Password / API Key
                </label>
                <input
                  type="password"
                  value={emailSettings.smtpPassword ?? ""}
                  onChange={(e) => setEmailSettings((prev) => ({ ...prev, smtpPassword: e.target.value }))}
                  placeholder="Gmail 16-digit App Password or Resend API Key"
                  className="w-full mt-1.5 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold font-mono"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gold/10 border border-gold/30 flex items-start gap-2.5 text-xs text-navy">
            <AlertCircle size={16} className="text-gold shrink-0 mt-0.5" />
            <p>
              <strong>Tip</strong>: For <strong>Gmail</strong>, use Host: <code className="bg-white/80 px-1 py-0.5 rounded font-mono">smtp.gmail.com</code>, Port: <code className="bg-white/80 px-1 py-0.5 rounded font-mono">465</code>, and generate a 16-letter App Password at <em>myaccount.google.com/security</em>.
            </p>
          </div>
        </div>

        {/* Email Template Editor Section */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <Mail className="text-gold shrink-0" size={20} />
            <div>
              <h2 className="text-base font-semibold text-navy">Email Template Editor</h2>
              <p className="text-xs text-navy/60 mt-0.5">
                Customize subjects and body messages for transactional customer emails.
              </p>
            </div>
          </div>

          {/* Template Tabs */}
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_KEYS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  activeTab === t.key
                    ? "bg-navy text-gold shadow-xs"
                    : "bg-offwhite text-navy/70 hover:bg-border/60"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* Active Template Editor */}
          {(() => {
            const currentTplConfig = TEMPLATE_KEYS.find((t) => t.key === activeTab)!;
            const currentTplData = emailTemplates[activeTab];

            return (
              <div className="bg-offwhite/50 border border-border rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-navy text-sm">{currentTplConfig.name}</h3>
                  <p className="text-xs text-navy/60 mt-0.5">{currentTplConfig.description}</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                    Email Subject Line
                  </label>
                  <input
                    type="text"
                    value={currentTplData.subject}
                    onChange={(e) =>
                      setEmailTemplates((prev) => ({
                        ...prev,
                        [activeTab]: { ...prev[activeTab], subject: e.target.value },
                      }))
                    }
                    className="w-full mt-1.5 text-sm bg-white border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide">
                      Email Body Content (HTML / Text)
                    </label>
                    <span className="text-[11px] text-navy/40 flex items-center gap-1">
                      <Code size={12} /> HTML tags supported
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={currentTplData.body}
                    onChange={(e) =>
                      setEmailTemplates((prev) => ({
                        ...prev,
                        [activeTab]: { ...prev[activeTab], body: e.target.value },
                      }))
                    }
                    className="w-full text-sm font-mono bg-white border border-border rounded-lg p-3 outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-navy/60 uppercase tracking-wide block mb-1">
                    Available Dynamic Tags (Click to insert):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentTplConfig.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setEmailTemplates((prev) => ({
                            ...prev,
                            [activeTab]: {
                              ...prev[activeTab],
                              body: prev[activeTab].body + " " + tag,
                            },
                          }))
                        }
                        className="bg-white border border-border px-2.5 py-1 rounded-md text-xs font-mono text-gold hover:border-gold transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-gold text-navy font-semibold px-6 py-3 rounded-full hover:brightness-110 transition flex items-center gap-2 shadow-xs disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save All Configurations
          </button>
        </div>
      </form>
    </div>
  );
}
