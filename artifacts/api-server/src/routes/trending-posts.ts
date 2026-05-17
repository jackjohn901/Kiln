import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable } from "@workspace/db";
import { desc, gte } from "drizzle-orm";

const router = Router();

// GET /trending-posts — posts sorted by recent engagement, with tag aggregates
router.get("/trending-posts", async (req, res): Promise<void> => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "50")), 200);
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const posts = await db.select().from(postsTable)
      .where(gte(postsTable.createdAt, since))
      .orderBy(desc(postsTable.likeCount), desc(postsTable.commentCount))
      .limit(limit);
    // Aggregate tags
    const tagMap = new Map<string, number>();
    posts.forEach(p => (p.tags ?? []).forEach(t => tagMap.set(t, (tagMap.get(t) ?? 0) + 1)));
    const trendingTags = Array.from(tagMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([tag, count]) => ({ tag, count }));
    res.json({
      posts: posts.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })),
      trendingTags,
    });
  } catch (err) {
    req.log.error({ err }, "getTrendingPosts error");
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
