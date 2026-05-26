import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const client = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

router.post("/ai/hashtags", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { technique, tags, caption, medium } = req.body as {
    technique?: string;
    tags?: string[];
    caption?: string;
    medium?: string;
  };

  const context = [
    technique && `Technique: ${technique}`,
    medium && `Medium: ${medium}`,
    tags?.length && `Tags already added: ${tags.join(", ")}`,
    caption && `Caption: ${caption}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!context) {
    res.status(400).json({ error: "At least one context field is required" });
    return;
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5-nano",
      max_completion_tokens: 150,
      messages: [
        {
          role: "system",
          content:
            'You are a social media strategist for craft artists on Kiln (a TikTok-style platform for glassblowers, ceramicists, weavers, metalworkers, and other craft makers). Suggest 8 relevant hashtags that help a craft post get discovered. Mix broad craft tags (ceramics, handmade) with niche technique tags (rakufired, woodfiring). Return ONLY a JSON array of lowercase strings without the # symbol, no explanation, no markdown. Example: ["ceramics","handmade","pottersofinstagram","wheelthrown","ceramicart","pottery","stoneware","functionalware"]',
        },
        {
          role: "user",
          content: `Suggest hashtags for this post:\n${context}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
    let hashtags: string[] = [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        hashtags = (parsed as unknown[])
          .filter((h): h is string => typeof h === "string")
          .map((h) => h.replace(/^#/, "").toLowerCase())
          .slice(0, 8);
      }
    } catch {
      hashtags = [];
    }

    res.json({ hashtags });
  } catch (err) {
    req.log.error({ err }, "ai-hashtags error");
    res.status(500).json({ error: "Hashtag generation failed" });
  }
});

export default router;
