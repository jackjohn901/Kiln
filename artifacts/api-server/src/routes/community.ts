import { Router } from "express";
import { db } from "@workspace/db";
import { communityPostsTable, communityLikesTable, profilesTable } from "@workspace/db/schema";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

// Shared: enrich posts with author profile + viewer like status
async function enrichPosts(
  posts: (typeof communityPostsTable.$inferSelect)[],
  viewerUserId: string | null,
) {
  if (posts.length === 0) return [];

  const authorIds = [...new Set(posts.map((p) => p.authorId))];
  const profiles = await db
    .select({
      userId: profilesTable.userId,
      displayName: profilesTable.displayName,
      handle: profilesTable.handle,
      avatarUrl: profilesTable.avatarUrl,
    })
    .from(profilesTable)
    .where(inArray(profilesTable.userId, authorIds));

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  let likedSet = new Set<string>();
  if (viewerUserId) {
    const postIds = posts.map((p) => p.id);
    const likes = await db
      .select({ postId: communityLikesTable.postId })
      .from(communityLikesTable)
      .where(
        and(
          eq(communityLikesTable.userId, viewerUserId),
          inArray(communityLikesTable.postId, postIds),
        ),
      );
    likedSet = new Set(likes.map((l) => l.postId));
  }

  return posts.map((p) => {
    const prof = profileMap.get(p.authorId);
    return {
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      guildId: p.guildId,
      parentId: p.parentId,
      repostOfId: p.repostOfId,
      likeCount: p.likeCount,
      replyCount: p.replyCount,
      repostCount: p.repostCount,
      isPinned: p.isPinned,
      createdAt: p.createdAt.toISOString(),
      liked: likedSet.has(p.id),
      author: {
        id: p.authorId,
        displayName: prof?.displayName ?? null,
        handle: prof?.handle ?? null,
        avatarUrl: prof?.avatarUrl ?? null,
      },
    };
  });
}

// GET /community — public community feed (top-level posts only, newest first)
router.get("/community", async (req, res): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 60);
    const offset = Number(req.query.offset) || 0;
    const viewerId = req.isAuthenticated() ? req.user.id : null;

    const posts = await db
      .select()
      .from(communityPostsTable)
      .where(
        and(
          isNull(communityPostsTable.guildId),
          isNull(communityPostsTable.parentId),
          eq(communityPostsTable.isDeleted, false),
        ),
      )
      .orderBy(desc(communityPostsTable.isPinned), desc(communityPostsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const enriched = await enrichPosts(posts, viewerId);
    res.json({ posts: enriched, hasMore: posts.length === limit });
  } catch (err) {
    req.log.error({ err }, "community feed failed");
    res.status(500).json({ error: "Failed to load community feed" });
  }
});

// GET /community/guilds/:guildId — guild discussion threads (top-level only)
router.get("/community/guilds/:guildId", async (req, res): Promise<void> => {
  try {
    const { guildId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 30, 60);
    const offset = Number(req.query.offset) || 0;
    const viewerId = req.isAuthenticated() ? req.user.id : null;

    const posts = await db
      .select()
      .from(communityPostsTable)
      .where(
        and(
          eq(communityPostsTable.guildId, guildId),
          isNull(communityPostsTable.parentId),
          eq(communityPostsTable.isDeleted, false),
        ),
      )
      .orderBy(desc(communityPostsTable.isPinned), desc(communityPostsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const enriched = await enrichPosts(posts, viewerId);
    res.json({ posts: enriched, hasMore: posts.length === limit });
  } catch (err) {
    req.log.error({ err }, "guild community fetch failed");
    res.status(500).json({ error: "Failed to load guild discussions" });
  }
});

// GET /community/:postId — single post + its replies
router.get("/community/:postId", async (req, res): Promise<void> => {
  try {
    const { postId } = req.params;
    const viewerId = req.isAuthenticated() ? req.user.id : null;

    const [post] = await db
      .select()
      .from(communityPostsTable)
      .where(and(eq(communityPostsTable.id, postId), eq(communityPostsTable.isDeleted, false)))
      .limit(1);

    if (!post) { res.status(404).json({ error: "Post not found" }); return; }

    const replies = await db
      .select()
      .from(communityPostsTable)
      .where(
        and(eq(communityPostsTable.parentId, postId), eq(communityPostsTable.isDeleted, false)),
      )
      .orderBy(desc(communityPostsTable.createdAt))
      .limit(50);

    const [enrichedPost, enrichedReplies] = await Promise.all([
      enrichPosts([post], viewerId),
      enrichPosts(replies, viewerId),
    ]);

    res.json({ post: enrichedPost[0], replies: enrichedReplies });
  } catch (err) {
    req.log.error({ err }, "community post fetch failed");
    res.status(500).json({ error: "Failed to load post" });
  }
});

// POST /community — create a post or guild thread
router.post("/community", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  try {
    const { content, imageUrl, guildId } = req.body as {
      content?: string;
      imageUrl?: string;
      guildId?: string;
    };
    if (!content?.trim()) { res.status(400).json({ error: "Content is required" }); return; }
    if (content.length > 1000) { res.status(400).json({ error: "Max 1000 characters" }); return; }

    const id = randomUUID();
    await db.insert(communityPostsTable).values({
      id,
      authorId: req.user.id,
      content: content.trim(),
      imageUrl: imageUrl ?? null,
      guildId: guildId ?? null,
      parentId: null,
    });

    const [created] = await db.select().from(communityPostsTable).where(eq(communityPostsTable.id, id));
    const [enriched] = await enrichPosts([created], req.user.id);
    res.status(201).json({ post: enriched });
  } catch (err) {
    req.log.error({ err }, "community post create failed");
    res.status(500).json({ error: "Failed to create post" });
  }
});

// POST /community/:postId/reply
router.post("/community/:postId/reply", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  try {
    const { postId } = req.params;
    const { content } = req.body as { content?: string };
    if (!content?.trim()) { res.status(400).json({ error: "Content is required" }); return; }
    if (content.length > 500) { res.status(400).json({ error: "Max 500 characters" }); return; }

    const [parent] = await db
      .select({ id: communityPostsTable.id, isDeleted: communityPostsTable.isDeleted })
      .from(communityPostsTable)
      .where(eq(communityPostsTable.id, postId))
      .limit(1);
    if (!parent || parent.isDeleted) { res.status(404).json({ error: "Post not found" }); return; }

    const replyId = randomUUID();
    await db.insert(communityPostsTable).values({
      id: replyId,
      authorId: req.user.id,
      content: content.trim(),
      parentId: postId,
      guildId: null,
    });
    await db
      .update(communityPostsTable)
      .set({ replyCount: sql`${communityPostsTable.replyCount} + 1` })
      .where(eq(communityPostsTable.id, postId));

    const [created] = await db.select().from(communityPostsTable).where(eq(communityPostsTable.id, replyId));
    const [enriched] = await enrichPosts([created], req.user.id);
    res.status(201).json({ reply: enriched });
  } catch (err) {
    req.log.error({ err }, "community reply failed");
    res.status(500).json({ error: "Failed to post reply" });
  }
});

// POST /community/:postId/like — toggle like
router.post("/community/:postId/like", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const [existing] = await db
      .select()
      .from(communityLikesTable)
      .where(and(eq(communityLikesTable.postId, postId), eq(communityLikesTable.userId, userId)))
      .limit(1);

    if (existing) {
      await db
        .delete(communityLikesTable)
        .where(and(eq(communityLikesTable.postId, postId), eq(communityLikesTable.userId, userId)));
      await db
        .update(communityPostsTable)
        .set({ likeCount: sql`GREATEST(${communityPostsTable.likeCount} - 1, 0)` })
        .where(eq(communityPostsTable.id, postId));
      res.json({ liked: false });
    } else {
      await db.insert(communityLikesTable).values({ id: randomUUID(), postId, userId });
      await db
        .update(communityPostsTable)
        .set({ likeCount: sql`${communityPostsTable.likeCount} + 1` })
        .where(eq(communityPostsTable.id, postId));
      res.json({ liked: true });
    }
  } catch (err) {
    req.log.error({ err }, "community like failed");
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

// DELETE /community/:postId — soft delete (own posts only)
router.delete("/community/:postId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Login required" }); return; }
  try {
    const { postId } = req.params;
    const [post] = await db
      .select({ authorId: communityPostsTable.authorId })
      .from(communityPostsTable)
      .where(eq(communityPostsTable.id, postId))
      .limit(1);
    if (!post) { res.status(404).json({ error: "Not found" }); return; }
    if (post.authorId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }

    await db
      .update(communityPostsTable)
      .set({ isDeleted: true })
      .where(eq(communityPostsTable.id, postId));
    res.json({ deleted: true });
  } catch (err) {
    req.log.error({ err }, "community delete failed");
    res.status(500).json({ error: "Failed to delete post" });
  }
});

export default router;
