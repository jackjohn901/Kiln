import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, likesTable, savesTable, followsTable, userSettingsTable, streaksTable } from "@workspace/db";
import { desc, lt, eq, and, inArray } from "drizzle-orm";

const router = Router();

const ARTIST_LEVELS = ["Emerging", "Rising", "Established", "Master"] as const;

function hashId(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function authorLevel(authorId: string): string {
  return ARTIST_LEVELS[hashId(authorId) % 4];
}

function hotnessScore(
  likeCount: number,
  commentCount: number,
  saveCount: number,
  createdAt: Date,
  tasteBonus = 0,
): number {
  const ageHours = (Date.now() - createdAt.getTime()) / 3600000;
  const engagement = likeCount * 3 + commentCount * 5 + saveCount * 4;
  return ((engagement + 1) * (1 + tasteBonus)) / Math.pow(ageHours + 2, 0.8);
}

router.get("/feed", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const page = Math.max(Number(req.query.page) || 0, 0);
    const userId = req.isAuthenticated() ? req.user.id : null;

    let preferredTechniques: string[] = [];
    if (userId) {
      const [settings] = await db.select({ settings: userSettingsTable.settings })
        .from(userSettingsTable)
        .where(eq(userSettingsTable.userId, userId));
      const s = (settings?.settings ?? {}) as Record<string, unknown>;
      if (Array.isArray(s["techniques"])) {
        preferredTechniques = s["techniques"] as string[];
      }
    }

    const POOL_SIZE = 200;
    const pool = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.isDraft, false))
      .orderBy(desc(postsTable.createdAt))
      .limit(POOL_SIZE);

    const scored = pool.map((p) => {
      const technique = p.technique?.toLowerCase() ?? "";
      const tasteBonus = preferredTechniques.some(
        (t) => technique.includes(t.toLowerCase()),
      ) ? 0.25 : 0;
      return { ...p, _score: hotnessScore(p.likeCount, p.commentCount, p.saveCount, p.createdAt, tasteBonus) };
    }).sort((a, b) => b._score - a._score);

    const slice = scored.slice(page * limit, (page + 1) * limit);
    const hasMore = scored.length > (page + 1) * limit;

    let likedIds = new Set<string>();
    let savedIds = new Set<string>();
    if (userId && slice.length > 0) {
      const postIds = slice.map((p) => p.id);
      const [likes, saves] = await Promise.all([
        db.select({ postId: likesTable.postId }).from(likesTable)
          .where(and(eq(likesTable.userId, userId), inArray(likesTable.postId, postIds))),
        db.select({ postId: savesTable.postId }).from(savesTable)
          .where(and(eq(savesTable.userId, userId), inArray(savesTable.postId, postIds))),
      ]);
      likedIds = new Set(likes.map((l) => l.postId));
      savedIds = new Set(saves.map((s) => s.postId));
    }

    // Batch-fetch author streaks
    const authorIds = [...new Set(slice.map((p) => p.authorId))];
    const streakRows = authorIds.length
      ? await db.select({ userId: streaksTable.userId, currentStreak: streaksTable.currentStreak })
          .from(streaksTable).where(inArray(streaksTable.userId, authorIds))
      : [];
    const streakMap = new Map(streakRows.map((s) => [s.userId, s.currentStreak]));

    res.json({
      posts: slice.map(({ _score: _, ...p }) => ({
        ...p,
        tags: p.tags ?? [],
        isLiked: likedIds.has(p.id),
        isSaved: savedIds.has(p.id),
        authorStreak: streakMap.get(p.authorId) ?? 0,
        authorLevel: authorLevel(p.authorId),
        createdAt: p.createdAt.toISOString(),
        musicTrackId: p.musicTrackId,
      })),
      hasMore,
      nextCursor: hasMore ? String(page + 1) : null,
    });
  } catch (err) {
    req.log.error({ err }, "getFeed error");
    res.status(500).json({ error: "Failed to load feed" });
  }
});

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

    const whereClause = cursor
      ? and(inArray(postsTable.authorId, followingIds), eq(postsTable.isDraft, false), lt(postsTable.createdAt, new Date(cursor)))
      : and(inArray(postsTable.authorId, followingIds), eq(postsTable.isDraft, false));

    const posts = await db
      .select()
      .from(postsTable)
      .where(whereClause)
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

    // Batch-fetch author streaks
    const authorIds2 = [...new Set(page.map((p) => p.authorId))];
    const streakRows2 = authorIds2.length
      ? await db.select({ userId: streaksTable.userId, currentStreak: streaksTable.currentStreak })
          .from(streaksTable).where(inArray(streaksTable.userId, authorIds2))
      : [];
    const streakMap2 = new Map(streakRows2.map((s) => [s.userId, s.currentStreak]));

    res.json({
      posts: page.map((post) => ({
        ...post,
        tags: post.tags ?? [],
        isLiked: likedIds.has(post.id),
        isSaved: savedIds.has(post.id),
        authorStreak: streakMap2.get(post.authorId) ?? 0,
        authorLevel: authorLevel(post.authorId),
        createdAt: post.createdAt.toISOString(),
        musicTrackId: post.musicTrackId,
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
