import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { formatINR } from "@/lib/format";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Truck, Package } from "lucide-react";
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
    <div className="space-y-6">
      <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-navy/60 hover:text-navy">
        <ArrowLeft size={15} /> Back to My Orders
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-navy">{order.orderNumber}</h1>
          <p className="text-xs text-navy/50 mt-0.5">Placed {new Date(order.createdAt).toLocaleString("en-IN")}</p>
        </div>
        <div className="self-start sm:self-auto">
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Tracking Info Alert if available */}
      {order.trackingId && (
        <div className="bg-gold/10 border border-gold/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-navy">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-gold shrink-0" />
            <div>
              <span className="font-semibold block sm:inline">Tracking ID / AWB: {order.trackingId}</span>
            </div>
          </div>
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-navy text-white text-xs font-semibold px-4 py-2 rounded-xl text-center hover:bg-navy-dark transition"
            >
              Track Package →
            </a>
          )}
        </div>
      )}

      {/* Tracking Stepper Bar */}
      {!["cancelled", "refunded"].includes(order.status) && (
        <div className="bg-white border border-border rounded-2xl p-4 sm:p-6">
          <h2 className="text-xs font-semibold text-navy/50 uppercase tracking-wide mb-4 flex items-center gap-1.5">
            <Package size={15} /> Order Progress
          </h2>
          <div className="overflow-x-auto pb-2 scrollbar-none">
            <div className="flex items-center min-w-[580px]">
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
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-navy/50 uppercase tracking-wide">Ordered Items ({items.length})</h2>
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 sm:gap-4 bg-white border border-border rounded-2xl p-3.5 sm:p-4">
              {item.productImage && (
                <div className="relative h-16 w-16 shrink-0 rounded-xl bg-offwhite overflow-hidden border border-border">
                  <Image src={item.productImage} alt={item.productName} fill className="object-contain p-1" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-navy truncate">{item.productName}</p>
                <p className="text-xs text-navy/50 mt-0.5">Qty: {item.quantity}</p>
                {item.customization?.text && (
                  <p className="text-xs text-navy/60 mt-0.5 truncate">Text: &ldquo;{item.customization.text}&rdquo;</p>
                )}
                {item.customization?.size && (
                  <p className="text-xs text-navy/60">Size: {item.customization.size}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs sm:text-sm font-semibold text-navy">{formatINR(item.lineTotal)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-border rounded-2xl p-4 sm:p-5">
            <h3 className="text-xs font-semibold text-navy/50 uppercase tracking-wide mb-3">Shipping Address</h3>
            <p className="text-xs sm:text-sm text-navy font-semibold mb-1">{addr.fullName}</p>
            <p className="text-xs sm:text-sm text-navy/70 leading-relaxed">
              {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.pincode}
            </p>
            <p className="text-xs sm:text-sm text-navy/70 mt-2 font-medium">📞 {addr.phone}</p>
          </div>

          <div className="bg-white border border-border rounded-2xl p-4 sm:p-5 space-y-2">
            <div className="flex justify-between text-xs sm:text-sm text-navy/70">
              <span>Subtotal</span>
              <span>{formatINR(order.subtotal)}</span>
            </div>
            <div className="flex justify-between font-semibold text-xs sm:text-sm pt-2 border-t border-border text-navy">
              <span>Total</span>
              <span>{formatINR(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
