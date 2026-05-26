import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const client = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

const COLOR_GRADES: Record<string, string> = {
  cinematic: "contrast(1.15) saturate(0.75) brightness(0.88) sepia(0.06)",
  vibrant:   "contrast(1.05) saturate(1.4) brightness(1.05)",
  moody:     "contrast(1.25) saturate(0.6) brightness(0.82) hue-rotate(10deg)",
  clean:     "contrast(1.0) saturate(0.85) brightness(1.1)",
  golden:    "contrast(1.1) saturate(1.15) brightness(0.93) sepia(0.28)",
};

const STYLE_GUIDES: Record<string, string> = {
  "movie-trailer":
    "Dramatic, dark, mysterious. Think A24 aesthetic. Big bold title cards with slow powerful reveals. Build tension then release. Artist name as final card. Cinematic and unforgettable.",
  advertisement:
    "Bold, high-energy, direct. Viewer immediately understands the value proposition. Vibrant and confident. CTA at the end. Think luxury brand but accessible.",
  commercial:
    "Warm, story-driven, human. The craft process IS the story. Gentle authentic pacing. Feels like the art speaks for itself. Aspirational but deeply grounded in real making.",
  "short-clip":
    "Maximum impact in 7 seconds. One arresting image + one perfect line of text. Pure scroll-stopping energy. No fluff — just the essential. Think viral social clip.",
  documentary:
    "Slow, intimate, archival. Ken Burns-style meditative pacing. The craft as witness to time and practice. Text is sparse and poetic — one or two lines that linger. Warm, desaturated, timeless.",
  "luxury-brand":
    "Ultra-minimal, aspirational, silent luxury. Think Hermès or Bottega Veneta. Almost no text — the image alone commands respect. One perfect word or phrase. Whisper-quiet, impossibly elegant.",
  "behind-the-scenes":
    "Raw, authentic, unpolished. The real studio, the real hands, the real process. Casual handwritten-feeling text. Warm and unguarded. Makes viewers feel they have exclusive access.",
  "time-lapse-reveal":
    "Fast-paced progressive reveal. Multiple quick text bursts that build momentum to a dramatic final image reveal. High energy rhythm that climaxes in the last second. Think epic product launch.",
};

router.post("/ai/enhance-reel", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { imageUrl, caption, technique, style, artistName, clipDurationMs } = req.body as {
    imageUrl?: string;
    caption?: string;
    technique?: string;
    style: string;
    artistName?: string;
    clipDurationMs?: number;
  };

  if (!style) {
    res.status(400).json({ error: "style is required" });
    return;
  }

  const styleGuide = STYLE_GUIDES[style] ?? STYLE_GUIDES["movie-trailer"];
  const totalMs = clipDurationMs && clipDurationMs > 0 ? Math.round(clipDurationMs) : 7000;
  const watermarkStart = Math.round(totalMs * 0.83);
  const watermarkDuration = Math.round(totalMs * 0.14);

  const userPrompt = `${imageUrl ? `Analyze this craft art image and generate` : `Generate`} a cinematic "${style}" enhancement plan.

Context:
- Caption: ${caption || "No caption"}
- Technique: ${technique || "craft art"}
- Artist: ${artistName || "the artist"}
- Style mode: ${style}
- Style guide: ${styleGuide}
- Total clip duration: ${totalMs}ms

Return ONLY valid JSON — no markdown, no code fences, no explanation. Just the raw JSON object:
{
  "headline": "short dramatic headline (max 5 words)",
  "tagline": "secondary supporting line (max 9 words)",
  "overlays": [
    {
      "id": "o1",
      "text": "text to display",
      "startMs": 0,
      "durationMs": ${Math.round(totalMs * 0.34)},
      "position": "bottom",
      "style": "large"
    }
  ],
  "colorGrade": "cinematic",
  "colorFilter": "contrast(1.15) saturate(0.75) brightness(0.88) sepia(0.06)",
  "audioMood": "contemplative ambient drone",
  "audioBpm": 72,
  "transition": "fade",
  "treatmentNotes": "One sentence describing the visual treatment"
}

Critical overlay rules:
- 3 to 5 overlays, no more
- Timestamps must span 0ms to ${totalMs}ms total
- startMs values must be strictly increasing
- (startMs + durationMs) must be less than the next overlay's startMs by at least 200ms
- Final overlay: artist watermark ("${artistName || "kilnfire"}") at position "top-right", style "watermark", startMs ${watermarkStart}, durationMs ${watermarkDuration}
- position options: "top" | "center" | "bottom" | "top-right"
- style options: "title" | "large" | "small" | "watermark" | "subtitle"
- colorGrade options: cinematic | vibrant | moody | clean | golden
- colorFilter: valid CSS filter string matching the chosen grade

All text must feel authentic to craft culture — poetic, process-honoring, never generic.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 1024,
      messages: [
        {
          role: "system",
          content:
            "You are a world-class video producer specializing in cinematic social media content for craft artists. You create enhancement plans that make craft art feel like a major film or luxury brand campaign. Always respond with raw valid JSON only — no markdown, no explanation.",
        },
        {
          role: "user",
          content: imageUrl
            ? [
                { type: "image_url" as const, image_url: { url: imageUrl } },
                { type: "text" as const, text: userPrompt },
              ]
            : userPrompt,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";

    let plan: Record<string, unknown>;
    try {
      const cleaned = raw
        .replace(/^```(?:json)?\s*/m, "")
        .replace(/\s*```$/m, "")
        .trim();
      plan = JSON.parse(cleaned);
    } catch {
      req.log.error({ raw }, "Failed to parse AI enhance-reel JSON");
      res.status(500).json({ error: "Failed to parse enhancement plan" });
      return;
    }

    // Normalise colorFilter from preset if model didn't provide it
    if (!plan.colorFilter && typeof plan.colorGrade === "string") {
      plan.colorFilter = COLOR_GRADES[plan.colorGrade] ?? COLOR_GRADES.cinematic;
    }

    // Ensure every overlay has an id
    if (Array.isArray(plan.overlays)) {
      plan.overlays = (plan.overlays as Record<string, unknown>[]).map((o, i) => ({
        ...o,
        id: o.id ?? `o${i + 1}`,
      }));
    }

    res.json(plan);
  } catch (err) {
    req.log.error({ err }, "AI enhance-reel error");
    res.status(500).json({ error: "Enhancement generation failed" });
  }
});

export default router;
