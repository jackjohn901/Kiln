import { Router } from "express";
import { db } from "@workspace/db";
import { beatsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /beats — public beats
router.get("/beats", async (req, res): Promise<void> => {
  const beats = await db.select().from(beatsTable)
    .where(eq(beatsTable.isPublic, true))
    .orderBy(desc(beatsTable.createdAt))
    .limit(50);
  res.json({ beats });
});

// GET /beats/mine — my beats
router.get("/beats/mine", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const beats = await db.select().from(beatsTable)
    .where(eq(beatsTable.userId, req.user.id))
    .orderBy(desc(beatsTable.createdAt));
  res.json({ beats });
});

// POST /beats — save a beat
router.post("/beats", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, bpm, steps, pattern, trackCount, trackVolumes, trackMutes,
    melodyNotes, bassNotes, chordNotes, swing, reverb, license, price, isPublic } = req.body;
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const user = req.user;
  const artistName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  const artistHandle = user.email?.split("@")[0] ?? "artist";
  const [beat] = await db.insert(beatsTable).values({
    id: crypto.randomUUID(), userId: user.id, artistHandle, artistName, title,
    bpm: bpm ?? 120, steps: steps ?? 16, pattern: pattern ?? [],
    trackCount: trackCount ?? 8, trackVolumes: trackVolumes ?? [],
    trackMutes: trackMutes ?? [], melodyNotes: melodyNotes ?? [],
    bassNotes: bassNotes ?? [], chordNotes: chordNotes ?? [],
    swing: swing ?? 0, reverb: reverb ?? 0,
    license: license ?? "free", price: price ?? 0,
    isPublic: isPublic !== false,
  }).returning();
  res.status(201).json(beat);
});

// PATCH /beats/:id — update
router.patch("/beats/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [beat] = await db.select().from(beatsTable).where(eq(beatsTable.id, req.params.id));
  if (!beat || beat.userId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  const { title, bpm, pattern, isPublic, license, price } = req.body;
  const [updated] = await db.update(beatsTable).set({
    ...(title && { title }),
    ...(bpm !== undefined && { bpm }),
    ...(pattern !== undefined && { pattern }),
    ...(isPublic !== undefined && { isPublic }),
    ...(license && { license }),
    ...(price !== undefined && { price }),
  }).where(and(eq(beatsTable.id, req.params.id), eq(beatsTable.userId, req.user.id))).returning();
  res.json(updated);
});

// DELETE /beats/:id
router.delete("/beats/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [beat] = await db.select().from(beatsTable).where(eq(beatsTable.id, req.params.id));
  if (!beat || beat.userId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(beatsTable).where(eq(beatsTable.id, req.params.id));
  res.json({ ok: true });
});

export default router;
