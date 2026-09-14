import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { formatINR } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Package, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const session = await auth();
  const myOrders = session?.user
    ? await db.select().from(orders).where(eq(orders.userId, session.user.id)).orderBy(desc(orders.createdAt))
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-semibold text-navy">My Orders</h1>

      {myOrders.length === 0 ? (
        <div className="bg-offwhite border border-border rounded-2xl p-8 sm:p-12 text-center">
          <Package size={32} className="mx-auto text-navy/30 mb-3" />
          <p className="text-navy/60 text-xs sm:text-sm mb-4">No orders placed yet.</p>
          <Link href="/shop" className="bg-navy text-white font-semibold px-6 py-2.5 rounded-full text-xs sm:text-sm hover:bg-navy-dark inline-block transition">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myOrders.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.id}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-border rounded-2xl p-4 sm:p-5 hover:border-gold transition shadow-xs"
            >
              <div className="flex items-center justify-between sm:block">
                <div>
                  <p className="font-semibold text-navy text-sm">{o.orderNumber}</p>
                  <p className="text-xs text-navy/50">{new Date(o.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <ChevronRight size={16} className="sm:hidden text-navy/40" />
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
  );
}
