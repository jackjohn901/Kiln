import { Router } from "express";
import { db } from "@workspace/db";
import { subscriptionBoxesTable, boxSubscribersTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import crypto from "crypto";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router = Router();

// GET /subscription-boxes — browse all active boxes
router.get("/subscription-boxes", async (req, res): Promise<void> => {
  const boxes = await db.select().from(subscriptionBoxesTable).where(eq(subscriptionBoxesTable.isActive, true)).orderBy(desc(subscriptionBoxesTable.createdAt));
  res.json({ boxes: boxes.map(b => ({ ...b, nextShipDate: b.nextShipDate?.toISOString() ?? null, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() })) });
});

// GET /subscription-boxes/artist/:artistId
router.get("/subscription-boxes/artist/:artistId", async (req, res): Promise<void> => {
  const boxes = await db.select().from(subscriptionBoxesTable).where(eq(subscriptionBoxesTable.artistId, req.params.artistId));
  res.json({ boxes: boxes.map(b => ({ ...b, nextShipDate: b.nextShipDate?.toISOString() ?? null, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() })) });
});

// POST /subscription-boxes — create a box
router.post("/subscription-boxes", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, description, imageUrl, priceCents, frequency, maxSubscribers, nextShipDate } = req.body;
  if (!title || !priceCents) { res.status(400).json({ error: "title and priceCents required" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  const [box] = await db.insert(subscriptionBoxesTable).values({
    id: crypto.randomUUID(), artistId: user.id, artistName: name,
    title, description, imageUrl, priceCents, frequency: frequency ?? "monthly",
    maxSubscribers: maxSubscribers ?? null, nextShipDate: nextShipDate ? new Date(nextShipDate) : null,
  }).returning();
  res.status(201).json({ ...box, nextShipDate: box.nextShipDate?.toISOString() ?? null, createdAt: box.createdAt.toISOString(), updatedAt: box.updatedAt.toISOString() });
});

// POST /subscription-boxes/:id/subscribe — subscribe via Stripe
router.post("/subscription-boxes/:id/subscribe", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [box] = await db.select().from(subscriptionBoxesTable).where(eq(subscriptionBoxesTable.id, req.params.id));
  if (!box || !box.isActive) { res.status(404).json({ error: "Box not found" }); return; }
  const { shippingAddress } = req.body;
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Subscriber";
  try {
    const stripe = await getUncachableStripeClient();
    const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : `http://localhost:${process.env.PORT}`;
    const basePath = process.env.BASE_PATH ?? "";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'link'],
      customer_email: user.email ?? undefined,
      line_items: [{
        price_data: {
          currency: "usd", unit_amount: box.priceCents,
          product_data: { name: box.title, description: `${box.frequency} subscription box from ${box.artistName}` },
          recurring: { interval: box.frequency === "quarterly" ? "month" : "month", interval_count: box.frequency === "quarterly" ? 3 : 1 },
        },
        quantity: 1,
      }],
      mode: "subscription",
      success_url: `${baseUrl}${basePath}/subscription-boxes/${box.id}?subscribed=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${basePath}/subscription-boxes/${box.id}`,
      metadata: { platform: "kiln", boxId: box.id, userId: user.id },
    });
    const [sub] = await db.insert(boxSubscribersTable).values({
      id: crypto.randomUUID(), boxId: box.id, userId: user.id, userName: name,
      userEmail: user.email ?? null, shippingAddress: shippingAddress ?? null, stripeSubscriptionId: session.id,
    }).returning();
    await db.update(subscriptionBoxesTable).set({ subscriberCount: sql`${subscriptionBoxesTable.subscriberCount} + 1` }).where(eq(subscriptionBoxesTable.id, box.id));
    res.json({ url: session.url, subId: sub.id });
  } catch (err: any) {
    logger.error({ err }, "subscription box error");
    res.status(500).json({ error: err.message ?? "Subscription failed" });
  }
});

export default router;
