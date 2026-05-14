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

export default router;
