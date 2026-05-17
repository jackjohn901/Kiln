import { Router } from "express";
import { db } from "@workspace/db";
import { parliamentProposalsTable, parliamentVotesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

type ProposalOption = { id: string; label: string; votes: number };

// GET /parliament/proposals
router.get("/parliament/proposals", async (req, res): Promise<void> => {
  try {
    const proposals = await db.select().from(parliamentProposalsTable).orderBy(parliamentProposalsTable.endsAt);
    const userId = req.isAuthenticated() ? req.user.id : null;
    let myVotes: Record<string, string> = {};
    if (userId) {
      const votes = await db.select().from(parliamentVotesTable).where(eq(parliamentVotesTable.userId, userId));
      votes.forEach(v => { myVotes[v.proposalId] = v.optionId; });
    }
    res.json({
      proposals: proposals.map(p => ({
        ...p,
        options: p.options as ProposalOption[],
        endsAt: p.endsAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
        myVote: myVotes[p.id] ?? null,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "getProposals error");
    res.status(500).json({ error: "Failed" });
  }
});

// POST /parliament/proposals/:id/vote
router.post("/parliament/proposals/:id/vote", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { optionId } = req.body;
  if (!optionId) { res.status(400).json({ error: "optionId required" }); return; }
  const { id } = req.params;
  const userId = req.user.id;
  const [proposal] = await db.select().from(parliamentProposalsTable).where(eq(parliamentProposalsTable.id, id));
  if (!proposal) { res.status(404).json({ error: "Not found" }); return; }
  if (new Date() > proposal.endsAt) { res.status(400).json({ error: "Proposal has ended" }); return; }
  const existing = await db.select().from(parliamentVotesTable)
    .where(and(eq(parliamentVotesTable.proposalId, id), eq(parliamentVotesTable.userId, userId)));
  const options = proposal.options as ProposalOption[];
  if (existing.length) {
    const oldOptionId = existing[0]!.optionId;
    await db.update(parliamentVotesTable).set({ optionId }).where(and(eq(parliamentVotesTable.proposalId, id), eq(parliamentVotesTable.userId, userId)));
    const updated = options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o.id === oldOptionId ? { ...o, votes: Math.max(0, o.votes - 1) } : o);
    await db.update(parliamentProposalsTable).set({ options: updated }).where(eq(parliamentProposalsTable.id, id));
    res.json({ optionId, options: updated });
  } else {
    await db.insert(parliamentVotesTable).values({ id: crypto.randomUUID(), proposalId: id, userId, optionId });
    const updated = options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o);
    const newTotal = proposal.totalVoices + 1;
    await db.update(parliamentProposalsTable).set({ options: updated, totalVoices: newTotal }).where(eq(parliamentProposalsTable.id, id));
    res.json({ optionId, options: updated, totalVoices: newTotal });
  }
});

// POST /parliament/proposals — create (admin/any auth user)
router.post("/parliament/proposals", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, description, category, options, endsAt } = req.body;
  if (!title || !options?.length || !endsAt) { res.status(400).json({ error: "title, options, endsAt required" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Community member";
  const opts: ProposalOption[] = (options as string[]).map((label, i) => ({ id: `opt-${i}`, label, votes: 0 }));
  const [proposal] = await db.insert(parliamentProposalsTable).values({
    id: crypto.randomUUID(), title, description: description ?? "", category: category ?? "community",
    options: opts, endsAt: new Date(endsAt), totalVoices: 0,
    proposedBy: name, proposedByUserId: user.id, proposedByAvatar: user.profileImageUrl ?? null,
  }).returning();
  res.status(201).json({ ...proposal, options: opts, endsAt: proposal.endsAt.toISOString(), createdAt: proposal.createdAt.toISOString(), myVote: null });
});

export default router;
