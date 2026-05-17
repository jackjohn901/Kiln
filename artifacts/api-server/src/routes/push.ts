import { Router } from "express";
import { db } from "@workspace/db";
import { pushSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import webpush from "web-push";
import { logger } from "../lib/logger";

const router = Router();

function getVapidConfigured(): boolean {
  return !!(process.env["VAPID_PUBLIC_KEY"] && process.env["VAPID_PRIVATE_KEY"] && process.env["VAPID_EMAIL"]);
}

function setupVapid() {
  if (!getVapidConfigured()) return;
  webpush.setVapidDetails(
    process.env["VAPID_EMAIL"]!,
    process.env["VAPID_PUBLIC_KEY"]!,
    process.env["VAPID_PRIVATE_KEY"]!,
  );
}

setupVapid();

router.get("/push/vapid-key", (_req, res) => {
  const key = process.env["VAPID_PUBLIC_KEY"];
  if (!key) { res.status(503).json({ error: "Push not configured" }); return; }
  res.json({ publicKey: key });
});

router.post("/push/subscribe", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { endpoint, keys } = req.body as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "endpoint and keys required" }); return;
  }
  try {
    await db.insert(pushSubscriptionsTable)
      .values({
        id: crypto.randomUUID(),
        userId: req.user.id,
        endpoint,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
      })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: { userId: req.user.id, p256dhKey: keys.p256dh, authKey: keys.auth },
      });
    res.status(201).json({ success: true });
  } catch (err) {
    req.log.error({ err }, "push subscribe error");
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

router.delete("/push/unsubscribe", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) { res.status(400).json({ error: "endpoint required" }); return; }
  try {
    await db.delete(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "push unsubscribe error");
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  if (!getVapidConfigured()) return;
  try {
    const subs = await db.select().from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId));
    const payloadStr = JSON.stringify(payload);
    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dhKey, auth: sub.authKey } },
            payloadStr,
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) {
            await db.delete(pushSubscriptionsTable)
              .where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
          }
        }
      }),
    );
  } catch (err) {
    logger.warn({ err, userId }, "sendPushToUser error");
  }
}

export default router;
