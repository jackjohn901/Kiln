import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, likesTable, savesTable } from "@workspace/db";
import { desc, lt, eq, and, inArray } from "drizzle-orm";

const router = Router();

router.get("/feed", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const where = cursor ? lt(postsTable.createdAt, new Date(cursor)) : undefined;

    const posts = await db
      .select()
      .from(postsTable)
      .where(where)
      .orderBy(desc(postsTable.createdAt))
      .limit(limit + 1);

    const hasMore = posts.length > limit;
    const page = hasMore ? posts.slice(0, limit) : posts;

    const userId = req.isAuthenticated() ? req.user.id : null;

    let likedIds = new Set<string>();
    let savedIds = new Set<string>();

    if (userId && page.length > 0) {
      const postIds = page.map((p) => p.id);
      const [likes, saves] = await Promise.all([
        db.select({ postId: likesTable.postId }).from(likesTable)
          .where(and(eq(likesTable.userId, userId), inArray(likesTable.postId, postIds))),
        db.select({ postId: savesTable.postId }).from(savesTable)
          .where(and(eq(savesTable.userId, userId), inArray(savesTable.postId, postIds))),
      ]);
      likedIds = new Set(likes.map((l) => l.postId));
      savedIds = new Set(saves.map((s) => s.postId));
    }

    const enriched = page.map((post) => ({
      ...post,
      tags: post.tags ?? [],
      isLiked: likedIds.has(post.id),
      isSaved: savedIds.has(post.id),
      createdAt: post.createdAt.toISOString(),
    }));

    res.json({
      posts: enriched,
      hasMore,
      nextCursor: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
    });
  } catch (err) {
    req.log.error({ err }, "getFeed error");
    res.status(500).json({ error: "Failed to load feed" });
  }
});

export default router;
