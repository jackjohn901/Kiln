import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const client = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

router.post("/ai/caption", async (req, res) => {
  const { technique, stage, tags } = req.body as {
    technique?: string;
    stage?: string;
    tags?: string[];
  };

  const context = [
    technique && `Technique: ${technique}`,
    stage && `Process stage: ${stage}`,
    tags?.length && `Tags: ${tags.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!context) {
    res.status(400).json({ error: "At least one of technique, stage, or tags is required" });
    return;
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are a social media caption writer for craft artists on Kiln, a platform like TikTok for glassblowers, ceramicists, and craft makers. Write short, compelling captions (1–3 sentences) that feel authentic, process-focused, and evocative — not corporate or generic. Use craft vocabulary naturally. Never use hashtags — those are added separately. Return exactly 3 captions separated by "|||".`,
        },
        {
          role: "user",
          content: `Write 3 caption options for a craft post with these details:\n${context}\n\nReturn exactly 3 captions separated by "|||".`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const captions = raw
      .split("|||")
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 3);

    res.json({ captions });
  } catch (err) {
    res.status(500).json({ error: "Caption generation failed" });
  }
});

export default router;
