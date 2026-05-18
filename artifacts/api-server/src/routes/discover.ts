import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable, postsTable, followsTable, streaksTable } from "@workspace/db";
import { desc, eq, and, or, inArray, sql, isNotNull, isNull, lte } from "drizzle-orm";
import { publicProfileFields, redactPatronMedia } from "../lib/publicFields";

const router = Router();

// GET /leaderboard — top creators by follower count
router.get("/leaderboard", async (req, res): Promise<void> => {
  try {
    const { medium, limit = "50" } = req.query as Record<string, string>;
    let query = db.select(publicProfileFields).from(profilesTable).$dynamic();
    if (medium && medium !== "All") {
      const { ilike } = await import("drizzle-orm");
      query = query.where(ilike(profilesTable.medium, `%${medium}%`));
    }
    const profiles = await query.orderBy(desc(profilesTable.followerCount)).limit(Number(limit));
    const viewerId = req.isAuthenticated() ? req.user.id : null;
    let followingIds = new Set<string>();
    if (viewerId && profiles.length > 0) {
      const ids = profiles.map(p => p.userId);
      const follows = await db.select({ followingId: followsTable.followingId }).from(followsTable).where(and(eq(followsTable.followerId, viewerId), inArray(followsTable.followingId, ids)));
      followingIds = new Set(follows.map(f => f.followingId));
    }
    res.json({ profiles: profiles.map((p, i) => ({ ...p, rank: i + 1, isFollowing: followingIds.has(p.userId), createdAt: p.createdAt.toISOString() })) });
  } catch (err) { req.log.error({ err }, "leaderboard error"); res.status(500).json({ error: "Failed to load leaderboard" }); }
});

// GET /leaderboard/streaks — top creators by current streak
router.get("/leaderboard/streaks", async (req, res): Promise<void> => {
  try {
    const streaks = await db.select().from(streaksTable)
      .where(isNotNull(streaksTable.lastPostDate))
      .orderBy(desc(streaksTable.currentStreak))
      .limit(50);
    if (!streaks.length) { res.json({ profiles: [] }); return; }
    const ids = streaks.map(s => s.userId);
    const profiles = await db.select({
      userId: profilesTable.userId,
      handle: profilesTable.handle,
      displayName: profilesTable.displayName,
      avatarUrl: profilesTable.avatarUrl,
      medium: profilesTable.medium,
    }).from(profilesTable).where(inArray(profilesTable.userId, ids));
    const profileMap = Object.fromEntries(profiles.map(p => [p.userId, p]));
    res.json({
      profiles: streaks.map(s => ({
        userId: s.userId,
        currentStreak: s.currentStreak,
        longestStreak: s.longestStreak,
        handle: profileMap[s.userId]?.handle ?? null,
        displayName: profileMap[s.userId]?.displayName ?? null,
        avatarUrl: profileMap[s.userId]?.avatarUrl ?? null,
        medium: profileMap[s.userId]?.medium ?? null,
      })),
    });
  } catch (err) { req.log.error({ err }, "streakLeaderboard error"); res.status(500).json({ error: "Failed" }); }
});

// GET /leaderboard/cities — artists grouped by city, sorted by count
router.get("/leaderboard/cities", async (req, res): Promise<void> => {
  try {
    const profiles = await db.select({
      userId: profilesTable.userId,
      displayName: profilesTable.displayName,
      handle: profilesTable.handle,
      avatarUrl: profilesTable.avatarUrl,
      medium: profilesTable.medium,
      followerCount: profilesTable.followerCount,
      location: profilesTable.location,
    }).from(profilesTable)
      .where(isNotNull(profilesTable.location))
      .orderBy(desc(profilesTable.followerCount))
      .limit(200);
    const cityMap = new Map<string, typeof profiles>();
    for (const p of profiles) {
      const city = (p.location ?? "").split(",")[0].trim();
      if (!city) continue;
      if (!cityMap.has(city)) cityMap.set(city, []);
      cityMap.get(city)!.push(p);
    }
    const cities = [...cityMap.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 20)
      .map(([city, artists]) => ({
        city,
        count: artists.length,
        topArtists: artists.slice(0, 5).map(p => ({
          userId: p.userId, displayName: p.displayName, handle: p.handle,
          avatarUrl: p.avatarUrl, medium: p.medium, followerCount: p.followerCount,
        })),
      }));
    res.json({ cities });
  } catch (err) { req.log.error({ err }, "cityLeaderboard error"); res.status(500).json({ error: "Failed" }); }
});

// GET /trending-posts — trending posts by like count
router.get("/trending-posts", async (req, res): Promise<void> => {
  try {
    const { tag, limit = "30" } = req.query as Record<string, string>;
    const baseFilter = and(
      sql`${postsTable.isDraft} = false`,
      or(isNull(postsTable.scheduledAt), lte(postsTable.scheduledAt, sql`NOW()`)),
      tag ? sql`${postsTable.tags} @> ARRAY[${tag}]::text[]` : undefined,
    );
    const posts = await db.select().from(postsTable)
      .where(baseFilter)
      .orderBy(desc(postsTable.likeCount))
      .limit(Number(limit));
    res.json({ posts: posts.map(p => redactPatronMedia({ ...p, tags: p.tags ?? [], createdAt: p.createdAt.toISOString() })) });
  } catch (err) { req.log.error({ err }, "trendingPosts error"); res.status(500).json({ error: "Failed to load trending posts" }); }
});

// GET /followers/:userId — who follows this user
router.get("/followers/:userId", async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;
    const { limit = "50", offset = "0" } = req.query as Record<string, string>;
    const follows = await db.select({ followerId: followsTable.followerId }).from(followsTable).where(eq(followsTable.followingId, userId)).limit(Number(limit)).offset(Number(offset));
    const followerIds = follows.map(f => f.followerId);
    if (!followerIds.length) { res.json({ followers: [] }); return; }
    const profiles = await db.select(publicProfileFields).from(profilesTable).where(inArray(profilesTable.userId, followerIds));
    const viewerId = req.isAuthenticated() ? req.user.id : null;
    let viewerFollowing = new Set<string>();
    if (viewerId) {
      const vf = await db.select({ followingId: followsTable.followingId }).from(followsTable).where(and(eq(followsTable.followerId, viewerId), inArray(followsTable.followingId, followerIds)));
      viewerFollowing = new Set(vf.map(f => f.followingId));
    }
    res.json({ followers: profiles.map(p => ({ ...p, isFollowing: viewerFollowing.has(p.userId), createdAt: p.createdAt.toISOString() })) });
  } catch (err) { req.log.error({ err }, "getFollowers error"); res.status(500).json({ error: "Failed to load followers" }); }
});

// GET /following/:userId — who this user follows
router.get("/following/:userId", async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;
    const follows = await db.select({ followingId: followsTable.followingId }).from(followsTable).where(eq(followsTable.followerId, userId)).limit(50);
    const followingIds = follows.map(f => f.followingId);
    if (!followingIds.length) { res.json({ following: [] }); return; }
    const profiles = await db.select(publicProfileFields).from(profilesTable).where(inArray(profilesTable.userId, followingIds));
    res.json({ following: profiles.map(p => ({ ...p, isFollowing: true, createdAt: p.createdAt.toISOString() })) });
  } catch (err) { req.log.error({ err }, "getFollowing error"); res.status(500).json({ error: "Failed to load following" }); }
});

export default router;
