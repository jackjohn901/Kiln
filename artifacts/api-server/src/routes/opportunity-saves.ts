import { Router } from "express";
import { db } from "@workspace/db";
import { opportunitySavesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// GET /me/opportunity-saves — list saved opps and their statuses
router.get("/me/opportunity-saves", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  try {
    const rows = await db.select({
      opportunityId: opportunitySavesTable.opportunityId,
      status: opportunitySavesTable.status,
    }).from(opportunitySavesTable).where(eq(opportunitySavesTable.userId, userId));

    const savedIds = rows.map(r => r.opportunityId);
    const applications: Record<string, string> = {};
    rows.filter(r => r.status !== "saved").forEach(r => { applications[r.opportunityId] = r.status; });
    res.json({ savedIds, applications });
  } catch (err) {
    logger.error({ err }, "opportunity-saves GET error");
    res.status(500).json({ error: "Failed to load" });
  }
});

// POST /me/opportunity-saves/:id — toggle save
router.post("/me/opportunity-saves/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const opportunityId = req.params.id;
  try {
    const existing = await db.select({ opportunityId: opportunitySavesTable.opportunityId, status: opportunitySavesTable.status })
      .from(opportunitySavesTable)
      .where(and(eq(opportunitySavesTable.userId, userId), eq(opportunitySavesTable.opportunityId, opportunityId)));

    if (existing.length > 0 && existing[0].status === "saved") {
      await db.delete(opportunitySavesTable)
        .where(and(eq(opportunitySavesTable.userId, userId), eq(opportunitySavesTable.opportunityId, opportunityId)));
      res.json({ saved: false });
    } else if (existing.length === 0) {
      await db.insert(opportunitySavesTable).values({ userId, opportunityId, status: "saved" });
      res.json({ saved: true });
    } else {
      res.json({ saved: true, status: existing[0].status });
    }
  } catch (err) {
    logger.error({ err }, "opportunity-saves POST error");
    res.status(500).json({ error: "Failed to toggle" });
  }
});

// PATCH /me/opportunity-status/:id — update application status
router.patch("/me/opportunity-status/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const opportunityId = req.params.id;
  const { status } = req.body as { status: string };
  const VALID = ["saved", "applied", "submitted", "accepted", "declined"];
  if (!VALID.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  try {
    await db.insert(opportunitySavesTable)
      .values({ userId, opportunityId, status })
      .onConflictDoUpdate({
        target: [opportunitySavesTable.userId, opportunitySavesTable.opportunityId],
        set: { status },
      });
    res.json({ ok: true, status });
  } catch (err) {
    logger.error({ err }, "opportunity-status PATCH error");
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
