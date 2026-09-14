import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  getCodSettings,
  updateCodSettings,
  getEmailTemplates,
  updateEmailTemplates,
  getEmailSettings,
  updateEmailSettings,
} from "@/lib/settings";
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
  const emailTemplates = await getEmailTemplates();
  const emailSettings = await getEmailSettings();
  return NextResponse.json({ cod, emailTemplates, emailSettings });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  let updatedCod = null;
  let updatedEmailTemplates = null;
  let updatedEmailSettings = null;

  if (body?.cod) {
    const parsedCod = codSchema.safeParse(body.cod);
    if (!parsedCod.success) {
      return NextResponse.json(
        { error: parsedCod.error.issues[0]?.message || "Invalid COD settings data" },
        { status: 400 }
      );
    }
    updatedCod = await updateCodSettings(parsedCod.data);
  }

  if (body?.emailTemplates) {
    updatedEmailTemplates = await updateEmailTemplates(body.emailTemplates);
  }

  if (body?.emailSettings) {
    updatedEmailSettings = await updateEmailSettings(body.emailSettings);
  }

  return NextResponse.json({
    ok: true,
    cod: updatedCod || (await getCodSettings()),
    emailTemplates: updatedEmailTemplates || (await getEmailTemplates()),
    emailSettings: updatedEmailSettings || (await getEmailSettings()),
  });
}
