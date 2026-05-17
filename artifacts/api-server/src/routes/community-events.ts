import { Router } from "express";
import { db } from "@workspace/db";
import { communityEventsTable, communityEventRsvpsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /community-events — all upcoming events
router.get("/community-events", async (req, res): Promise<void> => {
  const events = await db.select().from(communityEventsTable)
    .orderBy(desc(communityEventsTable.date))
    .limit(100);
  if (!req.isAuthenticated()) { res.json({ events, rsvps: [] }); return; }
  const rsvps = await db.select({ eventId: communityEventRsvpsTable.eventId }).from(communityEventRsvpsTable)
    .where(eq(communityEventRsvpsTable.userId, req.user.id));
  res.json({ events, rsvps: rsvps.map(r => r.eventId) });
});

// POST /community-events — create event
router.post("/community-events", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, type, mode, date, time, location, city, artistName, description, link } = req.body;
  if (!title || !date) { res.status(400).json({ error: "title and date required" }); return; }
  const user = req.user;
  const name = artistName || [user.firstName, user.lastName].filter(Boolean).join(" ") || "Artist";
  const [event] = await db.insert(communityEventsTable).values({
    id: crypto.randomUUID(), userId: user.id, title,
    type: type ?? "meetup", mode: mode ?? "in-person", date,
    time: time ?? null, location: location ?? null, city: city ?? null,
    artistName: name, description: description ?? null, link: link ?? null,
  }).returning();
  res.status(201).json(event);
});

// POST /community-events/:id/rsvp — toggle RSVP
router.post("/community-events/:id/rsvp", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const eventId = req.params.id;
  const existing = await db.select().from(communityEventRsvpsTable)
    .where(and(eq(communityEventRsvpsTable.eventId, eventId), eq(communityEventRsvpsTable.userId, userId)));
  if (existing.length > 0) {
    await db.delete(communityEventRsvpsTable)
      .where(and(eq(communityEventRsvpsTable.eventId, eventId), eq(communityEventRsvpsTable.userId, userId)));
    await db.update(communityEventsTable).set({ attendees: sql`${communityEventsTable.attendees} - 1` }).where(eq(communityEventsTable.id, eventId));
    res.json({ rsvped: false });
  } else {
    await db.insert(communityEventRsvpsTable).values({ eventId, userId }).onConflictDoNothing();
    await db.update(communityEventsTable).set({ attendees: sql`${communityEventsTable.attendees} + 1` }).where(eq(communityEventsTable.id, eventId));
    res.json({ rsvped: true });
  }
});

// DELETE /community-events/:id
router.delete("/community-events/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [event] = await db.select().from(communityEventsTable).where(eq(communityEventsTable.id, req.params.id));
  if (!event || event.userId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(communityEventRsvpsTable).where(eq(communityEventRsvpsTable.eventId, req.params.id));
  await db.delete(communityEventsTable).where(eq(communityEventsTable.id, req.params.id));
  res.json({ ok: true });
});

export default router;
