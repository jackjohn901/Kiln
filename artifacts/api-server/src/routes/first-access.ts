import { Router } from "express";
import { db } from "@workspace/db";
import { collectorFirstAccessTable, savesTable, postsTable } from "@workspace/db";
import { eq, and, gt, desc, inArray } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /listings/:id/first-access — does the current user have unexpired first access?
router.get("/listings/:id/first-access", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.json({ hasAccess: false }); return; }
  const [row] = await db.select()
    .from(collectorFirstAccessTable)
    .where(and(
      eq(collectorFirstAccessTable.listingId, req.params.id),
      eq(collectorFirstAccessTable.userId, req.user.id),
      gt(collectorFirstAccessTable.expiresAt, new Date()),
    ));
  if (!row) { res.json({ hasAccess: false }); return; }
  res.json({ hasAccess: true, expiresAt: row.expiresAt.toISOString() });
});

// Internal helper — grant collector first access to top savers of this artist's recent posts.
// Call this right after creating a new listing.
export async function grantFirstAccessToTopSavers(
  listingId: string,
  artistId: string,
): Promise<void> {
  try {
    // Find this artist's posts from last 60 days
    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const recentPosts = await db.select({ id: postsTable.id })
      .from(postsTable)
      .where(and(eq(postsTable.authorId, artistId), gt(postsTable.createdAt, since)))
      .orderBy(desc(postsTable.saveCount))
      .limit(20);

    if (!recentPosts.length) return;

    const postIds = recentPosts.map(p => p.id);
    const saves = await db.select({ userId: savesTable.userId, postId: savesTable.postId })
      .from(savesTable)
      .where(inArray(savesTable.postId, postIds));

    // Count saves per user, exclude the artist themselves
    const userSaveCounts = new Map<string, { count: number; postId: string }>();
    for (const s of saves) {
      if (s.userId === artistId) continue;
      const existing = userSaveCounts.get(s.userId);
      if (!existing) {
        userSaveCounts.set(s.userId, { count: 1, postId: s.postId });
      } else {
        existing.count++;
      }
    }

    // Top 3 savers
    const topSavers = [...userSaveCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3);

    if (!topSavers.length) return;

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    for (const [userId, { postId }] of topSavers) {
      await db.insert(collectorFirstAccessTable)
        .values({
          id: crypto.randomUUID(),
          listingId,
          userId,
          sourcePostId: postId,
          expiresAt,
        })
        .onConflictDoNothing();
    }
  } catch {
    // Non-fatal — first access is a bonus, never a blocker
  }
}

export default router;
