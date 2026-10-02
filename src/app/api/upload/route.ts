import { NextRequest, NextResponse } from "next/server";
import { saveUpload, UploadError } from "@/lib/storage";

export const runtime = "nodejs";

const ALLOWED_FOLDERS = new Set([
  "customizations",
  "previews",
  "print-ready",
  "mockups",
  "products",
  "bulk-enquiries",
]);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") ?? "customizations");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: "Upload folder is not allowed." }, { status: 400 });
    }

    const url = await saveUpload(file, folder);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[upload] failed", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
