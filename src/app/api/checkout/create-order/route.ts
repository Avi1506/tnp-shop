import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderItems, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateOrderNumber } from "@/lib/order-number";
import { getRazorpay } from "@/lib/razorpay";
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
  const { items, address, customerNote } = parsed.data;

  // Recompute prices server-side from the database — never trust amounts
  // sent by the client.
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

  for (const item of items) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    if (!product || !product.isActive) {
      return NextResponse.json({ error: `A product in your cart is no longer available.` }, { status: 400 });
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

  const shippingFee = 0; // Flat-rate / free shipping — adjust here if you introduce shipping tiers.
  const total = subtotal + shippingFee;
  const orderNumber = generateOrderNumber();

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId: session.user.id,
      status: "pending_payment",
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

  try {
    const rzpOrder = await getRazorpay().orders.create({
      amount: Math.round(total * 100), // paise
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
