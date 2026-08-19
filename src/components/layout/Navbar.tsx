"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ShoppingBag, Menu, X, User, Search } from "lucide-react";
import { useCart } from "@/components/cart/CartContext";
import { useSession } from "next-auth/react";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/bulk-enquiry", label: "Bulk & Corporate" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const { data: session } = useSession();
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-border">
      <div className="container-page flex items-center justify-between h-18 py-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image
            src="/images/brand/logo_full.png"
            alt="The Novelty Prints"
            width={180}
            height={54}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-navy/80 hover:text-gold transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <form action="/shop" className="hidden lg:flex items-center relative">
          <input
            type="text"
            name="q"
            placeholder="Search products..."
            className="text-sm bg-offwhite rounded-full pl-4 pr-9 py-2 w-56 outline-none border border-transparent focus:border-gold transition-colors"
          />
          <button type="submit" aria-label="Search" className="absolute right-3 text-navy/50">
            <Search size={15} />
          </button>
        </form>

        <div className="flex items-center gap-4">
          <Link
            href={session ? "/account" : "/login"}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-navy/80 hover:text-gold transition-colors"
          >
            <User size={18} />
            {session ? session.user?.name?.split(" ")[0] || "Account" : "Login"}
          </Link>
          <Link href="/cart" className="relative flex items-center text-navy hover:text-gold transition-colors">
            <ShoppingBag size={22} />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-red text-white text-[10px] font-bold rounded-full h-4.5 w-4.5 flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
          <button className="md:hidden text-navy" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden border-t border-border bg-white px-5 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-navy" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link href={session ? "/account" : "/login"} className="text-sm font-medium text-navy" onClick={() => setOpen(false)}>
            {session ? "My Account" : "Login / Register"}
          </Link>
        </nav>
      )}
    </header>
  );
}
