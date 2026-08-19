import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { formatINR } from "@/lib/format";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ORDER_STATUS_OPTIONS } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

const STEPS = ORDER_STATUS_OPTIONS.filter((s) => !["cancelled", "refunded"].includes(s));

export default async function CustomerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order || order.userId !== session.user.id) notFound();

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const currentStepIndex = STEPS.indexOf(order.status);
  const addr = order.shippingAddress;

  return (
    <div>
      <Link href="/account/orders" className="flex items-center gap-1.5 text-sm text-navy/60 hover:text-navy mb-6">
        <ArrowLeft size={15} /> Back to My Orders
      </Link>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold text-navy">{order.orderNumber}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-xs text-navy/50 mb-8">Placed {new Date(order.createdAt).toLocaleString("en-IN")}</p>

      {!["cancelled", "refunded"].includes(order.status) && (
        <div className="mb-10 overflow-x-auto">
          <div className="flex items-center min-w-[600px]">
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i <= currentStepIndex ? "bg-gold text-navy-dark" : "bg-offwhite text-navy/30 border border-border"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <p className={`text-[10px] mt-1.5 text-center capitalize w-16 ${i <= currentStepIndex ? "text-navy font-medium" : "text-navy/30"}`}>
                    {step.replace(/_/g, " ")}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 ${i < currentStepIndex ? "bg-gold" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 bg-white border border-border rounded-2xl p-4">
              {item.productImage && (
                <div className="relative h-16 w-16 shrink-0 rounded-lg bg-offwhite overflow-hidden">
                  <Image src={item.productImage} alt={item.productName} fill className="object-contain p-1.5" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-navy">{item.productName}</p>
                <p className="text-xs text-navy/50">Qty: {item.quantity}</p>
                {item.customization?.text && (
                  <p className="text-xs text-navy/50">Text: &ldquo;{item.customization.text}&rdquo;</p>
                )}
              </div>
              <p className="text-sm font-semibold text-navy">{formatINR(item.lineTotal)}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-border rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-navy/50 uppercase tracking-wide mb-3">Shipping Address</h3>
            <p className="text-sm text-navy font-medium mb-1">{addr.fullName}</p>
            <p className="text-sm text-navy/70">
              {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.pincode}
            </p>
            <p className="text-sm text-navy/70 mt-1">{addr.phone}</p>
          </div>
          <div className="bg-white border border-border rounded-2xl p-5">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-navy/60">Subtotal</span>
              <span className="text-navy">{formatINR(order.subtotal)}</span>
            </div>
            <div className="flex justify-between font-semibold text-sm pt-1.5 border-t border-border">
              <span className="text-navy">Total</span>
              <span className="text-navy">{formatINR(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
