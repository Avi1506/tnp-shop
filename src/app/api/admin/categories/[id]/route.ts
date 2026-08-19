import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const updates: Partial<typeof categories.$inferInsert> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.description !== undefined) updates.description = body.description;
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

  const [updated] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ category: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [{ value }] = await db.select({ value: count() }).from(products).where(eq(products.categoryId, id));
  if (value > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${value} product(s) still use this category. Reassign them first.` },
      { status: 400 }
    );
  }

  await db.delete(categories).where(eq(categories.id, id));
  return NextResponse.json({ ok: true });
}
