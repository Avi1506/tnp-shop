import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bulkEnquiries } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  company: z.string().nullable().optional(),
  phone: z.string().min(8, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email address"),
  productRequired: z.string().nullable().optional(),
  quantity: z.string().nullable().optional(),
  budget: z.string().nullable().optional(),
  deliveryDate: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  fileUrl: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || "Please fill in the required fields correctly.";
    return NextResponse.json({ error: issue }, { status: 400 });
  }

  const [enquiry] = await db
    .insert(bulkEnquiries)
    .values({
      name: parsed.data.name,
      company: parsed.data.company ?? null,
      phone: parsed.data.phone,
      email: parsed.data.email,
      productRequired: parsed.data.productRequired ?? null,
      quantity: parsed.data.quantity ?? null,
      budget: parsed.data.budget ?? null,
      deliveryDate: parsed.data.deliveryDate ?? null,
      message: parsed.data.message ?? null,
      fileUrl: parsed.data.fileUrl ?? null,
    })
    .returning();

  await sendEmail({
    to: process.env.ADMIN_EMAIL ?? "thenoveltyprints@gmail.com",
    subject: `New Bulk Enquiry from ${parsed.data.name}`,
    event: "bulk_enquiry",
    html: `
      <div style="font-family:sans-serif;">
        <h2>New Bulk / Corporate Enquiry</h2>
        <p><strong>Name:</strong> ${parsed.data.name}</p>
        <p><strong>Company:</strong> ${parsed.data.company ?? "—"}</p>
        <p><strong>Phone:</strong> ${parsed.data.phone}</p>
        <p><strong>Email:</strong> ${parsed.data.email}</p>
        <p><strong>Product Required:</strong> ${parsed.data.productRequired ?? "—"}</p>
        <p><strong>Quantity:</strong> ${parsed.data.quantity ?? "—"}</p>
        <p><strong>Budget:</strong> ${parsed.data.budget ?? "—"}</p>
        <p><strong>Delivery Date:</strong> ${parsed.data.deliveryDate ?? "—"}</p>
        <p><strong>Message:</strong> ${parsed.data.message ?? "—"}</p>
        ${parsed.data.fileUrl ? `<p><a href="${parsed.data.fileUrl}">View attached file/logo</a></p>` : ""}
      </div>`,
  });

  return NextResponse.json({ ok: true, id: enquiry.id });
}
