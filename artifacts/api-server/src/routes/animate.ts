import { Router } from "express";
import multer from "multer";
import { logger } from "../lib/logger";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are accepted"));
    }
  },
});

const FAL_MODEL = "fal-ai/kling-video/v1.6/standard/image-to-video";
const FAL_QUEUE_BASE = `https://queue.fal.run/${FAL_MODEL}`;
const FAL_STORAGE_URL = "https://fal.run/storage/upload";

function getFalKey(): string {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error("FAL_API_KEY is not configured");
  return key;
}

async function uploadImageToFal(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<string> {
  const key = getFalKey();
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: mimetype }), filename);

  const res = await fetch(FAL_STORAGE_URL, {
    method: "POST",
    headers: { Authorization: `Key ${key}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fal.ai storage upload failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { url: string };
  if (!data.url) throw new Error("fal.ai storage upload returned no URL");
  return data.url;
}

router.post(
  "/animate",
  upload.single("image"),
  async (req, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    const prompt =
      typeof req.body.prompt === "string" && req.body.prompt.trim()
        ? req.body.prompt.trim()
        : "subtle natural motion, gentle ambient life";
    const duration = req.body.duration === "10" ? "10" : "5";

    try {
      const key = getFalKey();

      const imageUrl = await uploadImageToFal(
        req.file.buffer,
        req.file.originalname || "image.jpg",
        req.file.mimetype,
      );

      const submitRes = await fetch(FAL_QUEUE_BASE, {
        method: "POST",
        headers: {
          Authorization: `Key ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: imageUrl,
          prompt,
          duration,
          aspect_ratio: "9:16",
        }),
      });

      if (!submitRes.ok) {
        const text = await submitRes.text();
        throw new Error(`fal.ai submit failed (${submitRes.status}): ${text}`);
      }

      const submitData = (await submitRes.json()) as { request_id: string };
      if (!submitData.request_id) {
        throw new Error("fal.ai returned no request_id");
      }

      res.json({ requestId: submitData.request_id });
    } catch (err: unknown) {
      req.log.error({ err }, "Animate submit failed");
      res
        .status(500)
        .json({
          error: err instanceof Error ? err.message : "Animation failed",
        });
    }
  },
);

router.get(
  "/animate/:requestId/status",
  async (req, res): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { requestId } = req.params;

    if (!/^[a-zA-Z0-9_-]+$/.test(requestId)) {
      res.status(400).json({ error: "Invalid request ID" });
      return;
    }

    try {
      const key = getFalKey();

      const statusRes = await fetch(
        `${FAL_QUEUE_BASE}/requests/${requestId}/status`,
        { headers: { Authorization: `Key ${key}` } },
      );

      if (!statusRes.ok) {
        const text = await statusRes.text();
        throw new Error(
          `fal.ai status check failed (${statusRes.status}): ${text}`,
        );
      }

      const statusData = (await statusRes.json()) as {
        status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
        error?: string;
      };

      if (statusData.status === "COMPLETED") {
        const resultRes = await fetch(
          `${FAL_QUEUE_BASE}/requests/${requestId}`,
          { headers: { Authorization: `Key ${key}` } },
        );

        if (!resultRes.ok) {
          throw new Error(
            `fal.ai result fetch failed (${resultRes.status})`,
          );
        }

        const resultData = (await resultRes.json()) as {
          video?: { url: string };
          output?: { video?: { url: string } };
        };

        const videoUrl =
          resultData.video?.url ?? resultData.output?.video?.url;

        if (!videoUrl) {
          throw new Error("No video URL in fal.ai response");
        }

        res.json({ status: "COMPLETED", videoUrl });
        return;
      }

      if (statusData.status === "FAILED") {
        res.json({
          status: "FAILED",
          error: statusData.error ?? "Animation generation failed",
        });
        return;
      }

      res.json({ status: statusData.status });
    } catch (err: unknown) {
      logger.error({ err }, "Animate status check failed");
      res
        .status(500)
        .json({
          error:
            err instanceof Error ? err.message : "Status check failed",
        });
    }
  },
);

export default router;
