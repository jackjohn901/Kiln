import { Router } from "express";
import { db } from "@workspace/db";
import { tipsTable, notificationsTable, profilesTable } from "@workspace/db";
import { eq, desc, sum, sql } from "drizzle-orm";
import crypto from "crypto";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router = Router();

// POST /tips/checkout — create Stripe checkout for a tip
router.post("/tips/checkout", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { toUserId, toUserName, postId, amountCents, message } = req.body as {
    toUserId: string; toUserName: string; postId?: string; amountCents: number; message?: string;
  };
  if (!toUserId || !amountCents || amountCents < 100) { res.status(400).json({ error: "toUserId and amountCents (min 100) required" }); return; }
  const user = req.user;
  const fromName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Fan";
  try {
    const [tip] = await db.insert(tipsTable).values({
      id: crypto.randomUUID(), fromUserId: user.id, fromUserName: fromName,
      toUserId, toUserName, postId: postId ?? null, amountCents, message: message ?? null, status: "pending",
    }).returning();

    const stripe = await getUncachableStripeClient();
    const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : `http://localhost:${process.env.PORT}`;
    const basePath = process.env.BASE_PATH ?? "";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: { name: `Tip for ${toUserName}`, description: message ?? "A tip from a fan" },
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${baseUrl}${basePath}${postId ? `/posts/${postId}` : `/artists/${toUserId}`}?tipped=1&tip_id=${tip.id}`,
      cancel_url: `${baseUrl}${basePath}${postId ? `/posts/${postId}` : `/artists/${toUserId}`}`,
      metadata: { platform: "kiln", tipId: tip.id, toUserId, fromUserId: user.id },
    });
    await db.update(tipsTable).set({ stripePaymentIntentId: session.id }).where(eq(tipsTable.id, tip.id));
    res.json({ url: session.url, tipId: tip.id });
  } catch (err: any) {
    logger.error({ err }, "tip checkout error");
    res.status(500).json({ error: err.message ?? "Checkout failed" });
  }
});

// POST /tips/:id/confirm — confirm tip after Stripe success
router.post("/tips/:id/confirm", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [tip] = await db.select().from(tipsTable).where(eq(tipsTable.id, req.params.id));
  if (!tip || tip.fromUserId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.update(tipsTable).set({ status: "completed" }).where(eq(tipsTable.id, tip.id));
  // Update total spent
  await db.update(profilesTable).set({ totalSpentCents: sql`${profilesTable.totalSpentCents} + ${tip.amountCents}` }).where(eq(profilesTable.userId, tip.fromUserId));
  // Notify artist
  await db.insert(notificationsTable).values({
    id: crypto.randomUUID(), userId: tip.toUserId, type: "tip" as any, fromId: tip.fromUserId,
    fromName: tip.fromUserName, fromAvatarUrl: req.user.profileImageUrl ?? null,
    text: `tipped you $${(tip.amountCents / 100).toFixed(2)}${tip.message ? `: "${tip.message}"` : ""}`,
    link: tip.postId ? `/posts/${tip.postId}` : `/artists/${tip.fromUserId}`,
  });
  res.json({ ok: true });
});

// GET /tips/received — tips I've received
router.get("/tips/received", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const tips = await db.select().from(tipsTable).where(eq(tipsTable.toUserId, req.user.id)).orderBy(desc(tipsTable.createdAt)).limit(50);
  const total = await db.select({ total: sum(tipsTable.amountCents) }).from(tipsTable).where(eq(tipsTable.toUserId, req.user.id));
  res.json({ tips: tips.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })), totalCents: Number(total[0]?.total ?? 0) });
});

export default router;
