import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, profilesTable } from "@workspace/db/schema";
import { and, desc, eq, isNotNull, isNull, lte, or, sql } from "drizzle-orm";

const router = Router();

// GET /gallery — paginated image grid for Pinterest-style discovery
// Query params: limit (default 40), offset (default 0), tag (filter by tag)
router.get("/gallery", async (req, res): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 40, 80);
    const offset = Number(req.query.offset) || 0;
    const tag = typeof req.query.tag === "string" ? req.query.tag.trim() : null;

    const rows = await db
      .select({
        postId: postsTable.id,
        thumbnailUrl: postsTable.thumbnailUrl,
        videoUrl: postsTable.videoUrl,
        caption: postsTable.caption,
        tags: postsTable.tags,
        likeCount: postsTable.likeCount,
        viewCount: postsTable.viewCount,
        createdAt: postsTable.createdAt,
        artistId: profilesTable.userId,
        handle: profilesTable.handle,
        displayName: profilesTable.displayName,
        avatarUrl: profilesTable.avatarUrl,
        location: profilesTable.location,
      })
      .from(postsTable)
      .innerJoin(profilesTable, eq(postsTable.authorId, profilesTable.userId))
      .where(
        and(
          isNotNull(postsTable.thumbnailUrl),
          eq(postsTable.isDraft, false),
          or(isNull(postsTable.scheduledAt), lte(postsTable.scheduledAt, sql`NOW()`)),
          tag
            ? sql`${postsTable.tags} @> ARRAY[${tag}]::text[]`
            : undefined,
        ),
      )
      .orderBy(desc(postsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      items: rows.map((r) => ({
        postId: r.postId,
        thumbnailUrl: r.thumbnailUrl,
        videoUrl: r.videoUrl,
        caption: r.caption ?? "",
        tags: r.tags ?? [],
        likeCount: r.likeCount,
        viewCount: r.viewCount,
        createdAt: r.createdAt.toISOString(),
        artist: {
          id: r.artistId,
          handle: r.handle,
          displayName: r.displayName,
          avatarUrl: r.avatarUrl,
          location: r.location,
        },
      })),
      total: rows.length,
      offset,
      limit,
    });
  } catch (err) {
    req.log.error({ err }, "gallery fetch failed");
    res.status(500).json({ error: "Failed to load gallery" });
  }
});

// GET /gallery/tags — most-used tags across image posts for filter chips
router.get("/gallery/tags", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select({ tags: postsTable.tags, likeCount: postsTable.likeCount })
      .from(postsTable)
      .where(
        and(
          isNotNull(postsTable.thumbnailUrl),
          eq(postsTable.isDraft, false),
          or(isNull(postsTable.scheduledAt), lte(postsTable.scheduledAt, sql`NOW()`)),
        ),
      )
      .limit(500);

    const counts: Record<string, number> = {};
    for (const row of rows) {
      for (const tag of row.tags ?? []) {
        counts[tag] = (counts[tag] ?? 0) + 1;
      }
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([tag, count]) => ({ tag, count }));

    res.json({ tags: sorted });
  } catch (err) {
    res.status(500).json({ error: "Failed to load tags" });
  }
});

export default router;
