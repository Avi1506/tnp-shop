import { db } from "@/db";
import { orders, products, users } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { formatINR } from "@/lib/format";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [[productCount], [orderCount], [customerCount], recentOrders, [revenue]] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(products),
    db.select({ count: sql<number>`count(*)` }).from(orders),
    db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "customer")),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
    db
      .select({ total: sql<string>`coalesce(sum(${orders.total}), 0)` })
      .from(orders)
      .where(eq(orders.status, "payment_received")),
  ]);

  const stats = [
    { label: "Total Products", value: productCount.count },
    { label: "Total Orders", value: orderCount.count },
    { label: "Customers", value: customerCount.count },
    { label: "Revenue (Paid)", value: formatINR(revenue.total ?? 0) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-border p-5">
            <p className="text-xs text-navy/50 uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-semibold text-navy">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-navy">Recent Orders</h2>
          <Link href="/admin/orders" className="text-xs font-semibold text-gold">
            View all →
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-navy/50 uppercase tracking-wide">
              <th className="px-5 py-3">Order</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={o.id} className="border-t border-border hover:bg-offwhite">
                <td className="px-5 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-navy hover:text-gold">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-5 py-3 font-medium text-navy">{formatINR(o.total)}</td>
                <td className="px-5 py-3 text-navy/60">{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
            {recentOrders.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-navy/40">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
