"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/CartContext";
import { formatINR } from "@/lib/format";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const { lines, removeLine, updateQuantity, subtotal } = useCart();

  if (lines.length === 0) {
    return (
      <div className="container-page py-24 text-center">
        <ShoppingBag size={40} className="mx-auto text-navy/30 mb-4" />
        <h1 className="text-xl font-semibold text-navy mb-2">Your cart is empty</h1>
        <p className="text-navy/60 mb-6 text-sm">Add a personalized gift to get started.</p>
        <Link href="/shop" className="bg-navy text-white font-semibold px-6 py-3 rounded-full hover:bg-navy-dark transition">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="text-2xl md:text-3xl font-semibold text-navy mb-8">Your Cart</h1>
      <div className="grid md:grid-cols-[1fr_340px] gap-10">
        <div className="space-y-4">
          {lines.map((line) => (
            <div key={line.lineId} className="flex gap-4 border border-border rounded-2xl p-4">
              <div className="relative h-24 w-24 shrink-0 rounded-xl bg-offwhite overflow-hidden">
                <Image src={line.image} alt={line.name} fill className="object-contain p-2" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy text-sm mb-1">{line.name}</p>
                {line.customization && (
                  <div className="text-xs text-navy/60 space-y-0.5 mb-2">
                    {line.customization.text && <p>Text: “{line.customization.text}”</p>}
                    {line.customization.size && <p>Size: {line.customization.size}</p>}
                    {line.customization.uploadedImages.length > 0 && (
                      <p>{line.customization.uploadedImages.length} photo(s) uploaded</p>
                    )}
                  </div>
                )}
                <p className="text-red font-bold text-sm mb-3">{formatINR(line.unitPrice)}</p>
                <div className="flex items-center justify-between">
                  {line.customization ? (
                    <span className="text-xs text-navy/40 italic">Customized item</span>
                  ) : (
                    <div className="flex items-center gap-2 border border-border rounded-full px-1.5 py-1">
                      <button
                        onClick={() => updateQuantity(line.lineId, line.quantity - 1)}
                        className="p-1.5 text-navy hover:text-gold"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-5 text-center text-xs font-semibold">{line.quantity}</span>
                      <button
                        onClick={() => updateQuantity(line.lineId, line.quantity + 1)}
                        className="p-1.5 text-navy hover:text-gold"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => removeLine(line.lineId)}
                    className="text-navy/40 hover:text-red transition"
                    aria-label="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border border-border rounded-2xl p-6 h-fit sticky top-24">
          <h2 className="font-semibold text-navy mb-4">Order Summary</h2>
          <div className="flex justify-between text-sm text-navy/70 mb-2">
            <span>Subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          <p className="text-xs text-navy/50 mb-4">Shipping calculated at checkout.</p>
          <div className="border-t border-border pt-4 flex justify-between font-semibold text-navy mb-6">
            <span>Total</span>
            <span>{formatINR(subtotal)}</span>
          </div>
          <Link
            href="/checkout"
            className="block text-center bg-gold text-navy-dark font-semibold py-3.5 rounded-full hover:brightness-110 transition"
          >
            Proceed to Checkout
          </Link>
          <p className="text-[11px] text-navy/40 text-center mt-3">
            Prepaid orders only — COD is not available for customized products.
          </p>
        </div>
      </div>
    </div>
  );
}
