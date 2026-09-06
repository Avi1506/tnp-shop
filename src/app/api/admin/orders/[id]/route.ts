import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  sendEmail,
  orderStatusUpdateEmail,
  orderShippedEmail,
  orderDeliveredEmail,
} from "@/lib/email";
import { ORDER_STATUSES } from "@/db/schema";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status, trackingId, trackingUrl } = body;

  if (!ORDER_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const updateData: {
    status: string;
    updatedAt: Date;
    trackingId?: string | null;
    trackingUrl?: string | null;
  } = {
    status,
    updatedAt: new Date(),
  };

  if (trackingId !== undefined) updateData.trackingId = trackingId || null;
  if (trackingUrl !== undefined) updateData.trackingUrl = trackingUrl || null;

  const [order] = await db
    .update(orders)
    .set(updateData)
    .where(eq(orders.id, id))
    .returning();

  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  // Send tailored professional email based on the new status
  try {
    if (status === "shipped") {
      await sendEmail({
        to: order.customerEmail,
        subject: `Your order ${order.orderNumber} has been shipped! 🚀`,
        event: "order_shipped",
        orderId: order.id,
        html: orderShippedEmail({
          orderNumber: order.orderNumber,
          customerName: order.shippingAddress.fullName,
          trackingId: order.trackingId,
          trackingUrl: order.trackingUrl,
        }),
      });
    } else if (status === "delivered") {
      await sendEmail({
        to: order.customerEmail,
        subject: `Your order ${order.orderNumber} has been delivered! 🎉`,
        event: "order_delivered",
        orderId: order.id,
        html: orderDeliveredEmail({
          orderNumber: order.orderNumber,
          customerName: order.shippingAddress.fullName,
        }),
      });
    } else {
      await sendEmail({
        to: order.customerEmail,
        subject: `Update on your order ${order.orderNumber}`,
        event: "order_status_update",
        orderId: order.id,
        html: orderStatusUpdateEmail({
          orderNumber: order.orderNumber,
          status,
          customerName: order.shippingAddress.fullName,
        }),
      });
    }
  } catch (err) {
    console.error("[orders PATCH] Email sending error:", err);
  }

  return NextResponse.json({ order });
}
