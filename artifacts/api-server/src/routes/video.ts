import { Router } from "express";
import Mux from "@mux/mux-node";
import { z } from "zod";
import { db, videoUploadsTable } from "@workspace/db";
import { eq, gte, and, count } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

function getMuxClient() {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    throw new Error("Mux credentials not configured. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET.");
  }
  return new Mux({ tokenId, tokenSecret });
}

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;

const ALLOWED_VIDEO_CONTENT_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "video/ogg",
  "video/3gpp",
  "video/3gpp2",
  "video/mpeg",
  "video/x-matroska",
]);

const VideoUploadRequestBody = z.object({
  name: z.string().min(1),
  size: z.number().int().positive().max(MAX_VIDEO_SIZE_BYTES, {
    message: `File size must not exceed ${MAX_VIDEO_SIZE_BYTES / (1024 * 1024)} MB`,
  }),
  contentType: z.string().optional(),
});

async function checkUploadRateLimit(userId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const [row] = await db
    .select({ total: count() })
    .from(videoUploadsTable)
    .where(and(
      eq(videoUploadsTable.userId, userId),
      gte(videoUploadsTable.createdAt, windowStart),
    ));
  return (row?.total ?? 0) < RATE_LIMIT_MAX;
}

router.post("/video/upload-url", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = VideoUploadRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
    return;
  }

  const { contentType } = parsed.data;
  if (contentType && !ALLOWED_VIDEO_CONTENT_TYPES.has(contentType)) {
    res.status(400).json({ error: "Unsupported video format" });
    return;
  }

  try {
    const allowed = await checkUploadRateLimit(req.user.id);
    if (!allowed) {
      res.status(429).json({ error: "Too many upload requests. Please try again later." });
      return;
    }

    const mux = getMuxClient();
    const upload = await mux.video.uploads.create({
      cors_origin: "*",
      new_asset_settings: {
        playback_policy: ["public"],
        encoding_tier: "baseline",
      },
    });

    await db.insert(videoUploadsTable).values({
      uploadId: upload.id,
      userId: req.user.id,
    });

    res.json({ uploadUrl: upload.url, uploadId: upload.id });
  } catch (err: any) {
    logger.error({ err }, "Failed to create Mux upload URL");
    res.status(500).json({ error: err.message ?? "Failed to create upload URL" });
  }
});

router.get("/video/asset/:uploadId", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const [record] = await db
      .select()
      .from(videoUploadsTable)
      .where(eq(videoUploadsTable.uploadId, req.params.uploadId));

    if (!record) {
      res.status(404).json({ error: "Upload not found" });
      return;
    }

    if (record.userId !== req.user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const mux = getMuxClient();
    const upload = await mux.video.uploads.retrieve(req.params.uploadId);
    let playbackId: string | undefined;
    let assetId: string | undefined;
    let status: string = upload.status ?? "waiting";

    if (upload.asset_id) {
      assetId = upload.asset_id;
      const asset = await mux.video.assets.retrieve(upload.asset_id);
      status = asset.status ?? "preparing";
      playbackId = asset.playback_ids?.[0]?.id;
    }

    res.json({ status, assetId, playbackId });
  } catch (err: any) {
    logger.error({ err }, "Failed to get Mux asset");
    res.status(500).json({ error: err.message ?? "Failed to get asset" });
  }
});

router.post("/video/webhook", async (req, res): Promise<void> => {
  const event = req.body as { type: string; data?: { id?: string } };
  logger.info({ type: event.type }, "Mux webhook received");
  res.json({ received: true });
});

export default router;
