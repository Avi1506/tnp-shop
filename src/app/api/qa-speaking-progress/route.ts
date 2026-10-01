import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  sessions: z.number().int().min(0).max(100000).default(0),
  bestScore: z.number().int().min(0).max(100).default(0),
  lastScore: z.number().int().min(0).max(100).default(0),
  lastPracticedAt: z.string().nullable().default(null),
  lastPromptId: z.string().nullable().default(null),
});

function key(userId: string) {
  return `qa_speaking_progress:${userId}`;
}

const empty = {
  sessions: 0,
  bestScore: 0,
  lastScore: 0,
  lastPracticedAt: null,
  lastPromptId: null,
};

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key(userId)))
    .limit(1);

  const parsed = schema.safeParse(row?.value ?? empty);
  return NextResponse.json(
    { state: parsed.success ? parsed.data : empty },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid speaking progress payload" }, { status: 400 });
  }

  const now = new Date();
  await db
    .insert(siteSettings)
    .values({ key: key(userId), value: parsed.data, updatedAt: now })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: parsed.data, updatedAt: now },
    });

  return NextResponse.json({ ok: true, updatedAt: now.toISOString() });
}
