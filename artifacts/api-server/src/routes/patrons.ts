import { Router } from "express";
import { db } from "@workspace/db";
import { patronTiersTable, patronSubscriptionsTable, tipsTable, notificationsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /patron-tiers/:artistId — get tiers for an artist
router.get("/patron-tiers/:artistId", async (req, res): Promise<void> => {
  const tiers = await db.select().from(patronTiersTable).where(and(eq(patronTiersTable.artistId, req.params.artistId), eq(patronTiersTable.isActive, true))).orderBy(patronTiersTable.sortOrder);
  const viewerId = req.isAuthenticated() ? req.user.id : null;
  let subscribedTierIds = new Set<string>();
  if (viewerId) {
    const subs = await db.select({ tierId: patronSubscriptionsTable.tierId }).from(patronSubscriptionsTable).where(and(eq(patronSubscriptionsTable.subscriberId, viewerId), eq(patronSubscriptionsTable.artistId, req.params.artistId), eq(patronSubscriptionsTable.status, "active")));
    subscribedTierIds = new Set(subs.map(s => s.tierId));
  }
  res.json({ tiers: tiers.map(t => ({ ...t, isSubscribed: subscribedTierIds.has(t.id), createdAt: t.createdAt.toISOString() })) });
});

// POST /patron-tiers — create a tier (artist)
router.post("/patron-tiers", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, description, price, perks, sortOrder } = req.body;
  if (!name || !price) { res.status(400).json({ error: "name and price required" }); return; }
  const [tier] = await db.insert(patronTiersTable).values({ id: crypto.randomUUID(), artistId: req.user.id, name, description, price: Number(price), perks: perks ?? [], sortOrder: Number(sortOrder ?? 0) }).returning();
  res.status(201).json({ ...tier, isSubscribed: false, createdAt: tier.createdAt.toISOString() });
});

// POST /patron-tiers/:tierId/subscribe — subscribe/unsubscribe
router.post("/patron-tiers/:tierId/subscribe", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [tier] = await db.select().from(patronTiersTable).where(eq(patronTiersTable.id, req.params.tierId));
  if (!tier) { res.status(404).json({ error: "Tier not found" }); return; }
  const userId = req.user.id;
  const [existing] = await db.select().from(patronSubscriptionsTable).where(and(eq(patronSubscriptionsTable.tierId, tier.id), eq(patronSubscriptionsTable.subscriberId, userId), eq(patronSubscriptionsTable.status, "active")));
  if (existing) {
    await db.update(patronSubscriptionsTable).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(patronSubscriptionsTable.id, existing.id));
    await db.update(patronTiersTable).set({ subscriberCount: sql`GREATEST(${patronTiersTable.subscriberCount} - 1, 0)` }).where(eq(patronTiersTable.id, tier.id));
    res.json({ subscribed: false }); return;
  }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Patron";
  await db.insert(patronSubscriptionsTable).values({ id: crypto.randomUUID(), tierId: tier.id, artistId: tier.artistId, subscriberId: userId, subscriberName: name, amount: tier.price, status: "active" });
  await db.update(patronTiersTable).set({ subscriberCount: sql`${patronTiersTable.subscriberCount} + 1` }).where(eq(patronTiersTable.id, tier.id));
  await db.insert(notificationsTable).values({ id: crypto.randomUUID(), userId: tier.artistId, type: "subscription", fromId: userId, fromName: name, fromAvatarUrl: user.profileImageUrl ?? null, text: `subscribed to your ${tier.name} tier`, link: `/patrons` });
  res.json({ subscribed: true });
});

// GET /me/subscriptions — my active subscriptions
router.get("/me/subscriptions", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const subs = await db.select().from(patronSubscriptionsTable).where(and(eq(patronSubscriptionsTable.subscriberId, req.user.id), eq(patronSubscriptionsTable.status, "active"))).orderBy(desc(patronSubscriptionsTable.startedAt));
  res.json({ subscriptions: subs.map(s => ({ ...s, startedAt: s.startedAt.toISOString(), cancelledAt: s.cancelledAt?.toISOString() ?? null })) });
});

// POST /tips — send a tip
// POST /tips is now handled by /api/tips/checkout (new tips route)
// Legacy quick-tip endpoint kept for backwards compat
router.post("/tips", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { toId, toName, amount, message } = req.body;
  if (!toId || !amount) { res.status(400).json({ error: "toId and amount required" }); return; }
  const user = req.user;
  const fromName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Someone";
  const amountCents = Math.round(Number(amount) * 100);
  const [tip] = await db.insert(tipsTable).values({
    id: crypto.randomUUID(), fromUserId: user.id, fromUserName: fromName,
    toUserId: toId, toUserName: toName ?? "Artist", amountCents, message, status: "completed",
  }).returning();
  await db.insert(notificationsTable).values({ id: crypto.randomUUID(), userId: toId, type: "tip", fromId: user.id, fromName, fromAvatarUrl: user.profileImageUrl ?? null, text: `sent you a $${amount} tip${message ? `: "${message}"` : ""}`, link: `/earnings` });
  res.status(201).json({ ...tip, createdAt: tip.createdAt.toISOString() });
});

// GET /me/earnings — artist earnings summary
router.get("/me/earnings", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const [tips, subs] = await Promise.all([
    db.select().from(tipsTable).where(eq(tipsTable.toUserId, userId)).orderBy(desc(tipsTable.createdAt)),
    db.select().from(patronSubscriptionsTable).where(and(eq(patronSubscriptionsTable.artistId, userId), eq(patronSubscriptionsTable.status, "active"))),
  ]);
  const tipTotal = tips.reduce((s, t) => s + t.amountCents, 0);
  const monthlySubscriptions = subs.reduce((s, sub) => s + sub.amount, 0);
  const earnings = [
    ...tips.map(t => ({ id: t.id, type: "tip" as const, label: `Tip from ${t.fromUserName}`, sublabel: t.message ?? "", amount: t.amountCents, date: t.createdAt.toISOString() })),
    ...subs.map(s => ({ id: s.id, type: "subscription" as const, label: `Patron subscription`, sublabel: `$${s.amount}/mo`, amount: s.amount, date: s.startedAt.toISOString() })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({ earnings, totals: { tips: tipTotal, subscriptions: monthlySubscriptions, total: tipTotal + monthlySubscriptions } });
});

export default router;
