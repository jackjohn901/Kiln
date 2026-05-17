import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, verificationApplicationsTable, userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// POST /me/orders — create a single order after confirmed Stripe payment
router.post("/me/orders", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;

  const { title, description, sellerId, type, refId, imageUrl, amount, stripeSessionId } = req.body as {
    title: string;
    description?: string;
    sellerId?: string;
    type?: string;
    refId?: string;
    imageUrl?: string;
    amount: number;
    stripeSessionId?: string;
  };

  if (!title || typeof amount !== "number") {
    res.status(400).json({ error: "title and amount required" }); return;
  }

  try {
    const dedupeKey = stripeSessionId ? `stripe:${stripeSessionId}` : null;

    if (dedupeKey) {
      const existing = await db.select({ id: ordersTable.id }).from(ordersTable)
        .where(eq(ordersTable.notes, dedupeKey))
        .limit(1);
      if (existing.length > 0) {
        res.json({ orderId: existing[0].id, duplicate: true }); return;
      }
    }

    const orderId = crypto.randomUUID();
    await db.insert(ordersTable).values({
      id: orderId,
      buyerId: userId,
      sellerId: sellerId ?? "kiln",
      type: type ?? "listing",
      refId: refId ?? null,
      title,
      description: description ?? null,
      imageUrl: imageUrl ?? null,
      amount: Math.round(amount),
      currency: "USD",
      status: "confirmed",
      notes: dedupeKey,
    });

    res.json({ orderId });
  } catch (err) {
    logger.error({ err }, "me/orders POST error");
    res.status(500).json({ error: "Failed to create order" });
  }
});

// POST /me/orders/bulk — create multiple orders (one per cart item) after Stripe session
router.post("/me/orders/bulk", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;

  const { stripeSessionId, items } = req.body as {
    stripeSessionId: string;
    items: Array<{
      title: string;
      amount: number;
      sellerId?: string;
      type?: string;
      refId?: string;
      imageUrl?: string;
    }>;
  };

  if (!stripeSessionId || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "stripeSessionId and items required" }); return;
  }

  try {
    const dedupeKey = `stripe:${stripeSessionId}`;
    const existing = await db.select({ id: ordersTable.id }).from(ordersTable)
      .where(eq(ordersTable.notes, dedupeKey))
      .limit(1);

    if (existing.length > 0) {
      res.json({ orderIds: [existing[0].id], duplicate: true }); return;
    }

    const orderIds: string[] = [];
    for (const item of items) {
      const orderId = crypto.randomUUID();
      await db.insert(ordersTable).values({
        id: orderId,
        buyerId: userId,
        sellerId: item.sellerId ?? "kiln",
        type: item.type ?? "listing",
        refId: item.refId ?? null,
        title: item.title,
        description: null,
        imageUrl: item.imageUrl ?? null,
        amount: Math.round(item.amount),
        currency: "USD",
        status: "confirmed",
        notes: orderIds.length === 0 ? dedupeKey : null,
      });
      orderIds.push(orderId);
    }

    res.json({ orderIds });
  } catch (err) {
    logger.error({ err }, "me/orders/bulk error");
    res.status(500).json({ error: "Failed to create orders" });
  }
});

// POST /me/listing-waitlist/:id — toggle listing waitlist (stored in user_settings JSON)
router.post("/me/listing-waitlist/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const listingId = req.params.id;
  try {
    const [row] = await db.select({ settings: userSettingsTable.settings })
      .from(userSettingsTable).where(eq(userSettingsTable.userId, userId));
    const settings = (row?.settings ?? {}) as Record<string, unknown>;
    const waitlist: string[] = Array.isArray(settings.listingWaitlist) ? (settings.listingWaitlist as string[]) : [];
    const isOnWaitlist = waitlist.includes(listingId);
    const next = isOnWaitlist ? waitlist.filter(id => id !== listingId) : [...waitlist, listingId];
    const newSettings = { ...settings, listingWaitlist: next };
    if (row) {
      await db.update(userSettingsTable).set({ settings: newSettings }).where(eq(userSettingsTable.userId, userId));
    } else {
      await db.insert(userSettingsTable).values({ userId, settings: newSettings, shippingSettings: {}, paymentSettings: {} });
    }
    res.json({ onWaitlist: !isOnWaitlist });
  } catch (err) {
    logger.error({ err }, "listing-waitlist POST error");
    res.status(500).json({ error: "Failed to update waitlist" });
  }
});

// POST /me/verification-application — submit or update a verification application
router.post("/me/verification-application", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const { website, instagram, yearsActive, exhibitions, galleries, statement } = req.body as {
    website?: string; instagram?: string; yearsActive?: number;
    exhibitions?: string; galleries?: string; statement?: string;
  };
  try {
    const [row] = await db.insert(verificationApplicationsTable)
      .values({
        id: crypto.randomUUID(),
        userId,
        website: website ?? null,
        instagram: instagram ?? null,
        yearsActive: typeof yearsActive === "number" ? yearsActive : null,
        exhibitions: exhibitions ?? null,
        galleries: galleries ?? null,
        statement: statement ?? null,
        status: "pending",
      })
      .onConflictDoUpdate({
        target: [verificationApplicationsTable.userId],
        set: {
          website: website ?? null,
          instagram: instagram ?? null,
          yearsActive: typeof yearsActive === "number" ? yearsActive : null,
          exhibitions: exhibitions ?? null,
          galleries: galleries ?? null,
          statement: statement ?? null,
          status: "pending",
        },
      })
      .returning();
    res.json(row);
  } catch (err) {
    logger.error({ err }, "verification-application POST error");
    res.status(500).json({ error: "Failed to submit application" });
  }
});

// GET /me/verification-application — check existing application
router.get("/me/verification-application", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [row] = await db.select().from(verificationApplicationsTable)
    .where(eq(verificationApplicationsTable.userId, req.user.id));
  res.json(row ?? null);
});

export default router;
