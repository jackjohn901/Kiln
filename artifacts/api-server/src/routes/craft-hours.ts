import { Router } from "express";
import { db } from "@workspace/db";
import { craftHourLogsTable, craftHourGoalsTable } from "@workspace/db";
import { eq, desc, and, sum } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /craft-hours — logs + goal for current user
router.get("/craft-hours", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  try {
    const logs = await db.select().from(craftHourLogsTable)
      .where(eq(craftHourLogsTable.userId, userId))
      .orderBy(desc(craftHourLogsTable.createdAt)).limit(200);
    const [goal] = await db.select().from(craftHourGoalsTable).where(eq(craftHourGoalsTable.userId, userId));
    res.json({
      logs: logs.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
      goal: goal ? { hoursPerWeek: goal.hoursPerWeek, startedAt: goal.updatedAt.toISOString() } : null,
    });
  } catch (err) {
    req.log.error({ err }, "getCraftHours error");
    res.status(500).json({ error: "Failed" });
  }
});

// POST /craft-hours/logs — add a log entry
router.post("/craft-hours/logs", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { date, hours, minutes, technique, note } = req.body;
  if (!date) { res.status(400).json({ error: "date required" }); return; }
  const [log] = await db.insert(craftHourLogsTable).values({
    id: crypto.randomUUID(), userId: req.user.id,
    date, hours: hours ?? 0, minutes: minutes ?? 0,
    technique: technique ?? "", note: note ?? "",
  }).returning();
  res.status(201).json({ ...log, createdAt: log.createdAt.toISOString() });
});

// DELETE /craft-hours/logs/:id
router.delete("/craft-hours/logs/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.delete(craftHourLogsTable)
    .where(and(eq(craftHourLogsTable.id, req.params.id), eq(craftHourLogsTable.userId, req.user.id)));
  res.json({ ok: true });
});

// PATCH /craft-hours/goal
router.patch("/craft-hours/goal", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { hoursPerWeek } = req.body;
  if (!hoursPerWeek) { res.status(400).json({ error: "hoursPerWeek required" }); return; }
  const existing = await db.select().from(craftHourGoalsTable).where(eq(craftHourGoalsTable.userId, req.user.id));
  if (existing.length) {
    await db.update(craftHourGoalsTable).set({ hoursPerWeek: Number(hoursPerWeek), updatedAt: new Date() }).where(eq(craftHourGoalsTable.userId, req.user.id));
  } else {
    await db.insert(craftHourGoalsTable).values({ id: crypto.randomUUID(), userId: req.user.id, hoursPerWeek: Number(hoursPerWeek) });
  }
  res.json({ hoursPerWeek: Number(hoursPerWeek) });
});

export default router;
