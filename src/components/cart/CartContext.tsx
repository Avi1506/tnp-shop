"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

export type CartCustomization = {
  uploadedImages: string[];
  text: string | null;
  font: string | null;
  textColor: string | null;
  productColor: string | null;
  size: string | null;
  specialInstructions: string | null;
  previewImage: string | null;
  approved: boolean;
} | null;

export type CartLine = {
  lineId: string; // unique per cart line (customized items are never merged)
  productId: string;
  slug: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  customization: CartCustomization;
};

type CartContextValue = {
  lines: CartLine[];
  addLine: (line: Omit<CartLine, "lineId">) => void;
  removeLine: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
  subtotal: number;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "tnp_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const addLine = useCallback((line: Omit<CartLine, "lineId">) => {
    setLines((prev) => {
      // Non-customized items with the same product can stack quantity.
      if (!line.customization) {
        const existing = prev.find((l) => l.productId === line.productId && !l.customization);
        if (existing) {
          return prev.map((l) =>
            l.lineId === existing.lineId ? { ...l, quantity: l.quantity + line.quantity } : l
          );
        }
      }
      return [...prev, { ...line, lineId: crypto.randomUUID() }];
    });
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((l) => l.lineId !== lineId));
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    setLines((prev) =>
      prev.map((l) => (l.lineId === lineId ? { ...l, quantity: Math.max(1, quantity) } : l))
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [lines]
  );
  const count = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);

  return (
    <CartContext.Provider value={{ lines, addLine, removeLine, updateQuantity, clear, subtotal, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
