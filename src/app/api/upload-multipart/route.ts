import { NextRequest, NextResponse } from "next/server";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const CHUNK_BYTES = 1536 * 1024;
const MAX_PARTS = Math.ceil(MAX_BYTES / CHUNK_BYTES);

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

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

function publicUrlForKey(key: string) {
  const base = process.env.STORAGE_PUBLIC_URL?.replace(/\/$/, "");
  const bucket = process.env.STORAGE_BUCKET;

  return base
    ? `${base}/${key}`
    : `${process.env.STORAGE_ENDPOINT}/${bucket}/${key}`;
}

function extensionFor(contentType: string) {
  if (contentType === "image/jpeg" || contentType === "image/jpg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "pdf";
}

function validFinalKey(key: string) {
  const [folder] = key.split("/");
  return (
    ALLOWED_FOLDERS.has(folder) &&
    /^[a-z0-9-]+\/[0-9a-f-]+\.(?:jpg|png|webp|pdf)$/i.test(key)
  );
}

function validSessionId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

function tempKey(sessionId: string, partNumber: number) {
  return `_upload-staging/${sessionId}/part-${String(partNumber).padStart(2, "0")}`;
}

function matchesType(buffer: Buffer, contentType: string) {
  if (buffer.length < 4) return false;

  if (contentType === "image/jpeg" || contentType === "image/jpg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8;
  }

  if (contentType === "image/png") {
    return buffer.subarray(0, 4).toString("hex") === "89504e47";
  }

  if (contentType === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.length >= 12 &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  if (contentType === "application/pdf") {
    return buffer.subarray(0, 4).toString("ascii") === "%PDF";
  }

  return false;
}

async function readBodyBytes(body: unknown) {
  if (
    body &&
    typeof body === "object" &&
    "transformToByteArray" in body &&
    typeof (body as { transformToByteArray?: unknown }).transformToByteArray === "function"
  ) {
    const bytes = await (
      body as { transformToByteArray: () => Promise<Uint8Array> }
    ).transformToByteArray();
    return Buffer.from(bytes);
  }

  throw new Error("Storage returned an unreadable staged chunk.");
}

async function cleanupChunks(
  r2: S3Client,
  bucket: string,
  sessionId: string,
  partCount: number
) {
  await Promise.allSettled(
    Array.from({ length: partCount }, (_, index) =>
      r2.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: tempKey(sessionId, index + 1),
        })
      )
    )
  );
}

export async function POST(req: NextRequest) {
  try {
    const r2 = getR2Client();
    const bucket = process.env.STORAGE_BUCKET;

    if (!r2 || !bucket) {
      return NextResponse.json(
        { error: "Image storage is temporarily unavailable." },
        { status: 503 }
      );
    }

    const body = (await req.json()) as {
      action?: "init" | "complete";
      contentType?: string;
      contentLength?: number;
      folder?: string;
      key?: string;
      sessionId?: string;
      partCount?: number;
    };

    if (body.action === "init") {
      const contentType = body.contentType ?? "";
      const contentLength = body.contentLength ?? 0;
      const folder = body.folder ?? "customizations";

      if (!ALLOWED_TYPES.has(contentType)) {
        return NextResponse.json(
          { error: "Unsupported file type." },
          { status: 400 }
        );
      }

      if (!ALLOWED_FOLDERS.has(folder)) {
        return NextResponse.json(
          { error: "Upload folder is not allowed." },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(contentLength) ||
        contentLength < 1 ||
        contentLength > MAX_BYTES
      ) {
        return NextResponse.json(
          { error: "Invalid file size." },
          { status: 400 }
        );
      }

      const sessionId = uuid();
      const key = `${folder}/${uuid()}.${extensionFor(contentType)}`;
      const partCount = Math.ceil(contentLength / CHUNK_BYTES);

      return NextResponse.json({
        key,
        sessionId,
        partCount,
        chunkBytes: CHUNK_BYTES,
        publicUrl: publicUrlForKey(key),
      });
    }

    if (body.action === "complete") {
      const key = body.key ?? "";
      const sessionId = body.sessionId ?? "";
      const contentType = body.contentType ?? "";
      const contentLength = body.contentLength ?? 0;
      const partCount = body.partCount ?? 0;

      if (
        !validFinalKey(key) ||
        !validSessionId(sessionId) ||
        !ALLOWED_TYPES.has(contentType) ||
        !Number.isInteger(contentLength) ||
        contentLength < 1 ||
        contentLength > MAX_BYTES ||
        !Number.isInteger(partCount) ||
        partCount < 1 ||
        partCount > MAX_PARTS ||
        partCount !== Math.ceil(contentLength / CHUNK_BYTES)
      ) {
        return NextResponse.json(
          { error: "Invalid upload session." },
          { status: 400 }
        );
      }

      const chunks: Buffer[] = [];

      for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
        const object = await r2.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: tempKey(sessionId, partNumber),
          })
        );

        chunks.push(await readBodyBytes(object.Body));
      }

      const finalBuffer = Buffer.concat(chunks);

      if (finalBuffer.length !== contentLength) {
        await cleanupChunks(r2, bucket, sessionId, partCount);
        return NextResponse.json(
          { error: "Uploaded image was incomplete. Please retry." },
          { status: 400 }
        );
      }

      if (!matchesType(finalBuffer, contentType)) {
        await cleanupChunks(r2, bucket, sessionId, partCount);
        return NextResponse.json(
          { error: "File content does not match its type." },
          { status: 400 }
        );
      }

      await r2.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: finalBuffer,
          ContentType: contentType,
          ContentLength: finalBuffer.length,
        })
      );

      await r2.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      await cleanupChunks(r2, bucket, sessionId, partCount);

      return NextResponse.json({
        publicUrl: publicUrlForKey(key),
      });
    }

    return NextResponse.json(
      { error: "Unknown upload action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[upload-staging] request failed:", error);
    return NextResponse.json(
      { error: "Could not upload image. Please retry." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const r2 = getR2Client();
    const bucket = process.env.STORAGE_BUCKET;

    if (!r2 || !bucket) {
      return NextResponse.json(
        { error: "Image storage is temporarily unavailable." },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId") ?? "";
    const partNumber = Number(searchParams.get("partNumber"));
    const partCount = Number(searchParams.get("partCount"));

    if (
      !validSessionId(sessionId) ||
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      !Number.isInteger(partCount) ||
      partCount < 1 ||
      partCount > MAX_PARTS ||
      partNumber > partCount
    ) {
      return NextResponse.json(
        { error: "Invalid upload chunk." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await req.arrayBuffer());

    if (!buffer.length || buffer.length > CHUNK_BYTES) {
      return NextResponse.json(
        { error: "Invalid upload chunk size." },
        { status: 400 }
      );
    }

    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: tempKey(sessionId, partNumber),
        Body: buffer,
        ContentType: "application/octet-stream",
        ContentLength: buffer.length,
      })
    );

    return NextResponse.json({
      partNumber,
      size: buffer.length,
    });
  } catch (error) {
    console.error("[upload-staging] chunk failed:", error);
    return NextResponse.json(
      { error: "Could not upload image. Please retry." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const r2 = getR2Client();
    const bucket = process.env.STORAGE_BUCKET;

    if (!r2 || !bucket) {
      return new NextResponse(null, { status: 204 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId") ?? "";
    const partCount = Number(searchParams.get("partCount"));

    if (
      !validSessionId(sessionId) ||
      !Number.isInteger(partCount) ||
      partCount < 1 ||
      partCount > MAX_PARTS
    ) {
      return new NextResponse(null, { status: 204 });
    }

    await cleanupChunks(r2, bucket, sessionId, partCount);
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
