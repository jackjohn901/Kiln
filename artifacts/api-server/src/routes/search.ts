import { Router } from "express";
import { db, profilesTable, listingsTable, guildsTable, postsTable } from "@workspace/db";
import { ilike, or, and, isNull, lte, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/search", async (req, res): Promise<void> => {
  const q = (req.query.q as string)?.trim();
  if (!q || q.length < 2) {
    res.json({ artists: [], listings: [], guilds: [], posts: [] });
    return;
  }
  const like = `%${q}%`;

  const artistVec = sql`to_tsvector('english', coalesce(${profilesTable.displayName},'') || ' ' || coalesce(${profilesTable.handle},'') || ' ' || coalesce(${profilesTable.bio},''))`;
  const listingVec = sql`to_tsvector('english', coalesce(${listingsTable.title},'') || ' ' || coalesce(${listingsTable.description},''))`;
  const guildVec = sql`to_tsvector('english', coalesce(${guildsTable.name},'') || ' ' || coalesce(${guildsTable.description},''))`;
  const postVec = sql`to_tsvector('english', coalesce(${postsTable.caption},''))`;
  const tsq = sql`websearch_to_tsquery('english', ${q})`;

  try {
    const [artists, listings, guilds, posts] = await Promise.all([
      db.select().from(profilesTable)
        .where(or(sql`${artistVec} @@ ${tsq}`, ilike(profilesTable.displayName, like), ilike(profilesTable.handle, like)))
        .orderBy(sql`ts_rank(${artistVec}, ${tsq}) desc`)
        .limit(8),
      db.select().from(listingsTable)
        .where(or(sql`${listingVec} @@ ${tsq}`, ilike(listingsTable.title, like)))
        .orderBy(sql`ts_rank(${listingVec}, ${tsq}) desc`)
        .limit(8),
      db.select().from(guildsTable)
        .where(or(sql`${guildVec} @@ ${tsq}`, ilike(guildsTable.name, like), ilike(guildsTable.description, like)))
        .limit(6),
      db.select().from(postsTable)
        .where(and(
          or(sql`${postVec} @@ ${tsq}`, ilike(postsTable.caption, like)),
          sql`${postsTable.isDraft} = false`,
          or(isNull(postsTable.scheduledAt), lte(postsTable.scheduledAt, sql`NOW()`)),
        ))
        .orderBy(sql`ts_rank(${postVec}, ${tsq}) desc`)
        .limit(6),
    ]);
    res.json({ artists, listings, guilds, posts });
  } catch (err) {
    req.log.error({ err }, "search error");
    res.status(500).json({ error: "Search failed" });
  }
});

// GET /users/search — featured/random profiles for community discovery
router.get("/users/search", async (req, res): Promise<void> => {
  const { q, limit = "8" } = req.query as Record<string, string>;
  try {
    let profiles;
    if (q && q.trim().length >= 1) {
      const like = `%${q.trim()}%`;
      profiles = await db.select().from(profilesTable)
        .where(or(ilike(profilesTable.displayName, like), ilike(profilesTable.handle, like)))
        .orderBy(desc(profilesTable.followerCount))
        .limit(Number(limit));
    } else {
      profiles = await db.select().from(profilesTable)
        .orderBy(sql`RANDOM()`)
        .limit(Number(limit));
    }
    res.json({ profiles });
  } catch (err) {
    req.log.error({ err }, "users/search error");
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
