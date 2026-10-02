import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuid } from "uuid";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_FOLDERS = new Set([
  "customizations",
  "previews",
  "print-ready",
  "mockups",
  "products",
  "bulk-enquiries",
]);

function getR2Client() {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const accessKeyId = process.env.STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.STORAGE_SECRET_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      contentType?: string;
      contentLength?: number;
      folder?: string;
    };

    const {
      contentType = "image/jpeg",
      contentLength,
      folder = "customizations",
    } = body;

    if (!ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json(
        { error: "Upload folder is not allowed." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a JPG, PNG, WEBP or PDF." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(contentLength) ||
      !contentLength ||
      contentLength < 1 ||
      contentLength > MAX_BYTES
    ) {
      return NextResponse.json(
        { error: "Invalid file size. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    const r2 = getR2Client();
    const bucket = process.env.STORAGE_BUCKET;

    if (!r2 || !bucket) {
      return NextResponse.json({ fallbackToLegacy: true });
    }

    const ext = contentType.split("/")[1].replace("jpeg", "jpg");
    const key = `${folder}/${uuid()}.${ext}`;

    // Do not sign Content-Length. Browsers own that forbidden request header,
    // and signing it makes preview-origin uploads unnecessarily brittle.
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });

    const base = process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, "");
    const publicUrl = base
      ? `${base}/${key}`
      : `${process.env.STORAGE_ENDPOINT}/${bucket}/${key}`;

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (error) {
    console.error("[upload-url] failed to generate presigned URL:", error);
    return NextResponse.json({ fallbackToLegacy: true });
  }
}
