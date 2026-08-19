import "server-only";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { and, eq, ilike, or, desc, asc } from "drizzle-orm";

export async function getCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function getCategoryBySlug(slug: string) {
  const [cat] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return cat ?? null;
}

export async function getProducts(opts: {
  categorySlug?: string;
  search?: string;
  featuredOnly?: boolean;
  bestsellerOnly?: boolean;
  limit?: number;
} = {}) {
  const conditions = [eq(products.isActive, true)];

  if (opts.categorySlug) {
    const cat = await getCategoryBySlug(opts.categorySlug);
    if (cat) conditions.push(eq(products.categoryId, cat.id));
    else return [];
  }
  if (opts.featuredOnly) conditions.push(eq(products.isFeatured, true));
  if (opts.bestsellerOnly) conditions.push(eq(products.isBestseller, true));
  if (opts.search) {
    conditions.push(
      or(
        ilike(products.name, `%${opts.search}%`),
        ilike(products.shortDescription, `%${opts.search}%`)
      )!
    );
  }

  const query = db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(desc(products.isBestseller), desc(products.createdAt));

  return opts.limit ? query.limit(opts.limit) : query;
}

export async function getProductBySlug(slug: string) {
  const [p] = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return p ?? null;
}
