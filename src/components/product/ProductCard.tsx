"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatINR } from "@/lib/format";
import { Sparkles, Wand2 } from "lucide-react";
import type { products } from "@/db/schema";
import WishlistButton from "./WishlistButton";
import { trackEvent } from "@/lib/analytics";

type Product = typeof products.$inferSelect;

const TSHIRT_SWATCHES = [
  { id: "white", label: "White", color: "#FFFFFF", image: "/images/products/tshirt_round_white.png", border: "border-border" },
  { id: "black", label: "Black", color: "#111111", image: "/images/products/tshirt_round_black.png", border: "border-transparent" },
  { id: "navy", label: "Navy", color: "#1B2A4A", image: "/images/products/tshirt_round_navy.jpg", border: "border-transparent" },
];

export default function ProductCard({ product }: { product: Product }) {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedSwatch, setSelectedSwatch] = useState<string>("white");

  const isMagicMug = product.slug.includes("magic-mug") || product.name.toLowerCase().includes("magic mug");
  const isMagicCushion = product.slug.includes("cushion-magic") || product.name.toLowerCase().includes("magic cushion");
  const isTshirt = product.slug.includes("tshirt") || product.slug.includes("t-shirt") || product.name.toLowerCase().includes("t-shirt");

  // Determine current image
  let baseImage = product.images?.[0] || "/images/products/placeholder.png";
  if (isTshirt) {
    const activeSwatch = TSHIRT_SWATCHES.find((s) => s.id === selectedSwatch);
    if (activeSwatch) baseImage = activeSwatch.image;
  }

  const hoverImage = isMagicMug
    ? "/images/products/mug_magic_hot.jpg"
    : isMagicCushion
    ? "/images/products/cushion_magic_revealed.jpg"
    : null;

  const isPlaceholder = baseImage.endsWith("placeholder.png");

  // Print area coordinates
  const printArea = product.customization?.printArea || (isTshirt ? { xPct: 32, yPct: 28, widthPct: 36, heightPct: 44 } : null);

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative rounded-2xl border border-border bg-white overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
      >
        <Link href={`/products/${product.slug}`} className="block">
          <div className={`relative aspect-square ${isPlaceholder ? "placeholder-card" : "bg-offwhite"} overflow-hidden`}>
            {/* Primary Product Image */}
            <Image
              src={baseImage}
              alt={product.name}
              fill
              className={`object-contain p-6 transition-all duration-500 ${
                hoverImage && isHovered ? "opacity-0 scale-105" : "opacity-100 group-hover:scale-105"
              }`}
              sizes="(max-width: 768px) 50vw, 25vw"
            />

            {/* Hover-Flip State Image (for Magic Mug & Magic Cushion) */}
            {hoverImage && (
              <Image
                src={hoverImage}
                alt={`${product.name} Revealed Mockup`}
                fill
                className={`object-contain p-6 transition-all duration-500 absolute inset-0 ${
                  isHovered ? "opacity-100 scale-105" : "opacity-0 scale-95"
                }`}
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            )}

            {/* Micro-interaction badge for Magic products */}
            {(isMagicMug || isMagicCushion) && (
              <span className="absolute bottom-3 left-3 bg-navy-dark/80 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                <Wand2 size={10} className="text-gold" />
                <span>{isHovered ? "Revealed!" : "Hover to Reveal"}</span>
              </span>
            )}

            {/* Chest Print Area dashed bounding box for T-Shirts */}
            {isTshirt && printArea && (
              <div
                className={`absolute pointer-events-none transition-opacity duration-300 flex items-center justify-center p-1 ${
                  isHovered ? "opacity-100" : "opacity-75"
                }`}
                style={{
                  left: `${printArea.xPct}%`,
                  top: `${printArea.yPct}%`,
                  width: `${printArea.widthPct}%`,
                  height: `${printArea.heightPct}%`,
                }}
              >
                <div className="w-full h-full border border-dashed border-[#E65100]/80 rounded flex items-center justify-center bg-[#E65100]/5">
                  <span className="text-[8px] font-bold text-[#E65100] tracking-wider uppercase">Chest Print</span>
                </div>
              </div>
            )}

            {/* Standard customizable item 'YOUR IMAGE HERE' overlay */}
            {!isTshirt && product.customizable && printArea && !hoverImage && (
              <div
                className="absolute pointer-events-none flex items-center justify-center p-2"
                style={{
                  left: `${printArea.xPct}%`,
                  top: `${printArea.yPct}%`,
                  width: `${printArea.widthPct}%`,
                  height: `${printArea.heightPct}%`,
                }}
              >
                <div
                  className={`w-full h-full flex flex-col items-center justify-center border border-dashed border-navy/40 bg-white/70 backdrop-blur-[1px] p-1 text-center shadow-xs ${
                    product.customization?.shape === "circle" ? "rounded-full" : "rounded-md"
                  }`}
                >
                  <span className="text-[9px] font-bold text-navy/80 leading-tight">YOUR IMAGE</span>
                  <span className="text-[8px] font-semibold text-gold leading-tight">HERE</span>
                </div>
              </div>
            )}

            {product.isBestseller && (
              <span className="absolute top-3 left-3 bg-gold text-white text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full shadow-xs">
                Bestseller
              </span>
            )}
            <WishlistButton productId={product.id} className="absolute top-3 right-3" />

            {product.customizable && (
              <span className="absolute bottom-3 right-3 bg-white/95 text-navy text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs border border-border">
                <Sparkles size={10} className="text-gold" /> Personalize
              </span>
            )}
          </div>
        </Link>

        {/* Product Details & Actions */}
        <div className="p-4 flex flex-col justify-between flex-1">
          <div>
            {/* Interactive Color Swatches for T-Shirts */}
            {isTshirt && (
              <div className="flex items-center gap-2 mb-2 pt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-navy/50">Color:</span>
                <div className="flex items-center gap-1.5">
                  {TSHIRT_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.id}
                      type="button"
                      aria-label={`Select ${swatch.label} Color`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedSwatch(swatch.id);
                        trackEvent("swatch_color_selected", { color: swatch.id, product: product.name });
                      }}
                      className={`w-5 h-5 rounded-full border-2 transition swatch-touch ${
                        selectedSwatch === swatch.id
                          ? "border-[#E65100] scale-110 shadow-xs"
                          : `${swatch.border} opacity-80 hover:opacity-100`
                      }`}
                      style={{ backgroundColor: swatch.color }}
                    />
                  ))}
                </div>
              </div>
            )}

            <Link href={`/products/${product.slug}`}>
              <h3 className="text-sm font-semibold text-navy leading-snug line-clamp-2 hover:text-[#E65100] transition-colors mb-1">
                {product.name}
              </h3>
            </Link>

            <p className="text-sm mb-3">
              <span className="text-red font-bold">
                {product.isQuoteOnly ? "Custom Quote" : `Starting ${formatINR(product.startingPrice)}`}
              </span>
            </p>
          </div>

          {/* Quick Customize Action Button (CRO trigger) */}
          {product.customizable && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                trackEvent("primary_cta_clicked", { label: "quick_customize_card_trigger", product: product.name });
                window.location.href = `/products/${product.slug}/customize`;
              }}
              className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl border control-border text-navy bg-white hover:border-[#E65100] hover:text-[#E65100] hover:bg-[#E65100]/5 transition flex items-center justify-center gap-1.5 shadow-2xs touch-target-48"
            >
              <Sparkles size={13} className="text-[#E65100]" />
              <span>Quick Customize</span>
            </button>
          )}
        </div>
      </div>

    </>
  );
}
