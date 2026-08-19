import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { formatINR } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AccountDashboard() {
  const session = await auth();
  const recentOrders = session?.user
    ? await db.select().from(orders).where(eq(orders.userId, session.user.id)).orderBy(desc(orders.createdAt)).limit(5)
    : [];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-1">
        Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
      </h1>
      <p className="text-navy/60 text-sm mb-8">{session?.user?.email}</p>

      <h2 className="font-semibold text-navy mb-4">Recent Orders</h2>
      {recentOrders.length === 0 ? (
        <div className="bg-offwhite border border-border rounded-2xl p-8 text-center">
          <p className="text-navy/60 text-sm mb-4">You haven&apos;t placed any orders yet.</p>
          <Link href="/shop" className="text-gold font-semibold text-sm">
            Start shopping →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recentOrders.map((o) => (
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
