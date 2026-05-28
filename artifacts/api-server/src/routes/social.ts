import { Router } from "express";
import { db } from "@workspace/db";
import {
  followsTable, profilesTable, notificationsTable, postsTable, userSettingsTable,
  listingsTable, workshopsTable, patronTiersTable,
} from "@workspace/db";
import { eq, and, sql, or, ilike, inArray, desc, isNull, lte } from "drizzle-orm";
import { publicProfileFields, redactPatronMedia } from "../lib/publicFields";
import { sendEmailWithRetry, newFollowerEmail } from "../lib/email";
import { isEmailPaused } from "../lib/emailPaused";
import { logger } from "../lib/logger";
import crypto from "crypto";
import { broadcast } from "../lib/websocket";
import { awardBadge } from "./badges";

const router = Router();

const MAX_PROFILES_PER_EMAIL = 10;
const MAX_PROFILES_PER_NAME = 10;

async function countProfilesByEmail(email: string): Promise<number> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(profilesTable)
    .where(eq(profilesTable.contactEmail, email));
  return count;
}

async function countProfilesByName(name: string): Promise<number> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(profilesTable)
    .where(eq(profilesTable.displayName, name));
  return count;
}

/**
 * When a new profile is created, automatically follow the platform creator.
 * Controlled by the CREATOR_USER_ID env var — no-ops if unset.
 */
async function autoFollowCreator(newUserId: string): Promise<void> {
  const creatorId = process.env.CREATOR_USER_ID;
  if (!creatorId || newUserId === creatorId) return;

  try {
    await db.insert(followsTable)
      .values({ followerId: newUserId, followingId: creatorId })
      .onConflictDoNothing();

    await Promise.all([
      db.update(profilesTable)
        .set({ followerCount: sql`${profilesTable.followerCount} + 1` })
        .where(eq(profilesTable.userId, creatorId)),
      db.update(profilesTable)
        .set({ followingCount: sql`${profilesTable.followingCount} + 1` })
        .where(eq(profilesTable.userId, newUserId)),
    ]);
  } catch {
    // Non-fatal — don't block profile creation
  }
}

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
    const followNotifId = crypto.randomUUID();
    await db.insert(notificationsTable).values({
      id: followNotifId,
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

    const newCount = profile?.followerCount ?? 0;
    if (newCount === 1) awardBadge(followingId, "first_follower").catch(() => {});
    else if (newCount === 100) awardBadge(followingId, "hundred_followers").catch(() => {});
    else if (newCount === 1000) awardBadge(followingId, "thousand_followers").catch(() => {});
    else if (newCount === 10000) awardBadge(followingId, "ten_thousand_followers").catch(() => {});

    broadcast(followingId, { type: "follow", followerId, followingId });
    broadcast(followingId, { type: "notification", userId: followingId, text: "Someone started following you", link: `/profile/${followerId}` });

    // Email notification
    const followerName = [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") || req.user.email || "Someone";
    try {
      const [[p], [s]] = await Promise.all([
        db.select({ contactEmail: profilesTable.contactEmail }).from(profilesTable).where(eq(profilesTable.userId, followingId)).limit(1),
        db.select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt }).from(userSettingsTable).where(eq(userSettingsTable.userId, followingId)).limit(1),
      ]);
      const emailSettings = s?.settings as Record<string, unknown> | null;
      const emailSnoozed = isEmailPaused(emailSettings, s?.notifEmailResumeAt);
      const wantsEmail = !emailSnoozed && emailSettings?.notif_email_follows !== false;
      if (emailSnoozed) {
        db.update(notificationsTable).set({ emailSkipped: true }).where(eq(notificationsTable.id, followNotifId)).catch(() => {});
      }
      if (wantsEmail && p?.contactEmail) await sendEmailWithRetry({ to: p.contactEmail, subject: `${followerName} started following you on Kiln`, html: newFollowerEmail(followerName) }, { label: "new follower notification" });
    } catch (err) {
      logger.warn({ err, followingId }, "Failed to send new-follower notification email");
    }

    res.json({ following: true, followerCount: newCount });
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

    const profiles = await db.select(publicProfileFields).from(profilesTable)
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
    const [profile] = await db.select(publicProfileFields).from(profilesTable).where(eq(profilesTable.userId, userId));
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
      .where(and(
        eq(postsTable.authorId, userId),
        eq(postsTable.isDraft, false),
        or(isNull(postsTable.scheduledAt), lte(postsTable.scheduledAt, sql`NOW()`)),
      ))
      .orderBy(desc(postsTable.createdAt))
      .limit(30);
    res.json({
      posts: posts.map((p) => redactPatronMedia({ ...p, tags: p.tags ?? [], createdAt: p.createdAt.toISOString() })),
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
      const derivedName = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;

      if (user.email) {
        const emailCount = await countProfilesByEmail(user.email);
        if (emailCount >= MAX_PROFILES_PER_EMAIL) {
          res.status(429).json({ error: "This email is already associated with the maximum number of profiles." });
          return;
        }
      }
      if (derivedName) {
        const nameCount = await countProfilesByName(derivedName);
        if (nameCount >= MAX_PROFILES_PER_NAME) {
          res.status(429).json({ error: "This display name is already associated with the maximum number of profiles." });
          return;
        }
      }

      const [created] = await db.insert(profilesTable).values({
        userId,
        displayName: derivedName,
        avatarUrl: user.profileImageUrl ?? null,
        contactEmail: user.email ?? null,
      }).returning();
      void autoFollowCreator(userId);
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
  const { handle, displayName, bio, medium, location, website, avatarUrl, bannerUrl, kilnStatus, accountType, whyICreate, inspirations, artistStatement, collectorStory } = req.body;
  try {
    const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
    if (!existing) {
      if (displayName) {
        const nameCount = await countProfilesByName(displayName);
        if (nameCount >= MAX_PROFILES_PER_NAME) {
          res.status(429).json({ error: "This display name is already associated with the maximum number of profiles." });
          return;
        }
      }
      const [created] = await db.insert(profilesTable).values({ userId, handle, displayName, bio, medium, location, website, avatarUrl, bannerUrl, kilnStatus, accountType: accountType ?? "artist", whyICreate, inspirations, artistStatement, collectorStory }).returning();
      void autoFollowCreator(userId);
      res.json({ ...created, isFollowing: false, createdAt: created.createdAt.toISOString() }); return;
    }

    // Prevent updating displayName to one that's already at the max count (unless it's their own current name)
    if (displayName && displayName !== existing.displayName) {
      const nameCount = await countProfilesByName(displayName);
      if (nameCount >= MAX_PROFILES_PER_NAME) {
        res.status(429).json({ error: "This display name is already associated with the maximum number of profiles." });
        return;
      }
    }

    const [updated] = await db.update(profilesTable)
      .set({ handle, displayName, bio, medium, location, website, avatarUrl, bannerUrl, kilnStatus, ...(accountType ? { accountType } : {}), whyICreate: whyICreate ?? null, inspirations: inspirations ?? null, artistStatement: artistStatement ?? null, collectorStory: collectorStory ?? null })
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

// GET /users/:userId/press-packet — public, aggregated press packet data
router.get("/users/:userId/press-packet", async (req, res): Promise<void> => {
  const { userId } = req.params;
  try {
    const [profile] = await db.select(publicProfileFields).from(profilesTable).where(eq(profilesTable.userId, userId));
    if (!profile) { res.status(404).json({ error: "Artist not found" }); return; }

    const [followerCountRow, postCountRow, listingCountRow, workshopCountRow] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(followsTable).where(eq(followsTable.followingId, userId)),
      db.select({ count: sql<number>`count(*)::int` }).from(postsTable).where(and(eq(postsTable.authorId, userId), eq(postsTable.isDraft, false), or(isNull(postsTable.scheduledAt), lte(postsTable.scheduledAt, sql`NOW()`)))),
      db.select({ count: sql<number>`count(*)::int` }).from(listingsTable).where(and(eq(listingsTable.artistId, userId), eq(listingsTable.isAvailable, true), eq(listingsTable.isSold, false))),
      db.select({ count: sql<number>`count(*)::int` }).from(workshopsTable).where(eq(workshopsTable.artistId, userId)),
    ]);

    const recentPosts = await db.select({
      id: postsTable.id,
      thumbnailUrl: postsTable.thumbnailUrl,
      videoUrl: postsTable.videoUrl,
      caption: postsTable.caption,
      likeCount: postsTable.likeCount,
      viewCount: postsTable.viewCount,
      createdAt: postsTable.createdAt,
    }).from(postsTable)
      .where(and(eq(postsTable.authorId, userId), eq(postsTable.isDraft, false), or(isNull(postsTable.scheduledAt), lte(postsTable.scheduledAt, sql`NOW()`))))
      .orderBy(desc(postsTable.createdAt))
      .limit(9);

    const patronTiers = await db.select({
      id: patronTiersTable.id,
      name: patronTiersTable.name,
      price: patronTiersTable.price,
      description: patronTiersTable.description,
      perks: patronTiersTable.perks,
    }).from(patronTiersTable)
      .where(and(eq(patronTiersTable.artistId, userId), eq(patronTiersTable.isActive, true)))
      .orderBy(patronTiersTable.sortOrder);

    res.json({
      profile: { ...profile, createdAt: profile.createdAt.toISOString() },
      stats: {
        followerCount: followerCountRow[0]?.count ?? 0,
        postCount: postCountRow[0]?.count ?? 0,
        listingCount: listingCountRow[0]?.count ?? 0,
        workshopCount: workshopCountRow[0]?.count ?? 0,
      },
      recentPosts: recentPosts.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })),
      patronTiers,
    });
  } catch (err) {
    req.log.error({ err }, "getPressPacket error");
    res.status(500).json({ error: "Failed to load press packet" });
  }
});

export default router;
