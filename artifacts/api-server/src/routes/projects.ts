import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, projectPostsTable, postsTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/projects/mine", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const projects = await db.select().from(projectsTable)
    .where(eq(projectsTable.artistId, req.user.id))
    .orderBy(desc(projectsTable.createdAt));
  res.json({ projects });
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, req.params.id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  const chapters = await db.select().from(projectPostsTable)
    .where(eq(projectPostsTable.projectId, req.params.id))
    .orderBy(projectPostsTable.chapterNum);
  const postIds = chapters.map((c) => c.postId);
  const posts = postIds.length
    ? await db.select().from(postsTable).where(inArray(postsTable.id, postIds))
    : [];
  const postMap = new Map(posts.map((p) => [p.id, p]));
  res.json({
    project,
    chapters: chapters.map((c) => ({ ...c, post: postMap.get(c.postId) ?? null })),
  });
});

router.post("/projects", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, description, medium, coverImageUrl, startedAt } = req.body as {
    title: string; description?: string; medium?: string; coverImageUrl?: string; startedAt?: string;
  };
  if (!title?.trim()) { res.status(400).json({ error: "Title required" }); return; }
  const project = {
    id: randomUUID(),
    artistId: req.user.id,
    title: title.trim(),
    description: description ?? null,
    medium: medium ?? null,
    coverImageUrl: coverImageUrl ?? null,
    status: "active",
    linkedListingId: null,
    postCount: 0,
    startedAt: startedAt ? new Date(startedAt) : new Date(),
    completedAt: null,
    createdAt: new Date(),
  };
  await db.insert(projectsTable).values(project);
  res.status(201).json({ project });
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [existing] = await db.select({ artistId: projectsTable.artistId })
    .from(projectsTable).where(eq(projectsTable.id, req.params.id));
  if (!existing || existing.artistId !== req.user.id) { res.status(404).json({ error: "Not found" }); return; }
  const { title, description, medium, coverImageUrl, status, linkedListingId, completedAt } =
    req.body as Record<string, string | undefined>;
  await db.update(projectsTable).set({
    ...(title && { title }),
    ...(description !== undefined && { description }),
    ...(medium !== undefined && { medium }),
    ...(coverImageUrl !== undefined && { coverImageUrl }),
    ...(status && { status }),
    ...(linkedListingId !== undefined && { linkedListingId }),
    ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt) : null }),
  }).where(eq(projectsTable.id, req.params.id));
  res.json({ ok: true });
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [existing] = await db.select({ artistId: projectsTable.artistId })
    .from(projectsTable).where(eq(projectsTable.id, req.params.id));
  if (!existing || existing.artistId !== req.user.id) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(projectPostsTable).where(eq(projectPostsTable.projectId, req.params.id));
  await db.delete(projectsTable).where(eq(projectsTable.id, req.params.id));
  res.json({ ok: true });
});

router.post("/projects/:id/posts", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [project] = await db.select({ artistId: projectsTable.artistId, postCount: projectsTable.postCount })
    .from(projectsTable).where(eq(projectsTable.id, req.params.id));
  if (!project || project.artistId !== req.user.id) { res.status(404).json({ error: "Not found" }); return; }
  const { postId, stage } = req.body as { postId: string; stage?: string };
  if (!postId) { res.status(400).json({ error: "postId required" }); return; }
  const newCount = project.postCount + 1;
  await db.insert(projectPostsTable).values({
    id: randomUUID(),
    projectId: req.params.id,
    postId,
    chapterNum: newCount,
    stage: stage ?? null,
    addedAt: new Date(),
  });
  await db.update(projectsTable).set({ postCount: newCount }).where(eq(projectsTable.id, req.params.id));
  res.status(201).json({ ok: true, chapterNum: newCount });
});

router.delete("/projects/:id/posts/:postId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [project] = await db.select({ artistId: projectsTable.artistId, postCount: projectsTable.postCount })
    .from(projectsTable).where(eq(projectsTable.id, req.params.id));
  if (!project || project.artistId !== req.user.id) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(projectPostsTable).where(
    and(eq(projectPostsTable.projectId, req.params.id), eq(projectPostsTable.postId, req.params.postId))
  );
  await db.update(projectsTable)
    .set({ postCount: Math.max(0, project.postCount - 1) })
    .where(eq(projectsTable.id, req.params.id));
  res.json({ ok: true });
});

export default router;
