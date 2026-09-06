import { NextResponse } from "next/server";
import { getCodSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const cod = await getCodSettings();
  return NextResponse.json({ cod });
}
