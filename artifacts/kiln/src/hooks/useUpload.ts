import { useState, useCallback } from "react";

export interface UploadResult {
  servingUrl: string;
  objectPath: string;
}

export interface VideoUploadResult {
  uploadId: string;
  playbackId: string;
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

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
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
        throw new Error("Upload succeeded but the file couldn't be made readable. Please try again.");
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
        throw new Error(msg);
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
