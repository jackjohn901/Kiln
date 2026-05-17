import { Router } from "express";
import { db } from "@workspace/db";
import { listingsTable, notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /resale — browse resale listings
router.get("/resale", async (req, res): Promise<void> => {
  const listings = await db.select().from(listingsTable)
    .where(and(eq(listingsTable.isResale, true), eq(listingsTable.isAvailable, true)))
    .orderBy(desc(listingsTable.createdAt)).limit(50);
  res.json({ listings: listings.map(l => ({ ...l, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() })) });
});

// POST /resale — list a piece for resale
router.post("/resale", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, description, price, imageUrl, imageUrls, medium, technique, dimensions, originalArtistId, originalArtistName, originalListingId, royaltyPercent } = req.body;
  if (!title || !price || !originalArtistId) { res.status(400).json({ error: "title, price, originalArtistId required" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Collector";
  const [listing] = await db.insert(listingsTable).values({
    id: crypto.randomUUID(), artistId: user.id, artistName: name,
    artistAvatarUrl: user.profileImageUrl ?? null, title, description,
    price: Number(price), medium, technique, dimensions,
    imageUrl: imageUrl ?? null, imageUrls: imageUrls ?? [],
    isResale: true, originalArtistId, originalArtistName: originalArtistName ?? "",
    originalListingId: originalListingId ?? null,
    royaltyPercent: Math.min(royaltyPercent ?? 10, 30),
  }).returning();
  // Notify original artist
  if (originalArtistId) {
    await db.insert(notificationsTable).values({
      id: crypto.randomUUID(), userId: originalArtistId, type: "resale" as any,
      fromId: user.id, fromName: name, fromAvatarUrl: user.profileImageUrl ?? null,
      text: `listed your work "${title}" for resale at $${price}`,
      link: `/listings/${listing.id}`,
    });
  }
  res.status(201).json({ ...listing, createdAt: listing.createdAt.toISOString(), updatedAt: listing.updatedAt.toISOString() });
});

export default router;
