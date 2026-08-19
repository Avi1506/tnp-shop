import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc } from "drizzle-orm";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const cats = await db.select().from(categories).orderBy(asc(categories.sortOrder));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">Add Product</h1>
      <ProductForm categories={cats} />
    </div>
  );
}
