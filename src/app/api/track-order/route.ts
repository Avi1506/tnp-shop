import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { orderNumber, email } = await req.json().catch(() => ({}));
  if (!orderNumber || !email) {
    return NextResponse.json({ error: "Order number and email are required." }, { status: 400 });
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.orderNumber, String(orderNumber).trim()), eq(orders.customerEmail, String(email).toLowerCase().trim())))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "No order found with that order number and email." }, { status: 404 });
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt,
    items: items.map((i) => ({ name: i.productName, quantity: i.quantity })),
  });
}
