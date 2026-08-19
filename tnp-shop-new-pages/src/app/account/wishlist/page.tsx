"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/product/ProductCard";
import { Loader2, Heart } from "lucide-react";
import type { products } from "@/db/schema";

type Product = typeof products.$inferSelect;

export default function WishlistPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/wishlist")
      .then((r) => r.json())
      .then((d) => setItems(d.products ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">My Wishlist</h1>
      {loading ? (
        <Loader2 className="animate-spin text-navy/40" size={20} />
      ) : items.length === 0 ? (
        <div className="bg-offwhite border border-border rounded-2xl p-10 text-center">
          <Heart size={24} className="mx-auto text-navy/30 mb-3" />
          <p className="text-navy/60 text-sm">Nothing saved yet — tap the heart icon on any product.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
