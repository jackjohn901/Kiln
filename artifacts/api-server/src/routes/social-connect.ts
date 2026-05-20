import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { socialConnectionsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

const router = Router();

// Short-lived state store for OAuth CSRF protection (expires after 10 minutes)
const oauthStateMap = new Map<string, { userId: string; expiresAt: number }>();

function generateState(userId: string): string {
  const state = `${userId}:${crypto.randomBytes(16).toString("hex")}`;
  oauthStateMap.set(state, { userId, expiresAt: Date.now() + 10 * 60 * 1000 });
  return state;
}

function consumeState(state: string): string | null {
  const entry = oauthStateMap.get(state);
  oauthStateMap.delete(state);
  if (!entry || Date.now() > entry.expiresAt) return null;
  return entry.userId;
}

function getCallbackBase(req: { hostname: string }): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return `https://${domains.split(",")[0]}`;
  return `https://${req.hostname}`;
}

function redirectToApp(res: { redirect: (url: string) => void }, base: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  res.redirect(`${base}/kiln/social-sync?${qs}`);
}

// ─── List connections ──────────────────────────────────────────────────────────

router.get("/me/social-connections", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const rows = await db
      .select()
      .from(socialConnectionsTable)
      .where(eq(socialConnectionsTable.userId, req.user.id));
    res.json(rows.map((r) => ({
      platform: r.platform,
      platformUsername: r.platformUsername,
      platformAvatarUrl: r.platformAvatarUrl,
      autoPost: r.autoPost,
      connectedAt: r.connectedAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "listSocialConnections error");
    res.status(500).json({ error: "Failed to load connections" });
  }
});

// ─── Toggle auto-post ─────────────────────────────────────────────────────────

router.patch("/me/social-connections/:platform", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { platform } = req.params;
  const { autoPost } = req.body as { autoPost: boolean };
  try {
    await db
      .update(socialConnectionsTable)
      .set({ autoPost: !!autoPost })
      .where(and(eq(socialConnectionsTable.userId, req.user.id), eq(socialConnectionsTable.platform, platform)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "patchSocialConnection error");
    res.status(500).json({ error: "Failed to update" });
  }
});

// ─── Disconnect ────────────────────────────────────────────────────────────────

router.delete("/me/social-connections/:platform", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { platform } = req.params;
  try {
    await db
      .delete(socialConnectionsTable)
      .where(and(eq(socialConnectionsTable.userId, req.user.id), eq(socialConnectionsTable.platform, platform)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "deleteSocialConnection error");
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

// ─── Instagram OAuth ───────────────────────────────────────────────────────────

router.get("/social-auth/instagram/connect", (req, res): void => {
  if (!req.isAuthenticated()) { res.redirect("/api/login"); return; }
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  if (!clientId) {
    const base = getCallbackBase(req);
    redirectToApp(res, base, { error: "Instagram app not configured" });
    return;
  }
  const state = generateState(req.user.id);
  const base = getCallbackBase(req);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${base}/api/social-auth/instagram/callback`,
    scope: "instagram_basic,instagram_content_publish",
    response_type: "code",
    state,
  });
  res.redirect(`https://api.instagram.com/oauth/authorize?${params}`);
});

router.get("/social-auth/instagram/callback", async (req, res): Promise<void> => {
  const base = getCallbackBase(req);
  const { code, state, error } = req.query as Record<string, string>;

  if (error) { redirectToApp(res, base, { error: `Instagram: ${error}` }); return; }

  const userId = consumeState(state);
  if (!userId) { redirectToApp(res, base, { error: "Invalid or expired OAuth state" }); return; }

  const clientId = process.env.INSTAGRAM_CLIENT_ID!;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET!;

  try {
    // Exchange code for short-lived token
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: `${base}/api/social-auth/instagram/callback`,
      code,
    });
    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST", body: tokenBody,
    });
    if (!tokenRes.ok) throw new Error(await tokenRes.text());
    const { access_token: shortToken, user_id: igUserId } = (await tokenRes.json()) as { access_token: string; user_id: string };

    // Exchange for long-lived token (60 days)
    const longParams = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: clientSecret,
      access_token: shortToken,
    });
    const longRes = await fetch(`https://graph.instagram.com/access_token?${longParams}`);
    const longData = (await longRes.json()) as { access_token?: string; expires_in?: number };
    const finalToken = longData.access_token ?? shortToken;
    const expiresAt = longData.expires_in
      ? new Date(Date.now() + longData.expires_in * 1000)
      : null;

    // Fetch username
    const infoRes = await fetch(`https://graph.instagram.com/${igUserId}?fields=username&access_token=${finalToken}`);
    const info = (await infoRes.json()) as { username?: string };

    await db
      .insert(socialConnectionsTable)
      .values({
        id: crypto.randomUUID(),
        userId,
        platform: "instagram",
        accessToken: finalToken,
        platformUserId: String(igUserId),
        platformUsername: info.username ?? null,
        expiresAt,
        autoPost: true,
      })
      .onConflictDoUpdate({
        target: [socialConnectionsTable.userId, socialConnectionsTable.platform],
        set: { accessToken: finalToken, platformUserId: String(igUserId), platformUsername: info.username ?? null, expiresAt, autoPost: true },
      });

    redirectToApp(res, base, { connected: "instagram" });
  } catch (err) {
    req.log.error({ err }, "Instagram callback error");
    redirectToApp(res, base, { error: "Instagram connection failed" });
  }
});

// ─── TikTok OAuth ─────────────────────────────────────────────────────────────

router.get("/social-auth/tiktok/connect", (req, res): void => {
  if (!req.isAuthenticated()) { res.redirect("/api/login"); return; }
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    const base = getCallbackBase(req);
    redirectToApp(res, base, { error: "TikTok app not configured" });
    return;
  }
  const state = generateState(req.user.id);
  const base = getCallbackBase(req);
  const params = new URLSearchParams({
    client_key: clientKey,
    scope: "user.info.basic,video.publish",
    response_type: "code",
    redirect_uri: `${base}/api/social-auth/tiktok/callback`,
    state,
  });
  res.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params}`);
});

router.get("/social-auth/tiktok/callback", async (req, res): Promise<void> => {
  const base = getCallbackBase(req);
  const { code, state, error } = req.query as Record<string, string>;

  if (error) { redirectToApp(res, base, { error: `TikTok: ${error}` }); return; }

  const userId = consumeState(state);
  if (!userId) { redirectToApp(res, base, { error: "Invalid or expired OAuth state" }); return; }

  const clientKey = process.env.TIKTOK_CLIENT_KEY!;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;

  try {
    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${base}/api/social-auth/tiktok/callback`,
      }),
    });
    if (!tokenRes.ok) throw new Error(await tokenRes.text());
    const tokenData = (await tokenRes.json()) as { access_token: string; refresh_token?: string; open_id: string; expires_in?: number };

    const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;

    // Fetch user info
    const infoRes = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const infoData = (await infoRes.json()) as { data?: { user?: { open_id?: string; display_name?: string; avatar_url?: string } } };
    const ttUser = infoData.data?.user;

    await db
      .insert(socialConnectionsTable)
      .values({
        id: crypto.randomUUID(),
        userId,
        platform: "tiktok",
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        platformUserId: tokenData.open_id,
        platformUsername: ttUser?.display_name ?? null,
        platformAvatarUrl: ttUser?.avatar_url ?? null,
        expiresAt,
        autoPost: true,
      })
      .onConflictDoUpdate({
        target: [socialConnectionsTable.userId, socialConnectionsTable.platform],
        set: { accessToken: tokenData.access_token, refreshToken: tokenData.refresh_token ?? null, platformUserId: tokenData.open_id, platformUsername: ttUser?.display_name ?? null, platformAvatarUrl: ttUser?.avatar_url ?? null, expiresAt, autoPost: true },
      });

    redirectToApp(res, base, { connected: "tiktok" });
  } catch (err) {
    req.log.error({ err }, "TikTok callback error");
    redirectToApp(res, base, { error: "TikTok connection failed" });
  }
});

// ─── Facebook OAuth ────────────────────────────────────────────────────────────

router.get("/social-auth/facebook/connect", (req, res): void => {
  if (!req.isAuthenticated()) { res.redirect("/api/login"); return; }
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) {
    const base = getCallbackBase(req);
    redirectToApp(res, base, { error: "Facebook app not configured" });
    return;
  }
  const state = generateState(req.user.id);
  const base = getCallbackBase(req);
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: `${base}/api/social-auth/facebook/callback`,
    scope: "pages_manage_posts,pages_read_engagement,pages_show_list",
    state,
    response_type: "code",
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
});

router.get("/social-auth/facebook/callback", async (req, res): Promise<void> => {
  const base = getCallbackBase(req);
  const { code, state, error } = req.query as Record<string, string>;

  if (error) { redirectToApp(res, base, { error: `Facebook: ${error}` }); return; }

  const userId = consumeState(state);
  if (!userId) { redirectToApp(res, base, { error: "Invalid or expired OAuth state" }); return; }

  const appId = process.env.FACEBOOK_APP_ID!;
  const appSecret = process.env.FACEBOOK_APP_SECRET!;

  try {
    // Exchange code for user token
    const tokenParams = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: `${base}/api/social-auth/facebook/callback`,
      code,
    });
    const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams}`);
    if (!tokenRes.ok) throw new Error(await tokenRes.text());
    const tokenData = (await tokenRes.json()) as { access_token: string; expires_in?: number };

    // Get user's Pages (use first page for posting)
    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${tokenData.access_token}`);
    const pagesData = (await pagesRes.json()) as { data?: Array<{ id: string; name: string; access_token: string; picture?: { data?: { url?: string } } }> };
    const page = pagesData.data?.[0];

    const pageToken = page?.access_token ?? tokenData.access_token;
    const pageId = page?.id ?? "me";
    const pageName = page?.name ?? "My Page";

    const expiresAt = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null;

    await db
      .insert(socialConnectionsTable)
      .values({
        id: crypto.randomUUID(),
        userId,
        platform: "facebook",
        accessToken: pageToken,
        platformUserId: pageId,
        platformUsername: pageName,
        expiresAt,
        autoPost: true,
      })
      .onConflictDoUpdate({
        target: [socialConnectionsTable.userId, socialConnectionsTable.platform],
        set: { accessToken: pageToken, platformUserId: pageId, platformUsername: pageName, expiresAt, autoPost: true },
      });

    redirectToApp(res, base, { connected: "facebook" });
  } catch (err) {
    req.log.error({ err }, "Facebook callback error");
    redirectToApp(res, base, { error: "Facebook connection failed" });
  }
});

export default router;
