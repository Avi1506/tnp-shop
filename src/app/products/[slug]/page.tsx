import { getProductBySlug, getProducts } from "@/lib/catalog";
import { formatINR } from "@/lib/format";
import Image from "next/image";
import { notFound } from "next/navigation";
import AddToCartPanel from "@/components/product/AddToCartPanel";
import ProductCard from "@/components/product/ProductCard";
import { CheckCircle2, Truck, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

// Rule 4: ISR — Static Caching
// Individual product pages are pre-rendered and served from Vercel's CDN edge.
// Refreshes every 30 minutes — fast page loads for all visitors with minimal DB queries.
export const revalidate = 1800; // Rebuild at most every 30 minutes

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.shortDescription ?? undefined,
    openGraph: { images: product.images?.[0] ? [product.images[0]] : [] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive) notFound();

  const related = await getProducts({ categorySlug: undefined, limit: 4 });
  const image = product.images?.[0] || "/images/products/placeholder.png";
  const isPlaceholder = image.endsWith("placeholder.png");

  return (
    <div className="container-page py-10 md:py-14">
      <div className="grid md:grid-cols-2 gap-12">
        <div className={`relative aspect-square rounded-2xl overflow-hidden ${isPlaceholder ? "placeholder-card" : "bg-offwhite"}`}>
          <Image src={image} alt={product.name} fill className="object-contain p-8 md:p-10" priority />
          {product.customizable && product.customization?.printArea && (
            <div
              className="absolute pointer-events-none flex items-center justify-center p-3"
              style={{
                left: `${product.customization.printArea.xPct}%`,
                top: `${product.customization.printArea.yPct}%`,
                width: `${product.customization.printArea.widthPct}%`,
                height: `${product.customization.printArea.heightPct}%`,
              }}
            >
              <div
                className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gold/60 bg-white/75 backdrop-blur-[2px] p-2 text-center shadow-xs ${
                  product.customization.shape === "circle" ? "rounded-full" : "rounded-xl"
                }`}
              >
                <span className="text-xs sm:text-sm font-bold text-navy tracking-wide">YOUR IMAGE</span>
                <span className="text-[10px] sm:text-xs font-semibold text-gold">HERE</span>
                <span className="text-[9px] text-navy/50 mt-0.5">Click to Personalize</span>
              </div>
            </div>
          )}
        </div>

        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-navy mb-3">{product.name}</h1>
          <p className="text-2xl font-bold text-red mb-5">
            {product.isQuoteOnly ? "Custom Quote" : `Starting ${formatINR(product.startingPrice)}`}
          </p>
          <p className="text-navy/70 text-sm leading-relaxed mb-6">{product.shortDescription}</p>

          <div className="border-t border-b border-border py-6 mb-6">
            <AddToCartPanel
              productId={product.id}
              slug={product.slug}
              name={product.name}
              image={image}
              price={parseFloat(product.startingPrice)}
              customizable={product.customizable}
              customization={product.customization}
            />
          </div>

          <div className="space-y-3 text-sm text-navy/70">
            <p className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-teal" /> Design approval before we print
            </p>
            <p className="flex items-center gap-2">
              <Truck size={16} className="text-teal" /> Pan India delivery
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-teal" /> 100% Quality Guaranteed &amp; Safe Checkout
            </p>
          </div>

          {product.description && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-navy uppercase tracking-wide mb-2">Details</h3>
              <p className="text-sm text-navy/70 leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-20">
        <h2 className="text-xl font-semibold text-navy mb-6">You may also like</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {related.filter((p) => p.id !== product.id).slice(0, 4).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
