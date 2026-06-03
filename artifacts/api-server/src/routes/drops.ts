import { Router } from "express";
import { db } from "@workspace/db";
import { dropsTable, dropWaitlistsTable, notificationsTable, userSettingsTable, profilesTable } from "@workspace/db";
import { sendSmsIfOptedIn } from "../lib/sms";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
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
    // Batch waitlist counts for all drops
    const dropIds = rows.map(d => d.id);
    const countRows = dropIds.length
      ? await db.select({ dropId: dropWaitlistsTable.dropId, count: sql<number>`cast(count(*) as int)` })
          .from(dropWaitlistsTable)
          .where(inArray(dropWaitlistsTable.dropId, dropIds))
          .groupBy(dropWaitlistsTable.dropId)
      : [];
    const waitlistCounts = new Map(countRows.map(r => [r.dropId, r.count]));
    res.json({ drops: rows.map(d => ({ ...d, isOnWaitlist: waitlistIds.has(d.id), waitlistCount: waitlistCounts.get(d.id) ?? 0, dropDate: d.dropDate.toISOString(), createdAt: d.createdAt.toISOString() })) });
  } catch (err) { req.log.error({ err }, "getDrops error"); res.status(500).json({ error: "Failed to load drops" }); }
});

// GET /drops/:id
router.get("/drops/:id", async (req, res): Promise<void> => {
  const [drop] = await db.select().from(dropsTable).where(eq(dropsTable.id, req.params.id));
  if (!drop) { res.status(404).json({ error: "Not found" }); return; }
  const viewerId = req.isAuthenticated() ? req.user.id : null;
  let isOnWaitlist = false;
  if (viewerId) { const [w] = await db.select().from(dropWaitlistsTable).where(and(eq(dropWaitlistsTable.dropId, drop.id), eq(dropWaitlistsTable.userId, viewerId))); isOnWaitlist = !!w; }
  const [countRow] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(dropWaitlistsTable).where(eq(dropWaitlistsTable.dropId, drop.id));
  res.json({ ...drop, isOnWaitlist, waitlistCount: countRow?.count ?? 0, dropDate: drop.dropDate.toISOString(), createdAt: drop.createdAt.toISOString() });
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

// GET /me/drops — my created drops
router.get("/me/drops", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(dropsTable).where(eq(dropsTable.artistId, req.user.id)).orderBy(desc(dropsTable.createdAt));
  res.json({ drops: rows.map(d => ({ ...d, isOnWaitlist: false, dropDate: d.dropDate.toISOString(), createdAt: d.createdAt.toISOString() })) });
});

// DELETE /drops/:id — remove a drop (owner only)
router.delete("/drops/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [drop] = await db.select().from(dropsTable).where(eq(dropsTable.id, req.params.id));
  if (!drop) { res.status(404).json({ error: "Not found" }); return; }
  if (drop.artistId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(dropWaitlistsTable).where(eq(dropWaitlistsTable.dropId, req.params.id));
  await db.delete(dropsTable).where(eq(dropsTable.id, req.params.id));
  res.json({ success: true });
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
  // SMS confirmation to the buyer who joined
  Promise.all([
    db.select({ settings: userSettingsTable.settings, notifSmsResumeAt: userSettingsTable.notifSmsResumeAt }).from(userSettingsTable).where(eq(userSettingsTable.userId, userId)),
    db.select({ phoneNumber: profilesTable.phoneNumber }).from(profilesTable).where(eq(profilesTable.userId, userId)),
  ]).then(([[s], [prof]]) => {
    sendSmsIfOptedIn(userId, prof?.phoneNumber, "notif_sms_drops", s?.settings as Record<string, unknown> | null, `Kiln: You're on the waitlist for "${drop.title}"! We'll text you when it drops. https://kilndrop.com/kiln/drops/${drop.id}`, s?.notifSmsResumeAt);
  }).catch(() => {});
  res.json({ onWaitlist: true });
});

export default router;
