import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { commissionsTable, notificationsTable, socialConnectionsTable, profilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { detectCommissionIntent } from "../lib/captionAdapter";
import { autoPostToConnectedPlatforms } from "../lib/socialAutoPost";

const router = Router();

const INSTAGRAM_VERIFY_TOKEN = process.env.INSTAGRAM_WEBHOOK_TOKEN ?? "kiln-instagram-verify";
const TIKTOK_VERIFY_TOKEN = process.env.TIKTOK_WEBHOOK_TOKEN ?? "kiln-tiktok-verify";

function getAppBase(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return `https://${domains.split(",")[0]}`;
  return "";
}

// ── Instagram webhook verification (GET) ──────────────────────────────────────

router.get("/webhooks/instagram/comments", (req, res): void => {
  const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query as Record<string, string>;
  if (mode === "subscribe" && token === INSTAGRAM_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: "Forbidden" });
  }
});

// ── Instagram comment webhook (POST) ──────────────────────────────────────────

router.post("/webhooks/instagram/comments", async (req, res): Promise<void> => {
  res.status(200).json({ received: true });

  try {
    const body = req.body as {
      entry?: Array<{
        id: string;
        changes?: Array<{
          field: string;
          value?: {
            text?: string;
            from?: { id: string; name?: string };
            media?: { id: string };
          };
        }>;
      }>;
    };

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "comments") continue;
        const text = change.value?.text;
        const fromId = change.value?.from?.id;
        const fromName = change.value?.from?.name ?? "Instagram user";
        if (!text || !fromId) continue;

        const instagramAccountId = entry.id;
        const [conn] = await db
          .select()
          .from(socialConnectionsTable)
          .where(
            and(
              eq(socialConnectionsTable.platform, "instagram"),
              eq(socialConnectionsTable.platformUserId, instagramAccountId),
            ),
          );
        if (!conn) continue;

        const { isInquiry, confidence, details } = await detectCommissionIntent(text);
        if (!isInquiry || confidence === "low") continue;

        const [profile] = await db
          .select({ displayName: profilesTable.displayName })
          .from(profilesTable)
          .where(eq(profilesTable.userId, conn.userId));

        const artistName = profile?.displayName ?? "Artist";
        const commissionId = crypto.randomUUID();

        await db.insert(commissionsTable).values({
          id: commissionId,
          artistId: conn.userId,
          artistName,
          clientId: `social:instagram:${fromId}`,
          clientName: fromName,
          description: `[Via Instagram comment] "${text}"${details ? `\n\nExtracted details: ${details}` : ""}`,
          status: "pending",
        });

        await db.insert(notificationsTable).values({
          id: crypto.randomUUID(),
          userId: conn.userId,
          type: "commission",
          fromId: `social:instagram:${fromId}`,
          fromName,
          fromAvatarUrl: null,
          text: `left a comment that looks like a commission inquiry: "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"`,
          link: "/commissions",
        });

        req.log.info({ commissionId, artistId: conn.userId, fromId }, "Comment-to-commission draft created via Instagram");
      }
    }
  } catch (err) {
    req.log.warn({ err }, "Instagram comment webhook processing error");
  }
});

// ── TikTok webhook verification (GET) ─────────────────────────────────────────

router.get("/webhooks/tiktok/comments", (req, res): void => {
  const { verify_token: token, challenge } = req.query as Record<string, string>;
  if (token === TIKTOK_VERIFY_TOKEN) {
    res.status(200).send(challenge ?? "ok");
  } else {
    res.status(403).json({ error: "Forbidden" });
  }
});

// ── TikTok comment webhook (POST) ─────────────────────────────────────────────

router.post("/webhooks/tiktok/comments", async (req, res): Promise<void> => {
  res.status(200).json({ received: true });

  try {
    const body = req.body as {
      event?: string;
      data?: {
        comment?: {
          text?: string;
          open_id?: string;
          display_name?: string;
          video?: { id?: string };
        };
      };
    };

    if (body.event !== "comment.create") return;

    const text = body.data?.comment?.text;
    const openId = body.data?.comment?.open_id;
    const displayName = body.data?.comment?.display_name ?? "TikTok user";
    if (!text || !openId) return;

    const { isInquiry, confidence, details } = await detectCommissionIntent(text);
    if (!isInquiry || confidence === "low") return;

    const videoId = body.data?.comment?.video?.id;
    if (!videoId) return;

    const [conn] = await db
      .select()
      .from(socialConnectionsTable)
      .where(eq(socialConnectionsTable.platform, "tiktok"));

    if (!conn) return;

    const [profile] = await db
      .select({ displayName: profilesTable.displayName })
      .from(profilesTable)
      .where(eq(profilesTable.userId, conn.userId));

    const artistName = profile?.displayName ?? "Artist";
    const commissionId = crypto.randomUUID();

    await db.insert(commissionsTable).values({
      id: commissionId,
      artistId: conn.userId,
      artistName,
      clientId: `social:tiktok:${openId}`,
      clientName: displayName,
      description: `[Via TikTok comment] "${text}"${details ? `\n\nExtracted details: ${details}` : ""}`,
      status: "pending",
    });

    await db.insert(notificationsTable).values({
      id: crypto.randomUUID(),
      userId: conn.userId,
      type: "commission",
      fromId: `social:tiktok:${openId}`,
      fromName: displayName,
      fromAvatarUrl: null,
      text: `left a TikTok comment that looks like a commission inquiry: "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}"`,
      link: "/commissions",
    });

    req.log.info({ commissionId, artistId: conn.userId, openId }, "Comment-to-commission draft created via TikTok");
  } catch (err) {
    req.log.warn({ err }, "TikTok comment webhook processing error");
  }
});

// ── Kiln Opening Reveal ────────────────────────────────────────────────────────

router.post("/me/kiln-opening", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { title, description, imageUrl } = req.body as {
    title?: string;
    description?: string;
    imageUrl?: string;
  };

  if (!title?.trim()) { res.status(400).json({ error: "title is required" }); return; }

  const user = req.user;
  const base = getAppBase();
  const profileUrl = `${base}/kiln/profile/${user.id}`;

  const caption = [
    `🔥 Kiln Opening Reveal: ${title}`,
    description ? `\n${description}` : "",
    `\nSee the new works on my Kiln profile: ${profileUrl}`,
    "\n\n#kilnopening #ceramics #craftreveal #handmade #fireitup",
  ]
    .filter(Boolean)
    .join("");

  try {
    await autoPostToConnectedPlatforms(
      user.id,
      { id: `kiln-opening-${Date.now()}`, caption, thumbnailUrl: imageUrl ?? null, videoUrl: null },
    );

    const connections = await db
      .select({ platform: socialConnectionsTable.platform })
      .from(socialConnectionsTable)
      .where(
        and(
          eq(socialConnectionsTable.userId, user.id),
          eq(socialConnectionsTable.autoPost, true),
        ),
      );

    res.json({
      success: true,
      sharedTo: connections.map((c) => c.platform),
    });
  } catch (err) {
    req.log.error({ err }, "kilnOpening error");
    res.status(500).json({ error: "Failed to announce opening" });
  }
});

// ── Social reach for a post ────────────────────────────────────────────────────

router.get("/posts/:id/social-reach", async (req, res): Promise<void> => {
  try {
    const { db: dbModule, postsTable } = await import("@workspace/db");
    const { eq: eqFn } = await import("drizzle-orm");
    const [post] = await dbModule.select({ sharedPlatforms: postsTable.sharedPlatforms }).from(postsTable).where(eqFn(postsTable.id, req.params.id));
    if (!post) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ platforms: post.sharedPlatforms ?? [] });
  } catch (err) {
    req.log.error({ err }, "socialReach error");
    res.status(500).json({ error: "Failed to load social reach" });
  }
});

export default router;
