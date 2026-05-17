import { useState, useCallback } from "react";

export interface UploadResult {
  servingUrl: string;
  objectPath: string;
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
      // Step 1: request a presigned GCS upload URL
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      if (!metaRes.ok) {
        const msg = await metaRes.text().catch(() => "Failed to get upload URL");
        throw new Error(msg);
      }
      const { uploadURL, objectPath } = (await metaRes.json()) as {
        uploadURL: string;
        objectPath: string;
      };

      setProgress(30);

      // Step 2: PUT the file bytes directly to GCS (not to our server)
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload to storage failed");

      setProgress(100);
      // objectPath looks like "/objects/uploads/<uuid>" — serve via /api/storage
      return { servingUrl: `/api/storage${objectPath}`, objectPath };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
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

  return { upload, uploading, progress, error, reset };
}
