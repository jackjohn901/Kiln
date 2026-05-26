import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, listingsTable, notificationsTable, reviewVotesTable } from "@workspace/db";
import { eq, desc, avg, count, and, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /reviews/:targetType/:targetId
router.get("/reviews/:targetType/:targetId", async (req, res): Promise<void> => {
  const { targetType, targetId } = req.params;
  const rows = await db.select().from(reviewsTable)
    .where(and(eq(reviewsTable.targetId, targetId), eq(reviewsTable.targetType, targetType)))
    .orderBy(desc(reviewsTable.createdAt)).limit(50);
  const stats = await db.select({ avg: avg(reviewsTable.rating), count: count() })
    .from(reviewsTable).where(and(eq(reviewsTable.targetId, targetId), eq(reviewsTable.targetType, targetType)));
  res.json({
    reviews: rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })),
    avgRating: Number(stats[0]?.avg ?? 0).toFixed(1),
    reviewCount: stats[0]?.count ?? 0,
  });
});

// POST /reviews — submit a review
router.post("/reviews", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { targetId, targetType, rating, title, body } = req.body;
  if (!targetId || !targetType || !rating) { res.status(400).json({ error: "targetId, targetType, rating required" }); return; }
  if (rating < 1 || rating > 5) { res.status(400).json({ error: "Rating must be 1–5" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Collector";
  const [review] = await db.insert(reviewsTable).values({
    id: crypto.randomUUID(), reviewerId: user.id, reviewerName: name,
    reviewerAvatarUrl: user.profileImageUrl ?? null, targetId, targetType,
    rating, title, body, isVerifiedPurchase: false,
  }).returning();
  res.status(201).json({ review: { ...review, createdAt: review.createdAt.toISOString(), updatedAt: review.updatedAt.toISOString() } });
});

// POST /reviews/:id/respond — artist responds to review (only the listing/workshop owner)
router.post("/reviews/:id/respond", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { response } = req.body;
  if (!response) { res.status(400).json({ error: "response required" }); return; }
  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, req.params.id));
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  // Ownership check: for listings, verify the reviewer is the listing artist
  if (review.targetType === "listing") {
    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, review.targetId));
    if (!listing || listing.artistId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  } else {
    // Ownership checks for other target types not yet implemented — deny by default
    res.status(403).json({ error: "Forbidden" }); return;
  }
  await db.update(reviewsTable).set({ artistResponse: response }).where(eq(reviewsTable.id, req.params.id));
  res.json({ ok: true });
});

// POST /reviews/:id/helpful — toggle helpful vote (auth required, one per user)
router.post("/reviews/:id/helpful", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const reviewId = req.params.id;
  const userId = req.user.id;

  const [existing] = await db.select().from(reviewVotesTable)
    .where(and(eq(reviewVotesTable.reviewId, reviewId), eq(reviewVotesTable.userId, userId)));

  if (existing) {
    // Already voted — remove vote (toggle off)
    await db.delete(reviewVotesTable)
      .where(and(eq(reviewVotesTable.reviewId, reviewId), eq(reviewVotesTable.userId, userId)));
    await db.update(reviewsTable)
      .set({ helpfulCount: sql`GREATEST(0, ${reviewsTable.helpfulCount} - 1)` })
      .where(eq(reviewsTable.id, reviewId));
    res.json({ ok: true, helpful: false });
    return;
  }

  // Add vote
  await db.insert(reviewVotesTable).values({
    id: crypto.randomUUID(),
    reviewId,
    userId,
  });
  await db.update(reviewsTable)
    .set({ helpfulCount: sql`${reviewsTable.helpfulCount} + 1` })
    .where(eq(reviewsTable.id, reviewId));
  res.json({ ok: true, helpful: true });
});

export default router;
