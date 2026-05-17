import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, followsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// GET /analytics/me — real post performance data for the logged-in user
router.get("/analytics/me", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const userId = req.user.id;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const [allPosts, followerRows] = await Promise.all([
      db.select().from(postsTable)
        .where(and(eq(postsTable.authorId, userId), eq(postsTable.isDraft, false)))
        .orderBy(desc(postsTable.createdAt))
        .limit(100),
      db.select({ count: sql<number>`count(*)::int` })
        .from(followsTable)
        .where(eq(followsTable.followingId, userId)),
    ]);

    const followerCount = followerRows[0]?.count ?? 0;
    const totalPosts = allPosts.length;
    const totalLikes = allPosts.reduce((s, p) => s + (p.likeCount ?? 0), 0);
    const totalComments = allPosts.reduce((s, p) => s + (p.commentCount ?? 0), 0);
    const totalSaves = allPosts.reduce((s, p) => s + (p.saveCount ?? 0), 0);

    // Posts per day for last 30 days (for chart)
    const recentPosts = allPosts.filter((p) => new Date(p.createdAt) >= thirtyDaysAgo);
    const postsByDay: Record<string, number> = {};
    for (const p of recentPosts) {
      const day = new Date(p.createdAt).toISOString().slice(0, 10);
      postsByDay[day] = (postsByDay[day] ?? 0) + 1;
    }

    // Likes per day for last 30 days (proportional estimate from recent posts)
    const likesByDay: Record<string, number> = {};
    for (const p of recentPosts) {
      const day = new Date(p.createdAt).toISOString().slice(0, 10);
      likesByDay[day] = (likesByDay[day] ?? 0) + (p.likeCount ?? 0);
    }

    // Top posts by engagement
    const topPosts = [...allPosts]
      .sort((a, b) => ((b.likeCount ?? 0) + (b.commentCount ?? 0)) - ((a.likeCount ?? 0) + (a.commentCount ?? 0)))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        caption: p.caption,
        thumbnailUrl: p.thumbnailUrl,
        likeCount: p.likeCount ?? 0,
        commentCount: p.commentCount ?? 0,
        saveCount: p.saveCount ?? 0,
        createdAt: p.createdAt.toISOString(),
      }));

    res.json({
      totalPosts,
      totalLikes,
      totalComments,
      totalSaves,
      followerCount,
      topPosts,
      postsByDay,
      likesByDay,
    });
  } catch (err) {
    req.log.error({ err }, "analytics/me error");
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

export default router;
