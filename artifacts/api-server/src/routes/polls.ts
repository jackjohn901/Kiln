import { Router } from "express";
import { db } from "@workspace/db";
import { pollsTable, pollVotesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/posts/:id/poll", async (req, res): Promise<void> => {
  const rows = await db.select().from(pollsTable).where(eq(pollsTable.postId, req.params.id)).limit(1);
  if (rows.length === 0) { res.json({ poll: null }); return; }
  const poll = rows[0];
  let userVote: number | null = null;
  if (req.isAuthenticated()) {
    const votes = await db.select().from(pollVotesTable)
      .where(and(eq(pollVotesTable.pollId, poll.id), eq(pollVotesTable.userId, req.user.id)))
      .limit(1);
    if (votes.length > 0) userVote = votes[0].optionIndex;
  }
  const counts = poll.voteCounts ?? [];
  const total = counts.reduce((s: number, n: number) => s + n, 0);
  res.json({ poll: { ...poll, endsAt: poll.endsAt?.toISOString() ?? null, createdAt: poll.createdAt.toISOString(), total, userVote } });
});

router.post("/posts/:id/poll", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const existing = await db.select().from(pollsTable).where(eq(pollsTable.postId, req.params.id)).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Poll already exists" }); return; }
  const { question, options, endsAt } = req.body as { question: string; options: string[]; endsAt?: string };
  if (!question || !Array.isArray(options) || options.length < 2) { res.status(400).json({ error: "Need question + 2+ options" }); return; }
  const id = randomUUID();
  const voteCounts = options.map(() => 0);
  await db.insert(pollsTable).values({
    id, postId: req.params.id, authorId: userId, question,
    options, voteCounts, endsAt: endsAt ? new Date(endsAt) : null,
  });
  res.json({ pollId: id });
});

router.post("/polls/:id/vote", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const { optionIndex } = req.body as { optionIndex: number };
  const rows = await db.select().from(pollsTable).where(eq(pollsTable.id, req.params.id)).limit(1);
  if (rows.length === 0) { res.status(404).json({ error: "Poll not found" }); return; }
  const poll = rows[0];
  if (poll.endsAt && poll.endsAt < new Date()) { res.status(400).json({ error: "Poll ended" }); return; }
  if (optionIndex < 0 || optionIndex >= poll.options.length) { res.status(400).json({ error: "Invalid option" }); return; }
  const existingVote = await db.select().from(pollVotesTable)
    .where(and(eq(pollVotesTable.pollId, poll.id), eq(pollVotesTable.userId, userId)))
    .limit(1);
  if (existingVote.length > 0) { res.status(409).json({ error: "Already voted" }); return; }
  await db.insert(pollVotesTable).values({ id: randomUUID(), pollId: poll.id, userId, optionIndex });
  const current = poll.voteCounts ?? poll.options.map(() => 0);
  const newCounts = [...current];
  newCounts[optionIndex] = (newCounts[optionIndex] ?? 0) + 1;
  await db.update(pollsTable).set({ voteCounts: newCounts }).where(eq(pollsTable.id, poll.id));
  res.json({ ok: true, voteCounts: newCounts });
});

export default router;
