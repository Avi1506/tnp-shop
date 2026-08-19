"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";

const BULK_PRODUCTS = [
  "Bulk T-Shirts", "Customized Mugs", "Caps & Merchandise", "Return Gifts",
  "Event Giveaways", "Customized Gift Combos", "Employee Welcome Kits",
  "Client Appreciation Gifts", "Festival Hampers", "Branded Diaries & Pens",
  "Logo Merchandise", "Other",
];

export default function BulkEnquiryPage() {
  const [form, setForm] = useState({
    name: "", company: "", phone: "", email: "",
    productRequired: BULK_PRODUCTS[0], quantity: "", budget: "", deliveryDate: "", message: "",
  });
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "bulk-enquiries");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      toast.error(data.error);
      return;
    }
    setFileUrl(data.url);
    toast.success("File attached");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/bulk-enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, fileUrl }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("Something went wrong — please try again.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="container-page max-w-lg py-24 text-center">
        <CheckCircle2 size={40} className="mx-auto text-teal mb-4" />
        <h1 className="text-xl font-semibold text-navy mb-2">Enquiry received!</h1>
        <p className="text-navy/60 text-sm">
          We&apos;ll get back to you shortly with a custom quote. For urgent requests, WhatsApp us directly.
        </p>
        <a
          href="https://wa.me/918923032312"
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 bg-navy text-white font-semibold px-6 py-3 rounded-full hover:bg-navy-dark"
        >
          <MessageCircle size={18} /> WhatsApp Us
        </a>
      </div>
    );
  }

  return (
    <div className="container-page py-10 md:py-14 max-w-2xl">
      <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">
        For Events, Schools &amp; Businesses
      </p>
      <h1 className="text-2xl md:text-3xl font-semibold text-navy mb-3">Bulk &amp; Corporate Gifting</h1>
      <p className="text-navy/60 text-sm mb-8">
        Return gifts, event giveaways, branded merchandise and corporate gifting — tell us what you need and
        we&apos;ll send a custom quote. Bulk pricing depends on quantity, customization, size and packaging.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input required placeholder="Your Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="col-span-2 sm:col-span-1 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold" />
          <input placeholder="Company (optional)" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} className="col-span-2 sm:col-span-1 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold" />
          <input required type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="col-span-2 sm:col-span-1 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold" />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="col-span-2 sm:col-span-1 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold" />

          <select value={form.productRequired} onChange={(e) => setForm((f) => ({ ...f, productRequired: e.target.value }))} className="col-span-2 sm:col-span-1 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold">
            {BULK_PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <input placeholder="Approx. Quantity" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className="col-span-2 sm:col-span-1 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold" />
          <input placeholder="Budget (optional)" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} className="col-span-2 sm:col-span-1 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold" />
          <input placeholder="Needed By (optional)" value={form.deliveryDate} onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value }))} className="col-span-2 sm:col-span-1 text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold" />
        </div>

        <textarea
          placeholder="Tell us more about your requirement..."
          rows={4}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-gold resize-none"
        />

        <div>
          <label className="text-xs font-semibold text-navy/60 uppercase tracking-wide mb-2 block">
            Attach a logo or reference file (optional)
          </label>
          <input type="file" onChange={handleFile} disabled={uploading} className="text-sm" />
          {uploading && <Loader2 size={14} className="animate-spin inline ml-2 text-navy/40" />}
          {fileUrl && <p className="text-xs text-teal mt-1">✓ File attached</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-gold text-navy-dark font-semibold py-3.5 rounded-full hover:brightness-110 transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Get a Custom Quote
        </button>
      </form>
    </div>
  );
}
