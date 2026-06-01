import { Router } from "express";
import { db } from "@workspace/db";
import { profilesTable, followsTable, streaksTable, postsTable } from "@workspace/db";
import { desc, eq, and, inArray, isNotNull, gte, sql } from "drizzle-orm";
import { publicProfileFields } from "../lib/publicFields";

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

// GET /discover/rising-artists — new / low-follower artists who are actively
// posting, so newcomers get discovered before they build a following.
router.get("/discover/rising-artists", async (req, res): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 12, 50);
    const RISING_FOLLOWER_CAP = 500;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // Aggregate per-author over the FULL 30-day window (one row per active
    // author) so a low-follower maker with a single older-but-recent post is
    // still considered — not just authors in the newest slice of posts.
    const recent = await db
      .select({
        authorId: postsTable.authorId,
        count: sql<number>`count(*)::int`,
        last: sql<string>`max(${postsTable.createdAt})`,
      })
      .from(postsTable)
      .where(and(eq(postsTable.isDraft, false), gte(postsTable.createdAt, since)))
      .groupBy(postsTable.authorId)
      .orderBy(desc(sql`max(${postsTable.createdAt})`))
      .limit(500);
    if (!recent.length) { res.json({ artists: [] }); return; }

    const activity = new Map<string, { count: number; last: Date }>(
      recent.map((r) => [r.authorId, { count: r.count, last: new Date(r.last) }]),
    );
    const authorIds = [...activity.keys()];

    const profiles = await db.select({
      userId: profilesTable.userId,
      handle: profilesTable.handle,
      displayName: profilesTable.displayName,
      avatarUrl: profilesTable.avatarUrl,
      medium: profilesTable.medium,
      bio: profilesTable.bio,
      location: profilesTable.location,
      followerCount: profilesTable.followerCount,
    }).from(profilesTable)
      .where(and(inArray(profilesTable.userId, authorIds), isNotNull(profilesTable.displayName)));

    const ranked = profiles
      .filter((p) => (p.followerCount ?? 0) < RISING_FOLLOWER_CAP)
      .map((p) => ({ p, act: activity.get(p.userId)! }))
      .sort((a, b) => {
        // Newcomers first (fewest followers), then most active, then most recent.
        if ((a.p.followerCount ?? 0) !== (b.p.followerCount ?? 0)) return (a.p.followerCount ?? 0) - (b.p.followerCount ?? 0);
        if (a.act.count !== b.act.count) return b.act.count - a.act.count;
        return b.act.last.getTime() - a.act.last.getTime();
      })
      .slice(0, limit);

    const viewerId = req.isAuthenticated() ? req.user.id : null;
    let followingIds = new Set<string>();
    if (viewerId && ranked.length) {
      const ids = ranked.map((r) => r.p.userId);
      const follows = await db.select({ followingId: followsTable.followingId }).from(followsTable)
        .where(and(eq(followsTable.followerId, viewerId), inArray(followsTable.followingId, ids)));
      followingIds = new Set(follows.map((f) => f.followingId));
    }

    res.json({
      artists: ranked.map(({ p, act }) => ({
        userId: p.userId,
        handle: p.handle,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        medium: p.medium,
        bio: p.bio,
        location: p.location,
        followerCount: p.followerCount ?? 0,
        recentPosts: act.count,
        isFollowing: followingIds.has(p.userId),
      })),
    });
  } catch (err) { req.log.error({ err }, "risingArtists error"); res.status(500).json({ error: "Failed to load rising artists" }); }
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
