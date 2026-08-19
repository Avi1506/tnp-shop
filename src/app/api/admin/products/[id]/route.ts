import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const updates: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
  const allowedFields = [
    "name", "slug", "categoryId", "shortDescription", "description", "images",
    "startingPrice", "salePrice", "isQuoteOnly", "stock", "isActive", "isFeatured",
    "isBestseller", "customizable", "customization", "tags",
  ] as const;
  for (const field of allowedFields) {
    if (field in body) (updates as Record<string, unknown>)[field] = body[field];
  }
  if (updates.startingPrice != null) updates.startingPrice = String(updates.startingPrice);

  const [updated] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.delete(products).where(eq(products.id, id));
  return NextResponse.json({ ok: true });
}
