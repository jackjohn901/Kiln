import { Router } from "express";
import { db } from "@workspace/db";
import { boostedPostsTable } from "@workspace/db";
import { eq, desc, and, gt } from "drizzle-orm";
import crypto from "crypto";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router = Router();

// GET /boosts/me — my active boosts
router.get("/boosts/me", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const boosts = await db.select().from(boostedPostsTable).where(eq(boostedPostsTable.userId, req.user.id)).orderBy(desc(boostedPostsTable.createdAt));
  res.json({ boosts: boosts.map(b => ({ ...b, startDate: b.startDate.toISOString(), endDate: b.endDate.toISOString(), createdAt: b.createdAt.toISOString() })) });
});

// POST /boosts — boost a post via Stripe
router.post("/boosts", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { postId, budgetCents, durationDays, targetTechnique, targetLocation } = req.body;
  if (!postId || !budgetCents || budgetCents < 500) { res.status(400).json({ error: "postId and budgetCents (min $5) required" }); return; }
  const user = req.user;
  const endDate = new Date(Date.now() + (durationDays ?? 7) * 24 * 60 * 60 * 1000);
  try {
    const stripe = await getUncachableStripeClient();
    const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : `http://localhost:${process.env.PORT}`;
    const basePath = process.env.BASE_PATH ?? "";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [{ price_data: { currency: "usd", unit_amount: budgetCents, product_data: { name: `Boost post for ${durationDays ?? 7} days` } }, quantity: 1 }],
      mode: "payment",
      success_url: `${baseUrl}${basePath}/posts/${postId}?boosted=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${basePath}/posts/${postId}`,
      metadata: { platform: "kiln", postId, userId: user.id },
    });
    const [boost] = await db.insert(boostedPostsTable).values({
      id: crypto.randomUUID(), postId, userId: user.id, budgetCents, targetTechnique: targetTechnique ?? null,
      targetLocation: targetLocation ?? null, status: "pending", endDate, stripeSessionId: session.id,
    }).returning();
    res.json({ url: session.url, boostId: boost.id });
  } catch (err: any) {
    logger.error({ err }, "boost error");
    res.status(500).json({ error: err.message ?? "Boost failed" });
  }
});

// GET /boosts/active — get IDs of currently boosted posts (for feed injection)
router.get("/boosts/active", async (req, res): Promise<void> => {
  const now = new Date();
  const boosts = await db.select({ postId: boostedPostsTable.postId }).from(boostedPostsTable)
    .where(and(eq(boostedPostsTable.status, "active"), gt(boostedPostsTable.endDate, now)));
  res.json({ postIds: boosts.map(b => b.postId) });
});

export default router;
