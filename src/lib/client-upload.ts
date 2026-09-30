"use client";

export type UploadFolder =
  | "customizations"
  | "previews"
  | "print-ready"
  | "mockups"
  | "products"
  | "bulk-enquiries";

type SignedUploadResponse = {
  fallbackToLegacy?: boolean;
  uploadUrl?: string;
  publicUrl?: string;
  error?: string;
};

type MultipartInitResponse = {
  key?: string;
  uploadId?: string;
  publicUrl?: string;
  error?: string;
};

const CHUNK_BYTES = 1536 * 1024;

function xhrUpload(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    Object.entries(headers).forEach(([key, value]) =>
      xhr.setRequestHeader(key, value)
    );
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error("Direct upload to storage failed."));
    };
    xhr.onerror = () => reject(new Error("Direct upload to storage failed."));
    xhr.send(body);
  });
}

async function multipartUpload(
  file: File,
  folder: UploadFolder,
  onProgress?: (percent: number) => void
) {
  const initResponse = await fetch("/api/upload-multipart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "init",
      contentType: file.type,
      contentLength: file.size,
      folder,
    }),
  });

  const init = (await initResponse.json().catch(() => ({}))) as MultipartInitResponse;
  if (!initResponse.ok || !init.key || !init.uploadId || !init.publicUrl) {
    throw new Error(init.error || "Could not upload image. Please retry.");
  }

  const parts: Array<{ ETag: string; PartNumber: number }> = [];
  const partCount = Math.ceil(file.size / CHUNK_BYTES);

  try {
    for (let index = 0; index < partCount; index += 1) {
      const start = index * CHUNK_BYTES;
      const end = Math.min(file.size, start + CHUNK_BYTES);
      const chunk = file.slice(start, end);

      const params = new URLSearchParams({
        key: init.key,
        uploadId: init.uploadId,
        partNumber: String(index + 1),
        contentType: file.type,
      });

      const response = await fetch(`/api/upload-multipart?${params.toString()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: chunk,
      });

      const uploaded = (await response.json().catch(() => ({}))) as {
        ETag?: string;
        PartNumber?: number;
        error?: string;
      };

      if (!response.ok || !uploaded.ETag || !uploaded.PartNumber) {
        throw new Error(uploaded.error || "Could not upload image. Please retry.");
      }

      parts.push({ ETag: uploaded.ETag, PartNumber: uploaded.PartNumber });
      onProgress?.(Math.round(((index + 1) / partCount) * 95));
    }

    const completeResponse = await fetch("/api/upload-multipart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        key: init.key,
        uploadId: init.uploadId,
        parts,
      }),
    });

    const completed = (await completeResponse.json().catch(() => ({}))) as {
      publicUrl?: string;
      error?: string;
    };

    if (!completeResponse.ok || !completed.publicUrl) {
      throw new Error(completed.error || "Could not upload image. Please retry.");
    }

    onProgress?.(100);
    return completed.publicUrl;
  } catch (error) {
    const params = new URLSearchParams({
      key: init.key,
      uploadId: init.uploadId,
    });
    void fetch(`/api/upload-multipart?${params.toString()}`, {
      method: "DELETE",
    }).catch(() => undefined);
    throw error;
  }
}

export async function uploadFile(
  file: File,
  folder: UploadFolder,
  onProgress?: (percent: number) => void
): Promise<string> {
  const signedResponse = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: file.type,
      contentLength: file.size,
      folder,
    }),
  });

  const signed = (await signedResponse.json().catch(() => ({}))) as SignedUploadResponse;

  if (
    signedResponse.ok &&
    !signed.fallbackToLegacy &&
    signed.uploadUrl &&
    signed.publicUrl
  ) {
    try {
      await xhrUpload(
        signed.uploadUrl,
        file,
        { "Content-Type": file.type },
        onProgress
      );
      onProgress?.(100);
      return signed.publicUrl;
    } catch {
      // Preview deployments can be blocked by R2 CORS even when signing succeeds.
      // Fall back to same-origin chunked multipart upload so supported files do
      // not hit Vercel's single-request multipart body limit.
      return multipartUpload(file, folder, onProgress);
    }
  }

  if (signedResponse.ok && signed.fallbackToLegacy) {
    return multipartUpload(file, folder, onProgress);
  }

  throw new Error(signed.error || "Could not prepare upload. Please retry.");
}
