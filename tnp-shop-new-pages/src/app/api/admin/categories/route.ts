import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc } from "drizzle-orm";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  return NextResponse.json({ categories: rows });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const [created] = await db
    .insert(categories)
    .values({
      name: body.name,
      slug: body.slug || slugify(body.name),
      description: body.description ?? "",
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json({ category: created });
}
