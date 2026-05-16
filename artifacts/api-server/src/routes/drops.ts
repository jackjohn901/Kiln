import { Router } from "express";
import { db } from "@workspace/db";
import { dropsTable, dropWaitlistsTable, notificationsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /drops
router.get("/drops", async (req, res): Promise<void> => {
  try {
    const { artistId } = req.query as Record<string, string>;
    let query = db.select().from(dropsTable).$dynamic();
    if (artistId) query = query.where(eq(dropsTable.artistId, artistId));
    const rows = await query.orderBy(desc(dropsTable.dropDate));
    const viewerId = req.isAuthenticated() ? req.user.id : null;
    let waitlistIds = new Set<string>();
    if (viewerId) {
      const w = await db.select({ dropId: dropWaitlistsTable.dropId }).from(dropWaitlistsTable).where(eq(dropWaitlistsTable.userId, viewerId));
      waitlistIds = new Set(w.map(x => x.dropId));
    }
    res.json({ drops: rows.map(d => ({ ...d, isOnWaitlist: waitlistIds.has(d.id), dropDate: d.dropDate.toISOString(), createdAt: d.createdAt.toISOString() })) });
  } catch (err) { req.log.error({ err }, "getDrops error"); res.status(500).json({ error: "Failed to load drops" }); }
});

// GET /drops/:id
router.get("/drops/:id", async (req, res): Promise<void> => {
  const [drop] = await db.select().from(dropsTable).where(eq(dropsTable.id, req.params.id));
  if (!drop) { res.status(404).json({ error: "Not found" }); return; }
  const viewerId = req.isAuthenticated() ? req.user.id : null;
  let isOnWaitlist = false;
  if (viewerId) { const [w] = await db.select().from(dropWaitlistsTable).where(and(eq(dropWaitlistsTable.dropId, drop.id), eq(dropWaitlistsTable.userId, viewerId))); isOnWaitlist = !!w; }
  res.json({ ...drop, isOnWaitlist, dropDate: drop.dropDate.toISOString(), createdAt: drop.createdAt.toISOString() });
});

// POST /drops — create drop
router.post("/drops", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, description, imageUrl, price, edition, dropDate, technique, tags, isPatronEarlyAccess } = req.body;
  if (!title || !price || !dropDate) { res.status(400).json({ error: "title, price, dropDate required" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  const [drop] = await db.insert(dropsTable).values({ id: crypto.randomUUID(), artistId: user.id, artistName: name, artistAvatarUrl: user.profileImageUrl ?? null, title, description, imageUrl, price: Number(price), edition: Number(edition ?? 1), dropDate: new Date(dropDate), technique, tags: tags ?? [], isPatronEarlyAccess: !!isPatronEarlyAccess, status: new Date(dropDate) > new Date() ? "upcoming" : "live" }).returning();
  res.status(201).json({ ...drop, isOnWaitlist: false, dropDate: drop.dropDate.toISOString(), createdAt: drop.createdAt.toISOString() });
});

// POST /drops/:id/waitlist — toggle waitlist
router.post("/drops/:id/waitlist", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id; const dropId = req.params.id;
  const [drop] = await db.select().from(dropsTable).where(eq(dropsTable.id, dropId));
  if (!drop) { res.status(404).json({ error: "Not found" }); return; }
  const [existing] = await db.select().from(dropWaitlistsTable).where(and(eq(dropWaitlistsTable.dropId, dropId), eq(dropWaitlistsTable.userId, userId)));
  if (existing) {
    await db.delete(dropWaitlistsTable).where(and(eq(dropWaitlistsTable.dropId, dropId), eq(dropWaitlistsTable.userId, userId)));
    res.json({ onWaitlist: false }); return;
  }
  await db.insert(dropWaitlistsTable).values({ dropId, userId });
  const user = req.user; const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Someone";
  await db.insert(notificationsTable).values({ id: crypto.randomUUID(), userId: drop.artistId, type: "drop", fromId: userId, fromName: name, fromAvatarUrl: user.profileImageUrl ?? null, text: `joined the waitlist for your drop: ${drop.title}`, link: `/drops` });
  res.json({ onWaitlist: true });
});

export default router;
