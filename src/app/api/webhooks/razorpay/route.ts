import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyWebhookSignature } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id;
    if (razorpayOrderId) {
      const [order] = await db.select().from(orders).where(eq(orders.razorpayOrderId, razorpayOrderId)).limit(1);
      if (order && order.status === "pending_payment") {
        await db
          .update(orders)
          .set({ status: "payment_received", razorpayPaymentId: payment.id, updatedAt: new Date() })
          .where(eq(orders.id, order.id));

        await db.insert(payments).values({
          orderId: order.id,
          razorpayOrderId,
          razorpayPaymentId: payment.id,
          amount: order.total,
          status: "paid",
          rawWebhookPayload: event,
        });
        // Note: the /api/checkout/verify route is the primary path and
        // sends the confirmation emails. This webhook exists as a safety
        // net for cases where the browser closes before that call fires —
        // wire up email sending here too if you want it fully redundant.
      }
    }
  }

  if (event.event === "payment.failed") {
    const payment = event.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id;
    if (razorpayOrderId) {
      const [order] = await db.select().from(orders).where(eq(orders.razorpayOrderId, razorpayOrderId)).limit(1);
      if (order && order.status === "pending_payment") {
        await db.insert(payments).values({
          orderId: order.id,
          razorpayOrderId,
          razorpayPaymentId: payment.id,
          amount: order.total,
          status: "failed",
          rawWebhookPayload: event,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
