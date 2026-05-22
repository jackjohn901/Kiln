import { Router } from "express";
import { db } from "@workspace/db";
import { socialConnectionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

const router = Router();

const KILN_BASE = "https://kilnfire.replit.app/kiln";

async function postToBluesky(text: string): Promise<string | null> {
  const identifier = process.env["BLUESKY_IDENTIFIER"];
  const appPassword = process.env["BLUESKY_APP_PASSWORD"];
  if (!identifier || !appPassword) return null;
  try {
    const sessionResp = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password: appPassword }),
    });
    if (!sessionResp.ok) return null;
    const session = await sessionResp.json() as { accessJwt?: string; did?: string };
    if (!session.accessJwt || !session.did) return null;

    const postResp = await fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.accessJwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        repo: session.did,
        collection: "app.bsky.feed.post",
        record: { $type: "app.bsky.feed.post", text: text.slice(0, 300), createdAt: new Date().toISOString() },
      }),
    });
    if (!postResp.ok) return null;
    const post = await postResp.json() as { uri?: string };
    return post.uri ? `https://bsky.app/profile/${identifier}/post/${post.uri.split("/").pop()}` : null;
  } catch { return null; }
}

async function postToMastodon(text: string): Promise<string | null> {
  const token = process.env["MASTODON_ACCESS_TOKEN"];
  const instance = process.env["MASTODON_INSTANCE"] ?? "mastodon.social";
  if (!token) return null;
  try {
    const resp = await fetch(`https://${instance}/api/v1/statuses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: text.slice(0, 500), visibility: "public" }),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as { url?: string };
    return data.url ?? null;
  } catch { return null; }
}

// POST /api/press-packet/share
// Requires auth. Posts to Bluesky or Mastodon on behalf of Kiln, featuring the artist's press packet.
router.post("/press-packet/share", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required to share" }); return; }

  const { platform, artistName, packetUrl, bio } = req.body as {
    platform: string;
    artistName?: string;
    packetUrl?: string;
    bio?: string;
  };

  if (!platform) { res.status(400).json({ error: "platform is required" }); return; }

  const name = artistName ?? "A Kiln artist";
  const url = packetUrl ?? KILN_BASE;
  const snippet = bio ? ` "${bio.slice(0, 120)}${bio.length > 120 ? "…" : ""}"` : "";

  try {
    if (platform === "bluesky") {
      const configured = !!(process.env["BLUESKY_IDENTIFIER"] && process.env["BLUESKY_APP_PASSWORD"]);
      if (!configured) { res.status(422).json({ error: "Bluesky credentials not configured on this server yet." }); return; }
      const text = `✨ ${name} — press packet on Kiln\n${snippet}\n\n${url}\n\n#CraftArt #HandmadeArt #Kiln`;
      const postUrl = await postToBluesky(text);
      if (!postUrl) { res.status(500).json({ error: "Failed to post to Bluesky" }); return; }
      res.json({ success: true, url: postUrl });
      return;
    }

    if (platform === "mastodon") {
      const configured = !!process.env["MASTODON_ACCESS_TOKEN"];
      if (!configured) { res.status(422).json({ error: "Mastodon credentials not configured on this server yet." }); return; }
      const text = `✨ ${name} — press packet on Kiln\n${snippet}\n\n${url}\n\n#CraftArt #HandmadeArt #Kiln #MakerCommunity`;
      const postUrl = await postToMastodon(text);
      if (!postUrl) { res.status(500).json({ error: "Failed to post to Mastodon" }); return; }
      res.json({ success: true, url: postUrl });
      return;
    }

    // Return connected account info for platforms that use OAuth
    if (["instagram", "tiktok", "facebook"].includes(platform)) {
      const [conn] = await db.select({ platformUsername: socialConnectionsTable.platformUsername })
        .from(socialConnectionsTable)
        .where(and(eq(socialConnectionsTable.userId, req.user.id), eq(socialConnectionsTable.platform, platform)));
      if (!conn) {
        res.status(422).json({ error: `Connect your ${platform} account in Settings first.`, needsConnection: true, platform });
        return;
      }
      // For connected accounts, the client handles the actual share URL / deep link
      res.json({ success: true, connected: true, username: conn.platformUsername });
      return;
    }

    res.status(400).json({ error: "Unsupported platform" });
  } catch (err) {
    req.log.error({ err }, "pressPacketShare error");
    res.status(500).json({ error: "Share failed" });
  }
});

// GET /api/press-packet/platforms — returns which platforms are configured for API posting
router.get("/press-packet/platforms", async (req, res): Promise<void> => {
  const blueskyConfigured = !!(process.env["BLUESKY_IDENTIFIER"] && process.env["BLUESKY_APP_PASSWORD"]);
  const mastodonConfigured = !!process.env["MASTODON_ACCESS_TOKEN"];

  let connectedPlatforms: string[] = [];
  if (req.isAuthenticated()) {
    const conns = await db.select({ platform: socialConnectionsTable.platform })
      .from(socialConnectionsTable)
      .where(eq(socialConnectionsTable.userId, req.user.id));
    connectedPlatforms = conns.map(c => c.platform);
  }

  res.json({ blueskyConfigured, mastodonConfigured, connectedPlatforms });
});

export default router;
