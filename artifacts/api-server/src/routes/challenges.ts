import { Router } from "express";
import { db } from "@workspace/db";
import { challengesTable, challengeEntriesTable } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/challenges", async (req, res): Promise<void> => {
  const now = new Date();
  const all = await db.select().from(challengesTable).orderBy(desc(challengesTable.startsAt));
  const userId = req.isAuthenticated() ? req.user.id : null;
  let enteredIds = new Set<string>();
  if (userId) {
    const entries = await db.select({ challengeId: challengeEntriesTable.challengeId })
      .from(challengeEntriesTable).where(eq(challengeEntriesTable.userId, userId));
    enteredIds = new Set(entries.map(e => e.challengeId));
  }
  const challenges = all.map(c => ({
    ...c,
    startsAt: c.startsAt.toISOString(),
    endsAt: c.endsAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    status: c.endsAt < now ? "ended" : c.startsAt > now ? "upcoming" : "active",
    entered: enteredIds.has(c.id),
  }));
  res.json({ challenges });
});

router.get("/challenges/:id", async (req, res): Promise<void> => {
  const rows = await db.select().from(challengesTable).where(eq(challengesTable.id, req.params.id)).limit(1);
  if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
  const c = rows[0];
  const now = new Date();
  const isEnded = c.endsAt < now;
  const entries = await db.select().from(challengeEntriesTable)
    .where(eq(challengeEntriesTable.challengeId, c.id))
    .orderBy(desc(challengeEntriesTable.voteCount))
    .limit(20);
  const winnerId = isEnded && entries.length > 0 && entries[0].voteCount > 0
    ? entries[0].id
    : null;
  res.json({
    challenge: {
      ...c,
      startsAt: c.startsAt.toISOString(),
      endsAt: c.endsAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
      status: isEnded ? "ended" : c.startsAt > now ? "upcoming" : "active",
      winnerId,
    },
    entries: entries.map((e, i) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
      isWinner: isEnded && i === 0 && e.voteCount > 0,
    })),
  });
});

router.post("/challenges/:id/enter", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const challengeId = req.params.id;
  const ch = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId)).limit(1);
  if (ch.length === 0) { res.status(404).json({ error: "Not found" }); return; }
  if (ch[0].endsAt < new Date()) { res.status(400).json({ error: "Challenge has ended" }); return; }
  const existing = await db.select().from(challengeEntriesTable)
    .where(and(eq(challengeEntriesTable.challengeId, challengeId), eq(challengeEntriesTable.userId, userId)))
    .limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Already entered" }); return; }
  const id = randomUUID();
  const { postId } = req.body as { postId?: string };
  await db.insert(challengeEntriesTable).values({ id, challengeId, userId, postId: postId ?? null, voteCount: 0 });
  await db.update(challengesTable).set({ entryCount: sql`${challengesTable.entryCount} + 1` }).where(eq(challengesTable.id, challengeId));
  res.json({ entryId: id });
});

router.post("/challenges/:id/entries/:entryId/vote", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { entryId } = req.params;
  const rows = await db.select().from(challengeEntriesTable).where(eq(challengeEntriesTable.id, entryId)).limit(1);
  if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
  await db.update(challengeEntriesTable)
    .set({ voteCount: sql`${challengeEntriesTable.voteCount} + 1` })
    .where(eq(challengeEntriesTable.id, entryId));
  res.json({ ok: true });
});

export default router;
