import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cats, [product]] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select().from(products).where(eq(products.id, id)).limit(1),
  ]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">Edit Product</h1>
      <ProductForm
        categories={cats}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          categoryId: product.categoryId,
          shortDescription: product.shortDescription ?? "",
          description: product.description ?? "",
          images: product.images,
          startingPrice: product.startingPrice,
          isQuoteOnly: product.isQuoteOnly,
          isActive: product.isActive,
          isFeatured: product.isFeatured,
          isBestseller: product.isBestseller,
          customizable: product.customizable,
          customization: product.customization,
        }}
      />
    </div>
  );
}
