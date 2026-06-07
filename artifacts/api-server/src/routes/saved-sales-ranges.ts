import { Router } from "express";
import { db } from "@workspace/db";
import { savedSalesRangesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

const isValidDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime());

// GET /me/saved-sales-ranges — list saved date ranges for the user
router.get("/me/saved-sales-ranges", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  try {
    const rows = await db.select().from(savedSalesRangesTable)
      .where(eq(savedSalesRangesTable.userId, userId))
      .orderBy(desc(savedSalesRangesTable.createdAt));
    res.json({ ranges: rows.map(r => ({ id: r.id, name: r.name, dateFrom: r.dateFrom, dateTo: r.dateTo })) });
  } catch (err) {
    logger.error({ err }, "saved-sales-ranges GET error");
    res.status(500).json({ error: "Failed to load" });
  }
});

// POST /me/saved-sales-ranges — save a new named date range
router.post("/me/saved-sales-ranges", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const { name, dateFrom, dateTo } = req.body as { name?: string; dateFrom?: string; dateTo?: string };
  const trimmedName = typeof name === "string" ? name.trim() : "";
  if (!trimmedName) { res.status(400).json({ error: "name is required" }); return; }
  if (trimmedName.length > 60) { res.status(400).json({ error: "name is too long" }); return; }
  if (!isValidDate(dateFrom) || !isValidDate(dateTo)) {
    res.status(400).json({ error: "dateFrom and dateTo must be valid YYYY-MM-DD dates" }); return;
  }
  try {
    const id = crypto.randomUUID();
    await db.insert(savedSalesRangesTable).values({ id, userId, name: trimmedName, dateFrom, dateTo });
    res.json({ range: { id, name: trimmedName, dateFrom, dateTo } });
  } catch (err) {
    logger.error({ err }, "saved-sales-ranges POST error");
    res.status(500).json({ error: "Failed to save range" });
  }
});

// DELETE /me/saved-sales-ranges/:id — remove a saved date range
router.delete("/me/saved-sales-ranges/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const { id } = req.params;
  try {
    await db.delete(savedSalesRangesTable)
      .where(and(eq(savedSalesRangesTable.id, id), eq(savedSalesRangesTable.userId, userId)));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "saved-sales-ranges DELETE error");
    res.status(500).json({ error: "Failed to delete range" });
  }
});

export default router;
