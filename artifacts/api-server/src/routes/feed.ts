import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, likesTable, savesTable, followsTable } from "@workspace/db";
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

// GET /feed/following — posts from users the current user follows
router.get("/feed/following", async (req, res) => {
  if (!req.isAuthenticated()) { res.json({ posts: [], hasMore: false, nextCursor: null }); return; }
  try {
    const userId = req.user.id;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = req.query.cursor as string | undefined;

    const follows = await db
      .select({ followingId: followsTable.followingId })
      .from(followsTable)
      .where(eq(followsTable.followerId, userId));

    const followingIds = follows.map((f) => f.followingId);
    if (followingIds.length === 0) {
      res.json({ posts: [], hasMore: false, nextCursor: null }); return;
    }

    const conditions = [inArray(postsTable.authorId, followingIds)];
    if (cursor) conditions.push(lt(postsTable.createdAt, new Date(cursor)));

    const posts = await db
      .select()
      .from(postsTable)
      .where(and(...(conditions as [any, ...any[]])))
      .orderBy(desc(postsTable.createdAt))
      .limit(limit + 1);

    const hasMore = posts.length > limit;
    const page = hasMore ? posts.slice(0, limit) : posts;

    const postIds = page.map((p) => p.id);
    const [likes, saves] = postIds.length > 0
      ? await Promise.all([
          db.select({ postId: likesTable.postId }).from(likesTable)
            .where(and(eq(likesTable.userId, userId), inArray(likesTable.postId, postIds))),
          db.select({ postId: savesTable.postId }).from(savesTable)
            .where(and(eq(savesTable.userId, userId), inArray(savesTable.postId, postIds))),
        ])
      : [[], []];

    const likedIds = new Set(likes.map((l) => l.postId));
    const savedIds = new Set(saves.map((s) => s.postId));

    res.json({
      posts: page.map((post) => ({
        ...post,
        tags: post.tags ?? [],
        isLiked: likedIds.has(post.id),
        isSaved: savedIds.has(post.id),
        createdAt: post.createdAt.toISOString(),
      })),
      hasMore,
      nextCursor: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
    });
  } catch (err) {
    req.log.error({ err }, "getFollowingFeed error");
    res.status(500).json({ error: "Failed to load feed" });
  }
});

export default router;
