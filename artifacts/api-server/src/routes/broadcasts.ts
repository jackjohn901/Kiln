import { Router } from "express";
import { db } from "@workspace/db";
import { broadcastsTable, broadcastSubscribersTable, profilesTable, notificationsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /broadcasts/:artistId — broadcasts from an artist
router.get("/broadcasts/:artistId", async (req, res): Promise<void> => {
  const broadcasts = await db.select().from(broadcastsTable)
    .where(eq(broadcastsTable.artistId, req.params.artistId))
    .orderBy(desc(broadcastsTable.createdAt)).limit(30);
  const isSubscribed = req.isAuthenticated()
    ? (await db.select().from(broadcastSubscribersTable).where(and(eq(broadcastSubscribersTable.artistId, req.params.artistId), eq(broadcastSubscribersTable.subscriberId, req.user.id)))).length > 0
    : false;
  res.json({ broadcasts: broadcasts.map(b => ({ ...b, createdAt: b.createdAt.toISOString() })), isSubscribed });
});

// POST /broadcasts — send a broadcast
router.post("/broadcasts", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { content, mediaUrl, mediaType, isPatronOnly } = req.body;
  if (!content) { res.status(400).json({ error: "content required" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  const [broadcast] = await db.insert(broadcastsTable).values({
    id: crypto.randomUUID(), artistId: user.id, artistName: name,
    artistAvatarUrl: user.profileImageUrl ?? null, content,
    mediaUrl: mediaUrl ?? null, mediaType: mediaType ?? null,
    isPatronOnly: isPatronOnly ?? false,
  }).returning();
  // Notify all subscribers
  const subs = await db.select().from(broadcastSubscribersTable).where(eq(broadcastSubscribersTable.artistId, user.id));
  if (subs.length > 0) {
    await db.insert(notificationsTable).values(subs.map(s => ({
      id: crypto.randomUUID(), userId: s.subscriberId, type: "broadcast" as any,
      fromId: user.id, fromName: name, fromAvatarUrl: user.profileImageUrl ?? null,
      text: content.slice(0, 80), link: `/broadcasts/${user.id}`,
    })));
    await db.update(broadcastsTable).set({ reachCount: subs.length }).where(eq(broadcastsTable.id, broadcast.id));
  }
  res.status(201).json({ ...broadcast, createdAt: broadcast.createdAt.toISOString() });
});

// POST /broadcasts/:artistId/subscribe
router.post("/broadcasts/:artistId/subscribe", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.insert(broadcastSubscribersTable).values({ artistId: req.params.artistId, subscriberId: req.user.id }).onConflictDoNothing();
  await db.update(profilesTable).set({ broadcastSubscriberCount: sql`${profilesTable.broadcastSubscriberCount} + 1` }).where(eq(profilesTable.userId, req.params.artistId));
  res.json({ subscribed: true });
});

// DELETE /broadcasts/:artistId/subscribe
router.delete("/broadcasts/:artistId/subscribe", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.delete(broadcastSubscribersTable).where(and(eq(broadcastSubscribersTable.artistId, req.params.artistId), eq(broadcastSubscribersTable.subscriberId, req.user.id)));
  await db.update(profilesTable).set({ broadcastSubscriberCount: sql`GREATEST(${profilesTable.broadcastSubscriberCount} - 1, 0)` }).where(eq(profilesTable.userId, req.params.artistId));
  res.json({ subscribed: false });
});

export default router;
