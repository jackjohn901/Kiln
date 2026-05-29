import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable } from "@workspace/db";
import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { redactPatronMedia } from "../lib/publicFields";

const router = Router();

// GET /trending-posts — posts sorted by recent engagement, with tag aggregates
router.get("/trending-posts", async (req, res): Promise<void> => {
  try {
    const parsedLimit = parseInt(String(req.query.limit ?? "50"), 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 50;
    const tag = typeof req.query.tag === "string" && req.query.tag ? req.query.tag : null;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const published = and(
      eq(postsTable.isDraft, false),
      or(isNull(postsTable.scheduledAt), lte(postsTable.scheduledAt, sql`NOW()`)),
    );
    // When a tag is requested (tag feed), return all-time posts with that tag.
    // Otherwise return the recent (30d) engagement-ranked window.
    const postsWhere = tag
      ? and(published, sql`${postsTable.tags} @> ARRAY[${tag}]::text[]`)
      : and(published, gte(postsTable.createdAt, since));
    const posts = await db.select().from(postsTable)
      .where(postsWhere)
      .orderBy(desc(postsTable.likeCount), desc(postsTable.commentCount))
      .limit(limit);

    // DB-side tag aggregation + weekly growth — accurate for the whole 30-day
    // window regardless of post volume (no row cap).
    const aggSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const windowWhere = and(published, gte(postsTable.createdAt, aggSince));

    const statsResult = await db.execute(sql`
      SELECT t.tag AS tag,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE ${postsTable.createdAt} >= ${weekAgo})::int AS this_week,
        COUNT(*) FILTER (WHERE ${postsTable.createdAt} >= ${twoWeeksAgo} AND ${postsTable.createdAt} < ${weekAgo})::int AS last_week
      FROM ${postsTable}, unnest(${postsTable.tags}) AS t(tag)
      WHERE ${windowWhere}
      GROUP BY t.tag
      ORDER BY count DESC
      LIMIT 40
    `);
    const statsRows = statsResult.rows as { tag: string; count: number; this_week: number; last_week: number }[];

    // Representative image per tag: highest-liked non-patron post with a thumbnail.
    const imageResult = await db.execute(sql`
      SELECT DISTINCT ON (t.tag) t.tag AS tag, ${postsTable.thumbnailUrl} AS image
      FROM ${postsTable}, unnest(${postsTable.tags}) AS t(tag)
      WHERE ${windowWhere}
        AND ${eq(postsTable.isPatronOnly, false)}
        AND ${postsTable.thumbnailUrl} IS NOT NULL
      ORDER BY t.tag, ${postsTable.likeCount} DESC
    `);
    const imageRows = imageResult.rows as { tag: string; image: string | null }[];
    const imageByTag = new Map(imageRows.map(r => [r.tag, r.image]));

    const trendingTags = statsRows.map(r => {
      const weeklyGrowth = r.last_week > 0
        ? Math.round(((r.this_week - r.last_week) / r.last_week) * 100)
        : r.this_week > 0 ? 100 : 0;
      return { tag: r.tag, count: r.count, weeklyGrowth, imageUrl: imageByTag.get(r.tag) ?? null };
    });
    res.json({
      posts: posts.map(p => redactPatronMedia({ ...p, tags: p.tags ?? [], createdAt: p.createdAt.toISOString() })),
      trendingTags,
    });
  } catch (err) {
    req.log.error({ err }, "getTrendingPosts error");
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
