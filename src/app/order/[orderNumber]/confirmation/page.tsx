import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { formatINR } from "@/lib/format";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order || order.userId !== session.user.id) notFound();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

  return (
    <div className="container-page max-w-2xl py-16 md:py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={32} className="text-teal" />
      </div>
      <h1 className="font-display text-2xl md:text-3xl font-semibold text-navy mb-2">
        Thank you! Your order is confirmed.
      </h1>
      <p className="text-navy/60 mb-8">
        Order <strong>{order.orderNumber}</strong> · A confirmation email is on its way to {order.customerEmail}
      </p>

      <div className="border border-border rounded-2xl p-6 text-left mb-8">
        {items.map((it) => (
          <div key={it.id} className="flex gap-4 py-3 border-b border-border last:border-0">
            {it.productImage && (
              <div className="relative h-16 w-16 shrink-0 rounded-lg bg-offwhite overflow-hidden">
                <Image src={it.productImage} alt={it.productName} fill className="object-contain p-1.5" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-semibold text-navy">{it.productName}</p>
              <p className="text-xs text-navy/50">Qty: {it.quantity}</p>
            </div>
            <p className="text-sm font-semibold text-navy">{formatINR(it.lineTotal)}</p>
          </div>
        ))}
        <div className="flex justify-between pt-4 font-semibold text-navy">
          <span>Total Paid</span>
          <span>{formatINR(order.total)}</span>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Link href="/account/orders" className="bg-navy text-white font-semibold px-6 py-3 rounded-full hover:bg-navy-dark transition">
          View My Orders
        </Link>
        <Link href="/shop" className="border border-border text-navy font-semibold px-6 py-3 rounded-full hover:bg-offwhite transition">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
