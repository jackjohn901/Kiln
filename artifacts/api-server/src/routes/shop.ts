import { Router } from "express";
import { db } from "@workspace/db";
import { listingsTable, wishlistsTable, ordersTable, userSettingsTable, profilesTable, workReservationsTable, reservationInterestsTable } from "@workspace/db";
import { eq, and, desc, ilike, or, sql } from "drizzle-orm";
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
    const rows = await query.orderBy(desc(listingsTable.createdAt)).limit(Number(limit)).offset(Number(offset));
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
  const { title, description, medium, technique, dimensions, weight, year, edition, imageUrl, imageUrls, price, shipsFrom, shipsTo, tags, isResale, originalArtistId, originalArtistName, originalListingId, royaltyPercent } = req.body;
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
  const { title, price, isAvailable, isSold, medium, dimensions, description } = req.body as {
    title?: string; price?: number; isAvailable?: boolean; isSold?: boolean;
    medium?: string; dimensions?: string; description?: string;
  };
  const updates: Partial<typeof listing> = { updatedAt: new Date() };
  if (title !== undefined) updates.title = title;
  if (price !== undefined) updates.price = Math.round(Number(price));
  if (isAvailable !== undefined) updates.isAvailable = Boolean(isAvailable);
  if (isSold !== undefined) updates.isSold = Boolean(isSold);
  if (medium !== undefined) updates.medium = medium;
  if (dimensions !== undefined) updates.dimensions = dimensions;
  if (description !== undefined) updates.description = description;
  const [updated] = await db.update(listingsTable).set(updates).where(eq(listingsTable.id, req.params.id)).returning();
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
      freeThreshold: typeof s.freeThreshold === "number" ? s.freeThreshold : null,
      offerLocalPickup: s.offerLocalPickup === true,
    });
  } catch (err) { req.log.error({ err }, "getArtistShipping error"); res.status(500).json({ error: "Failed to load shipping" }); }
});

// DELETE /listings/:id
router.delete("/listings/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [listing] = await db.select({ artistId: listingsTable.artistId }).from(listingsTable).where(eq(listingsTable.id, req.params.id));
  if (!listing || listing.artistId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(listingsTable).where(eq(listingsTable.id, req.params.id));
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
  const rows = await db.select().from(listingsTable).where(eq(listingsTable.artistId, req.user.id)).orderBy(desc(listingsTable.createdAt));
  res.json({ listings: rows.map(l => ({ ...l, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() })) });
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
        notes: ordersTable.notes,
        processingWindowDays: ordersTable.processingWindowDays,
        processingWindowLabel: ordersTable.processingWindowLabel,
        manualPayout: ordersTable.manualPayout,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
        buyerDisplayName: profilesTable.displayName,
        buyerHandle: profilesTable.handle,
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

// GET /me/orders — my orders (as buyer)
router.get("/me/orders", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.buyerId, req.user.id)).orderBy(desc(ordersTable.createdAt));
  res.json({ orders: rows.map(o => ({ ...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString() })) });
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
