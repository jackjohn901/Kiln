import { Router } from "express";
import { db } from "@workspace/db";
import { priceAlertsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { logger } from "../lib/logger";

const router = Router();

// GET /me/price-alerts — list all price alerts for the user
router.get("/me/price-alerts", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  try {
    const rows = await db.select().from(priceAlertsTable).where(eq(priceAlertsTable.userId, userId));
    const alertsMap: Record<string, number> = {};
    rows.forEach(r => { alertsMap[r.listingId] = r.targetPrice; });
    res.json({ alerts: alertsMap });
  } catch (err) {
    logger.error({ err }, "price-alerts GET error");
    res.status(500).json({ error: "Failed to load" });
  }
});

// POST /me/price-alerts/:listingId — set/update a price alert
router.post("/me/price-alerts/:listingId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const { listingId } = req.params;
  const { targetPrice } = req.body as { targetPrice: number };
  if (typeof targetPrice !== "number" || targetPrice <= 0) {
    res.status(400).json({ error: "targetPrice must be a positive number" }); return;
  }
  try {
    await db.insert(priceAlertsTable)
      .values({ id: crypto.randomUUID(), userId, listingId, targetPrice: Math.round(targetPrice) })
      .onConflictDoUpdate({
        target: [priceAlertsTable.userId, priceAlertsTable.listingId],
        set: { targetPrice: Math.round(targetPrice) },
      });
    res.json({ ok: true, targetPrice });
  } catch (err) {
    logger.error({ err }, "price-alerts POST error");
    res.status(500).json({ error: "Failed to save alert" });
  }
});

// DELETE /me/price-alerts/:listingId — remove a price alert
router.delete("/me/price-alerts/:listingId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const { listingId } = req.params;
  try {
    await db.delete(priceAlertsTable)
      .where(and(eq(priceAlertsTable.userId, userId), eq(priceAlertsTable.listingId, listingId)));
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "price-alerts DELETE error");
    res.status(500).json({ error: "Failed to delete alert" });
  }
});

export default router;
