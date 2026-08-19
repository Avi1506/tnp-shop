"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import { Minus, Plus, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import type { CustomizationConfig } from "@/db/schema";

export default function AddToCartPanel({
  productId,
  slug,
  name,
  image,
  price,
  customizable,
  customization,
}: {
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  customizable: boolean;
  customization: CustomizationConfig | null;
}) {
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState(customization?.fields.sizes?.[0] ?? "");
  const { addLine } = useCart();
  const router = useRouter();

  const needsCanvas = customizable && (customization?.fields.imageUpload || customization?.fields.text);

  function handleQuickAdd() {
    addLine({
      productId,
      slug,
      name,
      image,
      unitPrice: price,
      quantity: qty,
      customization: null,
    });
    toast.success(`${name} added to cart`);
  }

  if (needsCanvas) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-navy/70 flex items-center gap-2">
          <Sparkles size={16} className="text-gold" />
          This product can be personalized with your photo, name or logo.
        </p>
        <button
          onClick={() => router.push(`/products/${slug}/customize`)}
          className="w-full bg-gold text-navy-dark font-semibold py-3.5 rounded-full hover:brightness-110 transition"
        >
          Customize &amp; Buy
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {customization?.fields.sizeChoice && customization.fields.sizes?.length ? (
        <div>
          <p className="text-xs font-semibold text-navy/60 uppercase tracking-wide mb-2">Size</p>
          <div className="flex flex-wrap gap-2">
            {customization.fields.sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`text-sm px-4 py-2 rounded-lg border transition ${
                  size === s ? "bg-navy text-white border-navy" : "border-border text-navy hover:border-navy"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold text-navy/60 uppercase tracking-wide mb-2">Quantity</p>
        <div className="flex items-center gap-3 border border-border rounded-full w-fit px-2 py-1">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2 text-navy hover:text-gold">
            <Minus size={14} />
          </button>
          <span className="w-6 text-center text-sm font-semibold">{qty}</span>
          <button onClick={() => setQty((q) => q + 1)} className="p-2 text-navy hover:text-gold">
            <Plus size={14} />
          </button>
        </div>
      </div>

      <button
        onClick={handleQuickAdd}
        className="w-full bg-navy text-white font-semibold py-3.5 rounded-full hover:bg-navy-dark transition"
      >
        Add to Cart
      </button>
    </div>
  );
}
