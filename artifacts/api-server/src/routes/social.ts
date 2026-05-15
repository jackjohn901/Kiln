import { Router } from "express";
import { db } from "@workspace/db";
import {
  followsTable, profilesTable, notificationsTable, usersTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
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

// GET /me/profile — current user's profile
router.get("/me/profile", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const userId = req.user.id;
  try {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
    if (!profile) {
      // Auto-create profile for new users
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

export default router;
