import { Router } from "express";

const router = Router();

router.get("/feed", async (req, res) => {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  if (!token || !userId) {
    res.status(503).json({ error: "Instagram credentials not configured" });
    return;
  }

  try {
    const fields = "id,media_type,media_url,thumbnail_url,permalink,timestamp,caption";
    const url = `https://graph.instagram.com/${userId}/media?fields=${fields}&limit=50&access_token=${token}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errBody = await response.text();
      req.log.error({ status: response.status, body: errBody }, "Instagram API error");
      res.status(502).json({ error: "Instagram API returned an error" });
      return;
    }

    const data = (await response.json()) as { data?: unknown[] };
    const all = Array.isArray(data.data) ? data.data : [];
    const videos = all.filter((m: unknown) => {
      const item = m as Record<string, unknown>;
      return item.media_type === "VIDEO" || item.media_type === "REELS";
    });

    res.json({ videos });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch Instagram feed");
    res.status(500).json({ error: "Failed to fetch Instagram feed" });
  }
});

router.post("/post", async (req, res) => {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_USER_ID;

  if (!token || !igUserId) {
    res.status(503).json({ error: "Instagram credentials not configured" });
    return;
  }

  const { mediaUrl, caption, isVideo } = req.body as {
    mediaUrl: string;
    caption?: string;
    isVideo?: boolean;
  };

  if (!mediaUrl) {
    res.status(400).json({ error: "mediaUrl required" });
    return;
  }

  try {
    // Step 1: Create media container
    const containerBody = new URLSearchParams({
      access_token: token,
      caption: caption ?? "",
    });
    if (isVideo) {
      containerBody.set("video_url", mediaUrl);
      containerBody.set("media_type", "REELS");
    } else {
      containerBody.set("image_url", mediaUrl);
    }

    const containerRes = await fetch(`https://graph.instagram.com/v19.0/${igUserId}/media`, {
      method: "POST",
      body: containerBody,
    });

    if (!containerRes.ok) {
      const err = await containerRes.text();
      req.log.error({ err }, "Instagram media container error");
      res.status(502).json({ error: "Failed to create Instagram media container" });
      return;
    }

    const { id: containerId } = (await containerRes.json()) as { id: string };

    // Step 2: Publish
    const publishBody = new URLSearchParams({
      access_token: token,
      creation_id: containerId,
    });

    const publishRes = await fetch(`https://graph.instagram.com/v19.0/${igUserId}/media_publish`, {
      method: "POST",
      body: publishBody,
    });

    if (!publishRes.ok) {
      const err = await publishRes.text();
      req.log.error({ err }, "Instagram publish error");
      res.status(502).json({ error: "Failed to publish to Instagram" });
      return;
    }

    const published = (await publishRes.json()) as { id: string };
    res.json({ success: true, id: published.id });
  } catch (err) {
    req.log.error({ err }, "Instagram post error");
    res.status(500).json({ error: "Failed to post to Instagram" });
  }
});

export default router;
