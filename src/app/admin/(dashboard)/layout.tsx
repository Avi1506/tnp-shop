import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Package, FolderTree, ShoppingCart, LogOut } from "lucide-react";
import SignOutButton from "@/components/admin/SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // The /admin/login page itself must render without this guard.
  if (!session?.user || session.user.role !== "admin") {
    // proxy.ts already redirects unauthenticated visitors, but this is a
    // second, defense-in-depth check at the layout level.
    redirect("/admin/login");
  }

  const links = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/categories", label: "Categories", icon: FolderTree },
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  ];

  return (
    <div className="min-h-screen flex bg-offwhite">
      <aside className="w-60 bg-navy text-white flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10">
          <p className="font-display text-lg font-semibold">The Novelty Prints</p>
          <p className="text-xs text-gold tracking-widest uppercase mt-1">Admin</p>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition"
            >
              <l.icon size={17} />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-white/50 mb-2 truncate">{session.user.email}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto">
        <div className="p-8 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

export function AdminIconLogOut() {
  return <LogOut size={16} />;
}
