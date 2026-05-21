import { Router } from "express";
import { db } from "@workspace/db";
import { platformTokensTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const PINTEREST_API = "https://api.pinterest.com/v5";
const REDIRECT_URI = "https://kilnfire.replit.app/api/press/pinterest/callback";
const PIN_IMAGE_URL = "https://kilnfire.replit.app/kiln/opengraph.jpg";
const KILN_URL = "https://kilnfire.replit.app/kiln/";

function getAppCredentials() {
  return {
    appId: process.env["PINTEREST_APP_ID"] ?? "",
    appSecret: process.env["PINTEREST_APP_SECRET"] ?? "",
  };
}

async function getStoredTokens(): Promise<{
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
} | null> {
  const rows = await db
    .select()
    .from(platformTokensTable)
    .where(eq(platformTokensTable.platform, "pinterest"))
    .limit(1);
  return rows[0] ?? null;
}

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
} | null> {
  const { appId, appSecret } = getAppCredentials();
  if (!appId || !appSecret) return null;

  try {
    const resp = await fetch(`${PINTEREST_API}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!resp.ok) {
      logger.error({ status: resp.status }, "Pinterest token refresh failed");
      return null;
    }
    const data = (await resp.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) return null;

    const expiresAt = new Date(
      Date.now() + (data.expires_in ?? 2592000) * 1000
    );
    await db
      .update(platformTokensTable)
      .set({ accessToken: data.access_token, expiresAt, updatedAt: new Date() })
      .where(eq(platformTokensTable.platform, "pinterest"));

    return { accessToken: data.access_token, expiresAt };
  } catch (err) {
    logger.error({ err }, "Pinterest token refresh error");
    return null;
  }
}

async function getValidAccessToken(): Promise<string | null> {
  const stored = await getStoredTokens();
  if (!stored) return null;

  const bufferMs = 5 * 60 * 1000;
  const isExpired =
    stored.expiresAt && stored.expiresAt.getTime() - Date.now() < bufferMs;

  if (isExpired && stored.refreshToken) {
    const refreshed = await refreshAccessToken(stored.refreshToken);
    return refreshed?.accessToken ?? null;
  }
  return stored.accessToken;
}

export async function autoPostToPinterest(release: {
  title: string;
  summary: string;
  slug: string;
}): Promise<string | null> {
  const boardId = process.env["PINTEREST_BOARD_ID"];
  if (!boardId) return null;

  const accessToken = await getValidAccessToken();
  if (!accessToken) return null;

  try {
    const description = `${release.summary}\n\nKiln is the creator platform built exclusively for craft artists — process video, shop, workshops, patron tiers, and commissions in one place.\n\n#CraftArt #Ceramics #Pottery #Glassblowing #Weaving #HandmadeArt #CraftArtist #MakerCommunity`;
    const pinUrl = `https://kilnfire.replit.app/kiln/press/${release.slug}.html`;

    const resp = await fetch(`${PINTEREST_API}/pins`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        board_id: boardId,
        title: release.title,
        description,
        link: pinUrl,
        media_source: {
          source_type: "image_url",
          url: PIN_IMAGE_URL,
        },
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      logger.error({ status: resp.status, err }, "Pinterest pin creation failed");
      return null;
    }

    const data = (await resp.json()) as { id?: string };
    return data.id ? `https://pinterest.com/pin/${data.id}` : null;
  } catch (err) {
    logger.error({ err }, "Pinterest auto-post error");
    return null;
  }
}

// ── OAuth setup routes ────────────────────────────────────────────────────────

router.get("/press/pinterest/auth", (req, res) => {
  const { appId } = getAppCredentials();
  if (!appId) {
    res.status(400).send("PINTEREST_APP_ID not configured.");
    return;
  }
  const authUrl = new URL("https://www.pinterest.com/oauth/");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "boards:read,pins:write");
  authUrl.searchParams.set("state", "kiln-pinterest-setup");
  res.redirect(authUrl.toString());
});

router.get("/press/pinterest/callback", async (req, res) => {
  const { code, error } = req.query as { code?: string; error?: string };
  if (error || !code) {
    res.status(400).send(`Pinterest OAuth error: ${error ?? "no code"}`);
    return;
  }

  const { appId, appSecret } = getAppCredentials();
  try {
    const tokenResp = await fetch(`${PINTEREST_API}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }).toString(),
    });

    if (!tokenResp.ok) {
      const err = await tokenResp.text();
      res.status(400).send(`Token exchange failed: ${err}`);
      return;
    }

    const tokens = (await tokenResp.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!tokens.access_token) {
      res.status(400).send("No access token in response.");
      return;
    }

    const expiresAt = new Date(
      Date.now() + (tokens.expires_in ?? 2592000) * 1000
    );

    await db
      .insert(platformTokensTable)
      .values({
        platform: "pinterest",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: platformTokensTable.platform,
        set: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          expiresAt,
          updatedAt: new Date(),
        },
      });

    logger.info("Pinterest OAuth tokens saved successfully");

    res.send(`
      <!DOCTYPE html><html><head><title>Pinterest Connected</title></head>
      <body style="font-family:system-ui;max-width:500px;margin:4rem auto;padding:2rem;text-align:center;">
        <h1 style="color:#e60023;">✓ Pinterest Connected!</h1>
        <p>Kiln is now authorized to post pins to your Pinterest account.</p>
        <p style="color:#666;">The weekly press release cron will automatically pin new releases to your board. You can close this tab.</p>
        <p><a href="${KILN_URL}">← Back to Kiln</a></p>
      </body></html>
    `);
  } catch (err) {
    logger.error({ err }, "Pinterest callback error");
    res.status(500).send("Internal error during Pinterest setup.");
  }
});

router.get("/press/pinterest/status", async (_req, res) => {
  const stored = await getStoredTokens();
  if (!stored) {
    res.json({ connected: false });
    return;
  }
  res.json({
    connected: true,
    expiresAt: stored.expiresAt,
    hasRefreshToken: !!stored.refreshToken,
  });
});

export default router;
