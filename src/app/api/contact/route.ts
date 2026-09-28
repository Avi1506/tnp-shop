import { NextRequest, NextResponse } from "next/server";
import { sendEmail, getAdminEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(255),
  message: z.string().min(5).max(5000),
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in all fields correctly." }, { status: 400 });
  }

  const adminEmail = await getAdminEmail();
  const name = escapeHtml(parsed.data.name);
  const email = escapeHtml(parsed.data.email);
  const message = escapeHtml(parsed.data.message);

  await sendEmail({
    to: adminEmail,
    subject: `New message from ${parsed.data.name}`,
    event: "contact_message",
    html: `<div style="font-family:sans-serif;">
      <p><strong>From:</strong> ${name} (${email})</p>
      <p>${message}</p>
    </div>`,
  });

  return NextResponse.json({ ok: true });
}
