"use client";

export type UploadFolder = "customizations" | "previews" | "print-ready" | "mockups" | "products" | "bulk-enquiries";

type SignedUploadResponse = {
  fallbackToLegacy?: boolean;
  uploadUrl?: string;
  publicUrl?: string;
  error?: string;
};

function xhrUpload(
  url: string,
  body: Blob | FormData,
  headers: Record<string, string>,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
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

function xhrMultipartUpload(
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
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // handled below
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.url) resolve(data.url);
      else reject(new Error(data.error || "Upload failed."));
    };
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.send(form);
  });
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
    await xhrUpload(
      signed.uploadUrl,
      file,
      { "Content-Type": file.type },
      onProgress
    );
    onProgress?.(100);
    return signed.publicUrl;
  }

  if (signedResponse.ok && signed.fallbackToLegacy) {
    return xhrMultipartUpload(file, folder, onProgress);
  }

  throw new Error(signed.error || "Could not prepare upload.");
}
