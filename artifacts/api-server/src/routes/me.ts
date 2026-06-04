import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderEventsTable, verificationApplicationsTable, userSettingsTable, listingsTable, profilesTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, inArray, and, asc } from "drizzle-orm";
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
      quantity: ordersTable.quantity,
      currency: ordersTable.currency,
      status: ordersTable.status,
      sellerId: ordersTable.sellerId,
      shippingAddress: ordersTable.shippingAddress,
      trackingNumber: ordersTable.trackingNumber,
      carrier: ordersTable.carrier,
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

// GET /me/orders/cart/:sessionKey — fetch a grouped cart receipt by Stripe session key.
// Allows buyers to bookmark or share a stable URL for their multi-item cart purchase.
// The sessionKey is the raw Stripe session ID (without the "stripe:" prefix stored in notes).
// All sibling orders for that session are returned along with buyer details.
router.get("/me/orders/cart/:sessionKey", async (req, res): Promise<void> => {
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
      quantity: ordersTable.quantity,
      currency: ordersTable.currency,
      status: ordersTable.status,
      sellerId: ordersTable.sellerId,
      shippingAddress: ordersTable.shippingAddress,
      trackingNumber: ordersTable.trackingNumber,
      carrier: ordersTable.carrier,
      notes: ordersTable.notes,
      processingWindowDays: ordersTable.processingWindowDays,
      processingWindowLabel: ordersTable.processingWindowLabel,
      shippingCost: ordersTable.shippingCost,
      manualPayout: ordersTable.manualPayout,
      addressLocked: ordersTable.addressLocked,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    } as const;

    const dedupeKey = `stripe:${req.params.sessionKey}`;
    const siblingOrders = await db.select(orderColumns).from(ordersTable)
      .where(and(eq(ordersTable.notes, dedupeKey), eq(ordersTable.buyerId, req.user.id)));

    if (siblingOrders.length === 0) { res.status(404).json({ error: "Cart receipt not found" }); return; }

    // Use the first sibling as the "primary" order for top-level receipt fields.
    const order = siblingOrders[0]!;

    // Collect unique seller IDs across all sibling orders for profile + window lookups.
    const allSellerIds = [...new Set(siblingOrders.map((o) => o.sellerId).filter((id): id is string => !!id))];

    const [buyerProfileRow, allSellerProfileRows, buyerUserRow] = await Promise.all([
      db.select({ displayName: profilesTable.displayName, location: profilesTable.location })
        .from(profilesTable)
        .where(eq(profilesTable.userId, req.user.id))
        .limit(1)
        .then(r => r[0] ?? null),
      allSellerIds.length > 0
        ? db.select({ userId: profilesTable.userId, displayName: profilesTable.displayName, handle: profilesTable.handle, avatarUrl: profilesTable.avatarUrl })
            .from(profilesTable)
            .where(inArray(profilesTable.userId, allSellerIds))
        : Promise.resolve([]),
      db.select({ email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, req.user.id))
        .limit(1)
        .then(r => r[0] ?? null),
    ]);

    const sellerProfileMap = new Map(allSellerProfileRows.map((p) => [p.userId, p]));
    const primarySellerRow = order.sellerId ? (sellerProfileMap.get(order.sellerId) ?? null) : null;

    const buyerProfile = buyerProfileRow
      ? { displayName: buyerProfileRow.displayName ?? null, location: buyerProfileRow.location ?? null }
      : { displayName: null, location: null };

    const sellerProfile = primarySellerRow
      ? { displayName: primarySellerRow.displayName ?? null, handle: primarySellerRow.handle ?? null, avatarUrl: primarySellerRow.avatarUrl ?? null }
      : null;

    const buyerEmail = buyerUserRow?.email ?? null;

    // Build per-seller processing windows for multi-seller cart display.
    const seenCartSellerIds = new Set<string>();
    const perSellerWindows = siblingOrders
      .filter((o): o is typeof o & { sellerId: string } =>
        typeof o.sellerId === "string" && !seenCartSellerIds.has(o.sellerId) && !!(seenCartSellerIds.add(o.sellerId) || true))
      .map((o) => {
        const p = sellerProfileMap.get(o.sellerId);
        const sellerName = p?.displayName?.trim() || (p?.handle ? `@${p.handle}` : o.sellerId);
        return { sellerName, days: o.processingWindowDays ?? null, label: o.processingWindowLabel ?? null };
      });

    // Annotate each sibling order with the seller's display name and handle for the buyer receipt UI.
    const enrichedSiblingOrders = siblingOrders.map((o) => {
      const p = o.sellerId ? sellerProfileMap.get(o.sellerId) : null;
      return {
        ...o,
        sellerName: p?.displayName?.trim() || (p?.handle ? `@${p.handle}` : null),
        sellerHandle: p?.handle ?? null,
      };
    });

    res.json({ order, siblingOrders: enrichedSiblingOrders, buyerProfile, sellerProfile, buyerEmail, perSellerWindows });
  } catch (err) {
    logger.error({ err }, "me/orders/cart/:sessionKey GET error");
    res.status(500).json({ error: "Failed to load cart receipt" });
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
      quantity: ordersTable.quantity,
      currency: ordersTable.currency,
      status: ordersTable.status,
      sellerId: ordersTable.sellerId,
      shippingAddress: ordersTable.shippingAddress,
      trackingNumber: ordersTable.trackingNumber,
      carrier: ordersTable.carrier,
      notes: ordersTable.notes,
      processingWindowDays: ordersTable.processingWindowDays,
      processingWindowLabel: ordersTable.processingWindowLabel,
      shippingCost: ordersTable.shippingCost,
      manualPayout: ordersTable.manualPayout,
      addressLocked: ordersTable.addressLocked,
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

    // Collect unique seller IDs across all sibling orders (or just the single order).
    const ordersForSellers = siblingOrders.length > 0 ? siblingOrders : [order];
    const allSellerIds = [...new Set(ordersForSellers.map((o) => o.sellerId).filter((id): id is string => !!id))];

    const [buyerProfileRow, allSellerProfileRows, buyerUserRow] = await Promise.all([
      db.select({ displayName: profilesTable.displayName, location: profilesTable.location })
        .from(profilesTable)
        .where(eq(profilesTable.userId, req.user.id))
        .limit(1)
        .then(r => r[0] ?? null),
      allSellerIds.length > 0
        ? db.select({ userId: profilesTable.userId, displayName: profilesTable.displayName, handle: profilesTable.handle, avatarUrl: profilesTable.avatarUrl })
            .from(profilesTable)
            .where(inArray(profilesTable.userId, allSellerIds))
        : Promise.resolve([]),
      db.select({ email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, req.user.id))
        .limit(1)
        .then(r => r[0] ?? null),
    ]);

    const sellerProfileMap = new Map(allSellerProfileRows.map((p) => [p.userId, p]));
    const primarySellerRow = order.sellerId ? (sellerProfileMap.get(order.sellerId) ?? null) : null;

    const buyerProfile = buyerProfileRow
      ? { displayName: buyerProfileRow.displayName ?? null, location: buyerProfileRow.location ?? null }
      : { displayName: null, location: null };

    const sellerProfile = primarySellerRow
      ? { displayName: primarySellerRow.displayName ?? null, handle: primarySellerRow.handle ?? null, avatarUrl: primarySellerRow.avatarUrl ?? null }
      : null;

    const buyerEmail = buyerUserRow?.email ?? null;

    // Build per-seller processing windows for multi-seller cart display.
    const seenOrderSellerIds = new Set<string>();
    const perSellerWindows = siblingOrders.length > 1
      ? siblingOrders
          .filter((o): o is typeof o & { sellerId: string } =>
            typeof o.sellerId === "string" && !seenOrderSellerIds.has(o.sellerId) && !!(seenOrderSellerIds.add(o.sellerId) || true))
          .map((o) => {
            const p = sellerProfileMap.get(o.sellerId);
            const sellerName = p?.displayName?.trim() || (p?.handle ? `@${p.handle}` : o.sellerId);
            return { sellerName, days: o.processingWindowDays ?? null, label: o.processingWindowLabel ?? null };
          })
      : [];

    // Annotate each sibling order with the seller's display name and handle for the buyer receipt UI.
    const enrichedSiblingOrders = siblingOrders.map((o) => {
      const p = o.sellerId ? sellerProfileMap.get(o.sellerId) : null;
      return {
        ...o,
        sellerName: p?.displayName?.trim() || (p?.handle ? `@${p.handle}` : null),
        sellerHandle: p?.handle ?? null,
      };
    });

    // Order history events (e.g. tracking number changes) in chronological order.
    const eventRows = await db
      .select({
        id: orderEventsTable.id,
        type: orderEventsTable.type,
        trackingNumber: orderEventsTable.trackingNumber,
        carrier: orderEventsTable.carrier,
        previousTrackingNumber: orderEventsTable.previousTrackingNumber,
        note: orderEventsTable.note,
        createdAt: orderEventsTable.createdAt,
      })
      .from(orderEventsTable)
      .where(eq(orderEventsTable.orderId, order.id))
      .orderBy(asc(orderEventsTable.createdAt));
    const events = eventRows.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() }));

    res.json({ order, siblingOrders: enrichedSiblingOrders, buyerProfile, sellerProfile, buyerEmail, perSellerWindows, events });
  } catch (err) {
    logger.error({ err }, "me/orders/:id GET error");
    res.status(500).json({ error: "Failed to load order" });
  }
});

// PATCH /me/orders/:id/shipping-address — let the buyer correct the shipping address
// while the order is still in a pre-shipment state (pending, in_progress, confirmed).
// Buyers cannot update addresses once the seller has marked the item shipped or delivered.
router.patch("/me/orders/:id/shipping-address", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { address } = req.body as { address?: unknown };
  if (typeof address !== "string" || address.trim().length === 0) {
    res.status(400).json({ error: "address must be a non-empty string" }); return;
  }
  const trimmed = address.trim();
  if (trimmed.length > 1000) {
    res.status(400).json({ error: "address is too long (max 1000 characters)" }); return;
  }

  try {
    const rows = await db
      .select({ id: ordersTable.id, buyerId: ordersTable.buyerId, sellerId: ordersTable.sellerId, status: ordersTable.status, title: ordersTable.title, addressLocked: ordersTable.addressLocked })
      .from(ordersTable)
      .where(and(eq(ordersTable.id, req.params.id), eq(ordersTable.buyerId, req.user.id)))
      .limit(1);

    if (rows.length === 0) { res.status(404).json({ error: "Order not found" }); return; }

    const order = rows[0]!;
    const EDITABLE_STATUSES = ["pending", "in_progress", "confirmed"];
    if (!EDITABLE_STATUSES.includes(order.status)) {
      res.status(409).json({ error: "Shipping address cannot be changed once the order has shipped" }); return;
    }
    if (order.addressLocked) {
      res.status(409).json({ error: "The seller has locked the shipping address for this order" }); return;
    }

    await db
      .update(ordersTable)
      .set({ shippingAddress: trimmed })
      .where(eq(ordersTable.id, order.id));

    // Notify the seller that the buyer updated their shipping address.
    const buyer = req.user;
    const buyerName = [buyer.firstName, buyer.lastName].filter(Boolean).join(" ") || "A buyer";
    db.insert(notificationsTable).values({
      id: crypto.randomUUID(),
      userId: order.sellerId,
      type: "address_updated",
      fromId: buyer.id,
      fromName: buyerName,
      fromAvatarUrl: buyer.profileImageUrl ?? null,
      text: `${buyerName} updated their shipping address for "${order.title}"`,
      link: `/sales/${order.id}`,
    }).catch((err: unknown) => {
      logger.warn({ err, orderId: order.id }, "Failed to insert address_updated notification for seller");
    });

    res.json({ ok: true, shippingAddress: trimmed });
  } catch (err) {
    logger.error({ err }, "me/orders/:id/shipping-address PATCH error");
    res.status(500).json({ error: "Failed to update shipping address" });
  }
});

/**
 * Look up the buyer's stored default shipping address and format it as a
 * multi-line string suitable for stamping onto an order record.
 * Returns null when no address is stored or the record is empty.
 */
async function getBuyerShippingAddress(buyerId: string): Promise<string | null> {
  try {
    const [row] = await db
      .select({ defaultShippingAddress: userSettingsTable.defaultShippingAddress })
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, buyerId))
      .limit(1);
    if (!row?.defaultShippingAddress) return null;
    const addr = row.defaultShippingAddress as Record<string, unknown>;
    const street = typeof addr.street === "string" ? addr.street.trim() : "";
    const city = typeof addr.city === "string" ? addr.city.trim() : "";
    const state = typeof addr.state === "string" ? addr.state.trim() : "";
    const zip = typeof addr.zip === "string" ? addr.zip.trim() : "";
    const country = typeof addr.country === "string" ? addr.country.trim() : "";
    const line2 = [city, state, zip].filter(Boolean).join(", ");
    const parts = [street, line2, country].filter(Boolean);
    return parts.length > 0 ? parts.join("\n") : null;
  } catch {
    return null;
  }
}

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

    // Look up buyer's default shipping address once, reuse across all order rows.
    const buyerShippingAddress = await getBuyerShippingAddress(userId);

    // If this session has listingIds in metadata, delegate to the bulk endpoint logic
    // instead of creating a generic single order.
    if (verified.listingIds.length > 0) {
      const listings = await db
        .select({ id: listingsTable.id, title: listingsTable.title, artistId: listingsTable.artistId, price: listingsTable.price, imageUrl: listingsTable.imageUrl })
        .from(listingsTable)
        .where(inArray(listingsTable.id, verified.listingIds));

      const listingMap = new Map(listings.map((l) => [l.id, l]));

      // Fetch each seller's processing window so it can be stamped on every order row.
      const sellerIds = [...new Set(listings.map((l) => l.artistId))];
      const paymentSettingsRows = sellerIds.length > 0
        ? await db
            .select({ userId: userSettingsTable.userId, paymentSettings: userSettingsTable.paymentSettings })
            .from(userSettingsTable)
            .where(inArray(userSettingsTable.userId, sellerIds))
        : [];
      const processingWindowMap = new Map<string, number | null>();
      const processingWindowLabelMap = new Map<string, string | null>();
      for (const row of paymentSettingsRows) {
        const ps = row.paymentSettings as Record<string, unknown> | null;
        processingWindowMap.set(
          row.userId,
          ps && typeof ps.processingWindow === "number" ? ps.processingWindow : null,
        );
        const label =
          ps && typeof ps.processingWindowLabel === "string" && ps.processingWindowLabel.trim()
            ? ps.processingWindowLabel.trim()
            : null;
        processingWindowLabelMap.set(row.userId, label);
      }

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
          quantity: qty,
          currency: "USD",
          status: "confirmed",
          shippingAddress: buyerShippingAddress,
          processingWindowDays: processingWindowMap.get(listing.artistId) ?? null,
          processingWindowLabel: processingWindowLabelMap.get(listing.artistId) ?? null,
          // INVARIANT: notes must always equal the dedupeKey so every row in a session
          // can be grouped and deduplicated. Never omit this field on any insert path.
          notes: dedupeKey,
        });
        orderIds.push(orderId);
      }

      if (orderIds.length === 0) {
        const missingListingIds = verified.listingIds.filter((id) => !listingMap.has(id));
        logger.warn(
          { stripeSessionId, userId, missingListingIds },
          "Order creation failed: no valid listings found for session",
        );
        res.status(422).json({ error: "No valid listings found for this session." }); return;
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
      shippingAddress: buyerShippingAddress,
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

// POST /me/orders/bulk — fetch orders created by the webhook for a Stripe cart checkout.
// Order creation now happens server-side in the webhook (checkout.session.completed).
// This endpoint is read-only: it verifies the session for security then returns the
// existing order rows. A short retry loop handles the race where the browser lands on
// the success page just before the webhook has finished writing the order rows.
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

  try {
    const dedupeKey = `stripe:${stripeSessionId}`;

    // Retry up to 4 times (total ~3s) in case the webhook hasn't finished writing
    // order rows yet when the browser calls this endpoint after redirect.
    let allOrders: Array<{ id: string; sellerId: string | null; processingWindowDays: number | null; processingWindowLabel: string | null }> = [];
    for (let attempt = 0; attempt < 4; attempt++) {
      allOrders = await db
        .select({ id: ordersTable.id, sellerId: ordersTable.sellerId, processingWindowDays: ordersTable.processingWindowDays, processingWindowLabel: ordersTable.processingWindowLabel })
        .from(ordersTable)
        .where(eq(ordersTable.notes, dedupeKey));
      if (allOrders.length > 0) break;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 800));
    }

    if (allOrders.length === 0) {
      // Webhook hasn't created orders yet (or creation failed). Log a structured
      // warning so support can trace the incident to a Stripe session, then return
      // a 202 so the success page can degrade gracefully rather than showing an error.
      logger.warn(
        { stripeSessionId, userId, missingListingIds: verified.listingIds },
        "Order creation failed: no orders found for session after retries",
      );
      res.status(202).json({ orderIds: [], sellerIds: [], processingWindowDays: null, processingWindowLabel: null, perSellerWindows: [] });
      return;
    }

    const orderIds = allOrders.map((o) => o.id);
    const sellerIds = [...new Set(allOrders.map((o) => o.sellerId).filter((id): id is string => !!id))];

    const existingWindows = allOrders.map((o) => o.processingWindowDays).filter((w): w is number => typeof w === "number");
    const maxProcessingWindowDays = existingWindows.length > 0 ? Math.max(...existingWindows) : null;
    const processingWindowLabel = allOrders.map((o) => o.processingWindowLabel).find((l): l is string => typeof l === "string") ?? null;

    const sellerProfiles = sellerIds.length > 0
      ? await db
          .select({ userId: profilesTable.userId, displayName: profilesTable.displayName })
          .from(profilesTable)
          .where(inArray(profilesTable.userId, sellerIds))
      : [];
    const sellerNameMap = new Map(sellerProfiles.map((p) => [p.userId, p.displayName ?? p.userId]));

    const seenSellerIds = new Set<string>();
    const perSellerWindows = allOrders
      .filter((o): o is typeof o & { sellerId: string } => typeof o.sellerId === "string" && !seenSellerIds.has(o.sellerId) && !!(seenSellerIds.add(o.sellerId) || true))
      .map((o) => ({
        sellerName: sellerNameMap.get(o.sellerId) ?? o.sellerId,
        days: o.processingWindowDays ?? null,
        label: o.processingWindowLabel ?? null,
      }));

    res.json({ orderIds, sellerIds, processingWindowDays: maxProcessingWindowDays, processingWindowLabel, perSellerWindows });
  } catch (err) {
    logger.error({ err }, "me/orders/bulk error");
    res.status(500).json({ error: "Failed to fetch orders" });
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
