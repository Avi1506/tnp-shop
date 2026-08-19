import Image from "next/image";
import Link from "next/link";
import { getCategories, getProducts } from "@/lib/catalog";
import ProductCard from "@/components/product/ProductCard";
import {
  ShoppingBag,
  MessageCircle,
  Pencil,
  CheckCircle,
  CreditCard,
  Truck,
  Sparkles,
  Package,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [categories, bestsellers] = await Promise.all([
    getCategories(),
    getProducts({ bestsellerOnly: true, limit: 4 }),
  ]);

  const featured = bestsellers.length ? bestsellers : await getProducts({ limit: 4 });

  const steps = [
    { icon: ShoppingBag, title: "Choose Your Product", n: "1" },
    { icon: Pencil, title: "Personalise It", n: "2" },
    { icon: Sparkles, title: "Preview Your Design", n: "3" },
    { icon: CheckCircle, title: "Approve", n: "4" },
    { icon: CreditCard, title: "Pay Online", n: "5" },
    { icon: Truck, title: "We Create & Deliver", n: "6" },
  ];

  return (
    <div>
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-[#3A1426] opacity-95" />
        <div className="container-page relative py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-gold text-sm font-semibold tracking-[0.2em] uppercase mb-5">
              Personalized Gifts · Custom Printing · Bulk Gifting
            </p>
            <h1 className="font-display text-4xl md:text-6xl font-semibold leading-[1.1] mb-6">
              Made personal.
              <br />
              Made memorable.
            </h1>
            <p className="text-white/70 text-base md:text-lg max-w-md mb-8">
              Personalized gifts and custom products, designed around your photos, names and logos —
              delivered Pan India.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/shop"
                className="bg-gold text-navy-dark font-semibold px-7 py-3.5 rounded-full hover:brightness-110 transition"
              >
                Shop Personalised Gifts
              </Link>
              <Link
                href="/bulk-enquiry"
                className="border border-white/30 text-white font-semibold px-7 py-3.5 rounded-full hover:bg-white/10 transition"
              >
                Explore Bulk Gifting
              </Link>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-4">
            {["tshirt_round_white.png", "mug_heart_handle_colour.png", "cushion_heart.png", "clock_wall_round.png"].map(
              (img, i) => (
                <div
                  key={img}
                  className={`relative aspect-square bg-white rounded-2xl shadow-2xl p-4 ${i % 2 ? "translate-y-6" : ""}`}
                >
                  <Image src={`/images/products/${img}`} alt="" fill className="object-contain p-6" />
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">Shop By Category</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-navy">Find the perfect gift</h2>
          </div>
          <Link href="/shop" className="text-sm font-semibold text-navy hover:text-gold hidden sm:block">
            View all products →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop?category=${cat.slug}`}
              className="group rounded-2xl border border-border bg-offwhite p-5 text-center hover:border-gold hover:bg-white hover:shadow-md transition-all"
            >
              <div className="h-11 w-11 rounded-full bg-navy text-white flex items-center justify-center mx-auto mb-3 group-hover:bg-gold transition-colors">
                <Package size={20} />
              </div>
              <p className="text-xs font-semibold text-navy leading-snug">{cat.name}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-offwhite py-16 md:py-20">
        <div className="container-page">
          <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-2">Best Sellers</p>
          <h2 className="text-2xl md:text-3xl font-semibold text-navy mb-8">Loved by our customers</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16 md:py-20">
        <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-2 text-center">
          Simple &amp; Transparent
        </p>
        <h2 className="text-2xl md:text-3xl font-semibold text-navy mb-12 text-center">How It Works</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
          {steps.map((s) => (
            <div key={s.n} className="text-center">
              <div className="relative h-16 w-16 rounded-full bg-navy text-white flex items-center justify-center mx-auto mb-4">
                <s.icon size={24} />
                <span className="absolute -top-1 -right-1 bg-gold text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
                  {s.n}
                </span>
              </div>
              <p className="text-sm font-semibold text-navy">{s.title}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-16 md:pb-20">
        <div className="bg-navy rounded-3xl px-8 py-12 md:p-16 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-gold text-xs font-semibold tracking-widest uppercase mb-3">
              For Events, Schools &amp; Businesses
            </p>
            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
              Need a bulk order? Talk to us.
            </h2>
            <p className="text-white/70 mb-6">
              Return gifts, event giveaways, branded merchandise and corporate gifting — tailored to your
              event, your team or your brand.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/bulk-enquiry"
                className="bg-gold text-navy-dark font-semibold px-6 py-3 rounded-full hover:brightness-110 transition"
              >
                Get a Custom Quote
              </Link>
              <a
                href="https://wa.me/918923032312"
                target="_blank"
                rel="noreferrer"
                className="border border-white/30 text-white font-semibold px-6 py-3 rounded-full hover:bg-white/10 transition flex items-center gap-2"
              >
                <MessageCircle size={18} /> WhatsApp Us
              </a>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["Return Gifts", "Employee Kits", "Festival Hampers", "Logo Merchandise", "Event Giveaways", "Gift Combos"].map(
              (t) => (
                <div key={t} className="bg-white/5 border border-white/10 rounded-xl px-3 py-4 text-center">
                  <p className="text-white text-xs font-semibold">{t}</p>
                </div>
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
