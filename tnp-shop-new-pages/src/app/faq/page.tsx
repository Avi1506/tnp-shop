"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "How does customization work?",
    a: "Choose a product, upload your photo and/or add text using our live customizer, and review the preview. Once you approve it, add it to your cart and check out.",
  },
  {
    q: "How do I pay?",
    a: "All orders are prepaid — we accept online payments via Razorpay (cards, UPI, netbanking, wallets). Cash on Delivery is not available for customized products.",
  },
  {
    q: "How long does delivery take?",
    a: "Production time depends on the product and customization, typically followed by Pan India shipping. You'll get updates at each stage — production, quality check, packed, and shipped.",
  },
  {
    q: "Can I change my design after ordering?",
    a: "Design changes are only possible before you approve your customization at checkout. Once approved and paid, production begins and changes may not be possible — message us on WhatsApp right away if something's wrong.",
  },
  {
    q: "Do you deliver Pan India?",
    a: "Yes, we deliver across India.",
  },
  {
    q: "Can I place a bulk or corporate order?",
    a: "Absolutely — visit our Bulk & Corporate Gifting page to share your requirement and get a custom quote.",
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="container-page py-10 md:py-16 max-w-2xl">
      <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">Help</p>
      <h1 className="font-display text-3xl font-semibold text-navy mb-10">Frequently Asked Questions</h1>

      <div className="space-y-3">
        {FAQS.map((f, i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <span className="font-medium text-navy text-sm">{f.q}</span>
              <ChevronDown size={16} className={`text-navy/50 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && <p className="px-5 pb-4 text-sm text-navy/70 leading-relaxed">{f.a}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
