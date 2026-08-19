import { getProductBySlug } from "@/lib/catalog";
import { notFound } from "next/navigation";
import CustomizeCanvas from "@/components/product/CustomizeCanvas";

export const dynamic = "force-dynamic";

export const metadata = { title: "Customize Your Product" };

export default async function CustomizeProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive || !product.customizable || !product.customization) notFound();

  return (
    <div className="container-page py-10 md:py-14">
      <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">Live Preview</p>
      <h1 className="text-2xl md:text-3xl font-semibold text-navy mb-8">Customize Your {product.name}</h1>
      <CustomizeCanvas
        productId={product.id}
        slug={product.slug}
        name={product.name}
        price={parseFloat(product.startingPrice)}
        config={product.customization}
      />
    </div>
  );
}
