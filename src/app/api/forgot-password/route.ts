import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({ email: "" }));
  const normalized = String(email ?? "").toLowerCase().trim();

  // Always respond success (don't leak whether an email is registered)
  const [user] = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await db.insert(passwordResetTokens).values({ userId: user.id, token, expires });

    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your The Novelty Prints password",
      event: "password_reset_requested",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <p>Hi ${user.name ?? ""},</p>
        <p>Click below to reset your password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}" style="background:#1B2A4A;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Reset Password</a></p>
        <p style="color:#888;font-size:12px;">If you didn't request this, you can ignore this email.</p>
      </div>`,
    });
  }

  return NextResponse.json({ ok: true });
}
