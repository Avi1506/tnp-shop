import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderItems, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyRazorpaySignature } from "@/lib/razorpay";
import { formatINR } from "@/lib/format";
import { sendEmail, customerOrderConfirmedEmail, adminNewOrderEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {};

  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.userId !== session.user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.razorpayOrderId !== razorpay_order_id) {
    return NextResponse.json({ error: "Order mismatch." }, { status: 400 });
  }

  // THIS is the step that actually matters — we recompute the expected
  // signature server-side with our secret key. A client can fake a
  // "success" callback, but it cannot fake this signature.
  const valid = verifyRazorpaySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!valid) {
    await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, order.id));
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  // Idempotency: if this order was already marked paid (e.g. duplicate
  // callback / webhook race), don't re-send emails or double-insert.
  if (order.status === "payment_received" || order.status === "in_production") {
    return NextResponse.json({ ok: true, orderNumber: order.orderNumber, alreadyProcessed: true });
  }

  await db
    .update(orders)
    .set({ status: "payment_received", razorpayPaymentId: razorpay_payment_id, updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  await db.insert(payments).values({
    orderId: order.id,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    amount: order.total,
    status: "paid",
  });

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const itemsHtml = items
    .map(
      (it) =>
        `<div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #E9E4D8;">
          ${it.productImage ? `<img src="${it.productImage}" width="48" height="48" style="border-radius:6px;object-fit:cover;" />` : ""}
          <div>
            <div style="font-size:13px;font-weight:600;color:#1B2A4A;">${it.productName} × ${it.quantity}</div>
            ${it.customization?.text ? `<div style="font-size:12px;color:#8A8577;">Text: "${it.customization.text}"</div>` : ""}
            ${it.customization?.size ? `<div style="font-size:12px;color:#8A8577;">Size: ${it.customization.size}</div>` : ""}
            <div style="font-size:12px;color:#A63446;font-weight:600;">${formatINR(it.lineTotal)}</div>
          </div>
        </div>`
    )
    .join("");

  const addr = order.shippingAddress;
  const addressStr = `${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}, ${addr.city}, ${addr.state} ${addr.pincode}`;

  await sendEmail({
    to: order.customerEmail,
    subject: `Your order ${order.orderNumber} has been confirmed`,
    event: "order_confirmed",
    orderId: order.id,
    html: customerOrderConfirmedEmail({
      orderNumber: order.orderNumber,
      customerName: addr.fullName,
      total: formatINR(order.total),
      itemsHtml,
    }),
  });

  await sendEmail({
    to: process.env.ADMIN_EMAIL ?? "admin@thenoveltyprints.com",
    subject: `New Customized Order Received — ${order.orderNumber}`,
    event: "admin_new_order",
    orderId: order.id,
    html: adminNewOrderEmail({
      orderNumber: order.orderNumber,
      customerName: addr.fullName,
      customerPhone: addr.phone,
      customerEmail: order.customerEmail,
      address: addressStr,
      total: formatINR(order.total),
      itemsHtml,
    }),
  });

  return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
}
