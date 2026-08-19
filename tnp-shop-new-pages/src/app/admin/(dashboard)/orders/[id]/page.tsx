import { db } from "@/db";
import { orders, orderItems, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { formatINR } from "@/lib/format";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Download, Phone, Mail, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import OrderStatusChanger from "@/components/admin/OrderStatusChanger";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) notFound();

  const [items, orderPayments] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(payments).where(eq(payments.orderId, id)),
  ]);

  const addr = order.shippingAddress;

  return (
    <div>
      <Link href="/admin/orders" className="flex items-center gap-1.5 text-sm text-navy/60 hover:text-navy mb-6">
        <ArrowLeft size={15} /> Back to Orders
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-navy mb-1">{order.orderNumber}</h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={order.status} />
            <span className="text-xs text-navy/50">
              Placed {new Date(order.createdAt).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
        <OrderStatusChanger orderId={order.id} currentStatus={order.status} />
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-6">
          {/* CUSTOMIZATION DETAILS — the critical section */}
          <div>
            <h2 className="font-semibold text-navy mb-4">Order Items &amp; Customization Details</h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-border p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold text-navy">{item.productName}</p>
                      <p className="text-xs text-navy/50">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-navy">{formatINR(item.lineTotal)}</p>
                  </div>

                  {item.customization ? (
                    <div className="border-t border-border pt-4 grid sm:grid-cols-2 gap-4">
                      {item.customization.previewImage && (
                        <div>
                          <p className="text-[11px] font-semibold text-navy/50 uppercase tracking-wide mb-2">
                            Final Preview
                          </p>
                          <div className="relative aspect-square rounded-xl overflow-hidden bg-offwhite border border-border">
                            <Image src={item.customization.previewImage} alt="Final preview" fill className="object-contain p-2" />
                          </div>
                          <a
                            href={item.customization.previewImage}
                            download
                            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-gold hover:underline"
                          >
                            <Download size={12} /> Download Final Preview
                          </a>
                        </div>
                      )}

                      <div className="space-y-3">
                        {item.customization.uploadedImages.length > 0 && (
                          <div>
                            <p className="text-[11px] font-semibold text-navy/50 uppercase tracking-wide mb-2">
                              Customer Uploaded Photo(s)
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {item.customization.uploadedImages.map((img, i) => (
                                <a key={i} href={img} target="_blank" rel="noreferrer" className="block">
                                  <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-offwhite border border-border">
                                    <Image src={img} alt="" fill className="object-cover" />
                                  </div>
                                </a>
                              ))}
                            </div>
                            <a
                              href={item.customization.uploadedImages[0]}
                              download
                              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-gold hover:underline"
                            >
                              <Download size={12} /> Download Original Image
                            </a>
                          </div>
                        )}
                        {item.customization.text && (
                          <div>
                            <p className="text-[11px] font-semibold text-navy/50 uppercase tracking-wide">Text</p>
                            <p className="text-sm text-navy">&ldquo;{item.customization.text}&rdquo;</p>
                            {item.customization.font && (
                              <p className="text-xs text-navy/50">
                                Font: {item.customization.font} · Colour: {item.customization.textColor}
                              </p>
                            )}
                          </div>
                        )}
                        {item.customization.size && (
                          <div>
                            <p className="text-[11px] font-semibold text-navy/50 uppercase tracking-wide">Size</p>
                            <p className="text-sm text-navy">{item.customization.size}</p>
                          </div>
                        )}
                        {item.customization.specialInstructions && (
                          <div>
                            <p className="text-[11px] font-semibold text-navy/50 uppercase tracking-wide">
                              Special Instructions
                            </p>
                            <p className="text-sm text-navy">{item.customization.specialInstructions}</p>
                          </div>
                        )}
                        <p className="text-xs text-teal font-semibold">
                          {item.customization.approved ? "✓ Customer approved this design" : "Not yet approved"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-navy/40 italic border-t border-border pt-3">
                      No customization for this item.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {order.customerNote && (
            <div className="bg-offwhite rounded-xl p-4 border border-border">
              <p className="text-[11px] font-semibold text-navy/50 uppercase tracking-wide mb-1">Customer Note</p>
              <p className="text-sm text-navy">{order.customerNote}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="text-xs font-semibold text-navy/50 uppercase tracking-wide mb-3">Customer</h3>
            <p className="font-semibold text-navy mb-2">{addr.fullName}</p>
            <div className="space-y-1.5 text-sm text-navy/70">
              <p className="flex items-center gap-2">
                <Phone size={13} /> {addr.phone}
              </p>
              <p className="flex items-center gap-2">
                <Mail size={13} /> {order.customerEmail}
              </p>
              <p className="flex items-start gap-2">
                <MapPin size={13} className="mt-0.5 shrink-0" />
                {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}
                {addr.landmark ? `, ${addr.landmark}` : ""}, {addr.city}, {addr.state} {addr.pincode}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-border p-5">
            <h3 className="text-xs font-semibold text-navy/50 uppercase tracking-wide mb-3">Payment</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-navy/60">Subtotal</span>
                <span className="text-navy">{formatINR(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy/60">Shipping</span>
                <span className="text-navy">{formatINR(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-1.5 border-t border-border">
                <span className="text-navy">Total</span>
                <span className="text-navy">{formatINR(order.total)}</span>
              </div>
            </div>
            {orderPayments.map((p) => (
              <div key={p.id} className="mt-3 pt-3 border-t border-border text-xs text-navy/50 space-y-1">
                <p>Razorpay Payment: {p.razorpayPaymentId ?? "—"}</p>
                <p>Status: <span className="font-semibold text-teal">{p.status}</span></p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
