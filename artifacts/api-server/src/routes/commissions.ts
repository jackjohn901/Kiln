import { Router } from "express";
import { db } from "@workspace/db";
import { commissionsTable, notificationsTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// POST /commissions — submit a commission request
router.post("/commissions", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { artistId, artistName, workType, description, budgetRange, timeline, dimensions, referenceUrls } = req.body;
  if (!artistId || !description) { res.status(400).json({ error: "artistId and description required" }); return; }
  try {
    const user = req.user;
    const clientName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Collector";
    const [commission] = await db.insert(commissionsTable).values({
      id: crypto.randomUUID(), artistId, artistName: artistName ?? "Artist",
      clientId: user.id, clientName, clientEmail: user.email ?? undefined,
      workType, description, budgetRange, timeline, dimensions,
      referenceUrls: referenceUrls ?? [], status: "pending",
    }).returning();
    await db.insert(notificationsTable).values({ id: crypto.randomUUID(), userId: artistId, type: "commission", fromId: user.id, fromName: clientName, fromAvatarUrl: user.profileImageUrl ?? null, text: `sent you a commission request`, link: `/commissions` });
    res.status(201).json({ ...commission, createdAt: commission.createdAt.toISOString(), updatedAt: commission.updatedAt.toISOString() });
  } catch (err) { req.log.error({ err }, "createCommission error"); res.status(500).json({ error: "Failed to submit commission" }); }
});

// GET /me/commissions — my commissions (as client or artist)
router.get("/me/commissions", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const rows = await db.select().from(commissionsTable)
    .where(or(eq(commissionsTable.clientId, userId), eq(commissionsTable.artistId, userId)))
    .orderBy(desc(commissionsTable.createdAt));
  res.json({ commissions: rows.map(c => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(), estimatedDelivery: c.estimatedDelivery?.toISOString() ?? null })) });
});

// GET /me/commissions/received — commissions I received as artist
router.get("/me/commissions/received", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(commissionsTable).where(eq(commissionsTable.artistId, req.user.id)).orderBy(desc(commissionsTable.createdAt));
  res.json({ commissions: rows.map(c => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(), estimatedDelivery: c.estimatedDelivery?.toISOString() ?? null })) });
});

// PATCH /commissions/:id — update status/quote/milestone (artist only)
router.patch("/commissions/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [commission] = await db.select().from(commissionsTable).where(eq(commissionsTable.id, req.params.id));
  if (!commission) { res.status(404).json({ error: "Not found" }); return; }
  if (commission.artistId !== req.user.id && commission.clientId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  const { status, quotedPrice, artistNotes, milestone, depositPaid, finalPaid, estimatedDelivery } = req.body;
  const [updated] = await db.update(commissionsTable).set({
    ...(status && { status }),
    ...(quotedPrice !== undefined && { quotedPrice: Number(quotedPrice) }),
    ...(artistNotes !== undefined && { artistNotes }),
    ...(milestone !== undefined && { milestone }),
    ...(depositPaid !== undefined && { depositPaid }),
    ...(finalPaid !== undefined && { finalPaid }),
    ...(estimatedDelivery && { estimatedDelivery: new Date(estimatedDelivery) }),
  }).where(eq(commissionsTable.id, req.params.id)).returning();
  if (status && commission.clientId !== req.user.id) {
    await db.insert(notificationsTable).values({ id: crypto.randomUUID(), userId: commission.clientId, type: "commission", fromId: req.user.id, fromName: commission.artistName, fromAvatarUrl: req.user.profileImageUrl ?? null, text: `updated your commission: ${status}`, link: `/commissions` });
  }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(), estimatedDelivery: updated.estimatedDelivery?.toISOString() ?? null });
});

export default router;
