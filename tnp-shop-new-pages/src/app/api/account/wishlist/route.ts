import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { wishlists, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({ product: products })
    .from(wishlists)
    .innerJoin(products, eq(wishlists.productId, products.id))
    .where(eq(wishlists.userId, session.user.id));

  return NextResponse.json({ products: rows.map((r) => r.product) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await req.json();
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const [existing] = await db
    .select()
    .from(wishlists)
    .where(and(eq(wishlists.userId, session.user.id), eq(wishlists.productId, productId)))
    .limit(1);

  if (existing) {
    await db
      .delete(wishlists)
      .where(and(eq(wishlists.userId, session.user.id), eq(wishlists.productId, productId)));
    return NextResponse.json({ wishlisted: false });
  }

  await db.insert(wishlists).values({ userId: session.user.id, productId });
  return NextResponse.json({ wishlisted: true });
}
