import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, followsTable, likesTable, feedViewerSnapshotsTable, profilesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { getFeedViewerCount } from "../lib/websocket";

const router = Router();

// GET /analytics/me — real post performance data for the logged-in user
router.get("/analytics/me", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const userId = req.user.id;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    const [allPosts, followerRows, likeBuckets, locationRows] = await Promise.all([
      db.select().from(postsTable)
        .where(and(eq(postsTable.authorId, userId), eq(postsTable.isDraft, false)))
        .orderBy(desc(postsTable.createdAt))
        .limit(100),
      db.select({ count: sql<number>`count(*)::int` })
        .from(followsTable)
        .where(eq(followsTable.followingId, userId)),
      // When the artist's audience actually engages: likes bucketed by UTC
      // day-of-week and hour. The client rotates this into the viewer's
      // local timezone for the "Best Time to Post" heatmap.
      db.execute(sql`
        SELECT EXTRACT(DOW FROM (${likesTable.createdAt} AT TIME ZONE 'UTC'))::int AS dow,
               EXTRACT(HOUR FROM (${likesTable.createdAt} AT TIME ZONE 'UTC'))::int AS hour,
               COUNT(*)::int AS cnt
        FROM ${likesTable}
        INNER JOIN ${postsTable} ON ${postsTable.id} = ${likesTable.postId}
        WHERE ${eq(postsTable.authorId, userId)} AND ${eq(postsTable.isDraft, false)}
        GROUP BY dow, hour
      `),
      // Real "Top Locations": aggregate this artist's followers by the location
      // set on their profile. Followers with no location are excluded from the
      // breakdown (counted separately so the client can show coverage).
      db.execute(sql`
        SELECT ${profilesTable.location} AS location, COUNT(*)::int AS cnt
        FROM ${followsTable}
        INNER JOIN ${profilesTable} ON ${profilesTable.userId} = ${followsTable.followerId}
        WHERE ${eq(followsTable.followingId, userId)}
          AND ${profilesTable.location} IS NOT NULL
          AND TRIM(${profilesTable.location}) <> ''
        GROUP BY ${profilesTable.location}
        ORDER BY cnt DESC
        LIMIT 8
      `),
    ]);

    const followerCount = followerRows[0]?.count ?? 0;

    // Build the "Top Locations" breakdown with real counts and percentages.
    // Percentages are computed against followers who have a location set
    // (locatedFollowerCount), not the full follower count, so the shown shares
    // reflect the known sample rather than being diluted by unknowns.
    const locationCounts = (locationRows.rows as { location: string; cnt: number }[])
      .filter((r) => r.location && r.cnt > 0);
    const locatedFollowerCount = locationCounts.reduce((s, r) => s + r.cnt, 0);
    const topLocations = locationCounts.map((r) => ({
      location: r.location,
      count: r.cnt,
      pct: locatedFollowerCount > 0 ? Math.round((r.cnt / locatedFollowerCount) * 100) : 0,
    }));
    const totalPosts = allPosts.length;
    const totalLikes = allPosts.reduce((s, p) => s + (p.likeCount ?? 0), 0);
    const totalComments = allPosts.reduce((s, p) => s + (p.commentCount ?? 0), 0);
    const totalSaves = allPosts.reduce((s, p) => s + (p.saveCount ?? 0), 0);
    const totalViews = allPosts.reduce((s, p) => s + (p.viewCount ?? 0), 0);

    // Posts per day for last 30 days (for chart)
    const recentPosts = allPosts.filter((p) => new Date(p.createdAt) >= thirtyDaysAgo);
    const postsByDay: Record<string, number> = {};
    const likesByDay: Record<string, number> = {};
    const viewsByDay: Record<string, number> = {};
    for (const p of recentPosts) {
      const day = new Date(p.createdAt).toISOString().slice(0, 10);
      postsByDay[day] = (postsByDay[day] ?? 0) + 1;
      likesByDay[day] = (likesByDay[day] ?? 0) + (p.likeCount ?? 0);
      viewsByDay[day] = (viewsByDay[day] ?? 0) + (p.viewCount ?? 0);
    }

    // Engagement-by-hour grid for the "Best Time to Post" heatmap: 7 days
    // (0=Sun..6=Sat) x 24 hours, in UTC. Combines two real signals:
    //   - when the artist actually posted (posting history)
    //   - when their audience engaged (like timestamps)
    // The client rotates this into the viewer's local timezone before display.
    const engagementByHour: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
    let engagementSamples = 0;
    for (const p of allPosts) {
      const d = new Date(p.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      engagementByHour[d.getUTCDay()][d.getUTCHours()] += 1;
      engagementSamples++;
    }
    const likeRows = likeBuckets.rows as { dow: number; hour: number; cnt: number }[];
    for (const r of likeRows) {
      if (r.dow == null || r.hour == null) continue;
      engagementByHour[r.dow][r.hour] += r.cnt;
      engagementSamples += r.cnt;
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
      totalViews,
      followerCount,
      topLocations,
      locatedFollowerCount,
      topPosts,
      postsByDay,
      likesByDay,
      viewsByDay,
      engagementByHour,
      engagementSamples,
    });
  } catch (err) {
    req.log.error({ err }, "analytics/me error");
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

// GET /analytics/me/feed-viewers — current live follower count watching this artist's feed
router.get("/analytics/me/feed-viewers", (req, res): void => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const count = getFeedViewerCount(req.user.id);
  res.json({ count });
});

// GET /analytics/me/audience-activity — rolling 7-day history of when this
// artist's followers are watching their feed, bucketed by hour-of-day. Built
// from the periodic feed-viewer snapshots. Returns UTC hour buckets; the client
// rotates them into the viewer's local timezone (like the posting heatmap).
router.get("/analytics/me/audience-activity", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;

  try {
    const result = await db.execute(sql`
      SELECT EXTRACT(HOUR FROM (${feedViewerSnapshotsTable.capturedAt} AT TIME ZONE 'UTC'))::int AS hour,
             AVG(${feedViewerSnapshotsTable.count})::float AS avg_count,
             MAX(${feedViewerSnapshotsTable.count})::int AS max_count,
             COUNT(*)::int AS samples
      FROM ${feedViewerSnapshotsTable}
      WHERE ${eq(feedViewerSnapshotsTable.artistId, userId)}
        AND ${feedViewerSnapshotsTable.capturedAt} >= now() - interval '7 days'
      GROUP BY hour
    `);

    const avgByHourUtc = new Array(24).fill(0);
    const maxByHourUtc = new Array(24).fill(0);
    let totalSamples = 0;
    for (const r of result.rows as { hour: number; avg_count: number; max_count: number; samples: number }[]) {
      if (r.hour == null) continue;
      avgByHourUtc[r.hour] = Math.round((r.avg_count ?? 0) * 10) / 10;
      maxByHourUtc[r.hour] = r.max_count ?? 0;
      totalSamples += r.samples ?? 0;
    }

    res.json({ avgByHourUtc, maxByHourUtc, totalSamples });
  } catch (err) {
    req.log.error({ err }, "analytics/me/audience-activity error");
    res.status(500).json({ error: "Failed to load audience activity" });
  }
});

export default router;
