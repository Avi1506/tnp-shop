import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const progressSchema = z.object({
  learnedAt: z.record(z.string(), z.string()).default({}),
  weak: z.record(z.string(), z.number().int().min(0).max(1000)).default({}),
  attempts: z.number().int().min(0).max(1_000_000).default(0),
});

type ProgressState = z.infer<typeof progressSchema>;

function progressKey(userId: string) {
  return `qa_progress:${userId}`;
}

function emptyProgress(): ProgressState {
  return { learnedAt: {}, weak: {}, attempts: 0 };
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, progressKey(userId)))
    .limit(1);

  const parsed = progressSchema.safeParse(row?.value ?? emptyProgress());

  return NextResponse.json(
    {
      userId,
      state: parsed.success ? parsed.data : emptyProgress(),
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = progressSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid progress payload" }, { status: 400 });
  }

  const now = new Date();
  await db
    .insert(siteSettings)
    .values({
      key: progressKey(userId),
      value: parsed.data,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value: parsed.data,
        updatedAt: now,
      },
    });

  return NextResponse.json({
    ok: true,
    updatedAt: now.toISOString(),
  });
}
