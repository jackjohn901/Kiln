import { Router } from "express";
import { db } from "@workspace/db";
import { patronTiersTable, patronSubscriptionsTable, tipsTable, notificationsTable, ordersTable, profilesTable, userSettingsTable } from "@workspace/db";
import { sendEmailWithRetry, newPatronEmail } from "../lib/email";
import { generateUnsubscribeToken } from "../lib/unsubscribeTokens";
import { isEmailPaused, prependSnoozeRecap } from "../lib/emailPaused";
import { eq, and, desc, sql, inArray, gte, lt } from "drizzle-orm";
import { logger } from "../lib/logger";
import { isEarningsPeriod, resolveEarningsPeriodRange, monthBucketKeys, dayBucketKeys } from "../lib/earningsPeriod";
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
  const patronNotifId = crypto.randomUUID();
  await db.insert(notificationsTable).values({ id: patronNotifId, userId: tier.artistId, type: "subscription", fromId: userId, fromName: name, fromAvatarUrl: user.profileImageUrl ?? null, text: `subscribed to your ${tier.name} tier`, link: `/patrons` });

  // Email notification
  try {
    const [[p], [s]] = await Promise.all([
      db.select({ contactEmail: profilesTable.contactEmail }).from(profilesTable).where(eq(profilesTable.userId, tier.artistId)).limit(1),
      db.select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt }).from(userSettingsTable).where(eq(userSettingsTable.userId, tier.artistId)).limit(1),
    ]);
    const emailSettings = (s?.settings as Record<string, unknown> | null);
    const emailSnoozed = isEmailPaused(emailSettings, s?.notifEmailResumeAt);
    const wantsEmail = !emailSnoozed && emailSettings?.notif_email_new_patron !== false;
    if (emailSnoozed) {
      db.update(notificationsTable).set({ emailSkipped: true }).where(eq(notificationsTable.id, patronNotifId)).catch(() => {});
    }
    if (wantsEmail && p?.contactEmail) {
      const unsubToken = generateUnsubscribeToken(tier.artistId);
      const unsubscribeUrl = `https://kilndrop.com/api/unsubscribe/patrons?token=${encodeURIComponent(unsubToken)}`;
      const patronHtml = await prependSnoozeRecap(tier.artistId, newPatronEmail(name, tier.name, unsubscribeUrl));
      await sendEmailWithRetry({ to: p.contactEmail, subject: `${name} became your patron on Kiln`, html: patronHtml }, { label: "new patron notification" });
    }
  } catch (err) {
    logger.warn({ err, artistId: tier.artistId }, "Failed to send new-patron notification email");
  }

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

// GET /me/earnings/monthly-summary — trailing N months totals for sparkline chart
// Query params: ?months=6 (default, clamped 1-12)
//               ?year=YYYY&month=1-12 — anchor month (defaults to current month)
//               Returns N months ending at the anchor month (inclusive).
router.get("/me/earnings/monthly-summary", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const rawMonths = parseInt((req.query.months as string) || "6", 10);
  const numMonths = Math.min(Math.max(isNaN(rawMonths) ? 6 : rawMonths, 1), 12);

  const now = new Date();
  const anchorYear = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
  const anchorMonth = req.query.month ? parseInt(req.query.month as string, 10) - 1 : now.getMonth(); // 0-indexed

  const results: { month: string; label: string; total: number }[] = [];

  for (let i = numMonths - 1; i >= 0; i--) {
    // Work backwards from the anchor month
    const start = new Date(anchorYear, anchorMonth - i, 1);
    const end = new Date(anchorYear, anchorMonth - i + 1, 1);
    const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    const label = start.toLocaleString("en-US", { month: "short" });

    const [tipsAgg, subsAgg, salesAgg] = await Promise.all([
      db.select({ total: sql<string>`COALESCE(SUM(${tipsTable.amountCents}), 0)` })
        .from(tipsTable)
        .where(and(eq(tipsTable.toUserId, userId), eq(tipsTable.status, "completed"), gte(tipsTable.createdAt, start), lt(tipsTable.createdAt, end))),
      db.select({ total: sql<string>`COALESCE(SUM(${patronSubscriptionsTable.amount}), 0)` })
        .from(patronSubscriptionsTable)
        .where(and(
          eq(patronSubscriptionsTable.artistId, userId),
          lt(patronSubscriptionsTable.startedAt, end),
          sql`(${patronSubscriptionsTable.cancelledAt} IS NULL OR ${patronSubscriptionsTable.cancelledAt} >= ${start})`
        )),
      db.select({ total: sql<string>`COALESCE(SUM(${ordersTable.amount}), 0)` })
        .from(ordersTable)
        .where(and(
          eq(ordersTable.sellerId, userId),
          inArray(ordersTable.status, ["confirmed", "delivered", "shipped", "in_progress"]),
          gte(ordersTable.createdAt, start),
          lt(ordersTable.createdAt, end)
        )),
    ]);

    const tipCents = Number(tipsAgg[0]?.total ?? 0);
    const subCents = Number(subsAgg[0]?.total ?? 0);
    const saleCents = Number(salesAgg[0]?.total ?? 0);
    const total = (tipCents + subCents + saleCents) / 100;

    results.push({ month: monthKey, label, total });
  }

  res.json({ months: results });
});

// GET /me/earnings — artist earnings summary (tips + subscriptions + shop sales)
// Optional query params:
//   ?month=1-12&year=YYYY — filter to a specific calendar month
//   ?period=30d|90d|1y    — filter totals/earnings to a trailing window (ignored if month/year given)
router.get("/me/earnings", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;

  const monthParam = req.query.month !== undefined ? parseInt(req.query.month as string, 10) : null;
  const yearParam = req.query.year !== undefined ? parseInt(req.query.year as string, 10) : null;
  const periodParam = isEarningsPeriod(req.query.period) ? req.query.period : null;
  // dateRange = exact calendar month (skips time-series); periodRange = trailing window (keeps time-series).
  let dateRange: { start: Date; end: Date } | null = null;
  if (monthParam !== null && yearParam !== null && monthParam >= 1 && monthParam <= 12 && yearParam >= 2000 && yearParam <= 2100) {
    dateRange = {
      start: new Date(yearParam, monthParam - 1, 1),
      end: new Date(yearParam, monthParam, 1),
    };
  }
  // A month filter takes precedence over a trailing-window period filter.
  const periodRange = dateRange ? null : resolveEarningsPeriodRange(periodParam);
  // Effective range used to scope tips/subscriptions/sales WHERE clauses + totals.
  const queryRange = dateRange ?? periodRange;

  const [tips, subs, sales] = await Promise.all([
    db.select({
      id: tipsTable.id,
      fromUserId: tipsTable.fromUserId,
      fromUserName: tipsTable.fromUserName,
      toUserId: tipsTable.toUserId,
      amountCents: tipsTable.amountCents,
      message: tipsTable.message,
      status: tipsTable.status,
      createdAt: tipsTable.createdAt,
      fromAvatarUrl: profilesTable.avatarUrl,
      fromHandle: profilesTable.handle,
    }).from(tipsTable)
      .leftJoin(profilesTable, eq(tipsTable.fromUserId, profilesTable.userId))
      .where(
        queryRange
          ? and(eq(tipsTable.toUserId, userId), eq(tipsTable.status, "completed"), gte(tipsTable.createdAt, queryRange.start), lt(tipsTable.createdAt, queryRange.end))
          : and(eq(tipsTable.toUserId, userId), eq(tipsTable.status, "completed"))
      ).orderBy(desc(tipsTable.createdAt)),
    // When a date range is given, include subscriptions that were active at any
    // point during the window: started before window-end AND (not cancelled OR
    // cancelled on/after window-start). This approximates recurring patron revenue
    // using available schema data (no separate charge-events table exists yet).
    db.select().from(patronSubscriptionsTable).where(
      queryRange
        ? and(
            eq(patronSubscriptionsTable.artistId, userId),
            lt(patronSubscriptionsTable.startedAt, queryRange.end),
            // not cancelled before the window started
            sql`(${patronSubscriptionsTable.cancelledAt} IS NULL OR ${patronSubscriptionsTable.cancelledAt} >= ${queryRange.start})`
          )
        : and(eq(patronSubscriptionsTable.artistId, userId), eq(patronSubscriptionsTable.status, "active"))
    ).orderBy(desc(patronSubscriptionsTable.startedAt)),
    db.select().from(ordersTable).where(
      queryRange
        ? and(eq(ordersTable.sellerId, userId), inArray(ordersTable.status, ["confirmed", "delivered", "shipped", "in_progress"]), gte(ordersTable.createdAt, queryRange.start), lt(ordersTable.createdAt, queryRange.end))
        : and(eq(ordersTable.sellerId, userId), inArray(ordersTable.status, ["confirmed", "delivered", "shipped", "in_progress"]))
    ).orderBy(desc(ordersTable.createdAt)),
  ]);
  const tipTotal = tips.reduce((s, t) => s + t.amountCents / 100, 0);
  const subTotal = subs.reduce((s, sub) => s + sub.amount / 100, 0);
  const saleTotal = sales.reduce((s, o) => s + o.amount / 100, 0);

  const salesByType = sales.reduce<{ listings: number; drops: number; commissions: number; workshops: number }>(
    (acc, o) => {
      const amount = o.amount / 100;
      if (o.type === "drop") acc.drops += amount;
      else if (o.type === "commission") acc.commissions += amount;
      else if (o.type === "workshop") acc.workshops += amount;
      else acc.listings += amount;
      return acc;
    },
    { listings: 0, drops: 0, commissions: 0, workshops: 0 },
  );

  // Build time-series buckets (only when no specific month/year filter is active)
  type StreamBucket = { tips: number; subscriptions: number; shopSales: number; auctions: number };

  const timeSeriesByMonth: Record<string, StreamBucket> = {};
  const timeSeriesByDay: Record<string, StreamBucket> = {};
  const now = new Date();

  // Build buckets that cover the active window so the chart never drops in-window
  // data (and the chart sum lines up with the period totals). Month buckets span
  // every calendar month the window touches; day buckets are only used by the
  // 30d view, so size them to that window (else trailing 30 days).
  const monthKeys = monthBucketKeys(periodRange ? periodRange.start : null, now);
  const dayKeys = dayBucketKeys(periodParam === "30d" && periodRange ? periodRange.start : null, now);
  for (const key of monthKeys) timeSeriesByMonth[key] = { tips: 0, subscriptions: 0, shopSales: 0, auctions: 0 };
  for (const key of dayKeys) timeSeriesByDay[key] = { tips: 0, subscriptions: 0, shopSales: 0, auctions: 0 };

  if (!dateRange) {
    for (const t of tips) {
      const monthKey = t.createdAt.toISOString().slice(0, 7);
      const dayKey = t.createdAt.toISOString().slice(0, 10);
      const amt = t.amountCents / 100;
      if (timeSeriesByMonth[monthKey]) timeSeriesByMonth[monthKey].tips += amt;
      if (timeSeriesByDay[dayKey]) timeSeriesByDay[dayKey].tips += amt;
    }
    for (const s of subs) {
      const monthKey = s.startedAt.toISOString().slice(0, 7);
      const dayKey = s.startedAt.toISOString().slice(0, 10);
      const amt = s.amount / 100;
      if (timeSeriesByMonth[monthKey]) timeSeriesByMonth[monthKey].subscriptions += amt;
      if (timeSeriesByDay[dayKey]) timeSeriesByDay[dayKey].subscriptions += amt;
    }
    for (const o of sales) {
      const monthKey = o.createdAt.toISOString().slice(0, 7);
      const dayKey = o.createdAt.toISOString().slice(0, 10);
      const amt = o.amount / 100;
      const stream = o.type === "auction" ? "auctions" : "shopSales";
      if (timeSeriesByMonth[monthKey]) timeSeriesByMonth[monthKey][stream] += amt;
      if (timeSeriesByDay[dayKey]) timeSeriesByDay[dayKey][stream] += amt;
    }
  }

  type EarningType = "tip" | "subscription" | "listing" | "drop" | "commission" | "workshop";
  const earnings = [
    ...tips.map(t => ({ id: t.id, type: "tip" as EarningType, label: `Tip from ${t.fromUserName}`, sublabel: t.message ?? "via Kiln", amount: t.amountCents / 100, date: t.createdAt.toISOString(), fromUserId: t.fromUserId, fromAvatarUrl: t.fromAvatarUrl ?? null, fromHandle: t.fromHandle ?? null })),
    ...subs.map(s => ({ id: s.id, type: "subscription" as EarningType, label: "Patron subscription", sublabel: s.subscriberName ?? "Patron", amount: s.amount / 100, date: s.startedAt.toISOString() })),
    ...sales.map(o => ({ id: o.id, type: (["listing","drop","commission","workshop"].includes(o.type) ? o.type : "listing") as EarningType, label: o.title, sublabel: "Sale", amount: o.amount / 100, date: o.createdAt.toISOString() })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({
    earnings,
    totals: { tips: tipTotal, subscriptions: subTotal, sales: saleTotal, shopSales: saleTotal, salesByType, total: tipTotal + subTotal + saleTotal },
    timeSeriesByMonth: Object.entries(timeSeriesByMonth).map(([month, v]) => ({ month, ...v })),
    timeSeriesByDay: Object.entries(timeSeriesByDay).map(([day, v]) => ({ day, ...v })),
  });
});

export default router;
