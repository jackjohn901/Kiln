import { Router } from "express";
import { db } from "@workspace/db";
import { linkInBioTable, profilesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

// GET /link-in-bio/me
router.get("/link-in-bio/me", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [page] = await db.select().from(linkInBioTable).where(eq(linkInBioTable.userId, req.user.id));
  res.json({ page: page ? { ...page, updatedAt: page.updatedAt.toISOString(), createdAt: page.createdAt.toISOString() } : null });
});

// GET /link-in-bio/:slug — public view by slug or userId
router.get("/link-in-bio/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  let page = null;
  [page] = await db.select().from(linkInBioTable).where(eq(linkInBioTable.customSlug, slug));
  if (!page) [page] = await db.select().from(linkInBioTable).where(eq(linkInBioTable.userId, slug));
  if (!page || !page.isPublished) { res.status(404).json({ error: "Not found" }); return; }
  // Increment view count
  await db.update(linkInBioTable).set({ viewCount: sql`(${linkInBioTable.viewCount})::int + 1` }).where(eq(linkInBioTable.userId, page.userId));
  res.json({ page: { ...page, updatedAt: page.updatedAt.toISOString(), createdAt: page.createdAt.toISOString() } });
});

// PUT /link-in-bio — upsert
router.put("/link-in-bio", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { pageTitle, bio, avatarUrl, theme, blocks, isPublished, customSlug } = req.body;
  const userId = req.user.id;
  const [page] = await db.insert(linkInBioTable).values({
    userId, pageTitle, bio, avatarUrl, theme: theme ?? "dark",
    blocks: JSON.stringify(blocks ?? []), isPublished: isPublished ?? false,
    customSlug: customSlug ?? null,
  }).onConflictDoUpdate({
    target: linkInBioTable.userId,
    set: {
      pageTitle, bio, avatarUrl, theme: theme ?? "dark",
      blocks: JSON.stringify(blocks ?? []), isPublished: isPublished ?? false,
      customSlug: customSlug ?? null,
    },
  }).returning();
  // Update profile slug
  if (customSlug) {
    await db.update(profilesTable).set({ linkInBioSlug: customSlug }).where(eq(profilesTable.userId, userId));
  }
  res.json({ page: { ...page, updatedAt: page.updatedAt.toISOString(), createdAt: page.createdAt.toISOString() } });
});

export default router;
