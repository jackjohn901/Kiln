import { Router } from "express";
import { db } from "@workspace/db";
import {
  postsTable, likesTable, savesTable, commentsTable, notificationsTable, profilesTable, userSettingsTable, followsTable,
} from "@workspace/db";
import { sendEmailWithRetry, newCommentEmail, newMentionEmail } from "../lib/email";
import { isEmailPaused } from "../lib/emailPaused";
import { generateUnsubscribeToken } from "../lib/unsubscribeTokens";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";
import crypto from "crypto";
import { broadcast, broadcastAll } from "../lib/websocket";
import { updateStreak } from "./streaks";
import { awardBadge } from "./badges";
import { autoPostToConnectedPlatforms } from "../lib/socialAutoPost";

const router = Router();

// POST /posts — create post
router.post("/posts", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { caption, videoUrl, thumbnailUrl, muxPlaybackId, technique, medium, tags, isPatronOnly, scheduledAt, isDraft, collaboratorId, collaboratorName, musicTrackId } = req.body as {
    caption?: string; videoUrl?: string; thumbnailUrl?: string; muxPlaybackId?: string; technique?: string; medium?: string;
    tags?: string[]; isPatronOnly?: boolean; scheduledAt?: string; isDraft?: boolean;
    collaboratorId?: string; collaboratorName?: string; musicTrackId?: string;
  };
  // Caption is optional, but a post must have *some* content —
  // either a caption, an image, or a video.
  const hasContent = (caption && caption.trim()) || thumbnailUrl || videoUrl;
  if (!hasContent) {
    res.status(400).json({ error: "Post must include a caption, image, or video" });
    return;
  }

  const schedDate = scheduledAt ? new Date(scheduledAt) : null;
  const asDraft = isDraft ?? (schedDate ? true : false);

  try {
    const id = crypto.randomUUID();
    const user = req.user;
    const [post] = await db.insert(postsTable).values({
      id,
      authorId: user.id,
      authorName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist",
      authorAvatarUrl: user.profileImageUrl ?? null,
      caption: caption ?? "",
      videoUrl: videoUrl ?? null,
      thumbnailUrl: thumbnailUrl ?? null,
      muxPlaybackId: muxPlaybackId ?? null,
      technique: technique ?? null,
      medium: medium ?? null,
      tags: tags ?? [],
      isPatronOnly: isPatronOnly ?? false,
      isDraft: asDraft,
      scheduledAt: schedDate,
      collaboratorId: collaboratorId ?? null,
      collaboratorName: collaboratorName ?? null,
      musicTrackId: musicTrackId ?? null,
    }).returning();

    updateStreak(user.id).catch(() => {});

    // Auto-post to connected social platforms (non-blocking, only for published posts)
    if (!asDraft) {
      autoPostToConnectedPlatforms(
        user.id,
        { id: post.id, caption: post.caption, videoUrl: post.videoUrl ?? null, thumbnailUrl: post.thumbnailUrl ?? null },
        { updatePostId: post.id },
      ).catch(() => {});

      // Notify followers via WebSocket so Following tab refreshes immediately
      db.select({ followerId: followsTable.followerId })
        .from(followsTable)
        .where(eq(followsTable.followingId, user.id))
        .then((followers) => {
          for (const { followerId } of followers) {
            broadcast(followerId, { type: "new-post", authorId: user.id });
          }
        })
        .catch(() => {});
    }

    db.select({ count: sql`COUNT(*)` })
      .from(postsTable)
      .where(and(eq(postsTable.authorId, user.id), eq(postsTable.isDraft, false)))
      .then(([row]) => {
        const n = Number(row?.count ?? 0);
        if (n === 1) awardBadge(user.id, "first_post").catch(() => {});
        else if (n === 10) awardBadge(user.id, "ten_posts").catch(() => {});
        else if (n === 100) awardBadge(user.id, "hundred_posts").catch(() => {});
      })
      .catch(() => {});

    res.status(201).json({ ...post, tags: post.tags ?? [], isLiked: false, isSaved: false, createdAt: post.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "createPost error");
    res.status(500).json({ error: "Failed to create post" });
  }
});

// GET /posts/:postId — single post
router.get("/posts/:postId", async (req, res): Promise<void> => {
  try {
    const { postId } = req.params;
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
    if (!post) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ post: { ...post, tags: post.tags ?? [], createdAt: post.createdAt.toISOString() } });
  } catch (err) {
    req.log.error({ err }, "getPost error");
    res.status(500).json({ error: "Failed to load post" });
  }
});

// POST /posts/:postId/view — increment view count (anonymous OK, once per call)
router.post("/posts/:postId/view", async (req, res): Promise<void> => {
  const { postId } = req.params;
  try {
    await db.update(postsTable)
      .set({ viewCount: sql`${postsTable.viewCount} + 1` })
      .where(eq(postsTable.id, postId));
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
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
        .set({ likeCount: sql`GREATEST(${postsTable.likeCount} - 1, 0)` })
        .where(eq(postsTable.id, postId))
        .returning({ likeCount: postsTable.likeCount });
      const likeCount = updated?.likeCount ?? 0;
      broadcastAll({ type: "like", postId, likeCount });
      res.json({ liked: false, likeCount }); return;
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
      broadcast(post.authorId, { type: "notification", userId: post.authorId, text: "Someone liked your post", link: `/post/${postId}` });
    }

    const likeCount = updated?.likeCount ?? 0;
    broadcastAll({ type: "like", postId, likeCount });
    res.json({ liked: true, likeCount });
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
        .set({ saveCount: sql`GREATEST(${postsTable.saveCount} - 1, 0)` })
        .where(eq(postsTable.id, postId))
        .returning({ saveCount: postsTable.saveCount });
      const saveCount = updated?.saveCount ?? 0;
      broadcastAll({ type: "save", postId, saveCount });
      res.json({ saved: false, saveCount }); return;
    }

    await db.insert(savesTable).values({ userId, postId });
    const [updated] = await db.update(postsTable)
      .set({ saveCount: sql`${postsTable.saveCount} + 1` })
      .where(eq(postsTable.id, postId))
      .returning({ saveCount: postsTable.saveCount });

    const saveCount = updated?.saveCount ?? 0;
    broadcastAll({ type: "save", postId, saveCount });
    res.json({ saved: true, saveCount });
  } catch (err) {
    req.log.error({ err }, "savePost error");
    res.status(500).json({ error: "Failed to toggle save" });
  }
});

// GET /posts/:postId/comments — returns top-level comments with nested replies
router.get("/posts/:postId/comments", async (req, res) => {
  try {
    const { postId } = req.params;
    const all = await db.select().from(commentsTable)
      .where(eq(commentsTable.postId, postId))
      .orderBy(desc(commentsTable.createdAt));

    const topLevel = all.filter((c) => !c.parentCommentId);
    const replyMap = new Map<string, typeof all>();
    for (const c of all) {
      if (c.parentCommentId) {
        if (!replyMap.has(c.parentCommentId)) replyMap.set(c.parentCommentId, []);
        replyMap.get(c.parentCommentId)!.push(c);
      }
    }
    const enriched = topLevel.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      replies: (replyMap.get(c.id) ?? []).map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), replies: [] })),
    }));
    res.json({ comments: enriched });
  } catch (err) {
    req.log.error({ err }, "getComments error");
    res.status(500).json({ error: "Failed to load comments" });
  }
});

// POST /posts/:postId/comments — supports optional parentId for replies
router.post("/posts/:postId/comments", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { postId } = req.params;
  const { text, parentId } = req.body as { text?: string; parentId?: string };
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
      parentCommentId: parentId ?? null,
    }).returning();

    if (parentId) {
      await db.update(commentsTable)
        .set({ replyCount: sql`${commentsTable.replyCount} + 1` })
        .where(eq(commentsTable.id, parentId));
    } else {
      await db.update(postsTable)
        .set({ commentCount: sql`${postsTable.commentCount} + 1` })
        .where(eq(postsTable.id, postId));
    }

    // Notify post author (only for top-level comments)
    if (!parentId) {
      const [post] = await db.select({ authorId: postsTable.authorId }).from(postsTable).where(eq(postsTable.id, postId));
      if (post && post.authorId !== user.id) {
        const authorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Someone";
        const commentNotifId = crypto.randomUUID();
        await db.insert(notificationsTable).values({
          id: commentNotifId,
          userId: post.authorId,
          type: "comment",
          fromId: user.id,
          fromName: authorName,
          fromAvatarUrl: user.profileImageUrl ?? null,
          text: `commented: "${text.trim().substring(0, 50)}"`,
          link: `/post/${postId}`,
        });
        broadcast(post.authorId, { type: "comment", postId, commentId: id, authorId: user.id });
        broadcast(post.authorId, { type: "notification", userId: post.authorId, text: `${authorName} commented on your post`, link: `/post/${postId}` });

        // Email notification
        try {
          const [[p], [s]] = await Promise.all([
            db.select({ contactEmail: profilesTable.contactEmail }).from(profilesTable).where(eq(profilesTable.userId, post.authorId)).limit(1),
            db.select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt }).from(userSettingsTable).where(eq(userSettingsTable.userId, post.authorId)).limit(1),
          ]);
          const emailSettings = s?.settings as Record<string, unknown> | null;
          const emailSnoozed = isEmailPaused(emailSettings, s?.notifEmailResumeAt);
          const wantsEmail = !emailSnoozed && emailSettings?.notif_email_comments !== false;
          if (emailSnoozed) {
            db.update(notificationsTable).set({ emailSkipped: true }).where(eq(notificationsTable.id, commentNotifId)).catch(() => {});
          }
          if (wantsEmail && p?.contactEmail) await sendEmailWithRetry({ to: p.contactEmail, subject: `${authorName} commented on your post`, html: newCommentEmail(authorName, text.trim(), postId) }, { label: "new comment notification" });
        } catch (err) {
          logger.warn({ err, authorId: post.authorId, postId }, "Failed to send new-comment notification email");
        }
      }
    }

    // Detect @mentions and notify mentioned users (cap at 5 unique handles)
    const mentionHandles = [
      ...new Set([...text.matchAll(/@(\w+)/g)].map((m) => m[1].toLowerCase())),
    ].slice(0, 5);
    if (mentionHandles.length > 0) {
      try {
        const [postRow] = await db
          .select({ authorId: postsTable.authorId })
          .from(postsTable)
          .where(eq(postsTable.id, postId))
          .limit(1);
        const postAuthorId = postRow?.authorId;
        const authorName =
          [user.firstName, user.lastName].filter(Boolean).join(" ") || "Someone";
        const mentionedProfiles = await db
          .select({ userId: profilesTable.userId })
          .from(profilesTable)
          .where(inArray(profilesTable.handle, mentionHandles));
        for (const mp of mentionedProfiles) {
          if (mp.userId === user.id) continue;
          if (mp.userId === postAuthorId) continue; // already notified as post author
          const mentionNotifId = crypto.randomUUID();
          await db.insert(notificationsTable).values({
            id: mentionNotifId,
            userId: mp.userId,
            type: "mention",
            fromId: user.id,
            fromName: authorName,
            fromAvatarUrl: user.profileImageUrl ?? null,
            text: `mentioned you: "${text.trim().substring(0, 50)}"`,
            link: `/post/${postId}`,
          });
          // Email notification
          const mentionedUserId = mp.userId;
          try {
            const [[p], [s]] = await Promise.all([
              db.select({ contactEmail: profilesTable.contactEmail }).from(profilesTable).where(eq(profilesTable.userId, mentionedUserId)).limit(1),
              db.select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt }).from(userSettingsTable).where(eq(userSettingsTable.userId, mentionedUserId)).limit(1),
            ]);
            const emailSettings = s?.settings as Record<string, unknown> | null;
            const emailSnoozed = isEmailPaused(emailSettings, s?.notifEmailResumeAt);
            const wantsEmail = !emailSnoozed && emailSettings?.notif_email_mentions !== false;
            if (emailSnoozed) {
              db.update(notificationsTable).set({ emailSkipped: true }).where(eq(notificationsTable.id, mentionNotifId)).catch(() => {});
            }
            if (wantsEmail && p?.contactEmail) {
              const unsubToken = generateUnsubscribeToken(mentionedUserId);
              const unsubscribeUrl = `https://kilnfire.replit.app/api/unsubscribe/mentions?token=${encodeURIComponent(unsubToken)}`;
              await sendEmailWithRetry({ to: p.contactEmail, subject: `${authorName} mentioned you on Kiln`, html: newMentionEmail(authorName, text.trim(), postId, unsubscribeUrl) }, { label: "mention notification" });
            }
          } catch (err) {
            logger.warn({ err, mentionedUserId, postId }, "Failed to send mention notification email");
          }
        }
      } catch {
        // mention notifications are non-critical
      }
    }

    res.status(201).json({ comment: { ...comment, createdAt: comment.createdAt.toISOString(), replies: [] } });
  } catch (err) {
    req.log.error({ err }, "addComment error");
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// GET /me/drafts — list my drafts
router.get("/me/drafts", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const rows = await db.select().from(postsTable)
      .where(and(eq(postsTable.authorId, req.user.id), eq(postsTable.isDraft, true)))
      .orderBy(desc(postsTable.updatedAt));
    res.json({ drafts: rows.map(p => ({ ...p, tags: p.tags ?? [], createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(), scheduledAt: p.scheduledAt?.toISOString() ?? null })) });
  } catch (err) { req.log.error({ err }, "getDrafts error"); res.status(500).json({ error: "Failed to load drafts" }); }
});

// POST /me/drafts — save a new draft (or update existing via body.draftId)
router.post("/me/drafts", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { caption, videoUrl, thumbnailUrl, technique, medium, tags, isPatronOnly, scheduledAt, draftId, collaboratorId, collaboratorName } = req.body as {
    caption?: string; videoUrl?: string; thumbnailUrl?: string; technique?: string; medium?: string;
    tags?: string[]; isPatronOnly?: boolean; scheduledAt?: string; draftId?: string;
    collaboratorId?: string; collaboratorName?: string;
  };
  const user = req.user;
  const authorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  try {
    if (draftId) {
      const [updated] = await db.update(postsTable).set({
        caption: caption ?? "", videoUrl: videoUrl ?? null, thumbnailUrl: thumbnailUrl ?? null,
        technique: technique ?? null, medium: medium ?? null, tags: tags ?? [],
        isPatronOnly: isPatronOnly ?? false, scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        collaboratorId: collaboratorId ?? null, collaboratorName: collaboratorName ?? null,
      }).where(and(eq(postsTable.id, draftId), eq(postsTable.authorId, user.id))).returning();
      if (!updated) { res.status(404).json({ error: "Draft not found" }); return; }
      res.json({ draft: { ...updated, tags: updated.tags ?? [], createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(), scheduledAt: updated.scheduledAt?.toISOString() ?? null } });
    } else {
      const id = crypto.randomUUID();
      const [draft] = await db.insert(postsTable).values({
        id, authorId: user.id, authorName, authorAvatarUrl: user.profileImageUrl ?? null,
        caption: caption ?? "", videoUrl: videoUrl ?? null, thumbnailUrl: thumbnailUrl ?? null,
        technique: technique ?? null, medium: medium ?? null, tags: tags ?? [],
        isPatronOnly: isPatronOnly ?? false, isDraft: true,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        collaboratorId: collaboratorId ?? null, collaboratorName: collaboratorName ?? null,
      }).returning();
      res.status(201).json({ draft: { ...draft, tags: draft.tags ?? [], createdAt: draft.createdAt.toISOString(), updatedAt: draft.updatedAt.toISOString(), scheduledAt: draft.scheduledAt?.toISOString() ?? null } });
    }
  } catch (err) { req.log.error({ err }, "saveDraft error"); res.status(500).json({ error: "Failed to save draft" }); }
});

// POST /me/drafts/:id/publish — publish a draft
router.post("/me/drafts/:id/publish", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [existing] = await db.select({ authorId: postsTable.authorId, isDraft: postsTable.isDraft })
      .from(postsTable).where(eq(postsTable.id, req.params.id));
    if (!existing || existing.authorId !== req.user.id) { res.status(404).json({ error: "Draft not found" }); return; }
    const [post] = await db.update(postsTable).set({ isDraft: false, scheduledAt: null })
      .where(eq(postsTable.id, req.params.id)).returning();

    // Notify followers via WebSocket so Following tab refreshes immediately
    db.select({ followerId: followsTable.followerId })
      .from(followsTable)
      .where(eq(followsTable.followingId, req.user.id))
      .then((followers) => {
        for (const { followerId } of followers) {
          broadcast(followerId, { type: "new-post", authorId: req.user.id });
        }
      })
      .catch(() => {});

    res.json({ post: { ...post, tags: post.tags ?? [], createdAt: post.createdAt.toISOString() } });
  } catch (err) { req.log.error({ err }, "publishDraft error"); res.status(500).json({ error: "Failed to publish draft" }); }
});

// DELETE /me/drafts/:id — delete a draft
router.delete("/me/drafts/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [existing] = await db.select({ authorId: postsTable.authorId }).from(postsTable)
      .where(and(eq(postsTable.id, req.params.id), eq(postsTable.isDraft, true)));
    if (!existing || existing.authorId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(postsTable).where(eq(postsTable.id, req.params.id));
    res.json({ success: true });
  } catch (err) { req.log.error({ err }, "deleteDraft error"); res.status(500).json({ error: "Failed to delete draft" }); }
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

// GET /users/:userId/collab-posts — posts where this user is a collaborator
router.get("/users/:userId/collab-posts", async (req, res): Promise<void> => {
  try {
    const { userId } = req.params;
    const rows = await db.select().from(postsTable)
      .where(and(eq(postsTable.collaboratorId, userId), eq(postsTable.isDraft, false)))
      .orderBy(desc(postsTable.createdAt));
    res.json({ posts: rows.map(p => ({ ...p, tags: p.tags ?? [], createdAt: p.createdAt.toISOString() })) });
  } catch (err) {
    req.log.error({ err }, "getCollabPosts error");
    res.status(500).json({ error: "Failed to load collaboration posts" });
  }
});

export default router;
