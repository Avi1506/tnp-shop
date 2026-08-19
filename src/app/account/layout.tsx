import Link from "next/link";
import { Package, MapPin, Heart, User } from "lucide-react";

const links = [
  { href: "/account", label: "Dashboard", icon: User },
  { href: "/account/orders", label: "My Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/profile", label: "Profile", icon: User },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-10 md:py-14">
      <div className="grid md:grid-cols-[220px_1fr] gap-10">
        <aside>
          <nav className="flex md:flex-col gap-1 overflow-x-auto">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-2.5 text-sm px-3 py-2.5 rounded-lg text-navy/70 hover:bg-offwhite hover:text-navy transition shrink-0"
              >
                <l.icon size={16} />
                {l.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
