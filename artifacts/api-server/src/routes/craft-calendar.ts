import { Router } from "express";
import { db } from "@workspace/db";
import { craftCalendarEventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /craft-calendar/events — my custom events
router.get("/craft-calendar/events", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.json({ events: [] }); return; }
  const events = await db.select().from(craftCalendarEventsTable)
    .where(eq(craftCalendarEventsTable.userId, req.user.id))
    .orderBy(desc(craftCalendarEventsTable.date));
  res.json({ events });
});

// POST /craft-calendar/events — create custom event
router.post("/craft-calendar/events", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, date, type, location, description, url, color } = req.body;
  if (!title || !date) { res.status(400).json({ error: "title and date required" }); return; }
  const [event] = await db.insert(craftCalendarEventsTable).values({
    id: crypto.randomUUID(), userId: req.user.id, title, date,
    type: type ?? "custom", location: location ?? null,
    description: description ?? null, url: url ?? null, color: color ?? null,
  }).returning();
  res.status(201).json(event);
});

// DELETE /craft-calendar/events/:id
router.delete("/craft-calendar/events/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [event] = await db.select().from(craftCalendarEventsTable).where(eq(craftCalendarEventsTable.id, req.params.id));
  if (!event || event.userId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(craftCalendarEventsTable).where(eq(craftCalendarEventsTable.id, req.params.id));
  res.json({ ok: true });
});

export default router;
