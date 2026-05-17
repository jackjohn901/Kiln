import { Router } from "express";
import { db } from "@workspace/db";
import { collabPostsTable, collabPostInterestsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /collab-board
router.get("/collab-board", async (req, res): Promise<void> => {
  try {
    const posts = await db.select().from(collabPostsTable)
      .orderBy(desc(collabPostsTable.createdAt)).limit(50);
    const userId = req.isAuthenticated() ? req.user.id : null;
    let interestedIds = new Set<string>();
    if (userId) {
      const interests = await db.select({ postId: collabPostInterestsTable.postId })
        .from(collabPostInterestsTable).where(eq(collabPostInterestsTable.userId, userId));
      interestedIds = new Set(interests.map(i => i.postId));
    }
    res.json({ posts: posts.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), interested: interestedIds.has(p.id) })) });
  } catch (err) {
    req.log.error({ err }, "getCollabBoard error");
    res.status(500).json({ error: "Failed" });
  }
});

// POST /collab-board
router.post("/collab-board", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, description, seeking, offering, location, remote, tags } = req.body;
  if (!title || !description) { res.status(400).json({ error: "title and description required" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  const [post] = await db.insert(collabPostsTable).values({
    id: crypto.randomUUID(), authorId: user.id, authorName: name,
    authorAvatarUrl: user.profileImageUrl ?? null,
    title, description,
    seeking: seeking ?? [], offering: offering ?? "",
    location: location ?? "", remote: remote ?? false,
    tags: tags ?? [],
  }).returning();
  res.status(201).json({ ...post, createdAt: post.createdAt.toISOString(), interested: false });
});

// POST /collab-board/:id/interest
router.post("/collab-board/:id/interest", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { id } = req.params;
  const userId = req.user.id;
  const name = [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") || req.user.email || "Artist";
  const existing = await db.select().from(collabPostInterestsTable)
    .where(and(eq(collabPostInterestsTable.postId, id), eq(collabPostInterestsTable.userId, userId)));
  if (existing.length) {
    await db.delete(collabPostInterestsTable)
      .where(and(eq(collabPostInterestsTable.postId, id), eq(collabPostInterestsTable.userId, userId)));
    await db.update(collabPostsTable).set({ responses: Math.max(0, (await db.select().from(collabPostsTable).where(eq(collabPostsTable.id, id)))[0]?.responses ?? 1) - 1 }).where(eq(collabPostsTable.id, id));
    res.json({ interested: false });
  } else {
    await db.insert(collabPostInterestsTable).values({ id: crypto.randomUUID(), postId: id, userId, userName: name });
    const [post] = await db.select().from(collabPostsTable).where(eq(collabPostsTable.id, id));
    if (post) await db.update(collabPostsTable).set({ responses: post.responses + 1 }).where(eq(collabPostsTable.id, id));
    res.json({ interested: true });
  }
});

// DELETE /collab-board/:id
router.delete("/collab-board/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.delete(collabPostsTable)
    .where(and(eq(collabPostsTable.id, req.params.id), eq(collabPostsTable.authorId, req.user.id)));
  res.json({ ok: true });
});

export default router;
