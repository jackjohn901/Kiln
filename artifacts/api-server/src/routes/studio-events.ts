import { Router, type IRouter } from "express";
import { db, studioEventsTable } from "@workspace/db";
import { eq, gte, sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET /studio-events → list upcoming events (public)
router.get("/studio-events", async (_req, res): Promise<void> => {
  try {
    const events = await db
      .select()
      .from(studioEventsTable)
      .where(eq(studioEventsTable.status, "upcoming"))
      .orderBy(studioEventsTable.eventDate);
    res.json(events);
  } catch (error) {
    logger.error({ error }, "Failed to fetch studio events");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /artists/:artistId/studio-events → artist's events
router.get("/artists/:artistId/studio-events", async (req, res): Promise<void> => {
  const { artistId } = req.params;
  try {
    const events = await db
      .select()
      .from(studioEventsTable)
      .where(eq(studioEventsTable.artistId, artistId))
      .orderBy(studioEventsTable.eventDate);
    res.json(events);
  } catch (error) {
    logger.error({ error, artistId }, "Failed to fetch artist studio events");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /studio-events → create event (auth required)
router.post("/studio-events", authMiddleware, async (req: any, res): Promise<void> => {
  const { title, description, eventDate, durationMins, maxAttendees, price, location, address, isVirtual } = req.body;
  
  if (!title || !description || !eventDate || !durationMins || !location || !address) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const [event] = await db.insert(studioEventsTable).values({
      artistId: req.user.id,
      artistName: req.user.name || req.user.username || "Artist",
      artistAvatarUrl: req.user.avatarUrl,
      title,
      description,
      eventDate: new Date(eventDate),
      durationMins: parseInt(durationMins, 10),
      maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : 20,
      price: price ? parseInt(price, 10) : 0,
      location,
      address,
      isVirtual: !!isVirtual,
      status: "upcoming"
    }).returning();

    res.status(201).json(event);
  } catch (error) {
    logger.error({ error }, "Failed to create studio event");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /studio-events/:id/attend → RSVP (auth required, inc attendee_count)
router.post("/studio-events/:id/attend", authMiddleware, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const [event] = await db
      .update(studioEventsTable)
      .set({
        attendeeCount: sql`${studioEventsTable.attendeeCount} + 1`
      })
      .where(eq(studioEventsTable.id, rawId))
      .returning();

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    res.json(event);
  } catch (error) {
    logger.error({ error, id: rawId }, "Failed to attend studio event");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /studio-events/:id/attend → cancel RSVP (dec attendee_count)
router.delete("/studio-events/:id/attend", authMiddleware, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  try {
    const [event] = await db
      .update(studioEventsTable)
      .set({
        attendeeCount: sql`GREATEST(0, ${studioEventsTable.attendeeCount} - 1)`
      })
      .where(eq(studioEventsTable.id, rawId))
      .returning();

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    res.json(event);
  } catch (error) {
    logger.error({ error, id: rawId }, "Failed to cancel RSVP");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
