import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, orderStatusUpdateEmail } from "@/lib/email";
import { ORDER_STATUSES } from "@/db/schema";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { status } = await req.json();

  if (!ORDER_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const [order] = await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning();

  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

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

  return NextResponse.json({ order });
}
