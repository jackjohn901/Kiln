import { Router } from "express";
import { db } from "@workspace/db";
import { inspirationBoardsTable, inspirationBoardItemsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /inspiration-boards — my boards with items
router.get("/inspiration-boards", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const boards = await db.select().from(inspirationBoardsTable)
    .where(eq(inspirationBoardsTable.userId, req.user.id))
    .orderBy(desc(inspirationBoardsTable.updatedAt));
  const result = [];
  for (const b of boards) {
    const items = await db.select().from(inspirationBoardItemsTable)
      .where(eq(inspirationBoardItemsTable.boardId, b.id))
      .orderBy(desc(inspirationBoardItemsTable.addedAt));
    result.push({ ...b, items });
  }
  res.json({ boards: result });
});

// POST /inspiration-boards — create board
router.post("/inspiration-boards", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, description, isPrivate } = req.body;
  if (!name) { res.status(400).json({ error: "name required" }); return; }
  const [board] = await db.insert(inspirationBoardsTable).values({
    id: crypto.randomUUID(), userId: req.user.id, name,
    description: description ?? null, isPrivate: isPrivate ?? false,
  }).returning();
  res.status(201).json({ ...board, items: [] });
});

// PATCH /inspiration-boards/:id
router.patch("/inspiration-boards/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [board] = await db.select().from(inspirationBoardsTable).where(eq(inspirationBoardsTable.id, req.params.id));
  if (!board || board.userId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, description, isPrivate, coverUrl } = req.body;
  const [updated] = await db.update(inspirationBoardsTable).set({
    ...(name && { name }),
    ...(description !== undefined && { description }),
    ...(isPrivate !== undefined && { isPrivate }),
    ...(coverUrl !== undefined && { coverUrl }),
  }).where(eq(inspirationBoardsTable.id, req.params.id)).returning();
  res.json(updated);
});

// DELETE /inspiration-boards/:id
router.delete("/inspiration-boards/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [board] = await db.select().from(inspirationBoardsTable).where(eq(inspirationBoardsTable.id, req.params.id));
  if (!board || board.userId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(inspirationBoardItemsTable).where(eq(inspirationBoardItemsTable.boardId, req.params.id));
  await db.delete(inspirationBoardsTable).where(eq(inspirationBoardsTable.id, req.params.id));
  res.json({ ok: true });
});

// POST /inspiration-boards/:id/items — add item
router.post("/inspiration-boards/:id/items", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [board] = await db.select().from(inspirationBoardsTable).where(eq(inspirationBoardsTable.id, req.params.id));
  if (!board || board.userId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  const { imageUrl, title, artistName, artistId, sourceType, sourceId } = req.body;
  const [item] = await db.insert(inspirationBoardItemsTable).values({
    id: crypto.randomUUID(), boardId: req.params.id,
    imageUrl: imageUrl ?? null, title: title ?? null,
    artistName: artistName ?? null, artistId: artistId ?? null,
    sourceType: sourceType ?? null, sourceId: sourceId ?? null,
  }).returning();
  if (!board.coverUrl && imageUrl) {
    await db.update(inspirationBoardsTable).set({ coverUrl: imageUrl }).where(eq(inspirationBoardsTable.id, req.params.id));
  }
  res.status(201).json(item);
});

// DELETE /inspiration-boards/:boardId/items/:itemId
router.delete("/inspiration-boards/:boardId/items/:itemId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [board] = await db.select().from(inspirationBoardsTable).where(eq(inspirationBoardsTable.id, req.params.boardId));
  if (!board || board.userId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(inspirationBoardItemsTable)
    .where(and(eq(inspirationBoardItemsTable.id, req.params.itemId), eq(inspirationBoardItemsTable.boardId, req.params.boardId)));
  res.json({ ok: true });
});

export default router;
