import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderItems, products, addresses, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateOrderNumber } from "@/lib/order-number";
import { getRazorpay } from "@/lib/razorpay";
import { formatINR } from "@/lib/format";
import { sendEmail, customerOrderConfirmedEmail, adminNewOrderEmail, getAdminEmail } from "@/lib/email";
import { z } from "zod";

const lineSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(50),
  customization: z
    .object({
      uploadedImages: z.array(z.string()),
      text: z.string().nullable(),
      font: z.string().nullable(),
      textColor: z.string().nullable(),
      productColor: z.string().nullable(),
      size: z.string().nullable(),
      specialInstructions: z.string().nullable(),
      previewImage: z.string().nullable(),
      approved: z.boolean(),
    })
    .nullable(),
});

const addressSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(8),
  line1: z.string().min(3),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().min(4).max(10),
});

const schema = z.object({
  items: z.array(lineSchema).min(1),
  address: addressSchema,
  customerNote: z.string().optional(),
  paymentMethod: z.enum(["online", "cod"]).default("online"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Please log in to check out." }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout data." }, { status: 400 });
  }
  const { items, address, customerNote, paymentMethod } = parsed.data;

  // Recompute prices server-side from the database
  let subtotal = 0;
  const resolvedItems: {
    productId: string;
    productName: string;
    productImage: string | null;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    customization: (typeof items)[number]["customization"];
  }[] = [];

  let hasNonCodProduct = false;
  let nonCodProductName = "";

  for (const item of items) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product || !product.isActive) {
      return NextResponse.json({ error: `A product in your cart is no longer available.` }, { status: 400 });
    }
    if (product.codAvailable === false) {
      hasNonCodProduct = true;
      nonCodProductName = product.name;
    }
    if (product.customizable && product.customization?.fields && (product.customization.fields.imageUpload || product.customization.fields.text)) {
      if (!item.customization?.approved) {
        return NextResponse.json(
          { error: `Please approve the customization for "${product.name}" before checking out.` },
          { status: 400 }
        );
      }
    }
    const unitPrice = parseFloat(product.startingPrice);
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    resolvedItems.push({
      productId: product.id,
      productName: product.name,
      productImage: item.customization?.previewImage || product.images?.[0] || null,
      quantity: item.quantity,
      unitPrice: unitPrice.toFixed(2),
      lineTotal: lineTotal.toFixed(2),
      customization: item.customization,
    });
  }

  const shippingFee = 0;
  const total = subtotal + shippingFee;

  // Server-side COD validation against store settings & product flags
  if (paymentMethod === "cod") {
    if (hasNonCodProduct) {
      return NextResponse.json(
        { error: `Cash on Delivery is unavailable because "${nonCodProductName}" requires prepaid payment.` },
        { status: 400 }
      );
    }

    const { getCodSettings } = await import("@/lib/settings");
    const codSettings = await getCodSettings();
    if (!codSettings.enabled) {
      return NextResponse.json(
        { error: "Cash on Delivery is currently unavailable. Please choose Online Payment." },
        { status: 400 }
      );
    }
    if (codSettings.minAmount && subtotal < codSettings.minAmount) {
      return NextResponse.json(
        { error: `Cash on Delivery is only available for orders above ₹${codSettings.minAmount}.` },
        { status: 400 }
      );
    }
    if (codSettings.maxAmount && subtotal > codSettings.maxAmount) {
      return NextResponse.json(
        { error: `Cash on Delivery is only available for orders up to ₹${codSettings.maxAmount}. Please choose Online Payment.` },
        { status: 400 }
      );
    }
  }

  const orderNumber = generateOrderNumber();

  // For COD: Status is design_review (order confirmed, payment expected on delivery)
  // For Online: Status is pending_payment until Razorpay signature is verified
  const initialStatus = paymentMethod === "cod" ? "design_review" : "pending_payment";

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId: session.user.id,
      status: initialStatus,
      paymentMethod,
      subtotal: subtotal.toFixed(2),
      shippingFee: shippingFee.toFixed(2),
      total: total.toFixed(2),
      shippingAddress: address,
      customerEmail: session.user.email ?? "",
      customerNote,
    })
    .returning();

  await db.insert(orderItems).values(
    resolvedItems.map((it) => ({
      orderId: order.id,
      productId: it.productId,
      productName: it.productName,
      productImage: it.productImage,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal,
      customization: it.customization,
    }))
  );

  // Auto-save shipping address to customer's address book (if not already saved)
  try {
    const existingAddresses = await db
      .select()
      .from(addresses)
      .where(
        and(
          eq(addresses.userId, session.user.id),
          eq(addresses.pincode, address.pincode),
          eq(addresses.phone, address.phone),
          eq(addresses.line1, address.line1)
        )
      )
      .limit(1);

    if (existingAddresses.length === 0) {
      // Check if this is the user's first address (make it default)
      const allAddresses = await db
        .select({ id: addresses.id })
        .from(addresses)
        .where(eq(addresses.userId, session.user.id));

      await db.insert(addresses).values({
        userId: session.user.id,
        label: "Order",
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2 ?? null,
        landmark: address.landmark ?? null,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        isDefault: allAddresses.length === 0,
      });
    }
    // Update phone on user profile if not set
    if (address.phone && session.user.id) {
      await db
        .update(users)
        .set({ phone: address.phone })
        .where(and(eq(users.id, session.user.id), eq(users.phone, "")));
    }
  } catch {
    // Non-critical — don't fail the order if address save fails
  }

  // --- CASH ON DELIVERY (COD) FLOW ---
  if (paymentMethod === "cod") {
    const itemsHtml = resolvedItems
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

    const addressStr = `${address.line1}${address.line2 ? ", " + address.line2 : ""}, ${address.city}, ${address.state} ${address.pincode}`;

    // Send Customer Order Confirmed Email for COD
    await sendEmail({
      to: order.customerEmail,
      subject: `Order ${order.orderNumber} Confirmed (Cash on Delivery)`,
      event: "order_confirmed_cod",
      orderId: order.id,
      html: customerOrderConfirmedEmail({
        orderNumber: order.orderNumber,
        customerName: address.fullName,
        total: `${formatINR(order.total)} (Cash on Delivery)`,
        itemsHtml,
      }),
    });

    const adminRecipient = await getAdminEmail();

    // Send Admin New Order Email for COD
    await sendEmail({
      to: adminRecipient,
      subject: `New COD Order Received — ${order.orderNumber}`,
      event: "admin_new_order_cod",
      orderId: order.id,
      html: adminNewOrderEmail({
        orderNumber: `${order.orderNumber} [COD]`,
        customerName: address.fullName,
        customerPhone: address.phone,
        customerEmail: order.customerEmail,
        address: addressStr,
        total: `${formatINR(order.total)} (Cash on Delivery)`,
        itemsHtml,
      }),
    });

    return NextResponse.json({
      ok: true,
      isCod: true,
      orderId: order.id,
      orderNumber,
    });
  }

  // --- ONLINE PAYMENT (RAZORPAY) FLOW ---
  try {
    const rzpOrder = await getRazorpay().orders.create({
      amount: Math.round(total * 100),
      currency: "INR",
      receipt: orderNumber,
      notes: { orderId: order.id, orderNumber },
    });

    await db.update(orders).set({ razorpayOrderId: rzpOrder.id }).where(eq(orders.id, order.id));

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      customerName: address.fullName,
      customerEmail: session.user.email,
      customerPhone: address.phone,
    });
  } catch (err) {
    console.error("[razorpay] order creation failed", err);
    return NextResponse.json(
      {
        error:
          "Payment gateway is not configured yet. Add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to your environment.",
      },
      { status: 500 }
    );
  }
}
