import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, notificationsTable } from "@workspace/db";
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
  res.status(201).json({ ...review, createdAt: review.createdAt.toISOString(), updatedAt: review.updatedAt.toISOString() });
});

// POST /reviews/:id/respond — artist responds to review
router.post("/reviews/:id/respond", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { response } = req.body;
  if (!response) { res.status(400).json({ error: "response required" }); return; }
  await db.update(reviewsTable).set({ artistResponse: response }).where(eq(reviewsTable.id, req.params.id));
  res.json({ ok: true });
});

// POST /reviews/:id/helpful
router.post("/reviews/:id/helpful", async (req, res): Promise<void> => {
  await db.update(reviewsTable).set({ helpfulCount: sql`${reviewsTable.helpfulCount} + 1` }).where(eq(reviewsTable.id, req.params.id));
  res.json({ ok: true });
});

export default router;
