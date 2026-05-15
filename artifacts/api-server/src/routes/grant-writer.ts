import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const client = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

router.post("/grant-writer", async (req, res) => {
  const { prompt } = req.body as { prompt: string };

  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "prompt string required" });
    return;
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional grant writer specializing in craft and fine art applications. Write ONLY the document text. No preamble, no labels, no markdown. Use paragraph breaks. Be specific, personal, and compelling.",
        },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 8192,
    });

    const text =
      completion.choices[0]?.message?.content ??
      "Unable to generate document. Please try again.";
    res.json({ text });
  } catch (err) {
    req.log.error({ err }, "Grant writer error");
    res.status(500).json({ error: "AI service unavailable" });
  }
});

export default router;
