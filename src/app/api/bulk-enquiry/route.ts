import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bulkEnquiries } from "@/db/schema";
import { sendEmail, getAdminEmail } from "@/lib/email";
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

  const adminRecipient = await getAdminEmail();

  // 1. Send Admin Notification
  await sendEmail({
    to: adminRecipient,
    subject: `New Bulk Enquiry from ${parsed.data.name}`,
    event: "bulk_enquiry",
    html: `
      <div style="font-family:Poppins,Arial,sans-serif;background:#FAF9F6;padding:24px;">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E9E4D8;padding:24px 32px;">
          <h2 style="color:#1B2A4A;margin-top:0;">New Bulk / Corporate Enquiry</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#8A8577;width:140px;">Name:</td><td style="padding:6px 0;color:#1B2A4A;font-weight:600;">${parsed.data.name}</td></tr>
            <tr><td style="padding:6px 0;color:#8A8577;">Company:</td><td style="padding:6px 0;color:#1B2A4A;font-weight:600;">${parsed.data.company ?? "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#8A8577;">Phone:</td><td style="padding:6px 0;color:#1B2A4A;font-weight:600;">${parsed.data.phone}</td></tr>
            <tr><td style="padding:6px 0;color:#8A8577;">Email:</td><td style="padding:6px 0;color:#1B2A4A;font-weight:600;">${parsed.data.email}</td></tr>
            <tr><td style="padding:6px 0;color:#8A8577;">Product:</td><td style="padding:6px 0;color:#1B2A4A;font-weight:600;">${parsed.data.productRequired ?? "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#8A8577;">Quantity:</td><td style="padding:6px 0;color:#1B2A4A;font-weight:600;">${parsed.data.quantity ?? "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#8A8577;">Budget:</td><td style="padding:6px 0;color:#1B2A4A;font-weight:600;">${parsed.data.budget ?? "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#8A8577;">Delivery Date:</td><td style="padding:6px 0;color:#1B2A4A;font-weight:600;">${parsed.data.deliveryDate ?? "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#8A8577;">Message:</td><td style="padding:6px 0;color:#1B2A4A;">${parsed.data.message ?? "—"}</td></tr>
            ${parsed.data.fileUrl ? `<tr><td style="padding:6px 0;color:#8A8577;">Attachment:</td><td style="padding:6px 0;"><a href="${parsed.data.fileUrl}" style="color:#B8912A;font-weight:600;">View Attached File / Logo</a></td></tr>` : ""}
          </table>
        </div>
      </div>`,
  });

  // 2. Send Customer Confirmation Receipt
  await sendEmail({
    to: parsed.data.email,
    subject: "We've received your Bulk / Corporate Enquiry — The Novelty Prints",
    event: "bulk_enquiry_customer_ack",
    html: `
      <div style="font-family:Poppins,Arial,sans-serif;background:#FAF9F6;padding:24px;">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E9E4D8;padding:24px 32px;">
          <h2 style="color:#1B2A4A;margin-top:0;">Thank you for reaching out, ${parsed.data.name}!</h2>
          <p style="color:#3A3A3A;font-size:14px;line-height:1.6;">
            We have received your enquiry for <strong>${parsed.data.productRequired ?? "Bulk Customization"}</strong> (Quantity: ${parsed.data.quantity ?? "As requested"}).
          </p>
          <p style="color:#3A3A3A;font-size:14px;line-height:1.6;">
            Our team will review your requirements and get back to you shortly with a customized quote and sample mockups.
          </p>
          <p style="color:#8A8577;font-size:12px;margin-top:24px;border-top:1px solid #E9E4D8;padding-top:16px;">
            For urgent requirements, you can also reach us directly on WhatsApp at <strong>89230 32312</strong>.
          </p>
        </div>
      </div>`,
  });

  return NextResponse.json({ ok: true, id: enquiry.id });
}
