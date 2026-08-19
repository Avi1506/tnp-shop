import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const updates: Partial<typeof users.$inferInsert> = {};
  if (body.name) updates.name = body.name;
  if (body.phone) updates.phone = body.phone;

  if (body.newPassword) {
    if (String(body.newPassword).length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
    if (!user?.passwordHash || !(await bcrypt.compare(body.currentPassword ?? "", user.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    updates.passwordHash = await bcrypt.hash(body.newPassword, 10);
  }

  await db.update(users).set(updates).where(eq(users.id, session.user.id));
  return NextResponse.json({ ok: true });
}
