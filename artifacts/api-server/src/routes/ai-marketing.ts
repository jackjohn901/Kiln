import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const client = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

const KILN_CONTEXT = `Kiln is a creator marketplace and social platform built exclusively for craft artists. Features: TikTok-style process video feed, direct sales shop (no listing fees), workshop booking, patron subscription tiers, custom commissions, limited-edition drops, live bidding auctions, guild communities, mentorship, AI craft assistant. URL: https://kilnfire.replit.app/kiln/`;

// POST /api/ai/marketing/bio
router.post("/ai/marketing/bio", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, medium, location, styleNotes, yearsActive } = req.body as {
    name?: string;
    medium?: string;
    location?: string;
    styleNotes?: string;
    yearsActive?: string;
  };

  if (!medium) {
    res.status(400).json({ error: "medium is required" });
    return;
  }

  try {
    const context = [
      name && `Name: ${name}`,
      medium && `Medium/discipline: ${medium}`,
      location && `Location: ${location}`,
      yearsActive && `Years active: ${yearsActive}`,
      styleNotes && `Style / approach notes: ${styleNotes}`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 600,
      messages: [
        {
          role: "system",
          content: `You write compelling artist bios for craft artists on Kiln. 
Rules:
- Write in third person
- 2–3 short paragraphs (80–150 words total)
- Open with the medium and where they work
- Middle: what makes their work distinctive, their process philosophy
- Close: exhibitions, recognition, or where to find their work (if not known, end with a forward-looking line)
- Tone: gallery-quality but human and warm, not corporate
- Never use the word "unique", "vibrant", or "passionate"
Return ONLY the bio text, no labels or explanation.`,
        },
        {
          role: "user",
          content: `Write an artist bio with these details:\n${context}`,
        },
      ],
    });

    const bio = response.choices[0]?.message?.content?.trim() ?? "";
    res.json({ bio });
  } catch {
    res.status(500).json({ error: "Bio generation failed" });
  }
});

// POST /api/ai/marketing/pitch
router.post("/ai/marketing/pitch", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, medium, location, targetType, styleNotes, achievements } = req.body as {
    name?: string;
    medium?: string;
    location?: string;
    targetType?: string;
    styleNotes?: string;
    achievements?: string;
  };

  if (!medium || !targetType) {
    res.status(400).json({ error: "medium and targetType are required" });
    return;
  }

  const targetLabels: Record<string, string> = {
    gallery: "gallery owner or curator",
    press: "journalist or art critic",
    magazine: "craft magazine editor",
    residency: "residency program director",
    collector: "private collector",
    brand: "brand or corporate buyer",
  };

  try {
    const context = [
      name && `Artist name: ${name}`,
      medium && `Medium: ${medium}`,
      location && `Location: ${location}`,
      styleNotes && `Work description: ${styleNotes}`,
      achievements && `Achievements/exhibitions: ${achievements}`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 800,
      messages: [
        {
          role: "system",
          content: `You write professional pitch emails for craft artists reaching out to ${targetLabels[targetType] ?? targetType}s.
Rules:
- Subject line first, then blank line, then body
- Subject line format: "Subject: [subject here]"
- Body: 3–4 short paragraphs
- Open: introduce who you are and your medium in one sentence
- Second: describe your work specifically — material, process, what makes it memorable
- Third: why you're reaching out to THIS recipient — personalize to their role
- Close: clear ask (studio visit, feature, representation, etc.) + link to Kiln profile
- Tone: confident but not arrogant, specific, professional
- Sign off with the artist's name
- Keep under 220 words total (not counting subject line)
Return ONLY the subject line and email body, no extra labels.`,
        },
        {
          role: "user",
          content: `Write a pitch email for a ${targetLabels[targetType] ?? targetType} with these details:\n${context}`,
        },
      ],
    });

    const email = response.choices[0]?.message?.content?.trim() ?? "";
    res.json({ email });
  } catch {
    res.status(500).json({ error: "Pitch generation failed" });
  }
});

// POST /api/ai/marketing/hashtags
router.post("/ai/marketing/hashtags", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { medium, platform, style } = req.body as {
    medium?: string;
    platform?: string;
    style?: string;
  };

  if (!medium) {
    res.status(400).json({ error: "medium is required" });
    return;
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 400,
      messages: [
        {
          role: "system",
          content: `You are a social media strategist specializing in craft art communities. Generate hashtag sets for craft artists.
Return a JSON object with three tiers:
{
  "niche": ["5–8 very specific hashtags for the exact medium, low competition, high relevance"],
  "community": ["5–8 mid-size community hashtags for the craft genre"],
  "broad": ["4–6 large reach hashtags to maximize discovery"]
}
Only return valid JSON. No markdown, no explanation.`,
        },
        {
          role: "user",
          content: `Generate hashtags for a ${medium} artist${style ? ` whose work is: ${style}` : ""}${platform ? ` posting on ${platform}` : ""}.`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "{}";
    const parsed = JSON.parse(raw);
    res.json({ hashtags: parsed });
  } catch {
    res.status(500).json({ error: "Hashtag generation failed" });
  }
});

// POST /api/ai/marketing/social-caption
router.post("/ai/marketing/social-caption", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { description, platform, tone } = req.body as {
    description?: string;
    platform?: string;
    tone?: string;
  };

  if (!description || !platform) {
    res.status(400).json({ error: "description and platform are required" });
    return;
  }

  const platformGuides: Record<string, string> = {
    instagram: `Instagram craft caption rules:
- 3–5 sentences, story-driven and aesthetic
- Reference the material, technique, and the feeling of the work
- End with 15–20 niche hashtags on a new line
- Warm, gallery + studio tone`,
    tiktok: `TikTok craft caption rules:
- First line is a hook (question or surprising fact, ≤80 chars)
- 2–3 short punchy sentences
- 5–8 hashtags max: mix niche and broad (#fyp #handmade)
- Casual, enthusiastic, process-focused`,
    twitter: `Twitter/X craft caption rules:
- One punchy sentence (≤200 chars) that makes people stop scrolling
- Can add 1–2 lines of context if needed, but total must fit 280 chars with hashtags
- 2–3 hashtags max
- Direct, confident, interesting`,
    linkedin: `LinkedIn craft caption rules:
- Professional but personal — tell the story of making this work
- 3–4 paragraphs with line breaks
- First line is a hook
- End with a question or thought about craft, business, or the maker movement
- 3–5 relevant hashtags at the end
- No emojis unless very sparing`,
    pinterest: `Pinterest pin description rules:
- 150–200 words, keyword-rich for search
- Describe the piece, the technique, the material, and the process
- Include style words (e.g. "handmade", "artisan", "one of a kind", "studio made")
- End with a call to action ("Find more in the shop" or "Available on Kiln")
- No hashtags — Pinterest doesn't use them the same way`,
  };

  const guide = platformGuides[platform] ?? `Write a compelling social media caption for ${platform}.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 500,
      messages: [
        {
          role: "system",
          content: `You write social media captions for craft artists. ${guide}${tone ? `\nTone preference: ${tone}` : ""}\nReturn ONLY the caption, no explanation or labels.`,
        },
        {
          role: "user",
          content: `Write a ${platform} caption for this post:\n${description}`,
        },
      ],
    });

    const caption = response.choices[0]?.message?.content?.trim() ?? "";
    res.json({ caption });
  } catch {
    res.status(500).json({ error: "Caption generation failed" });
  }
});

// POST /api/ai/marketing/email-subject
router.post("/ai/marketing/email-subject", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { topic, audience } = req.body as { topic?: string; audience?: string };
  if (!topic) { res.status(400).json({ error: "topic required" }); return; }
  try {
    const response = await client.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 150,
      messages: [
        {
          role: "system",
          content: `You write email subject lines for craft artist newsletters and announcements. Generate 5 subject line options.
Rules:
- Mix styles: curiosity, specificity, urgency, personal
- Under 55 characters each for mobile
- No clickbait or all-caps
- Return ONLY the 5 options, numbered 1–5, one per line`,
        },
        {
          role: "user",
          content: `Topic: ${topic}${audience ? `\nAudience: ${audience}` : ""}`,
        },
      ],
    });
    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    const subjects = raw
      .split("\n")
      .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 5);
    res.json({ subjects });
  } catch {
    res.status(500).json({ error: "Subject generation failed" });
  }
});

export default router;
