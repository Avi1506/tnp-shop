import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { formatINR } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const session = await auth();
  const myOrders = session?.user
    ? await db.select().from(orders).where(eq(orders.userId, session.user.id)).orderBy(desc(orders.createdAt))
    : [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">My Orders</h1>

      {myOrders.length === 0 ? (
        <div className="bg-offwhite border border-border rounded-2xl p-12 text-center">
          <Package size={28} className="mx-auto text-navy/30 mb-3" />
          <p className="text-navy/60 text-sm mb-4">No orders yet.</p>
          <Link href="/shop" className="bg-navy text-white font-semibold px-6 py-2.5 rounded-full text-sm hover:bg-navy-dark">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myOrders.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.id}`}
              className="flex items-center justify-between bg-white border border-border rounded-xl px-5 py-4 hover:border-gold transition"
            >
              <div>
                <p className="font-semibold text-navy text-sm">{o.orderNumber}</p>
                <p className="text-xs text-navy/50">{new Date(o.createdAt).toLocaleDateString("en-IN")}</p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={o.status} />
                <span className="font-semibold text-navy text-sm">{formatINR(o.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
