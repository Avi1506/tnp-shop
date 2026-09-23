import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders, addresses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { formatINR } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ChevronRight, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountDashboard() {
  const session = await auth();
  const [recentOrders, userAddresses] = await Promise.all([
    session?.user
      ? db.select().from(orders).where(eq(orders.userId, session.user.id)).orderBy(desc(orders.createdAt)).limit(5)
      : Promise.resolve([]),
    session?.user
      ? db.select().from(addresses).where(eq(addresses.userId, session.user.id)).limit(3)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-navy mb-1">
          Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-navy/60 text-xs sm:text-sm">{session?.user?.email}</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-navy text-sm sm:text-base">Recent Orders</h2>
          {recentOrders.length > 0 && (
            <Link href="/account/orders" className="text-gold font-semibold text-xs hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-offwhite border border-border rounded-2xl p-6 sm:p-8 text-center">
            <p className="text-navy/60 text-xs sm:text-sm mb-4">You haven&apos;t placed any orders yet.</p>
            <Link href="/shop" className="bg-navy text-white font-semibold px-5 py-2.5 rounded-full text-xs sm:text-sm hover:bg-navy-dark transition inline-block">
              Start Shopping →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((o) => (
              <Link
                key={o.id}
                href={`/account/orders/${o.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-border rounded-2xl p-4 sm:p-5 hover:border-gold transition shadow-xs"
              >
                <div>
                  <p className="font-semibold text-navy text-sm">{o.orderNumber}</p>
                  <p className="text-xs text-navy/50">{new Date(o.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                  <StatusBadge status={o.status} />
                  <span className="font-semibold text-navy text-sm sm:text-base">{formatINR(o.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Saved Addresses Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-navy text-sm sm:text-base">Saved Addresses</h2>
          <Link href="/account/addresses" className="text-gold font-semibold text-xs hover:underline flex items-center gap-0.5">
            Manage <ChevronRight size={14} />
          </Link>
        </div>

        {userAddresses.length === 0 ? (
          <div className="bg-offwhite border border-border rounded-2xl p-5 text-center">
            <p className="text-navy/60 text-xs sm:text-sm mb-3">Addresses used during checkout will automatically be saved here.</p>
            <Link href="/account/addresses" className="text-navy text-xs font-semibold hover:text-gold transition">
              + Add an address
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {userAddresses.map((a) => (
              <div key={a.id} className="bg-white border border-border rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gold mb-1">
                  <MapPin size={13} />
                  <span>{a.label || "Address"}</span>
                  {a.isDefault && <span className="bg-navy/10 text-navy text-[10px] px-2 py-0.5 rounded-full">Default</span>}
                </div>
                <p className="text-xs font-semibold text-navy">{a.fullName} · {a.phone}</p>
                <p className="text-xs text-navy/70 mt-1 line-clamp-2">
                  {a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
