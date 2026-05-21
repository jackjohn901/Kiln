import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, verificationApplicationsTable, userSettingsTable, listingsTable, profilesTable } from "@workspace/db";
import { eq, inArray, and } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";
import { getUncachableStripeClient } from "../stripeClient";

const router: IRouter = Router();

type VerifiedSession = {
  amountTotal: number | null;
  listingIds: string[];
  listingQtys: number[];
  manualPayout: boolean;
};

/**
 * Retrieve and verify a Stripe checkout session for the requesting user.
 * Enforces:
 *  - session exists and payment_status === "paid"
 *  - metadata.platform === "kiln" (session was created by this server)
 *  - metadata.userId is present and matches the caller (prevents session reuse across users)
 *
 * Returns parsed session data on success, or null if any check fails.
 */
async function verifyStripeSession(
  stripeSessionId: string,
  expectedUserId: string
): Promise<VerifiedSession | null> {
  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(stripeSessionId);

    if (session.payment_status !== "paid") {
      logger.warn({ stripeSessionId }, "Order rejected: session not paid");
      return null;
    }

    const meta = (session.metadata ?? {}) as Record<string, string>;

    // Require platform tag to reject sessions from other integrations.
    if (meta.platform !== "kiln") {
      logger.warn({ stripeSessionId }, "Order rejected: wrong platform");
      return null;
    }

    // Require strict user ownership: userId must be present in metadata and match caller.
    // Sessions created while the user was not authenticated do not embed a userId and
    // cannot be used to create order records.
    if (!meta.userId || meta.userId !== expectedUserId) {
      logger.warn({ stripeSessionId, expectedUserId, metaUserId: meta.userId }, "Order rejected: userId mismatch or absent");
      return null;
    }

    // Parse server-embedded listing IDs and quantities (set at checkout creation time).
    const listingIds = meta.listingIds
      ? meta.listingIds.split(",").filter(Boolean)
      : [];
    const rawQtys = meta.listingQtys
      ? meta.listingQtys.split(",").map(Number)
      : [];
    const listingQtys = listingIds.map((_, i) => (Number.isFinite(rawQtys[i]) && rawQtys[i] > 0 ? rawQtys[i] : 1));

    const manualPayout = meta.manualPayout === "true";

    return { amountTotal: session.amount_total, listingIds, listingQtys, manualPayout };
  } catch (err) {
    logger.error({ err, stripeSessionId }, "Stripe session verification error");
    return null;
  }
}

// GET /me/orders — list all orders for the current user
router.get("/me/orders", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { desc } = await import("drizzle-orm");
    const rows = await db.select({
      id: ordersTable.id,
      type: ordersTable.type,
      refId: ordersTable.refId,
      title: ordersTable.title,
      description: ordersTable.description,
      imageUrl: ordersTable.imageUrl,
      amount: ordersTable.amount,
      currency: ordersTable.currency,
      status: ordersTable.status,
      sellerId: ordersTable.sellerId,
      shippingAddress: ordersTable.shippingAddress,
      trackingNumber: ordersTable.trackingNumber,
      notes: ordersTable.notes,
      processingWindowDays: ordersTable.processingWindowDays,
      processingWindowLabel: ordersTable.processingWindowLabel,
      manualPayout: ordersTable.manualPayout,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    }).from(ordersTable)
      .where(eq(ordersTable.buyerId, req.user.id))
      .orderBy(desc(ordersTable.createdAt));
    res.json({ orders: rows });
  } catch (err) {
    logger.error({ err }, "me/orders GET error");
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// GET /me/orders/:id — fetch a single order for the current user.
// When the order belongs to a multi-item Stripe session (notes starts with "stripe:"),
// the response also includes all sibling orders from that same session as `siblingOrders`.
router.get("/me/orders/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const orderColumns = {
      id: ordersTable.id,
      type: ordersTable.type,
      refId: ordersTable.refId,
      title: ordersTable.title,
      description: ordersTable.description,
      imageUrl: ordersTable.imageUrl,
      amount: ordersTable.amount,
      currency: ordersTable.currency,
      status: ordersTable.status,
      sellerId: ordersTable.sellerId,
      shippingAddress: ordersTable.shippingAddress,
      trackingNumber: ordersTable.trackingNumber,
      notes: ordersTable.notes,
      processingWindowDays: ordersTable.processingWindowDays,
      processingWindowLabel: ordersTable.processingWindowLabel,
      manualPayout: ordersTable.manualPayout,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    } as const;

    const rows = await db.select(orderColumns).from(ordersTable)
      .where(and(eq(ordersTable.id, req.params.id), eq(ordersTable.buyerId, req.user.id)))
      .limit(1);

    if (rows.length === 0) { res.status(404).json({ error: "Order not found" }); return; }

    let order = rows[0];

    // If both processing window fields are NULL on the stamped order row, fall back to
    // the seller's current payment settings so buyers still see an estimate when the
    // backfill hasn't reached this order yet or the seller never configured one.
    if (order.processingWindowDays === null && order.processingWindowLabel === null && order.sellerId) {
      const [settingsRow] = await db
        .select({ paymentSettings: userSettingsTable.paymentSettings })
        .from(userSettingsTable)
        .where(eq(userSettingsTable.userId, order.sellerId))
        .limit(1);
      if (settingsRow) {
        const ps = settingsRow.paymentSettings as Record<string, unknown> | null;
        const liveDays = ps && typeof ps.processingWindow === "number" ? ps.processingWindow : null;
        const liveLabel = ps && typeof ps.processingWindowLabel === "string" && (ps.processingWindowLabel as string).trim()
          ? (ps.processingWindowLabel as string).trim()
          : null;
        if (liveDays !== null || liveLabel !== null) {
          order = { ...order, processingWindowDays: liveDays, processingWindowLabel: liveLabel };
        }
      }
    }

    // If this order is part of a multi-item Stripe checkout session, fetch all sibling orders
    // (same session key, same buyer) so the receipt page can show the complete purchase.
    let siblingOrders: typeof rows = [];
    if (order.notes && order.notes.startsWith("stripe:")) {
      siblingOrders = await db.select(orderColumns).from(ordersTable)
        .where(and(eq(ordersTable.notes, order.notes), eq(ordersTable.buyerId, req.user.id)));
    }

    const [buyerProfileRow] = await db
      .select({ displayName: profilesTable.displayName, location: profilesTable.location })
      .from(profilesTable)
      .where(eq(profilesTable.userId, req.user.id))
      .limit(1);

    const buyerProfile = buyerProfileRow
      ? { displayName: buyerProfileRow.displayName ?? null, location: buyerProfileRow.location ?? null }
      : { displayName: null, location: null };

    res.json({ order, siblingOrders, buyerProfile });
  } catch (err) {
    logger.error({ err }, "me/orders/:id GET error");
    res.status(500).json({ error: "Failed to load order" });
  }
});

// POST /me/orders — create a single order after confirmed Stripe payment.
// Used as a fallback when there is no pre-checkout item snapshot.
// All commerce-critical fields (amount) are derived from the verified Stripe session.
router.post("/me/orders", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;

  const { title, description, type, refId, imageUrl, stripeSessionId } = req.body as {
    title?: string;
    description?: string;
    type?: string;
    refId?: string;
    imageUrl?: string;
    stripeSessionId: string;
  };

  if (!stripeSessionId) {
    res.status(400).json({ error: "stripeSessionId required" }); return;
  }

  const verified = await verifyStripeSession(stripeSessionId, userId);
  if (!verified) {
    res.status(402).json({ error: "Payment verification failed. Complete a valid Stripe checkout first." }); return;
  }

  try {
    const dedupeKey = `stripe:${stripeSessionId}`;
    const existing = await db.select({ id: ordersTable.id }).from(ordersTable)
      .where(eq(ordersTable.notes, dedupeKey))
      .limit(1);
    if (existing.length > 0) {
      res.json({ orderId: existing[0].id, duplicate: true }); return;
    }

    // If this session has listingIds in metadata, delegate to the bulk endpoint logic
    // instead of creating a generic single order.
    if (verified.listingIds.length > 0) {
      const listings = await db
        .select({ id: listingsTable.id, title: listingsTable.title, artistId: listingsTable.artistId, price: listingsTable.price, imageUrl: listingsTable.imageUrl })
        .from(listingsTable)
        .where(inArray(listingsTable.id, verified.listingIds));

      const listingMap = new Map(listings.map((l) => [l.id, l]));

      // Reconcile: server-derived total must match Stripe-confirmed amount_total.
      let expectedCents = 0;
      for (let i = 0; i < verified.listingIds.length; i++) {
        const listing = listingMap.get(verified.listingIds[i]);
        if (listing) expectedCents += Math.round(listing.price * 100) * (verified.listingQtys[i] ?? 1);
      }
      const paidCents = verified.amountTotal ?? 0;
      if (Math.abs(expectedCents - paidCents) > 100) {
        logger.warn({ stripeSessionId, expectedCents, paidCents }, "Order rejected: amount mismatch");
        res.status(402).json({ error: "Payment amount does not match order total." }); return;
      }

      const orderIds: string[] = [];

      for (let i = 0; i < verified.listingIds.length; i++) {
        const listingId = verified.listingIds[i];
        const listing = listingMap.get(listingId);
        if (!listing) continue;
        const qty = verified.listingQtys[i] ?? 1;
        const orderId = crypto.randomUUID();
        await db.insert(ordersTable).values({
          id: orderId,
          buyerId: userId,
          sellerId: listing.artistId,
          type: "listing",
          refId: listingId,
          title: listing.title,
          description: null,
          imageUrl: listing.imageUrl ?? null,
          amount: listing.price * qty,
          currency: "USD",
          status: "confirmed",
          // INVARIANT: notes must always equal the dedupeKey so every row in a session
          // can be grouped and deduplicated. Never omit this field on any insert path.
          notes: dedupeKey,
        });
        orderIds.push(orderId);
      }

      res.json({ orderId: orderIds[0] ?? null, orderIds });
      return;
    }

    // Generic fallback: no listing metadata. Amount is derived from Stripe, not the client.
    const amountUsd = verified.amountTotal != null ? Math.round(verified.amountTotal / 100) : 0;
    const orderId = crypto.randomUUID();
    await db.insert(ordersTable).values({
      id: orderId,
      buyerId: userId,
      sellerId: "kiln",
      type: type ?? "listing",
      refId: refId ?? null,
      title: title ?? "Shop purchase",
      description: description ?? null,
      imageUrl: imageUrl ?? null,
      amount: amountUsd,
      currency: "USD",
      status: "confirmed",
      // INVARIANT: notes must always equal the dedupeKey so every row in a session
      // can be grouped and deduplicated. Never omit this field on any insert path.
      notes: dedupeKey,
    });

    res.json({ orderId });
  } catch (err) {
    logger.error({ err }, "me/orders POST error");
    res.status(500).json({ error: "Failed to create order" });
  }
});

// POST /me/orders/bulk — create multiple orders after a Stripe cart checkout.
// All order data is derived from server-embedded session metadata + DB lookups.
// The client only needs to supply the stripeSessionId; item data from the client is ignored.
router.post("/me/orders/bulk", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;

  const { stripeSessionId } = req.body as { stripeSessionId: string };

  if (!stripeSessionId) {
    res.status(400).json({ error: "stripeSessionId required" }); return;
  }

  const verified = await verifyStripeSession(stripeSessionId, userId);
  if (!verified) {
    res.status(402).json({ error: "Payment verification failed. Complete a valid Stripe checkout first." }); return;
  }

  if (verified.listingIds.length === 0) {
    res.status(400).json({ error: "No listing data found for this session." }); return;
  }

  try {
    const dedupeKey = `stripe:${stripeSessionId}`;
    const existing = await db
      .select({ id: ordersTable.id, sellerId: ordersTable.sellerId })
      .from(ordersTable)
      .where(eq(ordersTable.notes, dedupeKey))
      .limit(1);

    if (existing.length > 0) {
      // Fetch all orders for this session to collect seller IDs and processing windows.
      const allExisting = await db
        .select({ id: ordersTable.id, sellerId: ordersTable.sellerId, processingWindowDays: ordersTable.processingWindowDays, processingWindowLabel: ordersTable.processingWindowLabel })
        .from(ordersTable)
        .where(eq(ordersTable.notes, dedupeKey));
      const sellerIds = [...new Set(allExisting.map((o) => o.sellerId).filter(Boolean))];
      // Surface the most conservative processing window from the persisted order rows.
      const existingWindows = allExisting
        .map((o) => o.processingWindowDays)
        .filter((w): w is number => typeof w === "number");
      const maxProcessingWindowDays = existingWindows.length > 0 ? Math.max(...existingWindows) : null;
      const existingLabel = allExisting.map((o) => o.processingWindowLabel).find((l): l is string => typeof l === "string") ?? null;
      res.json({ orderIds: [existing[0].id], duplicate: true, sellerIds, processingWindowDays: maxProcessingWindowDays, processingWindowLabel: existingLabel }); return;
    }

    // Look up listing data from the DB — authoritative source for seller, price, and title.
    const listings = await db
      .select({
        id: listingsTable.id,
        title: listingsTable.title,
        artistId: listingsTable.artistId,
        price: listingsTable.price,
        imageUrl: listingsTable.imageUrl,
      })
      .from(listingsTable)
      .where(inArray(listingsTable.id, verified.listingIds));

    const listingMap = new Map(listings.map((l) => [l.id, l]));

    // Reconcile: server-derived total must match Stripe-confirmed amount_total.
    // This prevents a paid session for a cheap item from being used to mint high-value orders.
    let expectedCents = 0;
    for (let i = 0; i < verified.listingIds.length; i++) {
      const listing = listingMap.get(verified.listingIds[i]);
      if (listing) expectedCents += Math.round(listing.price * 100) * (verified.listingQtys[i] ?? 1);
    }
    const paidCents = verified.amountTotal ?? 0;
    if (Math.abs(expectedCents - paidCents) > 100) {
      logger.warn({ stripeSessionId, expectedCents, paidCents }, "Bulk order rejected: amount mismatch");
      res.status(402).json({ error: "Payment amount does not match order total." }); return;
    }

    // Fetch processing window for each seller (used to stamp the order record).
    const sellerIdsForListings = [...new Set(listings.map((l) => l.artistId))];
    const paymentSettingsRows = sellerIdsForListings.length > 0
      ? await db
          .select({ userId: userSettingsTable.userId, paymentSettings: userSettingsTable.paymentSettings })
          .from(userSettingsTable)
          .where(inArray(userSettingsTable.userId, sellerIdsForListings))
      : [];
    const processingWindowMap = new Map<string, number | null>();
    const processingWindowLabelMap = new Map<string, string | null>();
    for (const row of paymentSettingsRows) {
      const ps = row.paymentSettings as Record<string, unknown> | null;
      const w = ps && typeof ps.processingWindow === "number" ? ps.processingWindow : null;
      processingWindowMap.set(row.userId, w);
      const label = ps && typeof ps.processingWindowLabel === "string" && ps.processingWindowLabel.trim()
        ? ps.processingWindowLabel.trim()
        : null;
      processingWindowLabelMap.set(row.userId, label);
    }

    const orderIds: string[] = [];
    const sellerIdSet = new Set<string>();
    // Track the processing window values actually stamped on each order row so the
    // response is sourced from the persisted values, not from live payment settings.
    const stampedWindows: number[] = [];
    let stampedLabel: string | null = null;

    for (let i = 0; i < verified.listingIds.length; i++) {
      const listingId = verified.listingIds[i];
      const listing = listingMap.get(listingId);
      if (!listing) {
        logger.warn({ listingId }, "Listing from session metadata not found in DB; skipping");
        continue;
      }
      const qty = verified.listingQtys[i] ?? 1;
      const orderId = crypto.randomUUID();
      // Snapshot the seller's processing window at purchase time so it remains
      // stable even if the seller later changes their settings.
      const stampedWindow = processingWindowMap.get(listing.artistId) ?? null;
      const sellerLabel = processingWindowLabelMap.get(listing.artistId) ?? null;
      if (sellerLabel !== null) stampedLabel = sellerLabel;
      await db.insert(ordersTable).values({
        id: orderId,
        buyerId: userId,
        sellerId: listing.artistId,
        type: "listing",
        refId: listingId,
        title: listing.title,
        description: null,
        imageUrl: listing.imageUrl ?? null,
        // Amount is the DB listing price (authoritative) multiplied by quantity.
        amount: listing.price * qty,
        currency: "USD",
        status: "confirmed",
        // All order rows in a session share the deduplication key so they can be grouped.
        notes: dedupeKey,
        processingWindowDays: stampedWindow,
        processingWindowLabel: sellerLabel,
        manualPayout: verified.manualPayout,
      });
      orderIds.push(orderId);
      sellerIdSet.add(listing.artistId);
      if (stampedWindow !== null) stampedWindows.push(stampedWindow);
    }

    if (orderIds.length === 0) {
      res.status(400).json({ error: "No valid listings found for this session." }); return;
    }

    // Return the max processing window sourced from the stamped order rows — same
    // values that are now persisted in the DB, so the response is always consistent
    // with what the buyer would see if they fetched their order history.
    const maxProcessingWindowDays = stampedWindows.length > 0 ? Math.max(...stampedWindows) : null;

    res.json({ orderIds, sellerIds: [...sellerIdSet], processingWindowDays: maxProcessingWindowDays, processingWindowLabel: stampedLabel });
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

const COLLECTOR_LEVELS = [
  { name: "Admirer",     minCents: 0,       color: "stone",  icon: "👁" },
  { name: "Patron",      minCents: 1,        color: "amber",  icon: "✨" },
  { name: "Collector",   minCents: 50000,    color: "orange", icon: "🏺" },
  { name: "Connoisseur", minCents: 200000,   color: "violet", icon: "💎" },
  { name: "Curator",     minCents: 1000000,  color: "yellow", icon: "👑" },
] as const;

// GET /me/collector-level
router.get("/me/collector-level", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [profile] = await db.select({ totalSpentCents: profilesTable.totalSpentCents })
    .from(profilesTable).where(eq(profilesTable.userId, req.user.id));
  const spent = profile?.totalSpentCents ?? 0;
  let currentIdx = 0;
  for (let i = COLLECTOR_LEVELS.length - 1; i >= 0; i--) {
    if (spent >= COLLECTOR_LEVELS[i].minCents) { currentIdx = i; break; }
  }
  const current = COLLECTOR_LEVELS[currentIdx];
  const next = COLLECTOR_LEVELS[currentIdx + 1] ?? null;
  const progressPct = next
    ? Math.min(100, Math.round(((spent - current.minCents) / (next.minCents - current.minCents)) * 100))
    : 100;
  res.json({
    level: current.name,
    icon: current.icon,
    color: current.color,
    totalSpentCents: spent,
    nextLevel: next?.name ?? null,
    nextLevelMinCents: next?.minCents ?? null,
    progressPct,
  });
});

export default router;
