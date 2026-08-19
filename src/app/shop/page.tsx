import { getCategories, getProducts } from "@/lib/catalog";
import ProductCard from "@/components/product/ProductCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = { title: "Shop All Products" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ categorySlug: category, search: q }),
  ]);

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-8">
        <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">
          {q ? "Search Results" : "Shop"}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-navy">
          {q ? `Results for "${q}"` : activeCategory ? activeCategory.name : "All Products"}
        </h1>
        {activeCategory?.description && (
          <p className="text-navy/60 mt-1 text-sm italic">{activeCategory.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10">
        {/* Category sidebar */}
        <aside className="hidden md:block">
          <h3 className="text-xs font-semibold tracking-widest uppercase text-navy/50 mb-4">Categories</h3>
          <nav className="flex flex-col gap-1">
            <Link
              href="/shop"
              className={`text-sm rounded-lg px-3 py-2 transition ${
                !category ? "bg-navy text-white font-semibold" : "text-navy/80 hover:bg-offwhite"
              }`}
            >
              All Products
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/shop?category=${cat.slug}`}
                className={`text-sm rounded-lg px-3 py-2 transition ${
                  category === cat.slug ? "bg-navy text-white font-semibold" : "text-navy/80 hover:bg-offwhite"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </nav>
          <div className="mt-8 rounded-xl bg-offwhite border border-border p-4">
            <p className="text-xs text-navy/60 leading-relaxed">
              Starting prices are indicative. Final price may vary depending on customization, quantity,
              size and packaging.
            </p>
          </div>
        </aside>

        {/* Mobile category chips */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          <Link
            href="/shop"
            className={`shrink-0 text-xs font-semibold rounded-full px-4 py-2 ${
              !category ? "bg-navy text-white" : "bg-offwhite text-navy"
            }`}
          >
            All
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?category=${cat.slug}`}
              className={`shrink-0 text-xs font-semibold rounded-full px-4 py-2 ${
                category === cat.slug ? "bg-navy text-white" : "bg-offwhite text-navy"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </div>

        <div>
          {products.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-navy/60">No products found. Try a different category or search term.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
