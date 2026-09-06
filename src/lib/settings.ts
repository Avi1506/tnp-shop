import "server-only";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface CodSettings {
  enabled: boolean;
  minAmount?: number;
  maxAmount?: number;
  note?: string;
}

export const DEFAULT_COD_SETTINGS: CodSettings = {
  enabled: true,
  minAmount: 0,
  maxAmount: 10000,
  note: "Pay cash upon delivery. Please keep exact change ready.",
};

export async function getCodSettings(): Promise<CodSettings> {
  try {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "cod_settings"))
      .limit(1);

    if (row?.value) {
      return { ...DEFAULT_COD_SETTINGS, ...(row.value as CodSettings) };
    }
  } catch (err) {
    console.error("[settings] Failed to fetch COD settings:", err);
  }
  return DEFAULT_COD_SETTINGS;
}

export async function updateCodSettings(settings: Partial<CodSettings>): Promise<CodSettings> {
  const current = await getCodSettings();
  const updated: CodSettings = { ...current, ...settings };

  await db
    .insert(siteSettings)
    .values({
      key: "cod_settings",
      value: updated,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: {
        value: updated,
        updatedAt: new Date(),
      },
    });

  return updated;
}
