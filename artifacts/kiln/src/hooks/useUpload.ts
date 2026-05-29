import { useState, useCallback } from "react";

export interface UploadResult {
  servingUrl: string;
  objectPath: string;
}

export interface VideoUploadResult {
  uploadId: string;
  playbackId: string;
}

/** Error thrown by the upload helpers, carrying the HTTP status of the failed
 *  request so callers can distinguish a genuine auth failure (401) from a
 *  server/third-party failure (e.g. a 500 when the Mux upload service rejects
 *  our credentials). Without the status, callers were matching error text and
 *  mistaking a Mux "401 unauthorized" body for an expired user session. */
export class UploadError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

/** Resize and compress images client-side before upload.
 *  Cuts upload size 70-90% for phone photos (typical 4MB → 300KB).
 *  Returns the original file untouched for non-image types. */
function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxWidth) {
        h = Math.round(h * (maxWidth / w));
        w = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const compressed = new File([blob], file.name, { type: "image/jpeg", lastModified: file.lastModified });
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const compressed = await compressImage(file);

      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: compressed.name,
          size: compressed.size,
          contentType: compressed.type,
        }),
      });
      if (!metaRes.ok) {
        const msg = await metaRes.text().catch(() => "Failed to get upload URL");
        throw new UploadError(msg, metaRes.status);
      }
      const { uploadURL, objectPath } = (await metaRes.json()) as {
        uploadURL: string;
        objectPath: string;
      };

      setProgress(30);

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": compressed.type },
        body: compressed,
      });
      if (!uploadRes.ok) throw new Error("Upload to storage failed");

      // Mark the object as publicly readable so it can be displayed on profiles,
      // feeds, and to other users. Without this, the GET /storage/objects/* route
      // returns 403 because objects with no ACL policy are treated as private.
      // This MUST succeed — otherwise viewers will see broken images and the
      // caller will silently persist an unreadable URL.
      const aclRes = await fetch("/api/storage/uploads/make-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ objectPath }),
      });
      if (!aclRes.ok) {
        throw new UploadError(
          "Upload succeeded but the file couldn't be made readable. Please try again.",
          aclRes.status,
        );
      }

      setProgress(100);
      return { servingUrl: `/api/storage${objectPath}`, objectPath };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setError(msg);
      throw e;
    } finally {
      setUploading(false);
    }
  }, []);

  const uploadVideo = useCallback(async (file: File): Promise<VideoUploadResult> => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: get Mux direct-upload URL
      const metaRes = await fetch("/api/video/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size }),
      });
      if (!metaRes.ok) {
        const msg = await metaRes.text().catch(() => "Failed to get Mux upload URL");
        throw new UploadError(msg, metaRes.status);
      }
      const { uploadUrl, uploadId } = (await metaRes.json()) as {
        uploadUrl: string;
        uploadId: string;
      };

      setProgress(15);

      // Step 2: PUT file bytes directly to Mux
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Video upload to Mux failed");

      setProgress(50);

      // Step 3: poll for playbackId (up to 2 min)
      const deadline = Date.now() + 120_000;
      let playbackId = "";
      let elapsed = 0;
      while (Date.now() < deadline) {
        await new Promise<void>(r => setTimeout(r, 3000));
        elapsed += 3000;
        const assetRes = await fetch(`/api/video/asset/${uploadId}`, { credentials: "include" });
        if (assetRes.ok) {
          const data = (await assetRes.json()) as { status?: string; playbackId?: string };
          if (data.playbackId) {
            playbackId = data.playbackId;
            break;
          }
        } else if (assetRes.status === 401 || assetRes.status === 403) {
          // Session expired mid-processing — fail fast with the auth status so the
          // caller shows a re-login prompt instead of a misleading "timed out".
          throw new UploadError("Your session has expired. Please sign in again.", assetRes.status);
        }
        setProgress(50 + Math.min(45, Math.floor(elapsed / 2400)));
      }

      if (!playbackId) throw new Error("Timed out waiting for video to process. Try again shortly.");

      setProgress(100);
      return { uploadId, playbackId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Video upload failed";
      setError(msg);
      throw e;
    } finally {
      setUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setError(null);
  }, []);

  return { upload, uploadVideo, uploading, progress, error, reset };
}
