import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
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

export default router;
