import { Router } from "express";
import { db } from "@workspace/db";
import { listingsTable, wishlistsTable, ordersTable, userSettingsTable, profilesTable, workReservationsTable, reservationInterestsTable, usersTable, notificationsTable, cartItemsTable } from "@workspace/db";
import { sendSmsIfOptedIn } from "../lib/sms";
import { sendEmailWithRetry, shippingNotificationEmail, deliveryNotificationEmail, trackingUpdateEmail } from "../lib/email";
import { isEmailPaused } from "../lib/emailPaused";
import { eq, and, desc, asc, ilike, or, sql, inArray } from "drizzle-orm";
import crypto from "crypto";
import { autoPostToConnectedPlatforms } from "../lib/socialAutoPost";
import { grantFirstAccessToTopSavers } from "./first-access";

const router = Router();

// GET /listings — browse all listings
router.get("/listings", async (req, res): Promise<void> => {
  try {
    const { medium, available, artistId, limit = "50", offset = "0" } = req.query as Record<string, string>;
    let query = db.select().from(listingsTable).$dynamic();
    const conditions = [];
    if (medium && medium !== "All") conditions.push(ilike(listingsTable.medium, `%${medium}%`));
    if (available === "true") conditions.push(eq(listingsTable.isAvailable, true));
    if (available !== "false") conditions.push(eq(listingsTable.isSold, false));
    if (artistId) conditions.push(eq(listingsTable.artistId, artistId));
    if (conditions.length) query = query.where(and(...(conditions as [any, ...any[]])));
    const rows = await query.orderBy(desc(listingsTable.isPinned), asc(listingsTable.sortOrder), desc(listingsTable.createdAt)).limit(Number(limit)).offset(Number(offset));
    const viewerId = req.isAuthenticated() ? req.user.id : null;
    let wishlisted = new Set<string>();
    if (viewerId) {
      const w = await db.select({ listingId: wishlistsTable.listingId }).from(wishlistsTable).where(eq(wishlistsTable.userId, viewerId));
      wishlisted = new Set(w.map(x => x.listingId));
    }
    res.json({ listings: rows.map(l => ({ ...l, isWishlisted: wishlisted.has(l.id), createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() })) });
  } catch (err) { req.log.error({ err }, "getListings error"); res.status(500).json({ error: "Failed to load listings" }); }
});

// GET /listings/:id
router.get("/listings/:id", async (req, res): Promise<void> => {
  try {
    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, req.params.id));
    if (!listing) { res.status(404).json({ error: "Not found" }); return; }
    await db.update(listingsTable).set({ viewCount: sql`${listingsTable.viewCount} + 1` }).where(eq(listingsTable.id, req.params.id));
    const viewerId = req.isAuthenticated() ? req.user.id : null;
    let isWishlisted = false;
    if (viewerId) {
      const [w] = await db.select().from(wishlistsTable).where(and(eq(wishlistsTable.userId, viewerId), eq(wishlistsTable.listingId, req.params.id)));
      isWishlisted = !!w;
    }
    res.json({ ...listing, isWishlisted, createdAt: listing.createdAt.toISOString(), updatedAt: listing.updatedAt.toISOString() });
  } catch (err) { req.log.error({ err }, "getListing error"); res.status(500).json({ error: "Failed to load listing" }); }
});

// POST /listings — create listing (authenticated)
router.post("/listings", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, description, medium, technique, dimensions, weight, year, edition, imageUrl, imageUrls, price, shipsFrom, shipsTo, tags, isResale, originalArtistId, originalArtistName, originalListingId, royaltyPercent, bundleMinQty, bundleDiscountPct, stockCount } = req.body;
  if (!title || !price) { res.status(400).json({ error: "title and price required" }); return; }
  try {
    const user = req.user;
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
    const [listing] = await db.insert(listingsTable).values({
      id: crypto.randomUUID(), artistId: user.id, artistName: name, artistAvatarUrl: user.profileImageUrl ?? null,
      title, description, medium, technique, dimensions, weight, year: year ? Number(year) : null,
      edition, imageUrl, imageUrls: imageUrls ?? [], price: Number(price), shipsFrom, shipsTo: shipsTo ?? [], tags: tags ?? [],
      isResale: !!isResale,
      originalArtistId,
      originalArtistName,
      originalListingId,
      royaltyPercent: royaltyPercent ? Number(royaltyPercent) : 10,
      bundleMinQty: bundleMinQty ? Number(bundleMinQty) : null,
      bundleDiscountPct: bundleDiscountPct ? Number(bundleDiscountPct) : null,
      stockCount: stockCount !== undefined && stockCount !== null ? Number(stockCount) : null,
    }).returning();

    const caption = [title, description, technique ? `Technique: ${technique}` : null, medium ? `Medium: ${medium}` : null].filter(Boolean).join("\n");
    autoPostToConnectedPlatforms(
      user.id,
      { id: listing.id, caption, thumbnailUrl: imageUrl ?? null, videoUrl: null },
      { updateListingId: listing.id },
    ).catch(() => {});

    // Grant 24h first-access to the artist's top savers (non-blocking)
    grantFirstAccessToTopSavers(listing.id, user.id).catch(() => {});

    res.status(201).json({ listing: { ...listing, createdAt: listing.createdAt.toISOString(), updatedAt: listing.updatedAt.toISOString() } });
  } catch (err) { req.log.error({ err }, "createListing error"); res.status(500).json({ error: "Failed to create listing" }); }
});

// PATCH /listings/:id — update price, title, availability (owner only)
router.patch("/listings/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, req.params.id));
  if (!listing || listing.artistId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  const { title, price, isAvailable, isSold, medium, dimensions, description, bundleMinQty, bundleDiscountPct, isPinned, sortOrder, stockCount, shipsTo, shipsFrom, technique, weight, year, edition, tags, imageUrl } = req.body as {
    title?: string; price?: number; isAvailable?: boolean; isSold?: boolean;
    medium?: string; dimensions?: string; description?: string;
    bundleMinQty?: number | null; bundleDiscountPct?: number | null;
    isPinned?: boolean; sortOrder?: number;
    stockCount?: number | null;
    shipsTo?: string[]; shipsFrom?: string;
    technique?: string; weight?: string; year?: number | null;
    edition?: string; tags?: string[]; imageUrl?: string | null;
  };
  const updates: Partial<typeof listing> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (price !== undefined) updates.price = Math.round(Number(price));
  if (isAvailable !== undefined) updates.isAvailable = Boolean(isAvailable);
  if (isSold !== undefined) updates.isSold = Boolean(isSold);
  if (medium !== undefined) updates.medium = medium;
  if (dimensions !== undefined) updates.dimensions = dimensions;
  if (description !== undefined) updates.description = description;
  if (bundleMinQty !== undefined) updates.bundleMinQty = bundleMinQty ? Number(bundleMinQty) : null;
  if (bundleDiscountPct !== undefined) updates.bundleDiscountPct = bundleDiscountPct ? Number(bundleDiscountPct) : null;
  if (isPinned !== undefined) updates.isPinned = Boolean(isPinned);
  if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);
  if (stockCount !== undefined) updates.stockCount = stockCount !== null ? Number(stockCount) : null;
  if (shipsTo !== undefined) updates.shipsTo = Array.isArray(shipsTo) ? shipsTo : [];
  if (shipsFrom !== undefined) updates.shipsFrom = shipsFrom;
  if (technique !== undefined) updates.technique = technique;
  if (weight !== undefined) updates.weight = weight;
  if (year !== undefined) updates.year = year !== null ? Number(year) : null;
  if (edition !== undefined) updates.edition = edition;
  if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  const [updated] = await db.update(listingsTable).set(updates).where(eq(listingsTable.id, req.params.id)).returning();
  // If the listing is no longer purchasable, drop it from everyone's server-side cart.
  if (updated.isSold || !updated.isAvailable) {
    db.delete(cartItemsTable).where(eq(cartItemsTable.listingId, updated.id))
      .catch((err) => req.log.error({ err }, "cart cleanup on listing update failed"));
  }
  res.json({ listing: { ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() } });
});

// GET /artists/:artistId/shipping — public: buyer-facing shipping rates for an artist
router.get("/artists/:artistId/shipping", async (req, res): Promise<void> => {
  try {
    const [row] = await db.select({ shippingSettings: userSettingsTable.shippingSettings })
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, req.params.artistId));
    const s = (row?.shippingSettings ?? {}) as Record<string, unknown>;
    res.json({
      offerFreeShipping: s.offerFreeShipping === true,
      domesticRate: typeof s.domesticRate === "number" ? s.domesticRate : null,
      internationalRate: typeof s.internationalRate === "number" ? s.internationalRate : null,
      perItemRate: typeof s.perItemRate === "number" ? s.perItemRate : null,
      freeThreshold: typeof s.freeThreshold === "number" ? s.freeThreshold : null,
      freeShippingGapPercent: typeof s.freeShippingGapPercent === "number" ? s.freeShippingGapPercent : null,
      offerLocalPickup: s.offerLocalPickup === true,
      shipsTo: Array.isArray(s.shipsTo) ? (s.shipsTo as string[]).filter((x) => typeof x === "string") : [],
    });
  } catch (err) { req.log.error({ err }, "getArtistShipping error"); res.status(500).json({ error: "Failed to load shipping" }); }
});

// DELETE /listings/:id
router.delete("/listings/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [listing] = await db.select({ artistId: listingsTable.artistId }).from(listingsTable).where(eq(listingsTable.id, req.params.id));
  if (!listing || listing.artistId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(listingsTable).where(eq(listingsTable.id, req.params.id));
  // Drop the deleted listing from everyone's server-side cart so no ghost rows remain.
  db.delete(cartItemsTable).where(eq(cartItemsTable.listingId, req.params.id))
    .catch((err) => req.log.error({ err }, "cart cleanup on listing delete failed"));
  res.json({ success: true });
});

// POST /listings/:id/wishlist — toggle
router.post("/listings/:id/wishlist", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id; const listingId = req.params.id;
  try {
    const [existing] = await db.select().from(wishlistsTable).where(and(eq(wishlistsTable.userId, userId), eq(wishlistsTable.listingId, listingId)));
    if (existing) {
      await db.delete(wishlistsTable).where(and(eq(wishlistsTable.userId, userId), eq(wishlistsTable.listingId, listingId)));
      await db.update(listingsTable).set({ wishlistCount: sql`GREATEST(${listingsTable.wishlistCount} - 1, 0)` }).where(eq(listingsTable.id, listingId));
      res.json({ wishlisted: false }); return;
    }
    await db.insert(wishlistsTable).values({ userId, listingId });
    await db.update(listingsTable).set({ wishlistCount: sql`${listingsTable.wishlistCount} + 1` }).where(eq(listingsTable.id, listingId));
    res.json({ wishlisted: true });
  } catch (err) { req.log.error({ err }, "wishlist error"); res.status(500).json({ error: "Failed to toggle wishlist" }); }
});

// POST /listings/:id/inquire — send inquiry (creates order in pending state)
router.post("/listings/:id/inquire", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, req.params.id));
  if (!listing) { res.status(404).json({ error: "Not found" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Collector";

  const [settingsRow] = await db
    .select({ paymentSettings: userSettingsTable.paymentSettings })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, listing.artistId));
  const ps = (settingsRow?.paymentSettings as Record<string, unknown> | null) ?? {};
  const processingWindowDays = typeof ps.processingWindow === "number" ? ps.processingWindow : null;
  const processingWindowLabel =
    typeof ps.processingWindowLabel === "string" && ps.processingWindowLabel.trim()
      ? ps.processingWindowLabel.trim()
      : null;

  const [order] = await db.insert(ordersTable).values({
    id: crypto.randomUUID(), buyerId: user.id, sellerId: listing.artistId,
    type: "listing", refId: listing.id, title: listing.title,
    description: `Inquiry for: ${listing.title}`, imageUrl: listing.imageUrl ?? null,
    amount: listing.price, status: "inquiry",
    processingWindowDays,
    processingWindowLabel,
  }).returning();
  res.status(201).json({ ...order, createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString() });
});

// GET /me/wishlist — my wishlisted listing IDs
router.get("/me/wishlist", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.json({ listingIds: [] }); return; }
  const rows = await db.select({ listingId: wishlistsTable.listingId })
    .from(wishlistsTable).where(eq(wishlistsTable.userId, req.user.id));
  res.json({ listingIds: rows.map(r => r.listingId) });
});

// GET /me/listings — my listings
router.get("/me/listings", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(listingsTable).where(eq(listingsTable.artistId, req.user.id)).orderBy(desc(listingsTable.isPinned), asc(listingsTable.sortOrder), desc(listingsTable.createdAt));
  res.json({ listings: rows.map(l => ({ ...l, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() })) });
});

// PATCH /me/listings/reorder — bulk update sort order for listings
router.patch("/me/listings/reorder", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { order } = req.body as { order?: Array<{ id: string; sortOrder: number }> };
  if (!Array.isArray(order) || order.length === 0) { res.status(400).json({ error: "order array required" }); return; }
  try {
    const ids = order.map(o => o.id);
    const owned = await db.select({ id: listingsTable.id }).from(listingsTable)
      .where(and(eq(listingsTable.artistId, req.user.id), inArray(listingsTable.id, ids)));
    const ownedSet = new Set(owned.map(o => o.id));
    const updates = order.filter(o => ownedSet.has(o.id));
    await Promise.all(updates.map(({ id, sortOrder }) =>
      db.update(listingsTable).set({ sortOrder, updatedAt: new Date() }).where(eq(listingsTable.id, id))
    ));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "reorderListings error"); res.status(500).json({ error: "Failed to reorder listings" }); }
});

// GET /me/sales/:id — single sale detail for the current seller
router.get("/me/sales/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const rows = await db
      .select({
        id: ordersTable.id,
        buyerId: ordersTable.buyerId,
        type: ordersTable.type,
        refId: ordersTable.refId,
        title: ordersTable.title,
        description: ordersTable.description,
        imageUrl: ordersTable.imageUrl,
        amount: ordersTable.amount,
        currency: ordersTable.currency,
        status: ordersTable.status,
        shippingAddress: ordersTable.shippingAddress,
        trackingNumber: ordersTable.trackingNumber,
        carrier: ordersTable.carrier,
        notes: ordersTable.notes,
        processingWindowDays: ordersTable.processingWindowDays,
        processingWindowLabel: ordersTable.processingWindowLabel,
        manualPayout: ordersTable.manualPayout,
        addressLocked: ordersTable.addressLocked,
        quantity: ordersTable.quantity,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
        buyerDisplayName: profilesTable.displayName,
        buyerHandle: profilesTable.handle,
        buyerAvatarUrl: profilesTable.avatarUrl,
      })
      .from(ordersTable)
      .leftJoin(profilesTable, eq(ordersTable.buyerId, profilesTable.userId))
      .where(and(eq(ordersTable.id, req.params.id), eq(ordersTable.sellerId, req.user.id)))
      .limit(1);

    if (rows.length === 0) { res.status(404).json({ error: "Sale not found" }); return; }

    const sale = rows[0];

    res.json({
      sale: {
        ...sale,
        createdAt: sale.createdAt.toISOString(),
        updatedAt: sale.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    req.log.error({ err }, "me/sales/:id GET error");
    res.status(500).json({ error: "Failed to load sale" });
  }
});

// PATCH /me/sales/:id — seller updates order status / tracking number
router.patch("/me/sales/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [existing] = await db
      .select({ id: ordersTable.id, sellerId: ordersTable.sellerId, status: ordersTable.status, trackingNumber: ordersTable.trackingNumber })
      .from(ordersTable)
      .where(and(eq(ordersTable.id, req.params.id), eq(ordersTable.sellerId, req.user.id)))
      .limit(1);

    if (!existing) { res.status(404).json({ error: "Sale not found" }); return; }

    const { status, trackingNumber, carrier } = req.body as { status?: string; trackingNumber?: string; carrier?: string };

    const ALLOWED_STATUSES = ["in_progress", "shipped", "delivered", "cancelled"];
    if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` });
      return;
    }

    const ALLOWED_CARRIERS = ["usps", "ups", "fedex", "dhl", ""];
    if (carrier !== undefined && !ALLOWED_CARRIERS.includes(carrier.toLowerCase().trim())) {
      res.status(400).json({ error: `carrier must be one of: usps, ups, fedex, dhl` });
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber.trim() || null;
    if (carrier !== undefined) updates.carrier = carrier.toLowerCase().trim() || null;

    const [updated] = await db
      .update(ordersTable)
      .set(updates)
      .where(eq(ordersTable.id, req.params.id))
      .returning();

    // Notify the buyer when the seller marks as shipped or delivered
    if (updated.buyerId && status !== undefined && status !== existing.status && (status === "shipped" || status === "delivered")) {
      const tracking = updated.trackingNumber ? ` Tracking: ${updated.trackingNumber}.` : "";
      const orderLink = status === "shipped"
        ? `/orders/${updated.id}?highlight=shipped`
        : `/orders/${updated.id}?highlight=delivered`;

      if (status === "shipped") {
        const shippedNotifId = crypto.randomUUID();
        // In-app notification
        db.insert(notificationsTable).values({
          id: shippedNotifId,
          userId: updated.buyerId,
          type: "order_shipped",
          text: `Your order "${updated.title ?? "your order"}" has shipped!${tracking}`,
          link: orderLink,
        }).catch(() => {});

        // SMS + email
        Promise.all([
          db.select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt, notifSmsResumeAt: userSettingsTable.notifSmsResumeAt }).from(userSettingsTable).where(eq(userSettingsTable.userId, updated.buyerId)),
          db.select({ phoneNumber: profilesTable.phoneNumber }).from(profilesTable).where(eq(profilesTable.userId, updated.buyerId)),
          db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, updated.buyerId)),
        ]).then(([[s], [prof], [buyer]]) => {
          const buyerSettings = s?.settings as Record<string, unknown> | null;
          sendSmsIfOptedIn(updated.buyerId!, prof?.phoneNumber, "notif_sms_shipped", buyerSettings, `Kiln: Your order "${updated.title}" has shipped!${tracking} https://kilndrop.com/kiln/orders/${updated.id}`, s?.notifSmsResumeAt);
          const emailSnoozed = isEmailPaused(buyerSettings, s?.notifEmailResumeAt);
          const wantsEmail = !emailSnoozed && buyerSettings?.notif_email_shipped !== false;
          if (emailSnoozed) {
            db.update(notificationsTable).set({ emailSkipped: true }).where(eq(notificationsTable.id, shippedNotifId)).catch(() => {});
          }
          if (buyer?.email && wantsEmail) {
            sendEmailWithRetry(
              {
                to: buyer.email,
                subject: `Your order has shipped: ${updated.title}`,
                html: shippingNotificationEmail(updated.title ?? "Your order", updated.id, updated.trackingNumber, updated.carrier),
              },
              { contextId: updated.id, label: "shipping notification" },
            );
          }
        }).catch(() => {});
      } else if (status === "delivered") {
        const deliveredNotifId = crypto.randomUUID();
        // In-app notification
        db.insert(notificationsTable).values({
          id: deliveredNotifId,
          userId: updated.buyerId,
          type: "order_delivered",
          text: `Your order "${updated.title ?? "your order"}" has been delivered!`,
          link: orderLink,
        }).catch(() => {});

        // Email
        Promise.all([
          db.select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt }).from(userSettingsTable).where(eq(userSettingsTable.userId, updated.buyerId)),
          db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, updated.buyerId)),
        ]).then(([[s], [buyer]]) => {
          const buyerSettings = s?.settings as Record<string, unknown> | null;
          const emailSnoozed = isEmailPaused(buyerSettings, s?.notifEmailResumeAt);
          const wantsEmail = !emailSnoozed && buyerSettings?.notif_email_delivered !== false;
          if (buyer?.email && wantsEmail) {
            sendEmailWithRetry(
              {
                to: buyer.email,
                subject: `Your order has been delivered: ${updated.title}`,
                html: deliveryNotificationEmail(updated.title ?? "Your order", updated.id),
              },
              { contextId: updated.id, label: "delivery notification" },
            );
          }
        }).catch(() => {});
      }
    }

    // Notify the buyer when tracking number is updated on an already-shipped order (no status change)
    const newTracking = trackingNumber !== undefined ? (trackingNumber.trim() || null) : existing.trackingNumber;
    const trackingChanged = trackingNumber !== undefined && newTracking !== existing.trackingNumber;
    const statusUnchanged = status === undefined || status === existing.status;
    if (trackingChanged && statusUnchanged && updated.status === "shipped" && updated.buyerId) {
      const trackingNotifId = crypto.randomUUID();
      const orderLink = `/orders/${updated.id}?highlight=tracking`;
      const trackingText = newTracking ? ` Tracking: ${newTracking}.` : "";
      db.insert(notificationsTable).values({
        id: trackingNotifId,
        userId: updated.buyerId,
        type: "order_tracking_updated",
        text: `Tracking updated for "${updated.title ?? "your order"}".${trackingText}`,
        link: orderLink,
      }).catch(() => {});

      Promise.all([
        db.select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt }).from(userSettingsTable).where(eq(userSettingsTable.userId, updated.buyerId)),
        db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, updated.buyerId)),
      ]).then(([[s], [buyer]]) => {
        const buyerSettings = s?.settings as Record<string, unknown> | null;
        const emailSnoozed = isEmailPaused(buyerSettings, s?.notifEmailResumeAt);
        const wantsEmail = !emailSnoozed && buyerSettings?.notif_email_shipped !== false;
        if (emailSnoozed) {
          db.update(notificationsTable).set({ emailSkipped: true }).where(eq(notificationsTable.id, trackingNotifId)).catch(() => {});
        }
        if (buyer?.email && wantsEmail) {
          sendEmailWithRetry(
            {
              to: buyer.email,
              subject: `Tracking updated for your order: ${updated.title}`,
              html: trackingUpdateEmail(updated.title ?? "Your order", updated.id, newTracking ?? undefined, updated.carrier ?? undefined),
            },
            { contextId: updated.id, label: "tracking update notification" },
          );
        }
      }).catch(() => {});
    }

    let buyerDisplayName: string | null = null;
    let buyerHandle: string | null = null;
    let buyerAvatarUrl: string | null = null;
    if (updated.buyerId) {
      const [buyerProfile] = await db
        .select({ displayName: profilesTable.displayName, handle: profilesTable.handle, avatarUrl: profilesTable.avatarUrl })
        .from(profilesTable)
        .where(eq(profilesTable.userId, updated.buyerId))
        .limit(1);
      if (buyerProfile) {
        buyerDisplayName = buyerProfile.displayName ?? null;
        buyerHandle = buyerProfile.handle ?? null;
        buyerAvatarUrl = buyerProfile.avatarUrl ?? null;
      }
    }

    res.json({
      sale: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        buyerDisplayName,
        buyerHandle,
        buyerAvatarUrl,
      },
    });
  } catch (err) {
    req.log.error({ err }, "me/sales/:id PATCH error");
    res.status(500).json({ error: "Failed to update sale" });
  }
});

// PATCH /me/sales/:id/lock-address — seller locks the shipping address to prevent buyer edits
router.patch("/me/sales/:id/lock-address", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [existing] = await db
      .select({ id: ordersTable.id, sellerId: ordersTable.sellerId, status: ordersTable.status, addressLocked: ordersTable.addressLocked })
      .from(ordersTable)
      .where(and(eq(ordersTable.id, req.params.id), eq(ordersTable.sellerId, req.user.id)))
      .limit(1);

    if (!existing) { res.status(404).json({ error: "Sale not found" }); return; }

    const LOCKABLE_STATUSES = ["pending", "confirmed", "in_progress"];
    if (!LOCKABLE_STATUSES.includes(existing.status)) {
      res.status(409).json({ error: "Address can only be locked while the order is pending or in progress" }); return;
    }

    await db
      .update(ordersTable)
      .set({ addressLocked: true })
      .where(eq(ordersTable.id, existing.id));

    res.json({ ok: true, addressLocked: true });
  } catch (err) {
    req.log.error({ err }, "me/sales/:id/lock-address PATCH error");
    res.status(500).json({ error: "Failed to lock address" });
  }
});

// GET /me/orders — my orders (as buyer) with seller (artist) profile info
router.get("/me/orders", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db
    .select({
      order: ordersTable,
      sellerDisplayName: profilesTable.displayName,
      sellerHandle: profilesTable.handle,
      sellerAvatarUrl: profilesTable.avatarUrl,
    })
    .from(ordersTable)
    .leftJoin(profilesTable, eq(ordersTable.sellerId, profilesTable.userId))
    .where(eq(ordersTable.buyerId, req.user.id))
    .orderBy(desc(ordersTable.createdAt));
  res.json({
    orders: rows.map(({ order, sellerDisplayName, sellerHandle, sellerAvatarUrl }) => ({
      ...order,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      sellerDisplayName,
      sellerHandle,
      sellerAvatarUrl,
    })),
  });
});

// GET /me/sales — my sales (as seller) with buyer profile info
router.get("/me/sales", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db
    .select({
      id: ordersTable.id,
      buyerId: ordersTable.buyerId,
      type: ordersTable.type,
      refId: ordersTable.refId,
      title: ordersTable.title,
      description: ordersTable.description,
      imageUrl: ordersTable.imageUrl,
      amount: ordersTable.amount,
      currency: ordersTable.currency,
      status: ordersTable.status,
      shippingAddress: ordersTable.shippingAddress,
      trackingNumber: ordersTable.trackingNumber,
      notes: ordersTable.notes,
      processingWindowDays: ordersTable.processingWindowDays,
      processingWindowLabel: ordersTable.processingWindowLabel,
      manualPayout: ordersTable.manualPayout,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
      buyerDisplayName: profilesTable.displayName,
      buyerHandle: profilesTable.handle,
      buyerAvatarUrl: profilesTable.avatarUrl,
    })
    .from(ordersTable)
    .leftJoin(profilesTable, eq(ordersTable.buyerId, profilesTable.userId))
    .where(eq(ordersTable.sellerId, req.user.id))
    .orderBy(desc(ordersTable.createdAt));

  res.json({
    orders: rows.map(o => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })),
  });
});

// GET /artists/:artistId/reservations
router.get("/artists/:artistId/reservations", async (req, res): Promise<void> => {
  try {
    const rows = await db.select().from(workReservationsTable)
      .where(and(eq(workReservationsTable.artistId, req.params.artistId), eq(workReservationsTable.status, "open")))
      .orderBy(desc(workReservationsTable.createdAt));

    const viewerId = req.isAuthenticated() ? req.user.id : null;
    let interestedIds = new Set<string>();
    if (viewerId) {
      const interests = await db.select({ reservationId: reservationInterestsTable.reservationId })
        .from(reservationInterestsTable)
        .where(eq(reservationInterestsTable.userId, viewerId));
      interestedIds = new Set(interests.map(i => i.reservationId));
    }

    res.json({
      reservations: rows.map(r => ({
        ...r,
        isInterested: interestedIds.has(r.id),
        createdAt: r.createdAt.toISOString()
      }))
    });
  } catch (err) {
    req.log.error({ err }, "getReservations error");
    res.status(500).json({ error: "Failed to load reservations" });
  }
});

// POST /work-reservations — create (artist only)
router.post("/work-reservations", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, description, imageUrl, expectedDate } = req.body;
  if (!title || !expectedDate) { res.status(400).json({ error: "title and expectedDate are required" }); return; }

  try {
    const user = req.user;
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
    const [reservation] = await db.insert(workReservationsTable).values({
      artistId: user.id,
      artistName: name,
      title,
      description,
      imageUrl,
      expectedDate,
    }).returning();

    res.status(201).json({
      reservation: { ...reservation, createdAt: reservation.createdAt.toISOString() }
    });
  } catch (err) {
    req.log.error({ err }, "createReservation error");
    res.status(500).json({ error: "Failed to create reservation" });
  }
});

// POST /work-reservations/:id/interest
router.post("/work-reservations/:id/interest", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const reservationId = req.params.id;
  const userId = req.user.id;
  const userName = [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") || req.user.email || "Collector";

  try {
    const [existing] = await db.select().from(reservationInterestsTable)
      .where(and(eq(reservationInterestsTable.reservationId, reservationId), eq(reservationInterestsTable.userId, userId)));

    if (existing) {
      res.json({ success: true, alreadyInterested: true });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.insert(reservationInterestsTable).values({
        reservationId,
        userId,
        userName,
      });
      await tx.update(workReservationsTable)
        .set({ interestCount: sql`${workReservationsTable.interestCount} + 1` })
        .where(eq(workReservationsTable.id, reservationId));
    });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "expressInterest error");
    res.status(500).json({ error: "Failed to express interest" });
  }
});

// DELETE /work-reservations/:id/interest
router.delete("/work-reservations/:id/interest", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const reservationId = req.params.id;
  const userId = req.user.id;

  try {
    const [existing] = await db.select().from(reservationInterestsTable)
      .where(and(eq(reservationInterestsTable.reservationId, reservationId), eq(reservationInterestsTable.userId, userId)));

    if (!existing) {
      res.json({ success: true, notInterested: true });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(reservationInterestsTable)
        .where(and(eq(reservationInterestsTable.reservationId, reservationId), eq(reservationInterestsTable.userId, userId)));
      await tx.update(workReservationsTable)
        .set({ interestCount: sql`GREATEST(${workReservationsTable.interestCount} - 1, 0)` })
        .where(eq(workReservationsTable.id, reservationId));
    });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "removeInterest error");
    res.status(500).json({ error: "Failed to remove interest" });
  }
});

export default router;
