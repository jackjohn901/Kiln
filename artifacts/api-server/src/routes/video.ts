import { Router } from "express";
import Mux from "@mux/mux-node";
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

router.post("/video/upload-url", async (req, res): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const mux = getMuxClient();
    const upload = await mux.video.uploads.create({
      cors_origin: "*",
      new_asset_settings: {
        playback_policy: ["public"],
        encoding_tier: "baseline",
      },
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
