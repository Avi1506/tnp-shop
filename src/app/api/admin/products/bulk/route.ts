import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { inArray, eq } from "drizzle-orm";
import Papa from "papaparse";

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
  const action = body.action as "delete" | "edit" | "import";

  // --- BULK DELETE ---------------------------------------------------
  if (action === "delete") {
    const ids: string[] = body.ids ?? [];
    if (ids.length === 0) return NextResponse.json({ error: "No products selected." }, { status: 400 });
    await db.delete(products).where(inArray(products.id, ids));
    return NextResponse.json({ ok: true, deleted: ids.length });
  }

  // --- BULK EDIT -------------------------------------------------------
  if (action === "edit") {
    const ids: string[] = body.ids ?? [];
    const updates = body.updates ?? {};
    if (ids.length === 0) return NextResponse.json({ error: "No products selected." }, { status: 400 });

    const patch: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
    if (updates.categoryId) patch.categoryId = updates.categoryId;
    if (updates.isActive !== undefined) patch.isActive = updates.isActive;
    if (updates.isFeatured !== undefined) patch.isFeatured = updates.isFeatured;
    if (updates.isBestseller !== undefined) patch.isBestseller = updates.isBestseller;
    if (updates.customizable !== undefined) patch.customizable = updates.customizable;
    if (updates.priceSet !== undefined) patch.startingPrice = String(updates.priceSet);

    await db.update(products).set(patch).where(inArray(products.id, ids));

    // Percentage price adjustment needs a per-row update.
    if (updates.pricePercent) {
      const rows = await db.select().from(products).where(inArray(products.id, ids));
      for (const row of rows) {
        const newPrice = (parseFloat(row.startingPrice) * (1 + updates.pricePercent / 100)).toFixed(2);
        await db.update(products).set({ startingPrice: newPrice }).where(eq(products.id, row.id));
      }
    }

    return NextResponse.json({ ok: true, updated: ids.length });
  }

  // --- CSV BULK IMPORT ---------------------------------------------------
  // Expected columns: name, category (slug or name), startingPrice,
  // shortDescription, description, image, customizable, isActive
  if (action === "import") {
    const csv: string = body.csv ?? "";
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
    if (parsed.errors.length) {
      return NextResponse.json({ error: `CSV parse error: ${parsed.errors[0].message}` }, { status: 400 });
    }

    const allCategories = await db.select().from(categories);
    const catByKey = new Map<string, string>();
    for (const c of allCategories) {
      catByKey.set(c.slug.toLowerCase(), c.id);
      catByKey.set(c.name.toLowerCase(), c.id);
    }

    let created = 0;
    const errors: string[] = [];

    for (const [i, row] of parsed.data.entries()) {
      const name = row.name?.trim();
      const categoryKey = row.category?.trim().toLowerCase();
      const price = row.startingPrice?.trim();
      if (!name || !categoryKey || !price) {
        errors.push(`Row ${i + 2}: missing name, category or startingPrice — skipped.`);
        continue;
      }
      const categoryId = catByKey.get(categoryKey);
      if (!categoryId) {
        errors.push(`Row ${i + 2}: unknown category "${row.category}" — skipped.`);
        continue;
      }

      await db.insert(products).values({
        name,
        slug: slugify(name),
        categoryId,
        shortDescription: row.shortDescription ?? "",
        description: row.description ?? "",
        images: row.image ? [row.image] : [],
        startingPrice: price,
        isActive: row.isActive ? row.isActive.toLowerCase() !== "false" : true,
        customizable: row.customizable ? row.customizable.toLowerCase() === "true" : false,
        tags: [],
      }).onConflictDoNothing({ target: products.slug });
      created++;
    }

    return NextResponse.json({ ok: true, created, errors });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
