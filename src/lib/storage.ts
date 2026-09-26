import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export class UploadError extends Error {}

// ---------------------------------------------------------------------------
// saveUpload — legacy server-side upload path
// ---------------------------------------------------------------------------
// This function is the FALLBACK path used when:
//   a) Cloudflare R2 is not configured yet (STORAGE_DRIVER != "r2"), OR
//   b) The client could not use the presigned URL flow.
//
// Preferred path (Rule 1): Use /api/upload-url to get a presigned R2 URL and
// let the browser upload directly — that path never touches this function.
//
// Drivers:
//   STORAGE_DRIVER=r2  → Cloudflare R2 (or any S3-compatible store)
//   STORAGE_DRIVER=s3  → AWS S3 (same implementation, different endpoint)
//   (default)          → Local disk; falls back to Base64 Data URI on Vercel
// ---------------------------------------------------------------------------
export async function saveUpload(file: File, folder: string): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new UploadError("File is too large. Maximum size is 10 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedMime = sniffMime(buffer) ?? file.type;

  if (!ALLOWED_MIME.has(detectedMime)) {
    throw new UploadError("Unsupported file type. Please upload a JPG, PNG, WEBP or PDF.");
  }

  const ext = extensionFor(detectedMime);
  const filename = `${uuid()}.${ext}`;
  const key = `${folder}/${filename}`;

  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "r2" || driver === "s3") {
    return saveToS3(key, buffer, detectedMime);
  }
  return saveToLocalDisk(key, buffer, detectedMime);
}

// ---------------------------------------------------------------------------
// Local disk driver — development only.
// On Vercel (read-only filesystem) falls back to Base64 Data URI so the app
// doesn't crash. Data URIs are stored directly in the database — this is fine
// for a small number of uploads but will bloat your Neon free tier quickly.
// Set up Cloudflare R2 to avoid this (see /api/upload-url).
// ---------------------------------------------------------------------------
async function saveToLocalDisk(
  key: string,
  buffer: Buffer,
  detectedMime: string
): Promise<string> {
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const fullPath = path.join(uploadsDir, key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return `/uploads/${key}`;
  } catch (err: unknown) {
    console.warn("[storage] Local disk save unavailable, using Data URI fallback:", err);
    // Base64 Data URI fallback — works everywhere, but is large.
    return `data:${detectedMime};base64,${buffer.toString("base64")}`;
  }
}

// ---------------------------------------------------------------------------
// S3 / R2 driver — preferred for production.
// ---------------------------------------------------------------------------
function getS3Client() {
  if (
    !process.env.STORAGE_ENDPOINT ||
    !process.env.STORAGE_ACCESS_KEY ||
    !process.env.STORAGE_SECRET_KEY
  ) {
    throw new UploadError(
      "Cloud storage is not configured. Set STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY and STORAGE_BUCKET."
    );
  }
  return new S3Client({
    region: "auto",
    endpoint: process.env.STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY,
      secretAccessKey: process.env.STORAGE_SECRET_KEY,
    },
  });
}

async function saveToS3(key: string, buffer: Buffer, contentType: string): Promise<string> {
  const client = getS3Client();
  const bucket = process.env.STORAGE_BUCKET;
  if (!bucket) throw new UploadError("STORAGE_BUCKET is not set.");

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const base = process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, "");
  return base ? `${base}/${key}` : `${process.env.STORAGE_ENDPOINT}/${bucket}/${key}`;
}

// ---------------------------------------------------------------------------
// Magic-byte sniffing — don't trust the filename extension or the
// browser-supplied Content-Type header alone.
// ---------------------------------------------------------------------------
function sniffMime(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;
  const hex = buffer.subarray(0, 4).toString("hex");
  if (hex.startsWith("ffd8")) return "image/jpeg";
  if (hex === "89504e47") return "image/png";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF") return "image/webp";
  if (buffer.subarray(0, 4).toString("ascii") === "%PDF") return "application/pdf";
  return null;
}

function extensionFor(mime: string): string {
  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}
