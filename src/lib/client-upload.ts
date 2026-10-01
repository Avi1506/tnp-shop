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

const SAFE_SERVER_FALLBACK_BYTES = 3 * 1024 * 1024;

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

function xhrSmallServerUpload(
  file: File,
  folder: UploadFolder,
  onProgress?: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      let payload: { url?: string; error?: string } = {};
      try {
        payload = JSON.parse(xhr.responseText || "{}") as {
          url?: string;
          error?: string;
        };
      } catch {
        // handled below
      }

      if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
        onProgress?.(100);
        resolve(payload.url);
        return;
      }

      reject(
        new Error(
          payload.error ||
            (xhr.status === 413
              ? "Image is too large for the backup upload path."
              : "Could not upload image. Please retry.")
        )
      );
    };
    xhr.onerror = () =>
      reject(new Error("Could not upload image. Please retry."));
    xhr.send(form);
  });
}

async function safeFallbackUpload(
  file: File,
  folder: UploadFolder,
  onProgress?: (percent: number) => void
) {
  if (file.size <= SAFE_SERVER_FALLBACK_BYTES) {
    return xhrSmallServerUpload(file, folder, onProgress);
  }

  throw new Error(
    "Large image upload needs direct storage access. Please retry after storage connection is restored."
  );
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
      // Small files can safely use the same-origin server fallback.
      // Large files must remain direct-to-R2; proxying them through Vercel
      // risks the platform request-body limit.
      return safeFallbackUpload(file, folder, onProgress);
    }
  }

  if (signedResponse.ok && signed.fallbackToLegacy) {
    return safeFallbackUpload(file, folder, onProgress);
  }

  throw new Error(signed.error || "Could not prepare upload. Please retry.");
}
