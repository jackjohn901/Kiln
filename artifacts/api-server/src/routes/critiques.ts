import { Router } from "express";
import { db } from "@workspace/db";
import { critiquesTable, postsTable } from "@workspace/db";
import { eq, desc, ilike, or, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /critique-posts — posts tagged [critique welcome]
router.get("/critique-posts", async (req, res): Promise<void> => {
  try {
    const posts = await db.select().from(postsTable)
      .where(or(ilike(postsTable.caption, "%[critique welcome]%"), ilike(postsTable.caption, "%critique welcome%")))
      .orderBy(desc(postsTable.createdAt))
      .limit(20);
    const postIds = posts.map(p => p.id);
    let critiquesByPost: Record<string, typeof critiquesTable.$inferSelect[]> = {};
    if (postIds.length > 0) {
      const allCritiques = await db.select().from(critiquesTable)
        .where(sql`${critiquesTable.postId} = ANY(${postIds})`)
        .orderBy(desc(critiquesTable.createdAt));
      for (const c of allCritiques) {
        if (!critiquesByPost[c.postId]) critiquesByPost[c.postId] = [];
        critiquesByPost[c.postId].push(c);
      }
    }
    res.json({
      posts: posts.map(p => ({
        id: p.id,
        artistId: p.authorId,
        artistName: p.authorName,
        avatarUrl: p.authorAvatarUrl,
        imageUrl: p.thumbnailUrl ?? p.videoUrl,
        caption: p.caption,
        medium: p.medium ?? p.technique ?? "Craft",
        postedAt: p.createdAt.toISOString(),
        tags: p.tags ?? [],
        critiques: (critiquesByPost[p.id] ?? []).map(c => ({
          ...c,
          postedAt: c.createdAt.toISOString(),
          createdAt: c.createdAt.toISOString(),
        })),
        critiqueCount: (critiquesByPost[p.id] ?? []).length,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "critique-posts error");
    res.status(500).json({ error: "Failed to load critique posts" });
  }
});

// GET /critique-posts/:postId/critiques — get critiques for a specific post
router.get("/critique-posts/:postId/critiques", async (req, res): Promise<void> => {
  const rows = await db.select().from(critiquesTable)
    .where(eq(critiquesTable.postId, req.params.postId))
    .orderBy(desc(critiquesTable.createdAt));
  res.json({ critiques: rows.map(c => ({ ...c, postedAt: c.createdAt.toISOString(), createdAt: c.createdAt.toISOString() })) });
});

// POST /critique-posts/:postId/critiques — submit a critique
router.post("/critique-posts/:postId/critiques", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { technique, concept, finish, originality, text, postArtistId } = req.body as {
    technique: number; concept: number; finish: number; originality: number; text: string; postArtistId: string;
  };
  if (!text?.trim()) { res.status(400).json({ error: "text required" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  const [row] = await db.insert(critiquesTable).values({
    id: crypto.randomUUID(),
    postId: req.params.postId,
    postArtistId: postArtistId ?? "",
    fromId: user.id,
    fromName: name,
    fromAvatarUrl: user.profileImageUrl ?? null,
    technique: Math.min(5, Math.max(1, Number(technique ?? 3))),
    concept: Math.min(5, Math.max(1, Number(concept ?? 3))),
    finish: Math.min(5, Math.max(1, Number(finish ?? 3))),
    originality: Math.min(5, Math.max(1, Number(originality ?? 3))),
    text: text.trim(),
    helpful: 0,
  }).returning();
  res.status(201).json({ ...row, postedAt: row.createdAt.toISOString(), createdAt: row.createdAt.toISOString() });
});

// POST /critique-posts/:postId/critiques/:critiqueId/helpful — mark helpful
router.post("/critique-posts/:postId/critiques/:critiqueId/helpful", async (req, res): Promise<void> => {
  await db.update(critiquesTable).set({ helpful: sql`${critiquesTable.helpful} + 1` }).where(eq(critiquesTable.id, req.params.critiqueId));
  res.json({ success: true });
});

export default router;
