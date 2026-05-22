import { Router } from "express";
import OpenAI from "openai";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

const client = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

router.post("/ai/listing-writer", authMiddleware, async (req, res): Promise<void> => {
  const { title, medium, technique, dimensions, materials, year } = req.body as {
    title?: string;
    medium?: string;
    technique?: string;
    dimensions?: string;
    materials?: string;
    year?: string;
  };

  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const context = [
    `Title: ${title}`,
    medium && `Medium: ${medium}`,
    technique && `Technique: ${technique}`,
    dimensions && `Dimensions: ${dimensions}`,
    materials && `Materials: ${materials}`,
    year && `Year made: ${year}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "You are a copywriter for Kiln, a craft artist marketplace. Write compelling, specific product descriptions for handmade works. Be concrete about materials and process. Evoke the human hand behind the work. Make buyers feel the piece. 2–4 sentences. Avoid generic phrases like 'unique' or 'one of a kind'. Never mention the artist's name. Return only the description text — no title, no label, no preamble.",
        },
        {
          role: "user",
          content: `Write a product description for this listing:\n${context}`,
        },
      ],
    });

    const description = response.choices[0]?.message?.content?.trim() ?? "";
    res.json({ description });
  } catch (err) {
    req.log.error({ err }, "ai-listing-writer error");
    res.status(500).json({ error: "Description generation failed" });
  }
});

export default router;
