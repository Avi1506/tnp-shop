import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      images: products.images,
      startingPrice: products.startingPrice,
      isActive: products.isActive,
      isFeatured: products.isFeatured,
      isBestseller: products.isBestseller,
      customizable: products.customizable,
      categoryId: products.categoryId,
      categoryName: categories.name,
      stock: products.stock,
      createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .orderBy(desc(products.createdAt));

  return NextResponse.json({ products: rows });
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[×–—]/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.name || !body.categoryId || !body.startingPrice) {
    return NextResponse.json({ error: "Name, category and starting price are required." }, { status: 400 });
  }

  const [created] = await db
    .insert(products)
    .values({
      name: body.name,
      slug: body.slug || slugify(body.name),
      categoryId: body.categoryId,
      shortDescription: body.shortDescription ?? "",
      description: body.description ?? "",
      images: body.images ?? [],
      startingPrice: String(body.startingPrice),
      isQuoteOnly: !!body.isQuoteOnly,
      stock: body.stock ?? 999,
      isActive: body.isActive ?? true,
      isFeatured: !!body.isFeatured,
      isBestseller: !!body.isBestseller,
      customizable: !!body.customizable,
      customization: body.customization ?? null,
      tags: body.tags ?? [],
    })
    .returning();

  return NextResponse.json({ product: created });
}
