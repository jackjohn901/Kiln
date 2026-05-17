import { Router } from "express";
import { db } from "@workspace/db";
import { ghostPiecesTable, ghostUpdatesTable, ghostSubscribersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /ghost-mode/pieces — my pieces
router.get("/ghost-mode/pieces", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const pieces = await db.select().from(ghostPiecesTable)
    .where(eq(ghostPiecesTable.userId, req.user.id))
    .orderBy(desc(ghostPiecesTable.createdAt));
  const result = [];
  for (const p of pieces) {
    const updates = await db.select().from(ghostUpdatesTable)
      .where(eq(ghostUpdatesTable.pieceId, p.id))
      .orderBy(desc(ghostUpdatesTable.createdAt));
    const [subRow] = await db.select({ count: sql<number>`count(*)` }).from(ghostSubscribersTable)
      .where(eq(ghostSubscribersTable.pieceId, p.id));
    const subCount = Number(subRow?.count ?? 0);
    result.push({ ...p, updates, subscriberCount: subCount });
  }
  res.json({ pieces: result });
});

// POST /ghost-mode/pieces — register a piece
router.post("/ghost-mode/pieces", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, medium, soldTo, soldAt, imageUrl } = req.body;
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const [piece] = await db.insert(ghostPiecesTable).values({
    id: crypto.randomUUID(), userId: req.user.id, title,
    medium: medium ?? null, soldTo: soldTo ?? null,
    soldAt: soldAt ?? null, imageUrl: imageUrl ?? null,
  }).returning();
  res.status(201).json({ ...piece, updates: [] });
});

// DELETE /ghost-mode/pieces/:id
router.delete("/ghost-mode/pieces/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [piece] = await db.select().from(ghostPiecesTable).where(eq(ghostPiecesTable.id, req.params.id));
  if (!piece || piece.userId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(ghostUpdatesTable).where(eq(ghostUpdatesTable.pieceId, req.params.id));
  await db.delete(ghostPiecesTable).where(eq(ghostPiecesTable.id, req.params.id));
  res.json({ ok: true });
});

// POST /ghost-mode/pieces/:id/updates — add update
router.post("/ghost-mode/pieces/:id/updates", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [piece] = await db.select().from(ghostPiecesTable).where(eq(ghostPiecesTable.id, req.params.id));
  if (!piece || piece.userId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  const { type, content, imageUrl } = req.body;
  if (!content) { res.status(400).json({ error: "content required" }); return; }
  const [update] = await db.insert(ghostUpdatesTable).values({
    id: crypto.randomUUID(), pieceId: req.params.id,
    authorId: req.user.id, type: type ?? "note",
    content, imageUrl: imageUrl ?? null,
  }).returning();
  res.status(201).json(update);
});

// POST /ghost-mode/pieces/:id/subscribe — subscribe/unsubscribe
router.post("/ghost-mode/pieces/:id/subscribe", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const pieceId = req.params.id;
  const existing = await db.select().from(ghostSubscribersTable)
    .where(and(eq(ghostSubscribersTable.pieceId, pieceId), eq(ghostSubscribersTable.userId, userId)));
  if (existing.length > 0) {
    await db.delete(ghostSubscribersTable)
      .where(and(eq(ghostSubscribersTable.pieceId, pieceId), eq(ghostSubscribersTable.userId, userId)));
    res.json({ subscribed: false });
  } else {
    await db.insert(ghostSubscribersTable).values({ pieceId, userId });
    res.json({ subscribed: true });
  }
});

export default router;
