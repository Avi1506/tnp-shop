import { NextRequest, NextResponse } from "next/server";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  HeadObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuid } from "uuid";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PART_BYTES = 2 * 1024 * 1024;
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

function validKey(key: string) {
  const [folder] = key.split("/");
  return (
    ALLOWED_FOLDERS.has(folder) &&
    /^[a-z0-9-]+\/[0-9a-f-]+\.(?:jpg|png|webp|pdf)$/i.test(key)
  );
}

function extensionFor(contentType: string) {
  if (contentType === "image/jpeg" || contentType === "image/jpg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "pdf";
}

function firstPartMatchesType(buffer: Buffer, contentType: string) {
  if (buffer.length < 4) return false;
  if (contentType === "image/jpeg" || contentType === "image/jpg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8;
  }
  if (contentType === "image/png") {
    return buffer.subarray(0, 4).toString("hex") === "89504e47";
  }
  if (contentType === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF";
  }
  if (contentType === "application/pdf") {
    return buffer.subarray(0, 4).toString("ascii") === "%PDF";
  }
  return false;
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
      uploadId?: string;
      parts?: Array<{ ETag: string; PartNumber: number }>;
    };

    if (body.action === "init") {
      const contentType = body.contentType ?? "";
      const contentLength = body.contentLength ?? 0;
      const folder = body.folder ?? "customizations";

      if (!ALLOWED_TYPES.has(contentType)) {
        return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
      }
      if (!ALLOWED_FOLDERS.has(folder)) {
        return NextResponse.json({ error: "Upload folder is not allowed." }, { status: 400 });
      }
      if (
        !Number.isInteger(contentLength) ||
        contentLength < 1 ||
        contentLength > MAX_BYTES
      ) {
        return NextResponse.json({ error: "Invalid file size." }, { status: 400 });
      }

      const key = `${folder}/${uuid()}.${extensionFor(contentType)}`;
      const created = await r2.send(
        new CreateMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          ContentType: contentType,
        })
      );

      if (!created.UploadId) {
        throw new Error("Storage did not return a multipart upload id.");
      }

      return NextResponse.json({
        key,
        uploadId: created.UploadId,
        publicUrl: publicUrlForKey(key),
      });
    }

    if (body.action === "complete") {
      const key = body.key ?? "";
      const uploadId = body.uploadId ?? "";
      const parts = body.parts ?? [];

      if (!validKey(key) || !uploadId || !parts.length || parts.length > 10) {
        return NextResponse.json({ error: "Invalid upload session." }, { status: 400 });
      }

      const normalizedParts = parts
        .filter(
          (part) =>
            typeof part.ETag === "string" &&
            Number.isInteger(part.PartNumber) &&
            part.PartNumber > 0 &&
            part.PartNumber <= 10
        )
        .sort((a, b) => a.PartNumber - b.PartNumber);

      if (normalizedParts.length !== parts.length) {
        return NextResponse.json({ error: "Invalid upload parts." }, { status: 400 });
      }

      await r2.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: normalizedParts },
        })
      );

      await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));

      return NextResponse.json({ publicUrl: publicUrlForKey(key) });
    }

    return NextResponse.json({ error: "Unknown upload action." }, { status: 400 });
  } catch (error) {
    console.error("[upload-multipart] request failed:", error);
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
      return NextResponse.json({ error: "Storage unavailable." }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key") ?? "";
    const uploadId = searchParams.get("uploadId") ?? "";
    const partNumber = Number(searchParams.get("partNumber"));
    const contentType = searchParams.get("contentType") ?? "";

    if (
      !validKey(key) ||
      !uploadId ||
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > 10 ||
      !ALLOWED_TYPES.has(contentType)
    ) {
      return NextResponse.json({ error: "Invalid upload part." }, { status: 400 });
    }

    const buffer = Buffer.from(await req.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_PART_BYTES) {
      return NextResponse.json({ error: "Invalid upload part size." }, { status: 400 });
    }

    if (partNumber === 1 && !firstPartMatchesType(buffer, contentType)) {
      return NextResponse.json({ error: "File content does not match its type." }, { status: 400 });
    }

    const uploaded = await r2.send(
      new UploadPartCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: buffer,
      })
    );

    if (!uploaded.ETag) {
      throw new Error("Storage did not return an ETag.");
    }

    return NextResponse.json({ ETag: uploaded.ETag, PartNumber: partNumber });
  } catch (error) {
    console.error("[upload-multipart] part failed:", error);
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
    if (!r2 || !bucket) return new NextResponse(null, { status: 204 });

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key") ?? "";
    const uploadId = searchParams.get("uploadId") ?? "";

    if (!validKey(key) || !uploadId) return new NextResponse(null, { status: 204 });

    await r2.send(
      new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
      })
    );
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
