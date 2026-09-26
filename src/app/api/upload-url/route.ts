import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuid } from "uuid";

// ---------------------------------------------------------------------------
// Rule 1 & 2: Presigned R2 Upload URL
// ---------------------------------------------------------------------------
// Instead of streaming a file through Vercel (slow, uses serverless compute
// time, and risks EROFS errors), we hand the browser a short-lived signed URL
// and let it upload directly to Cloudflare R2.
//
// Flow:
//   1. Browser → POST /api/upload-url   (just metadata, tiny payload)
//   2. Server  → returns { uploadUrl, publicUrl }
//   3. Browser → PUT <uploadUrl>        (file goes straight to R2, zero Vercel)
//   4. Browser → saves only <publicUrl> (a short text string) in the DB
//
// Required Vercel environment variables:
//   STORAGE_DRIVER=r2
//   STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
//   STORAGE_ACCESS_KEY=<R2 Access Key ID>
//   STORAGE_SECRET_KEY=<R2 Secret Access Key>
//   STORAGE_BUCKET=<your bucket name>
//   STORAGE_PUBLIC_URL=https://pub-<hash>.r2.dev   (your bucket's public URL)
// ---------------------------------------------------------------------------

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function getR2Client() {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.STORAGE_SECRET_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return null; // R2 not configured — caller falls back to legacy upload
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      contentType?: string;
      contentLength?: number;
      folder?: string;
    };

    const { contentType = "image/jpeg", contentLength, folder = "customizations" } = body;

    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a JPG, PNG, WEBP or PDF." },
        { status: 400 }
      );
    }

    if (contentLength && contentLength > MAX_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    const r2 = getR2Client();

    // If R2 is not configured, signal the client to fall back to the legacy
    // /api/upload route that accepts a raw multipart upload.
    if (!r2) {
      return NextResponse.json({ fallbackToLegacy: true });
    }

    const bucket = process.env.STORAGE_BUCKET;
    if (!bucket) {
      return NextResponse.json({ fallbackToLegacy: true });
    }

    const ext = contentType.split("/")[1].replace("jpeg", "jpg");
    const safeFolder = folder.replace(/[^a-z0-9-_]/gi, "").slice(0, 40) || "customizations";
    const key = `${safeFolder}/${uuid()}.${ext}`;

    // Generate a signed URL valid for 5 minutes
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ...(contentLength ? { ContentLength: contentLength } : {}),
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });

    const base = process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, "");
    const publicUrl = base
      ? `${base}/${key}`
      : `${process.env.STORAGE_ENDPOINT}/${bucket}/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (err) {
    console.error("[upload-url] failed to generate presigned URL:", err);
    return NextResponse.json({ fallbackToLegacy: true });
  }
}
