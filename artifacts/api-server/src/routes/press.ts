import { Router } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import { pressReleasesTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

const KILN_CONTEXT = `
Kiln is a creator marketplace and social platform built exclusively for craft artists.
URL: https://kilnfire.replit.app/kiln/
Key features: TikTok-style process video feed (craft-only), direct sales shop (no listing fees), workshop booking, patron subscription tiers, custom commissions (milestone-based), limited-edition drops with waitlists, live bidding auctions, AI grant writer, AI craft assistant, technique-based guild communities, mentorship, critique circle, opportunities board (residencies/grants), studio map, craft calendar, newsletter, post scheduler, analytics.
Disciplines: ceramics/pottery, glassblowing, flameworking, kiln forming, weaving/fiber arts, natural dyeing, blacksmithing/metalwork, enamelwork, woodworking, bronze casting.
Audience: craft artists and collectors of handmade work.
Differentiator vs Etsy: craft-only, process video feed, multiple revenue streams beyond shop sales.
Differentiator vs Patreon: includes shop, workshop booking, video feed, craft community.
Differentiator vs TikTok: craft-specific audience, direct shop + booking + subscriptions built in.
Press contact: press@kilnfire.com
Press kit: https://kilnfire.replit.app/kiln/press.html
`.trim();

async function generatePressRelease(topic?: string): Promise<{
  title: string;
  slug: string;
  summary: string;
  plaintextContent: string;
  htmlContent: string;
  keywords: string;
}> {
  const topicLine = topic
    ? `Focus this release on: ${topic}`
    : "Write a general platform update or feature spotlight press release. Pick the most newsworthy angle from Kiln's features.";

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 2000,
    messages: [
      {
        role: "system",
        content: `You are a PR writer specializing in creator economy and art platform press releases. Write in AP style. Be specific and compelling. Always include real feature details.

Platform context:
${KILN_CONTEXT}`,
      },
      {
        role: "user",
        content: `${topicLine}

Write a press release with this exact JSON structure (respond ONLY with valid JSON, no markdown):
{
  "title": "Press release headline (compelling, specific, AP style)",
  "slug": "url-friendly-slug-for-this-release",
  "summary": "One sentence summary (max 160 chars) for SEO meta description",
  "keywords": "5-8 comma-separated keywords relevant to this release",
  "plaintextContent": "Full press release in plain text AP format with FOR IMMEDIATE RELEASE header, dateline (Portland, OR, [current month year]), 3-4 body paragraphs, founder quote, boilerplate, contact info, ### END ###",
  "htmlContent": "Same content as HTML with proper semantic structure: use <p> for paragraphs, <blockquote> for the quote, <strong> for the FOR IMMEDIATE RELEASE label and any key terms. Include a boilerplate <section> at the end. No <html>/<head>/<body> tags needed — just the inner content fragment."
}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  return parsed;
}

async function autoPostToDevTo(release: {
  title: string;
  plaintextContent: string;
  keywords: string;
}): Promise<string | null> {
  const apiKey = process.env["DEVTO_API_KEY"];
  if (!apiKey) return null;

  try {
    const resp = await fetch("https://dev.to/api/articles", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        article: {
          title: release.title,
          published: true,
          body_markdown: `${release.plaintextContent}\n\n---\n\n*Kiln is the creator platform built exclusively for craft artists. [Learn more →](https://kilnfire.replit.app/kiln/)*`,
          tags: release.keywords
            .split(",")
            .slice(0, 4)
            .map((k) => k.trim().toLowerCase().replace(/\s+/g, "")),
          canonical_url: "https://kilnfire.replit.app/kiln/press/index.html",
        },
      }),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { url?: string };
    return data.url ?? null;
  } catch {
    return null;
  }
}

async function runWeeklyRelease() {
  try {
    const topics = [
      "Kiln's built-in AI tools for craft artists — grant writer and craft assistant",
      "How craft artists are using Kiln to replace 5 platforms with one",
      "The workshop booking feature: how working artists are selling classes on Kiln",
      "Kiln's limited drops and auction features for selling one-of-a-kind work",
      "Patron subscriptions for craft artists: how Kiln's tiered membership works",
      "The craft renaissance: why handmade work is growing in value in the AI era",
      "How Kiln's process video feed drives sales for ceramic and glass artists",
      "Custom commissions on Kiln: milestone-based system for bespoke handmade work",
    ];

    const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const topic = topics[weekNumber % topics.length];

    const generated = await generatePressRelease(topic);
    if (!generated.title || !generated.plaintextContent) return;

    const postedUrls: string[] = [];
    const devtoUrl = await autoPostToDevTo(generated);
    if (devtoUrl) postedUrls.push(`devto:${devtoUrl}`);

    await db.insert(pressReleasesTable).values({
      title: generated.title,
      slug: generated.slug || `kiln-update-${Date.now()}`,
      summary: generated.summary,
      plaintextContent: generated.plaintextContent,
      htmlContent: generated.htmlContent,
      keywords: generated.keywords,
      autoPostedTo: postedUrls.length ? JSON.stringify(postedUrls) : null,
    });
  } catch {
  }
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
setTimeout(() => {
  runWeeklyRelease();
  setInterval(runWeeklyRelease, WEEK_MS);
}, 5000);

router.get("/press/releases", async (_req, res) => {
  try {
    const releases = await db
      .select({
        id: pressReleasesTable.id,
        title: pressReleasesTable.title,
        slug: pressReleasesTable.slug,
        summary: pressReleasesTable.summary,
        keywords: pressReleasesTable.keywords,
        autoPostedTo: pressReleasesTable.autoPostedTo,
        generatedAt: pressReleasesTable.generatedAt,
      })
      .from(pressReleasesTable)
      .orderBy(desc(pressReleasesTable.generatedAt))
      .limit(20);

    res.json({ releases });
  } catch {
    res.status(500).json({ error: "Failed to fetch press releases" });
  }
});

router.get("/press/releases/:slug", async (req, res) => {
  try {
    const releases = await db
      .select()
      .from(pressReleasesTable)
      .where(eq(pressReleasesTable.slug, req.params.slug))
      .limit(1);

    if (!releases[0]) {
      res.status(404).json({ error: "Release not found" });
      return;
    }
    res.json({ release: releases[0] });
  } catch {
    res.status(500).json({ error: "Failed to fetch press release" });
  }
});

router.post("/press/generate", async (req, res) => {
  const { topic } = req.body as { topic?: string };
  try {
    const generated = await generatePressRelease(topic);

    const [saved] = await db
      .insert(pressReleasesTable)
      .values({
        title: generated.title,
        slug: generated.slug || `kiln-update-${Date.now()}`,
        summary: generated.summary,
        plaintextContent: generated.plaintextContent,
        htmlContent: generated.htmlContent,
        keywords: generated.keywords,
        autoPostedTo: null,
      })
      .returning();

    res.json({ release: saved });
  } catch {
    res.status(500).json({ error: "Failed to generate press release" });
  }
});

export default router;
