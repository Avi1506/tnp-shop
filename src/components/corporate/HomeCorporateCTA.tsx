"use client";

import { useState } from "react";
import { Building2, MessageCircle, ArrowRight } from "lucide-react";
import CorporateQuoteDrawer from "./CorporateQuoteDrawer";
import { trackEvent } from "@/lib/analytics";

export default function HomeCorporateCTA() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const categories = [
    "Return Gifts",
    "Employee Kits",
    "Festival Hampers",
    "Logo Merchandise",
    "Event Giveaways",
    "Gift Combos",
  ];

  return (
    <>
      <section className="container-page pb-16 md:pb-20">
        <div className="bg-navy rounded-3xl px-8 py-12 md:p-16 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-3">
              For Events, Schools &amp; Businesses
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
              Need a bulk order? Talk to us.
            </h2>
            <p className="text-white/70 mb-6">
              Return gifts, event giveaways, branded merchandise and corporate gifting — tailored to your
              event, your team or your brand.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  trackEvent("primary_cta_clicked", { label: "home_corporate_quote_cta" });
                  setDrawerOpen(true);
                }}
                className="bg-gold text-navy-dark font-semibold px-6 py-3 rounded-full hover:brightness-110 transition flex items-center gap-2"
              >
                <Building2 size={16} />
                Get a Custom Quote
              </button>
              <a
                href="https://wa.me/918923032312"
                target="_blank"
                rel="noreferrer"
                className="border border-white/30 text-white font-semibold px-6 py-3 rounded-full hover:bg-white/10 transition flex items-center gap-2"
              >
                <MessageCircle size={18} /> WhatsApp Us
              </a>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {categories.map((t) => (
              <div key={t} className="bg-white/5 border border-white/10 rounded-xl px-3 py-4 text-center">
                <p className="text-white text-xs font-semibold">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CorporateQuoteDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
