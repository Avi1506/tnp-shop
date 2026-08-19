import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export class UploadError extends Error {}

/**
 * Saves a customer-uploaded file (customization photo, bulk enquiry logo, etc).
 * Validates real MIME type from the file's magic bytes (not just the
 * extension/declared content-type, which can be spoofed), enforces a size
 * limit, and stores it via whichever STORAGE_DRIVER is configured.
 *
 * Returns a public URL that can be used in <img> tags / emails / admin UI.
 */
export async function saveUpload(file: File, folder: string): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new UploadError("File is too large. Maximum size is 10MB.");
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
  if (driver === "s3") {
    return saveToS3(key, buffer, detectedMime);
  }
  return saveToLocalDisk(key, buffer);
}

// ---------------------------------------------------------------------------
// Local disk driver — fine for development, NOT recommended for production
// on serverless hosts (Vercel's filesystem is ephemeral). Switch
// STORAGE_DRIVER=s3 and configure Cloudflare R2 / AWS S3 before going live.
// ---------------------------------------------------------------------------
async function saveToLocalDisk(key: string, buffer: Buffer): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const fullPath = path.join(uploadsDir, key);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);
  return `/uploads/${key}`;
}

// ---------------------------------------------------------------------------
// S3-compatible driver (AWS S3, Cloudflare R2, Backblaze B2, etc).
// ---------------------------------------------------------------------------
function getS3Client() {
  if (!process.env.STORAGE_ENDPOINT || !process.env.STORAGE_ACCESS_KEY || !process.env.STORAGE_SECRET_KEY) {
    throw new UploadError(
      "S3 storage is not configured. Set STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY and STORAGE_BUCKET."
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
