import { db } from "@/db";
import { users, orders } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { formatINR } from "@/lib/format";
import Link from "next/link";
import { Users, Mail, Phone, ShoppingBag, IndianRupee } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  // Fetch all customers with order stats
  const customers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      createdAt: users.createdAt,
      orderCount: sql<number>`count(${orders.id})`,
      totalSpent: sql<string>`coalesce(sum(${orders.total}), 0)`,
    })
    .from(users)
    .leftJoin(orders, eq(orders.userId, users.id))
    .where(eq(users.role, "customer"))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + parseFloat(String(c.totalSpent)), 0);
  const totalOrders = customers.reduce((sum, c) => sum + Number(c.orderCount), 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center">
          <Users size={20} className="text-gold" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-navy">Customers</h1>
          <p className="text-xs text-navy/50 mt-0.5">All registered customer accounts</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-xs text-navy/50 uppercase tracking-wide mb-1">Total Customers</p>
          <p className="text-2xl font-semibold text-navy">{totalCustomers}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-xs text-navy/50 uppercase tracking-wide mb-1">Total Orders</p>
          <p className="text-2xl font-semibold text-navy">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5">
          <p className="text-xs text-navy/50 uppercase tracking-wide mb-1">Total Revenue</p>
          <p className="text-2xl font-semibold text-navy">{formatINR(totalRevenue)}</p>
        </div>
      </div>

      {/* Customers table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold text-navy">All Customers ({totalCustomers})</h2>
        </div>

        {customers.length === 0 ? (
          <div className="p-12 text-center text-navy/40">
            <Users size={36} className="mx-auto mb-3 opacity-30" />
            <p>No customers yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-navy/50 uppercase tracking-wide bg-offwhite">
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3 text-center">Orders</th>
                  <th className="px-5 py-3 text-right">Total Spent</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-offwhite/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold font-semibold text-xs shrink-0">
                          {(c.name ?? c.email ?? "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-navy">{c.name ?? "—"}</p>
                          <p className="text-xs text-navy/50 mt-0.5 max-w-[180px] truncate">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-navy/70">
                          <Mail size={11} className="text-navy/40 shrink-0" />
                          <span className="truncate max-w-[160px]">{c.email}</span>
                        </div>
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-navy/70">
                            <Phone size={11} className="text-navy/40 shrink-0" />
                            {c.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-navy/5 text-navy px-2.5 py-1 rounded-full">
                        <ShoppingBag size={11} />
                        {Number(c.orderCount)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 font-semibold text-navy">
                        <IndianRupee size={12} className="text-navy/50" />
                        {parseFloat(String(c.totalSpent)).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-navy/50">
                      {new Date(c.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders?customer=${encodeURIComponent(c.email ?? "")}`}
                        className="text-xs font-semibold text-gold hover:underline whitespace-nowrap"
                      >
                        View Orders →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
