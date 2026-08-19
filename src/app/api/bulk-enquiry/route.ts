import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bulkEnquiries } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  company: z.string().optional(),
  phone: z.string().min(8),
  email: z.string().email(),
  productRequired: z.string().optional(),
  quantity: z.string().optional(),
  budget: z.string().optional(),
  deliveryDate: z.string().optional(),
  message: z.string().optional(),
  fileUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in the required fields correctly." }, { status: 400 });
  }

  const [enquiry] = await db.insert(bulkEnquiries).values(parsed.data).returning();

  await sendEmail({
    to: process.env.ADMIN_EMAIL ?? "admin@thenoveltyprints.com",
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
