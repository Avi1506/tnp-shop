import { NextRequest, NextResponse } from "next/server";
import { saveUpload, UploadError } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") ?? "customizations");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const safeFolder = folder.replace(/[^a-z0-9-_]/gi, "").slice(0, 40) || "customizations";
    const url = await saveUpload(file, safeFolder);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[upload] failed", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
