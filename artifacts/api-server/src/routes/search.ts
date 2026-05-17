import { Router } from "express";
import { db, profilesTable, listingsTable, guildsTable, postsTable } from "@workspace/db";
import { ilike, or } from "drizzle-orm";

const router = Router();

router.get("/search", async (req, res): Promise<void> => {
  const q = (req.query.q as string)?.trim();
  if (!q || q.length < 2) {
    res.json({ artists: [], listings: [], guilds: [], posts: [] });
    return;
  }
  const like = `%${q}%`;

  try {
    const [artists, listings, guilds, posts] = await Promise.all([
      db.select().from(profilesTable)
        .where(or(ilike(profilesTable.displayName, like), ilike(profilesTable.handle, like)))
        .limit(8),
      db.select().from(listingsTable)
        .where(ilike(listingsTable.title, like))
        .limit(8),
      db.select().from(guildsTable)
        .where(or(ilike(guildsTable.name, like), ilike(guildsTable.description, like)))
        .limit(6),
      db.select().from(postsTable)
        .where(ilike(postsTable.caption, like))
        .limit(6),
    ]);
    res.json({ artists, listings, guilds, posts });
  } catch (err) {
    req.log.error({ err }, "search error");
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
