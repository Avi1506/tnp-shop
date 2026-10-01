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

type StagingInitResponse = {
  key?: string;
  sessionId?: string;
  partCount?: number;
  chunkBytes?: number;
  publicUrl?: string;
  error?: string;
};

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
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(new Error("Direct upload to storage failed."));
    };

    xhr.onerror = () =>
      reject(new Error("Direct upload to storage failed."));

    xhr.send(body);
  });
}

async function stagedServerUpload(
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

  const init = (await initResponse.json().catch(() => ({}))) as StagingInitResponse;

  if (
    !initResponse.ok ||
    !init.key ||
    !init.sessionId ||
    !init.partCount ||
    !init.chunkBytes ||
    !init.publicUrl
  ) {
    throw new Error(init.error || "Could not upload image. Please retry.");
  }

  try {
    for (let index = 0; index < init.partCount; index += 1) {
      const start = index * init.chunkBytes;
      const end = Math.min(file.size, start + init.chunkBytes);
      const chunk = file.slice(start, end);

      const params = new URLSearchParams({
        sessionId: init.sessionId,
        partNumber: String(index + 1),
        partCount: String(init.partCount),
      });

      const response = await fetch(
        `/api/upload-multipart?${params.toString()}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/octet-stream" },
          body: chunk,
        }
      );

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "Could not upload image. Please retry.");
      }

      onProgress?.(
        Math.min(94, Math.round(((index + 1) / init.partCount) * 94))
      );
    }

    const completeResponse = await fetch("/api/upload-multipart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        key: init.key,
        sessionId: init.sessionId,
        contentType: file.type,
        contentLength: file.size,
        partCount: init.partCount,
      }),
    });

    const complete = (await completeResponse.json().catch(() => ({}))) as {
      publicUrl?: string;
      error?: string;
    };

    if (!completeResponse.ok || !complete.publicUrl) {
      throw new Error(
        complete.error || "Could not upload image. Please retry."
      );
    }

    onProgress?.(100);
    return complete.publicUrl;
  } catch (error) {
    const params = new URLSearchParams({
      sessionId: init.sessionId,
      partCount: String(init.partCount),
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
      return stagedServerUpload(file, folder, onProgress);
    }
  }

  if (signedResponse.ok && signed.fallbackToLegacy) {
    return stagedServerUpload(file, folder, onProgress);
  }

  throw new Error(
    signed.error || "Could not prepare upload. Please retry."
  );
}
