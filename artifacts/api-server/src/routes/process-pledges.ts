import { Router } from "express";
import { db } from "@workspace/db";
import {
  processPledgesTable,
  pledgeSubscribersTable,
  pledgeUpdatesTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function serializePledge(p: typeof processPledgesTable.$inferSelect, isSubscribed = false) {
  return {
    id: p.id,
    artistId: p.artistId,
    artistName: p.artistName,
    artistAvatarUrl: p.artistAvatarUrl,
    title: p.title,
    description: p.description,
    pieceCount: p.pieceCount,
    intervalLabel: p.intervalLabel,
    targetPostCount: p.targetPostCount,
    currentPostCount: p.currentPostCount,
    status: p.status,
    startedAt: p.startedAt.toISOString(),
    completedAt: p.completedAt?.toISOString() ?? null,
    subscriberCount: p.subscriberCount,
    isSubscribed,
  };
}

// GET /api/process-pledges — community feed
router.get("/process-pledges", async (req, res): Promise<void> => {
  try {
    const pledges = await db
      .select()
      .from(processPledgesTable)
      .where(eq(processPledgesTable.status, "active"))
      .orderBy(desc(processPledgesTable.startedAt))
      .limit(50);

    const userId = req.isAuthenticated() ? req.user.id : null;
    let subscribedIds = new Set<string>();
    if (userId) {
      const subs = await db.select().from(pledgeSubscribersTable).where(eq(pledgeSubscribersTable.userId, userId));
      subscribedIds = new Set(subs.map((s) => s.pledgeId));
    }

    res.json({ pledges: pledges.map((p) => serializePledge(p, subscribedIds.has(p.id))) });
  } catch (err) {
    req.log.error({ err }, "getProcessPledges error");
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/me/process-pledges — my pledges
router.get("/me/process-pledges", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const pledges = await db
    .select()
    .from(processPledgesTable)
    .where(eq(processPledgesTable.artistId, req.user.id))
    .orderBy(desc(processPledgesTable.startedAt));
  res.json({ pledges: pledges.map((p) => serializePledge(p, false)) });
});

// POST /api/me/process-pledges — create a pledge
router.post("/me/process-pledges", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, description, pieceCount, intervalLabel, targetPostCount } = req.body as {
    title?: string; description?: string; pieceCount?: number;
    intervalLabel?: string; targetPostCount?: number;
  };
  if (!title?.trim()) { res.status(400).json({ error: "title required" }); return; }

  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";

  const [pledge] = await db.insert(processPledgesTable).values({
    id: crypto.randomUUID(),
    artistId: user.id,
    artistName: name,
    artistAvatarUrl: user.profileImageUrl ?? null,
    title: title.trim(),
    description: description?.trim() || null,
    pieceCount: pieceCount || null,
    intervalLabel: intervalLabel?.trim() || null,
    targetPostCount: targetPostCount || 10,
    currentPostCount: 0,
    status: "active",
    subscriberCount: 0,
  }).returning();

  res.status(201).json(serializePledge(pledge!, false));
});

// POST /api/process-pledges/:id/subscribe — toggle subscribe
router.post("/process-pledges/:id/subscribe", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const pledgeId = req.params.id!;
  const userId = req.user.id;

  const [existing] = await db
    .select()
    .from(pledgeSubscribersTable)
    .where(and(eq(pledgeSubscribersTable.pledgeId, pledgeId), eq(pledgeSubscribersTable.userId, userId)));

  if (existing) {
    await db.delete(pledgeSubscribersTable).where(
      and(eq(pledgeSubscribersTable.pledgeId, pledgeId), eq(pledgeSubscribersTable.userId, userId))
    );
    await db.update(processPledgesTable)
      .set({ subscriberCount: sql`GREATEST(0, subscriber_count - 1)` })
      .where(eq(processPledgesTable.id, pledgeId));
    res.json({ subscribed: false });
  } else {
    await db.insert(pledgeSubscribersTable).values({ pledgeId, userId }).onConflictDoNothing();
    await db.update(processPledgesTable)
      .set({ subscriberCount: sql`subscriber_count + 1` })
      .where(eq(processPledgesTable.id, pledgeId));
    res.json({ subscribed: true });
  }
});

// GET /api/process-pledges/:id/updates
router.get("/process-pledges/:id/updates", async (req, res): Promise<void> => {
  const updates = await db
    .select()
    .from(pledgeUpdatesTable)
    .where(eq(pledgeUpdatesTable.pledgeId, req.params.id!))
    .orderBy(desc(pledgeUpdatesTable.createdAt));
  res.json({
    updates: updates.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
});

// POST /api/me/process-pledges/:id/update — post a progress update
router.post("/me/process-pledges/:id/update", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const pledgeId = req.params.id!;
  const [pledge] = await db
    .select()
    .from(processPledgesTable)
    .where(and(eq(processPledgesTable.id, pledgeId), eq(processPledgesTable.artistId, req.user.id)));
  if (!pledge) { res.status(404).json({ error: "Not found" }); return; }

  const { caption, imageUrl, hoursInvested } = req.body as {
    caption?: string; imageUrl?: string; hoursInvested?: number;
  };

  const updateNumber = pledge.currentPostCount + 1;
  const [update] = await db.insert(pledgeUpdatesTable).values({
    id: crypto.randomUUID(),
    pledgeId,
    caption: caption?.trim() || null,
    imageUrl: imageUrl?.trim() || null,
    hoursInvested: hoursInvested || null,
    updateNumber,
  }).returning();

  const newCount = updateNumber;
  const newStatus = newCount >= pledge.targetPostCount ? "complete" : "active";
  await db.update(processPledgesTable)
    .set({ currentPostCount: newCount, status: newStatus, completedAt: newStatus === "complete" ? new Date() : null })
    .where(eq(processPledgesTable.id, pledgeId));

  const subscribers = await db.select().from(pledgeSubscribersTable).where(eq(pledgeSubscribersTable.pledgeId, pledgeId));
  if (subscribers.length > 0) {
    const user = req.user;
    const artistName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "An artist";
    await db.insert(notificationsTable).values(
      subscribers.map((s) => ({
        id: crypto.randomUUID(),
        userId: s.userId,
        type: "pledge_update",
        fromId: user.id,
        fromName: artistName,
        fromAvatarUrl: user.profileImageUrl ?? null,
        text: `${artistName} posted update #${updateNumber} on "${pledge.title}"`,
        link: `/process-pledges`,
        read: false,
      }))
    );
  }

  res.status(201).json({ ...update, createdAt: update!.createdAt.toISOString() });
});

// DELETE /api/me/process-pledges/:id — abandon a pledge
router.delete("/me/process-pledges/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.update(processPledgesTable)
    .set({ status: "abandoned" })
    .where(and(eq(processPledgesTable.id, req.params.id!), eq(processPledgesTable.artistId, req.user.id)));
  res.json({ ok: true });
});

export default router;
