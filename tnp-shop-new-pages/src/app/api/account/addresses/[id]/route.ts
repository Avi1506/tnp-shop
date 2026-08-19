import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, session.user.id)));
  return NextResponse.json({ ok: true });
}
