import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(5),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in all fields correctly." }, { status: 400 });
  }

  await sendEmail({
    to: process.env.ADMIN_EMAIL ?? "admin@thenoveltyprints.com",
    subject: `New message from ${parsed.data.name}`,
    event: "contact_message",
    html: `<div style="font-family:sans-serif;">
      <p><strong>From:</strong> ${parsed.data.name} (${parsed.data.email})</p>
      <p>${parsed.data.message}</p>
    </div>`,
  });

  return NextResponse.json({ ok: true });
}
