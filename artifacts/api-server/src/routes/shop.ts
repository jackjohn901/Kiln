import { Router } from "express";
import { db } from "@workspace/db";
import { listingsTable, wishlistsTable, ordersTable } from "@workspace/db";
import { eq, and, desc, ilike, or, sql } from "drizzle-orm";
import crypto from "crypto";

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
  const { title, description, medium, technique, dimensions, weight, year, edition, imageUrl, imageUrls, price, shipsFrom, shipsTo, tags } = req.body;
  if (!title || !price) { res.status(400).json({ error: "title and price required" }); return; }
  try {
    const user = req.user;
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
    const [listing] = await db.insert(listingsTable).values({
      id: crypto.randomUUID(), artistId: user.id, artistName: name, artistAvatarUrl: user.profileImageUrl ?? null,
      title, description, medium, technique, dimensions, weight, year: year ? Number(year) : null,
      edition, imageUrl, imageUrls: imageUrls ?? [], price: Number(price), shipsFrom, shipsTo: shipsTo ?? [], tags: tags ?? [],
    }).returning();
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
  const [order] = await db.insert(ordersTable).values({
    id: crypto.randomUUID(), buyerId: user.id, sellerId: listing.artistId,
    type: "listing", refId: listing.id, title: listing.title,
    description: `Inquiry for: ${listing.title}`, imageUrl: listing.imageUrl ?? null,
    amount: listing.price, status: "inquiry",
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

// GET /me/orders — my orders (as buyer)
router.get("/me/orders", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.buyerId, req.user.id)).orderBy(desc(ordersTable.createdAt));
  res.json({ orders: rows.map(o => ({ ...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString() })) });
});

// GET /me/sales — my sales (as seller)
router.get("/me/sales", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(ordersTable).where(eq(ordersTable.sellerId, req.user.id)).orderBy(desc(ordersTable.createdAt));
  res.json({ orders: rows.map(o => ({ ...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString() })) });
});

export default router;
