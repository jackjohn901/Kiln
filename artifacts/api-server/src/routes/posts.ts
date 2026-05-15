import { Router } from "express";
import { db } from "@workspace/db";
import {
  postsTable, likesTable, savesTable, commentsTable, notificationsTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";
import { broadcast } from "../lib/websocket";

const router = Router();

// POST /posts — create post
router.post("/posts", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { caption, videoUrl, thumbnailUrl, technique, medium, tags, isPatronOnly } = req.body;
  if (!caption) { res.status(400).json({ error: "caption required" }); return; }

  try {
    const id = crypto.randomUUID();
    const user = req.user;
    const [post] = await db.insert(postsTable).values({
      id,
      authorId: user.id,
      authorName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist",
      authorAvatarUrl: user.profileImageUrl ?? null,
      caption,
      videoUrl: videoUrl ?? null,
      thumbnailUrl: thumbnailUrl ?? null,
      technique: technique ?? null,
      medium: medium ?? null,
      tags: tags ?? [],
      isPatronOnly: isPatronOnly ?? false,
    }).returning();

    res.status(201).json({ ...post, tags: post.tags ?? [], isLiked: false, isSaved: false, createdAt: post.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "createPost error");
    res.status(500).json({ error: "Failed to create post" });
  }
});

// POST /posts/:postId/like — toggle like
router.post("/posts/:postId/like", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { postId } = req.params;
  const userId = req.user.id;

  try {
    const [existing] = await db.select().from(likesTable)
      .where(and(eq(likesTable.userId, userId), eq(likesTable.postId, postId)));

    if (existing) {
      await db.delete(likesTable)
        .where(and(eq(likesTable.userId, userId), eq(likesTable.postId, postId)));
      const [updated] = await db.update(postsTable)
        .set({ likeCount: sql`${postsTable.likeCount} - 1` })
        .where(eq(postsTable.id, postId))
        .returning({ likeCount: postsTable.likeCount });
      res.json({ liked: false, likeCount: updated?.likeCount ?? 0 }); return;
    }

    await db.insert(likesTable).values({ userId, postId });
    const [updated] = await db.update(postsTable)
      .set({ likeCount: sql`${postsTable.likeCount} + 1` })
      .where(eq(postsTable.id, postId))
      .returning({ likeCount: postsTable.likeCount });

    // Notify post author
    const [post] = await db.select({ authorId: postsTable.authorId }).from(postsTable).where(eq(postsTable.id, postId));
    if (post && post.authorId !== userId) {
      const user = req.user;
      await db.insert(notificationsTable).values({
        id: crypto.randomUUID(),
        userId: post.authorId,
        type: "like",
        fromId: userId,
        fromName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Someone",
        fromAvatarUrl: user.profileImageUrl ?? null,
        text: "liked your post",
        link: `/post/${postId}`,
      });
      broadcast(post.authorId, { type: "like", postId, userId, likeCount: updated?.likeCount ?? 0 });
      broadcast(post.authorId, { type: "notification", userId: post.authorId, text: "Someone liked your post", link: `/post/${postId}` });
    }

    res.json({ liked: true, likeCount: updated?.likeCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "likePost error");
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

// POST /posts/:postId/save — toggle save
router.post("/posts/:postId/save", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { postId } = req.params;
  const userId = req.user.id;

  try {
    const [existing] = await db.select().from(savesTable)
      .where(and(eq(savesTable.userId, userId), eq(savesTable.postId, postId)));

    if (existing) {
      await db.delete(savesTable)
        .where(and(eq(savesTable.userId, userId), eq(savesTable.postId, postId)));
      const [updated] = await db.update(postsTable)
        .set({ saveCount: sql`${postsTable.saveCount} - 1` })
        .where(eq(postsTable.id, postId))
        .returning({ saveCount: postsTable.saveCount });
      res.json({ saved: false, saveCount: updated?.saveCount ?? 0 }); return;
    }

    await db.insert(savesTable).values({ userId, postId });
    const [updated] = await db.update(postsTable)
      .set({ saveCount: sql`${postsTable.saveCount} + 1` })
      .where(eq(postsTable.id, postId))
      .returning({ saveCount: postsTable.saveCount });

    res.json({ saved: true, saveCount: updated?.saveCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "savePost error");
    res.status(500).json({ error: "Failed to toggle save" });
  }
});

// GET /posts/:postId/comments
router.get("/posts/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await db.select().from(commentsTable)
      .where(eq(commentsTable.postId, postId))
      .orderBy(desc(commentsTable.createdAt));
    res.json({ comments: comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })) });
  } catch (err) {
    req.log.error({ err }, "getComments error");
    res.status(500).json({ error: "Failed to load comments" });
  }
});

// POST /posts/:postId/comments
router.post("/posts/:postId/comments", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { postId } = req.params;
  const { text } = req.body;
  if (!text?.trim()) { res.status(400).json({ error: "text required" }); return; }

  try {
    const user = req.user;
    const id = crypto.randomUUID();
    const [comment] = await db.insert(commentsTable).values({
      id,
      postId,
      authorId: user.id,
      authorName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist",
      authorAvatarUrl: user.profileImageUrl ?? null,
      text: text.trim(),
    }).returning();

    await db.update(postsTable)
      .set({ commentCount: sql`${postsTable.commentCount} + 1` })
      .where(eq(postsTable.id, postId));

    // Notify post author
    const [post] = await db.select({ authorId: postsTable.authorId }).from(postsTable).where(eq(postsTable.id, postId));
    if (post && post.authorId !== user.id) {
      await db.insert(notificationsTable).values({
        id: crypto.randomUUID(),
        userId: post.authorId,
        type: "comment",
        fromId: user.id,
        fromName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Someone",
        fromAvatarUrl: user.profileImageUrl ?? null,
        text: `commented: "${text.trim().substring(0, 50)}"`,
        link: `/post/${postId}`,
      });
      broadcast(post.authorId, { type: "comment", postId, commentId: id, authorId: user.id });
      broadcast(post.authorId, { type: "notification", userId: post.authorId, text: "Someone commented on your post", link: `/post/${postId}` });
    }

    res.status(201).json({ ...comment, createdAt: comment.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "addComment error");
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// GET /me/saves — logged-in user's saved posts
router.get("/me/saves", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const rows = await db
      .select({ post: postsTable })
      .from(savesTable)
      .innerJoin(postsTable, eq(savesTable.postId, postsTable.id))
      .where(eq(savesTable.userId, req.user.id))
      .orderBy(desc(savesTable.createdAt))
      .limit(30);
    res.json({
      posts: rows.map((r) => ({
        ...r.post,
        tags: r.post.tags ?? [],
        createdAt: r.post.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "getMySaves error");
    res.status(500).json({ error: "Failed to load saves" });
  }
});

export default router;
