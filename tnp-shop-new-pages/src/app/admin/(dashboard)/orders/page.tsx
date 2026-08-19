import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { formatINR } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-navy mb-8">Orders</h1>
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-navy/50 uppercase tracking-wide">
              <th className="px-5 py-3">Order</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Total</th>
              <th className="px-5 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {allOrders.map((o) => (
              <tr key={o.id} className="border-t border-border hover:bg-offwhite">
                <td className="px-5 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-navy hover:text-gold">
                    {o.orderNumber}
                  </Link>
                </td>
                <td className="px-5 py-3 text-navy/70">{o.shippingAddress.fullName}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-5 py-3 font-medium text-navy">{formatINR(o.total)}</td>
                <td className="px-5 py-3 text-navy/60">{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
            {allOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-navy/40">
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
