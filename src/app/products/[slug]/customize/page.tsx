import { getProductBySlug } from "@/lib/catalog";
import { notFound } from "next/navigation";
import CustomizeCanvas from "@/components/product/CustomizeCanvas";
import { db } from "@/db";
import { categories, orderItems, orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { CartItemCustomization } from "@/db/schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customize Your Product" };

export default async function CustomizeProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ orderItemId?: string }>;
}) {
  const { slug } = await params;
  const { orderItemId } = await searchParams;
  const product = await getProductBySlug(slug);
  if (!product || !product.isActive || !product.customizable || !product.customization) notFound();

  const [category] = await db
    .select({ printTemplate: categories.printTemplate })
    .from(categories)
    .where(eq(categories.id, product.categoryId))
    .limit(1);

  let initialCustomization: CartItemCustomization | null = null;

  if (orderItemId) {
    const session = await auth();
    if (!session?.user) notFound();

    const [row] = await db
      .select({
        productId: orderItems.productId,
        customization: orderItems.customization,
        ownerId: orders.userId,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orderItems.id, orderItemId))
      .limit(1);

    const canOpen =
      row &&
      row.productId === product.id &&
      (session.user.role === "admin" || row.ownerId === session.user.id);

    if (!canOpen) notFound();
    initialCustomization = row.customization;
  }

  return (
    <div className="container-page py-6 sm:py-10 md:py-14 overflow-x-hidden">
      <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-1 sm:mb-2">
        Live Preview
      </p>
      <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-navy mb-6 sm:mb-8">
        Customize Your {product.name}
      </h1>
      <CustomizeCanvas
        productId={product.id}
        slug={product.slug}
        name={product.name}
        price={parseFloat(product.startingPrice)}
        config={product.customization}
        categoryTemplate={category?.printTemplate ?? null}
        initialCustomization={initialCustomization}
      />
    </div>
  );
}
