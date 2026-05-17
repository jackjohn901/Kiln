import { Router } from "express";
import { db } from "@workspace/db";
import {
  followsTable, profilesTable, notificationsTable, postsTable,
} from "@workspace/db";
import { eq, and, sql, or, ilike, inArray, desc } from "drizzle-orm";
import crypto from "crypto";
import { broadcast } from "../lib/websocket";

const router = Router();

// POST /users/:userId/follow — toggle follow
router.post("/users/:userId/follow", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const followingId = req.params.userId;
  const followerId = req.user.id;

  if (followerId === followingId) { res.status(400).json({ error: "Cannot follow yourself" }); return; }

  try {
    const [existing] = await db.select().from(followsTable)
      .where(and(eq(followsTable.followerId, followerId), eq(followsTable.followingId, followingId)));

    if (existing) {
      await db.delete(followsTable)
        .where(and(eq(followsTable.followerId, followerId), eq(followsTable.followingId, followingId)));

      await Promise.all([
        db.update(profilesTable)
          .set({ followerCount: sql`GREATEST(${profilesTable.followerCount} - 1, 0)` })
          .where(eq(profilesTable.userId, followingId)),
        db.update(profilesTable)
          .set({ followingCount: sql`GREATEST(${profilesTable.followingCount} - 1, 0)` })
          .where(eq(profilesTable.userId, followerId)),
      ]);

      const [profile] = await db.select({ followerCount: profilesTable.followerCount })
        .from(profilesTable).where(eq(profilesTable.userId, followingId));
      res.json({ following: false, followerCount: profile?.followerCount ?? 0 }); return;
    }

    await db.insert(followsTable).values({ followerId, followingId });

    await Promise.all([
      db.update(profilesTable)
        .set({ followerCount: sql`${profilesTable.followerCount} + 1` })
        .where(eq(profilesTable.userId, followingId)),
      db.update(profilesTable)
        .set({ followingCount: sql`${profilesTable.followingCount} + 1` })
        .where(eq(profilesTable.userId, followerId)),
    ]);

    const user = req.user;
    await db.insert(notificationsTable).values({
      id: crypto.randomUUID(),
      userId: followingId,
      type: "follow",
      fromId: followerId,
      fromName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Someone",
      fromAvatarUrl: user.profileImageUrl ?? null,
      text: "started following you",
      link: `/profile/${followerId}`,
    });

    const [profile] = await db.select({ followerCount: profilesTable.followerCount })
      .from(profilesTable).where(eq(profilesTable.userId, followingId));

    broadcast(followingId, { type: "follow", followerId, followingId });
    broadcast(followingId, { type: "notification", userId: followingId, text: "Someone started following you", link: `/profile/${followerId}` });

    res.json({ following: true, followerCount: profile?.followerCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "toggleFollow error");
    res.status(500).json({ error: "Failed to toggle follow" });
  }
});

// GET /users/search?q=&medium=&limit=
router.get("/users/search", async (req, res): Promise<void> => {
  const { q, medium, limit = "30" } = req.query as Record<string, string>;
  try {
    const conditions: ReturnType<typeof ilike>[] = [];
    if (q && q.trim()) {
      conditions.push(
        or(
          ilike(profilesTable.displayName, `%${q.trim()}%`),
          ilike(profilesTable.handle, `%${q.trim()}%`),
          ilike(profilesTable.medium, `%${q.trim()}%`),
        ) as any,
      );
    }
    if (medium && medium !== "All") {
      conditions.push(ilike(profilesTable.medium, `%${medium}%`) as any);
    }

    const profiles = await db.select().from(profilesTable)
      .where(conditions.length > 0 ? and(...(conditions as [any, ...any[]])) : undefined)
      .orderBy(desc(profilesTable.followerCount))
      .limit(Math.min(Number(limit) || 30, 50));

    const viewerId = req.isAuthenticated() ? req.user.id : null;
    let followingIds = new Set<string>();
    if (viewerId && profiles.length > 0) {
      const userIds = profiles.map((p) => p.userId);
      const follows = await db.select({ followingId: followsTable.followingId })
        .from(followsTable)
        .where(and(
          eq(followsTable.followerId, viewerId),
          inArray(followsTable.followingId, userIds),
        ));
      followingIds = new Set(follows.map((f) => f.followingId));
    }

    res.json({
      profiles: profiles.map((p) => ({
        ...p,
        isFollowing: followingIds.has(p.userId),
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "searchUsers error");
    res.status(500).json({ error: "Search failed" });
  }
});

// GET /users/:userId/profile
router.get("/users/:userId/profile", async (req, res): Promise<void> => {
  const { userId } = req.params;
  const viewerId = req.isAuthenticated() ? req.user.id : null;

  try {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
    if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

    let isFollowing = false;
    if (viewerId) {
      const [follow] = await db.select().from(followsTable)
        .where(and(eq(followsTable.followerId, viewerId), eq(followsTable.followingId, userId)));
      isFollowing = !!follow;
    }

    res.json({ ...profile, isFollowing, createdAt: profile.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "getUserProfile error");
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// GET /users/:userId/posts
router.get("/users/:userId/posts", async (req, res): Promise<void> => {
  const { userId } = req.params;
  try {
    const posts = await db.select().from(postsTable)
      .where(eq(postsTable.authorId, userId))
      .orderBy(desc(postsTable.createdAt))
      .limit(30);
    res.json({
      posts: posts.map((p) => ({
        ...p,
        tags: p.tags ?? [],
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "getUserPosts error");
    res.status(500).json({ error: "Failed to load posts" });
  }
});

// PATCH /users/:userId/profile
router.patch("/users/:userId/profile", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (req.user.id !== req.params.userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const { handle, displayName, bio, medium, location, website, avatarUrl, bannerUrl, kilnStatus } = req.body;
  try {
    const [updated] = await db.update(profilesTable)
      .set({ handle, displayName, bio, medium, location, website, avatarUrl, bannerUrl, kilnStatus })
      .where(eq(profilesTable.userId, req.params.userId))
      .returning();
    res.json({ ...updated, isFollowing: false, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "updateProfile error");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// GET /me/profile — current user's profile (auto-creates if missing)
router.get("/me/profile", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const userId = req.user.id;
  try {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
    if (!profile) {
      const user = req.user;
      const [created] = await db.insert(profilesTable).values({
        userId,
        displayName: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
        avatarUrl: user.profileImageUrl ?? null,
      }).returning();
      res.json({ ...created, isFollowing: false, createdAt: created.createdAt.toISOString() }); return;
    }
    res.json({ ...profile, isFollowing: false, createdAt: profile.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "getMyProfile error");
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// PATCH /me/profile
router.patch("/me/profile", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const userId = req.user.id;
  const { handle, displayName, bio, medium, location, website, avatarUrl, bannerUrl, kilnStatus } = req.body;
  try {
    const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
    if (!existing) {
      const [created] = await db.insert(profilesTable).values({ userId, handle, displayName, bio, medium, location, website, avatarUrl, bannerUrl, kilnStatus }).returning();
      res.json({ ...created, isFollowing: false, createdAt: created.createdAt.toISOString() }); return;
    }
    const [updated] = await db.update(profilesTable)
      .set({ handle, displayName, bio, medium, location, website, avatarUrl, bannerUrl, kilnStatus })
      .where(eq(profilesTable.userId, userId))
      .returning();
    res.json({ ...updated, isFollowing: false, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "updateMyProfile error");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// GET /me/posts — logged-in user's posts (excludes drafts)
router.get("/me/posts", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const posts = await db.select().from(postsTable)
      .where(and(eq(postsTable.authorId, req.user.id), eq(postsTable.isDraft, false)))
      .orderBy(desc(postsTable.createdAt))
      .limit(30);
    res.json({
      posts: posts.map((p) => ({
        ...p,
        tags: p.tags ?? [],
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "getMyPosts error");
    res.status(500).json({ error: "Failed to load posts" });
  }
});

// GET /me/following — list of userIds the current user follows
router.get("/me/following", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.json({ followingIds: [] }); return; }
  try {
    const follows = await db
      .select({ followingId: followsTable.followingId })
      .from(followsTable)
      .where(eq(followsTable.followerId, req.user.id));
    res.json({ followingIds: follows.map((f) => f.followingId) });
  } catch (err) {
    req.log.error({ err }, "getMyFollowing error");
    res.status(500).json({ error: "Failed to load following" });
  }
});

// GET /me/followers — people who follow the current user
router.get("/me/followers", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const follows = await db
      .select({
        followerId: followsTable.followerId,
        createdAt: followsTable.createdAt,
      })
      .from(followsTable)
      .where(eq(followsTable.followingId, req.user.id))
      .orderBy(desc(followsTable.createdAt))
      .limit(200);

    const followerIds = follows.map(f => f.followerId);
    const profiles = followerIds.length
      ? await db.select({ userId: profilesTable.userId, displayName: profilesTable.displayName, avatarUrl: profilesTable.avatarUrl })
          .from(profilesTable).where(inArray(profilesTable.userId, followerIds))
      : [];
    const profileMap = Object.fromEntries(profiles.map(p => [p.userId, p]));

    res.json({
      followers: follows.map(f => ({
        followerId: f.followerId,
        followerName: profileMap[f.followerId]?.displayName ?? null,
        followerAvatarUrl: profileMap[f.followerId]?.avatarUrl ?? null,
        createdAt: f.createdAt.toISOString(),
      }))
    });
  } catch (err) {
    req.log.error({ err }, "getMyFollowers error");
    res.status(500).json({ error: "Failed to load followers" });
  }
});

export default router;
