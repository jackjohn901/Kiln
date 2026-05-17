import { Router } from "express";
import { db } from "@workspace/db";
import { storiesTable, storyViewsTable, notificationsTable } from "@workspace/db";
import { eq, desc, gt, and, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /stories/feed — stories from people I follow (+ my own)
router.get("/stories/feed", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const now = new Date();
  try {
    const stories = await db.select().from(storiesTable)
      .where(and(gt(storiesTable.expiresAt, now), eq(storiesTable.isActive, true)))
      .orderBy(desc(storiesTable.createdAt))
      .limit(100);
    // Group by author
    const byAuthor = new Map<string, typeof stories>();
    for (const s of stories) {
      if (!byAuthor.has(s.authorId)) byAuthor.set(s.authorId, []);
      byAuthor.get(s.authorId)!.push(s);
    }
    const groups = Array.from(byAuthor.entries()).map(([authorId, items]) => ({
      authorId,
      authorName: items[0].authorName,
      authorAvatarUrl: items[0].authorAvatarUrl,
      stories: items.map(s => ({ ...s, expiresAt: s.expiresAt.toISOString(), createdAt: s.createdAt.toISOString() })),
    }));
    res.json({ groups });
  } catch (err) { req.log.error({ err }, "getStoriesFeed error"); res.status(500).json({ error: "Failed" }); }
});

// GET /stories/user/:userId
router.get("/stories/user/:userId", async (req, res): Promise<void> => {
  const now = new Date();
  const stories = await db.select().from(storiesTable)
    .where(and(eq(storiesTable.authorId, req.params.userId), gt(storiesTable.expiresAt, now), eq(storiesTable.isActive, true)))
    .orderBy(desc(storiesTable.createdAt));
  res.json({ stories: stories.map(s => ({ ...s, expiresAt: s.expiresAt.toISOString(), createdAt: s.createdAt.toISOString() })) });
});

// POST /stories — create a story
router.post("/stories", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { mediaUrl, mediaType, caption, duration } = req.body;
  if (!mediaUrl) { res.status(400).json({ error: "mediaUrl required" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [story] = await db.insert(storiesTable).values({
    id: crypto.randomUUID(), authorId: user.id, authorName: name,
    authorAvatarUrl: user.profileImageUrl ?? null, mediaUrl,
    mediaType: mediaType ?? "image", caption, duration: duration ?? 5,
    expiresAt, isActive: true,
  }).returning();
  res.status(201).json({ ...story, expiresAt: story.expiresAt.toISOString(), createdAt: story.createdAt.toISOString() });
});

// POST /stories/:id/view — mark as viewed
router.post("/stories/:id/view", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.json({ ok: true }); return; }
  const viewerId = req.user.id;
  try {
    await db.insert(storyViewsTable).values({ storyId: req.params.id, viewerId }).onConflictDoNothing();
    await db.update(storiesTable).set({ viewCount: sql`${storiesTable.viewCount} + 1` }).where(eq(storiesTable.id, req.params.id));
  } catch { /* ignore duplicate */ }
  res.json({ ok: true });
});

// DELETE /stories/:id
router.delete("/stories/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [story] = await db.select().from(storiesTable).where(eq(storiesTable.id, req.params.id));
  if (!story || story.authorId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.update(storiesTable).set({ isActive: false }).where(eq(storiesTable.id, req.params.id));
  res.json({ ok: true });
});

export default router;
