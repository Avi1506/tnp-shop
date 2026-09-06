import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getCodSettings, updateCodSettings } from "@/lib/settings";
import { z } from "zod";

const codSchema = z.object({
  enabled: z.boolean(),
  minAmount: z.number().nonnegative().optional(),
  maxAmount: z.number().positive().optional(),
  note: z.string().max(300).optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cod = await getCodSettings();
  return NextResponse.json({ cod });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = codSchema.safeParse(body?.cod);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid settings data" },
      { status: 400 }
    );
  }

  const updated = await updateCodSettings(parsed.data);
  return NextResponse.json({ ok: true, cod: updated });
}
