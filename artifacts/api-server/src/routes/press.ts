import { Router } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import { pressReleasesTable } from "@workspace/db/schema";
import { desc, eq } from "drizzle-orm";
import { autoPostToPinterest } from "./pinterest";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

const KILN_URL = "https://kilnfire.replit.app/kiln/";
const PRESS_INDEX = "https://kilnfire.replit.app/kiln/press/index.html";

const KILN_CONTEXT = `
Kiln is a creator marketplace and social platform built exclusively for craft artists.
URL: ${KILN_URL}
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
        content: `You are a PR writer specializing in creator economy and art platform press releases. Write in AP style. Be specific and compelling. Always include real feature details.\n\nPlatform context:\n${KILN_CONTEXT}`,
      },
      {
        role: "user",
        content: `${topicLine}\n\nWrite a press release with this exact JSON structure (respond ONLY with valid JSON, no markdown):\n{\n  "title": "Press release headline (compelling, specific, AP style)",\n  "slug": "url-friendly-slug-for-this-release",\n  "summary": "One sentence summary (max 160 chars) for SEO meta description",\n  "keywords": "5-8 comma-separated keywords relevant to this release",\n  "plaintextContent": "Full press release in plain text AP format with FOR IMMEDIATE RELEASE header, dateline (Portland, OR, [current month year]), 3-4 body paragraphs, founder quote, boilerplate, contact info, ### END ###",\n  "htmlContent": "Same content as HTML with proper semantic structure: use <p> for paragraphs, <blockquote> for the quote, <strong> for the FOR IMMEDIATE RELEASE label and any key terms. Include a boilerplate <section> at the end. No <html>/<head>/<body> tags needed — just the inner content fragment."\n}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw);
}

// ── Dev.to ────────────────────────────────────────────────────────────────────

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
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        article: {
          title: release.title,
          published: true,
          body_markdown: `${release.plaintextContent}\n\n---\n\n*Kiln is the creator platform built exclusively for craft artists. [Learn more →](${KILN_URL})*`,
          tags: release.keywords
            .split(",")
            .slice(0, 4)
            .map((k) => k.trim().toLowerCase().replace(/\s+/g, "")),
          canonical_url: PRESS_INDEX,
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

// ── Bluesky (AT Protocol) ─────────────────────────────────────────────────────

async function autoPostToBluesky(release: {
  title: string;
  summary: string;
}): Promise<string | null> {
  const identifier = process.env["BLUESKY_IDENTIFIER"];
  const appPassword = process.env["BLUESKY_APP_PASSWORD"];
  if (!identifier || !appPassword) return null;
  try {
    const sessionResp = await fetch(
      "https://bsky.social/xrpc/com.atproto.server.createSession",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password: appPassword }),
      }
    );
    if (!sessionResp.ok) return null;
    const session = (await sessionResp.json()) as {
      accessJwt?: string;
      did?: string;
    };
    if (!session.accessJwt || !session.did) return null;

    const text = `${release.title}\n\n${release.summary}\n\n${KILN_URL}`;
    const postResp = await fetch(
      "https://bsky.social/xrpc/com.atproto.repo.createRecord",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessJwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo: session.did,
          collection: "app.bsky.feed.post",
          record: {
            $type: "app.bsky.feed.post",
            text: text.slice(0, 300),
            createdAt: new Date().toISOString(),
          },
        }),
      }
    );
    if (!postResp.ok) return null;
    const post = (await postResp.json()) as { uri?: string };
    return post.uri
      ? `https://bsky.app/profile/${identifier}/post/${post.uri.split("/").pop()}`
      : null;
  } catch {
    return null;
  }
}

// ── Mastodon ──────────────────────────────────────────────────────────────────

async function autoPostToMastodon(release: {
  title: string;
  summary: string;
}): Promise<string | null> {
  const token = process.env["MASTODON_ACCESS_TOKEN"];
  const instance = process.env["MASTODON_INSTANCE"] ?? "mastodon.social";
  if (!token) return null;
  try {
    const status = `${release.title}\n\n${release.summary}\n\n${KILN_URL}\n\n#CraftArt #Ceramics #MakerCommunity #HandmadeArt #CreatorEconomy`;
    const resp = await fetch(`https://${instance}/api/v1/statuses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: status.slice(0, 500), visibility: "public" }),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { url?: string };
    return data.url ?? null;
  } catch {
    return null;
  }
}

// ── Weekly cron ───────────────────────────────────────────────────────────────

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
    const [devtoUrl, bskyUrl, mastodonUrl, pinterestUrl] = await Promise.all([
      autoPostToDevTo(generated),
      autoPostToBluesky(generated),
      autoPostToMastodon(generated),
      autoPostToPinterest(generated),
    ]);
    if (devtoUrl) postedUrls.push(`devto:${devtoUrl}`);
    if (bskyUrl) postedUrls.push(`bluesky:${bskyUrl}`);
    if (mastodonUrl) postedUrls.push(`mastodon:${mastodonUrl}`);
    if (pinterestUrl) postedUrls.push(`pinterest:${pinterestUrl}`);

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
    // silent — don't crash the server if an external API is down
  }
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
setTimeout(() => {
  runWeeklyRelease();
  setInterval(runWeeklyRelease, WEEK_MS);
}, 5000);

// ── Routes ────────────────────────────────────────────────────────────────────

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

router.get("/press/rss.xml", async (_req, res) => {
  try {
    const releases = await db
      .select({
        title: pressReleasesTable.title,
        slug: pressReleasesTable.slug,
        summary: pressReleasesTable.summary,
        htmlContent: pressReleasesTable.htmlContent,
        generatedAt: pressReleasesTable.generatedAt,
      })
      .from(pressReleasesTable)
      .orderBy(desc(pressReleasesTable.generatedAt))
      .limit(20);

    const items = releases
      .map((r) => {
        const url = `https://kilnfire.replit.app/kiln/press/${r.slug}.html`;
        const pubDate = r.generatedAt
          ? new Date(r.generatedAt).toUTCString()
          : new Date().toUTCString();
        const safeTitle = r.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeSummary = (r.summary ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `  <item>
    <title>${safeTitle}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <description>${safeSummary}</description>
    <pubDate>${pubDate}</pubDate>
  </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Kiln — Craft Artist Platform Press Releases</title>
    <link>${KILN_URL}</link>
    <description>News and updates from Kiln, the creator platform built exclusively for craft artists.</description>
    <language>en-us</language>
    <atom:link href="https://kilnfire.replit.app/api/press/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.send(xml);
  } catch {
    res.status(500).send("Failed to generate RSS feed");
  }
});

router.post("/press/generate", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
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
