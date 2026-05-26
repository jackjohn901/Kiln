import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const client = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

const SYSTEM_PROMPT = `You are Kiln AI, a knowledgeable craft assistant specializing in glass blowing, ceramics, pottery, flamework, kilnforming, glaze chemistry, blacksmithing, and related craft techniques. You are friendly, practical, and precise.

When answering:
- Be concise but thorough. Use bullet points for multi-step answers.
- Use specific temperatures in both Fahrenheit and Celsius when relevant.
- Mention safety considerations where important (always mention proper PPE for hot work).
- Reference real materials and techniques (specific Orton cone numbers, glaze materials like EPK, silica, whiting, feldspar).
- For glaze questions, provide actual recipe starting points with percentages.
- Keep responses focused on craft practice. For off-topic questions, gently redirect.
- Use a warm, studio-artist tone — like a master craftsperson sharing knowledge.
- Format with markdown where helpful (bold key terms, use lists).`;

router.post("/craft-assistant", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { messages } = req.body as { messages: { role: "user" | "assistant"; content: string }[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(-12),
      ],
      max_completion_tokens: 8192,
    });

    const reply = completion.choices[0]?.message?.content ?? "I couldn't generate a response. Please try again.";
    res.json({ reply });
  } catch (err) {
    req.log.error({ err }, "Craft assistant error");
    res.status(500).json({ error: "AI service unavailable" });
  }
});

export default router;
