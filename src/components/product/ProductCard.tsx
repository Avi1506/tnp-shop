import Link from "next/link";
import Image from "next/image";
import { formatINR } from "@/lib/format";
import { Sparkles } from "lucide-react";
import type { products } from "@/db/schema";
import WishlistButton from "./WishlistButton";

type Product = typeof products.$inferSelect;

export default function ProductCard({ product }: { product: Product }) {
  const image = product.images?.[0] || "/images/products/placeholder.png";
  const isPlaceholder = image.endsWith("placeholder.png");

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block rounded-2xl border border-border bg-white overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className={`relative aspect-square ${isPlaceholder ? "placeholder-card" : "bg-offwhite"}`}>
        <Image
          src={image}
          alt={product.name}
          fill
          className="object-contain p-6 group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        {product.isBestseller && (
          <span className="absolute top-3 left-3 bg-gold text-white text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full">
            Bestseller
          </span>
        )}
        <WishlistButton productId={product.id} className="absolute top-3 right-3" />
        {product.customizable && (
          <span className="absolute bottom-3 right-3 bg-white/90 text-navy text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            <Sparkles size={10} /> Customizable
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-navy leading-snug line-clamp-2 mb-1">{product.name}</h3>
        <p className="text-sm">
          <span className="text-red font-bold">
            {product.isQuoteOnly ? "Custom Quote" : `Starting ${formatINR(product.startingPrice)}`}
          </span>
        </p>
      </div>
    </Link>
  );
}
