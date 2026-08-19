import { getProductBySlug, getProducts } from "@/lib/catalog";
import { formatINR } from "@/lib/format";
import Image from "next/image";
import { notFound } from "next/navigation";
import AddToCartPanel from "@/components/product/AddToCartPanel";
import ProductCard from "@/components/product/ProductCard";
import { CheckCircle2, Truck, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

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
          <Image src={image} alt={product.name} fill className="object-contain p-10" priority />
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
              <ShieldCheck size={16} className="text-teal" /> Prepaid orders — COD not available on customized items
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
