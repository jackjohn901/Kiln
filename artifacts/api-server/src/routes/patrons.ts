import { Router } from "express";
import { db } from "@workspace/db";
import { patronTiersTable, patronSubscriptionsTable, tipsTable, notificationsTable, ordersTable, profilesTable, userSettingsTable } from "@workspace/db";
import { sendEmail, newPatronEmail } from "../lib/email";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
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

// PATCH /patron-tiers/:tierId — update a tier (artist only)
router.patch("/patron-tiers/:tierId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [tier] = await db.select().from(patronTiersTable).where(eq(patronTiersTable.id, req.params.tierId));
  if (!tier) { res.status(404).json({ error: "Tier not found" }); return; }
  if (tier.artistId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, description, price, perks, isActive, sortOrder } = req.body as {
    name?: string; description?: string; price?: number; perks?: string[]; isActive?: boolean; sortOrder?: number;
  };
  const updates: Partial<typeof tier> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = Number(price);
  if (perks !== undefined) updates.perks = perks;
  if (isActive !== undefined) updates.isActive = isActive;
  if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);
  const [updated] = await db.update(patronTiersTable).set(updates).where(eq(patronTiersTable.id, req.params.tierId)).returning();
  res.json({ ...updated, isSubscribed: false, createdAt: updated.createdAt.toISOString() });
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

  // Email notification (fire-and-forget)
  Promise.all([
    db.select({ contactEmail: profilesTable.contactEmail }).from(profilesTable).where(eq(profilesTable.userId, tier.artistId)).limit(1),
    db.select({ settings: userSettingsTable.settings }).from(userSettingsTable).where(eq(userSettingsTable.userId, tier.artistId)).limit(1),
  ]).then(([[p], [s]]) => {
    const emailSettings = (s?.settings as Record<string, boolean> | null);
    const wantsEmail = emailSettings?.notif_email_paused !== true && emailSettings?.notif_email_new_patron !== false;
    if (wantsEmail && p?.contactEmail) sendEmail({ to: p.contactEmail, subject: `${name} became your patron on Kiln`, html: newPatronEmail(name, tier.name) }).catch(() => {});
  }).catch(() => {});

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

// GET /me/patrons — people who subscribe to me (as artist)
router.get("/me/patrons", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select({
    id: patronSubscriptionsTable.id,
    subscriberId: patronSubscriptionsTable.subscriberId,
    subscriberName: patronSubscriptionsTable.subscriberName,
    tierId: patronSubscriptionsTable.tierId,
    amount: patronSubscriptionsTable.amount,
    status: patronSubscriptionsTable.status,
    startedAt: patronSubscriptionsTable.startedAt,
  }).from(patronSubscriptionsTable)
    .where(and(eq(patronSubscriptionsTable.artistId, req.user.id), eq(patronSubscriptionsTable.status, "active")))
    .orderBy(desc(patronSubscriptionsTable.startedAt));
  const tierIds = [...new Set(rows.map(r => r.tierId))];
  const tiers = tierIds.length
    ? await db.select({ id: patronTiersTable.id, name: patronTiersTable.name }).from(patronTiersTable).where(inArray(patronTiersTable.id, tierIds))
    : [];
  const tierMap = Object.fromEntries(tiers.map(t => [t.id, t.name]));
  res.json({ patrons: rows.map(r => ({ ...r, tierName: tierMap[r.tierId] ?? null, startedAt: r.startedAt.toISOString() })) });
});

// GET /me/earnings — artist earnings summary (tips + subscriptions + shop sales)
router.get("/me/earnings", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const [tips, subs, sales] = await Promise.all([
    db.select().from(tipsTable).where(and(eq(tipsTable.toUserId, userId), eq(tipsTable.status, "completed"))).orderBy(desc(tipsTable.createdAt)),
    db.select().from(patronSubscriptionsTable).where(and(eq(patronSubscriptionsTable.artistId, userId), eq(patronSubscriptionsTable.status, "active"))).orderBy(desc(patronSubscriptionsTable.startedAt)),
    db.select().from(ordersTable).where(and(eq(ordersTable.sellerId, userId), inArray(ordersTable.status, ["confirmed", "delivered", "shipped", "in_progress"]))).orderBy(desc(ordersTable.createdAt)),
  ]);
  const tipTotal = tips.reduce((s, t) => s + t.amountCents / 100, 0);
  const subTotal = subs.reduce((s, sub) => s + sub.amount / 100, 0);
  const saleTotal = sales.reduce((s, o) => s + o.amount / 100, 0);
  type EarningType = "tip" | "subscription" | "listing" | "drop" | "commission" | "workshop";
  const earnings = [
    ...tips.map(t => ({ id: t.id, type: "tip" as EarningType, label: `Tip from ${t.fromUserName}`, sublabel: t.message ?? "via Kiln", amount: t.amountCents / 100, date: t.createdAt.toISOString() })),
    ...subs.map(s => ({ id: s.id, type: "subscription" as EarningType, label: "Patron subscription", sublabel: s.subscriberName ?? "Patron", amount: s.amount / 100, date: s.startedAt.toISOString() })),
    ...sales.map(o => ({ id: o.id, type: (["listing","drop","commission","workshop"].includes(o.type) ? o.type : "listing") as EarningType, label: o.title, sublabel: "Sale", amount: o.amount / 100, date: o.createdAt.toISOString() })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({ earnings, totals: { tips: tipTotal, subscriptions: subTotal, sales: saleTotal, total: tipTotal + subTotal + saleTotal } });
});

export default router;
