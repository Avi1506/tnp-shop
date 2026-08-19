import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json().catch(() => ({}));
  if (!token || !password || String(password).length < 8) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, String(token)),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expires, new Date())
      )
    )
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, record.id));

  return NextResponse.json({ ok: true });
}
