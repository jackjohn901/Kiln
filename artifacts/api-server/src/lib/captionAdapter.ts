import OpenAI from "openai";
import { logger } from "./logger";

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

const PLATFORM_SYSTEM_PROMPTS: Record<string, string> = {
  instagram: `You adapt craft artist captions for Instagram. Rules:
- 2–4 sentences, aesthetic and story-driven
- Mention material, technique, or inspiration if present in original
- End with 15–20 niche hashtags on their own line (e.g. #handbuiltceramics #woodfire #craftphotography)
- Warm, gallery-quality tone
Return ONLY the adapted caption, no explanation.`,

  tiktok: `You adapt craft artist captions for TikTok. Rules:
- First line is a hook (question or bold statement, ≤80 chars)
- Casual, conversational, enthusiastic
- 5–8 hashtags max: mix niche (#ceramics #pottersoftiktok) and broad (#fyp #handmade #artistsoftiktok)
- Total ≤120 words
Return ONLY the adapted caption, no explanation.`,

  facebook: `You adapt craft artist captions for Facebook. Rules:
- 3–5 sentences, community-focused and conversational
- Tell the story: what is the piece, how was it made, what inspired it
- No hashtags
- End with an open question to invite comments (e.g. "Have you ever tried wheel throwing?")
Return ONLY the adapted caption, no explanation.`,
};

export async function adaptCaptionForPlatform(
  caption: string,
  platform: "instagram" | "tiktok" | "facebook",
): Promise<string> {
  if (!caption?.trim()) return caption ?? "";
  const systemPrompt = PLATFORM_SYSTEM_PROMPTS[platform];
  if (!systemPrompt) return caption;
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: caption },
      ],
      max_tokens: 350,
      temperature: 0.7,
    });
    const adapted = res.choices[0]?.message?.content?.trim();
    return adapted || caption;
  } catch (err) {
    logger.warn({ err, platform }, "captionAdapter: OpenAI call failed, using original");
    return caption;
  }
}

export async function detectCommissionIntent(
  comment: string,
): Promise<{ isInquiry: boolean; confidence: "high" | "medium" | "low"; details: string }> {
  if (!comment?.trim()) return { isInquiry: false, confidence: "low", details: "" };
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: `You analyze social media comments on craft artist posts.
Determine if the commenter is asking about commissioning custom work.
Respond ONLY with valid JSON: { "isInquiry": boolean, "confidence": "high"|"medium"|"low", "details": "brief extracted context" }
Commission signals: asking about custom orders, requesting a specific piece, asking for price quote, asking if the artist takes commissions.`,
        },
        { role: "user", content: `Comment: "${comment}"` },
      ],
      max_tokens: 120,
      temperature: 0.2,
    });
    const raw = res.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(raw);
    return {
      isInquiry: Boolean(parsed.isInquiry),
      confidence: parsed.confidence ?? "low",
      details: parsed.details ?? "",
    };
  } catch {
    return { isInquiry: false, confidence: "low", details: "" };
  }
}
