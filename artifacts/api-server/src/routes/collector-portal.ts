import { Router } from "express";
import { db } from "@workspace/db";
import { collectorSavesTable, collectorNotesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// GET /me/collector-saves — list saved listing IDs + notes
router.get("/me/collector-saves", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  try {
    const [saves, notes] = await Promise.all([
      db.select({ listingId: collectorSavesTable.listingId })
        .from(collectorSavesTable).where(eq(collectorSavesTable.userId, userId)),
      db.select({ listingId: collectorNotesTable.listingId, content: collectorNotesTable.content })
        .from(collectorNotesTable).where(eq(collectorNotesTable.userId, userId)),
    ]);
    const notesMap: Record<string, string> = {};
    notes.forEach(n => { notesMap[n.listingId] = n.content; });
    res.json({ savedIds: saves.map(s => s.listingId), notes: notesMap });
  } catch (err) {
    logger.error({ err }, "collector-saves GET error");
    res.status(500).json({ error: "Failed to load" });
  }
});

// POST /me/collector-saves/:listingId — toggle save
router.post("/me/collector-saves/:listingId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const { listingId } = req.params;
  try {
    const existing = await db.select({ listingId: collectorSavesTable.listingId })
      .from(collectorSavesTable)
      .where(and(eq(collectorSavesTable.userId, userId), eq(collectorSavesTable.listingId, listingId)));
    if (existing.length > 0) {
      await db.delete(collectorSavesTable)
        .where(and(eq(collectorSavesTable.userId, userId), eq(collectorSavesTable.listingId, listingId)));
      res.json({ saved: false });
    } else {
      await db.insert(collectorSavesTable).values({ userId, listingId });
      res.json({ saved: true });
    }
  } catch (err) {
    logger.error({ err }, "collector-saves POST error");
    res.status(500).json({ error: "Failed to toggle" });
  }
});

// PUT /me/collector-notes/:listingId — save note for a listing
router.put("/me/collector-notes/:listingId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const { listingId } = req.params;
  const { content } = req.body as { content: string };
  try {
    await db.insert(collectorNotesTable)
      .values({ userId, listingId, content: content ?? "" })
      .onConflictDoUpdate({
        target: [collectorNotesTable.userId, collectorNotesTable.listingId],
        set: { content: content ?? "" },
      });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "collector-notes PUT error");
    res.status(500).json({ error: "Failed to save note" });
  }
});

export default router;
