"use client";

import { formatINR } from "@/lib/format";
import { Building2, Sparkles, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function TieredPricingTable({
  basePrice,
  onOpenQuoteDrawer,
}: {
  basePrice: number;
  onOpenQuoteDrawer: () => void;
}) {
  const tiers = [
    {
      range: "1 – 24 units",
      discountLabel: "Base Price",
      pricePerUnit: basePrice,
      savings: null,
      badge: null,
    },
    {
      range: "25 – 99 units",
      discountLabel: "15% Off",
      pricePerUnit: Math.round(basePrice * 0.85),
      savings: `Save ${formatINR(basePrice - Math.round(basePrice * 0.85))}/unit`,
      badge: "Popular",
    },
    {
      range: "100 – 499 units",
      discountLabel: "30% Off",
      pricePerUnit: Math.round(basePrice * 0.70),
      savings: `Save ${formatINR(basePrice - Math.round(basePrice * 0.70))}/unit`,
      badge: "Best Value",
    },
    {
      range: "500+ units",
      discountLabel: "Custom Enterprise",
      pricePerUnit: null,
      savings: "Max Wholesale Discount",
      badge: "Enterprise",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-border p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-gold" />
          <h3 className="font-semibold text-navy text-sm">Tiered Bulk &amp; Corporate Pricing</h3>
        </div>
        <span className="text-[11px] font-semibold text-teal bg-teal/10 px-2 py-0.5 rounded-full">
          GST Invoicing Available
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-navy/60 uppercase text-[10px] tracking-wider">
              <th className="py-2 px-2.5">Order Quantity</th>
              <th className="py-2 px-2.5">Discount</th>
              <th className="py-2 px-2.5">Price / Unit</th>
              <th className="py-2 px-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {tiers.map((tier, idx) => (
              <tr key={idx} className="hover:bg-offwhite/80 transition-colors">
                <td className="py-2.5 px-2.5 font-medium text-navy">
                  <div className="flex items-center gap-1.5">
                    <span>{tier.range}</span>
                    {tier.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-gold/15 text-navy-dark border border-gold/30">
                        {tier.badge}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-2.5">
                  <span className="font-semibold text-teal">{tier.discountLabel}</span>
                  {tier.savings && (
                    <span className="text-[10px] text-navy/40 block">{tier.savings}</span>
                  )}
                </td>
                <td className="py-2.5 px-2.5 font-bold text-navy text-sm">
                  {tier.pricePerUnit ? (
                    formatINR(tier.pricePerUnit)
                  ) : (
                    <span className="text-xs text-gold font-semibold">Custom Quote</span>
                  )}
                </td>
                <td className="py-2.5 px-2.5 text-right">
                  {tier.pricePerUnit ? (
                    <span className="text-[11px] text-navy/50">Direct Cart</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        trackEvent("primary_cta_clicked", { label: "enterprise_quote_table_cta" });
                        onOpenQuoteDrawer();
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-navy hover:text-gold transition bg-offwhite hover:bg-gold/10 px-2.5 py-1 rounded-lg border border-border"
                    >
                      <span>Request Quote</span>
                      <ArrowRight size={11} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3.5 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-navy/60 flex items-center gap-1">
          <Sparkles size={12} className="text-gold" />
          <span>Ordering 50+ units? Get free digital sample &amp; volume packaging.</span>
        </p>
        <button
          type="button"
          onClick={() => {
            trackEvent("primary_cta_clicked", { label: "tiered_pricing_bottom_quote_cta" });
            onOpenQuoteDrawer();
          }}
          className="text-xs font-bold text-gold hover:underline flex items-center gap-1"
        >
          <span>Get Corporate Proposal</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
