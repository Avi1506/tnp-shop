"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, MapPin, Heart, User, LayoutDashboard } from "lucide-react";
import CustomerSignOutButton from "./CustomerSignOutButton";

const links = [
  { href: "/account", label: "Dashboard", icon: LayoutDashboard },
  { href: "/account/orders", label: "My Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/profile", label: "Profile", icon: User },
];

export default function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="flex md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none border-b md:border-b-0 border-border md:border-r md:border-border md:pr-4 -mx-1 px-1 md:mx-0 md:px-0">
      {links.map((l) => {
        const isActive = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-2 text-xs sm:text-sm font-medium px-3 py-2 md:px-3.5 md:py-2.5 rounded-xl transition shrink-0 ${
              isActive
                ? "bg-navy text-gold font-semibold shadow-xs"
                : "text-navy/70 hover:bg-offwhite hover:text-navy"
            }`}
          >
            <l.icon size={16} className={isActive ? "text-gold" : "text-navy/50"} />
            <span className="whitespace-nowrap">{l.label}</span>
          </Link>
        );
      })}
      <div className="md:mt-2 md:pt-2 md:border-t md:border-border shrink-0">
        <CustomerSignOutButton />
      </div>
    </nav>
  );
}
