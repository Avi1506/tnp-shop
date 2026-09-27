"use client";

import { useState } from "react";
import TieredPricingTable from "@/components/corporate/TieredPricingTable";
import CorporateQuoteDrawer from "@/components/corporate/CorporateQuoteDrawer";

export default function ProductDetailB2B({ basePrice }: { basePrice: number }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div className="mt-10">
        <TieredPricingTable
          basePrice={basePrice}
          onOpenQuoteDrawer={() => setDrawerOpen(true)}
        />
      </div>
      <CorporateQuoteDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
