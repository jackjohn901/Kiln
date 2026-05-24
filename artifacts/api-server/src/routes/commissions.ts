import { Router } from "express";
import { db } from "@workspace/db";
import { commissionsTable, notificationsTable, usersTable, userSettingsTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import crypto from "crypto";
import { sendEmail, newCommissionEmail, commissionUpdateEmail } from "../lib/email";

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
    await db.insert(notificationsTable).values({ id: crypto.randomUUID(), userId: artistId, type: "commission", fromId: user.id, fromName: clientName, fromAvatarUrl: user.profileImageUrl ?? null, text: `sent you a commission request`, link: `/commissions/${commission.id}` });
    const [[artistUser], [artistSettings]] = await Promise.all([
      db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, artistId)),
      db.select({ settings: userSettingsTable.settings }).from(userSettingsTable).where(eq(userSettingsTable.userId, artistId)),
    ]);
    const emailSettings = (artistSettings?.settings as Record<string, boolean> | null);
    const wantsEmail = emailSettings?.notif_email_paused !== true && emailSettings?.notif_email_new_commission !== false;
    if (wantsEmail && artistUser?.email) {
      sendEmail({ to: artistUser.email, subject: `New commission request from ${clientName}`, html: newCommissionEmail(clientName, workType ?? "", description) }).catch(() => {});
    }
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

// GET /commissions/:id — fetch a single commission (artist or client only)
router.get("/commissions/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [commission] = await db.select().from(commissionsTable).where(eq(commissionsTable.id, req.params.id));
  if (!commission) { res.status(404).json({ error: "Not found" }); return; }
  if (commission.artistId !== req.user.id && commission.clientId !== req.user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  res.json({ ...commission, createdAt: commission.createdAt.toISOString(), updatedAt: commission.updatedAt.toISOString(), estimatedDelivery: commission.estimatedDelivery?.toISOString() ?? null });
});

// PATCH /commissions/:id — update commission state with per-role field authorization.
// Artist fields: status (quoted/declined/in_progress/revision/completed), quotedPrice, artistNotes, milestone, estimatedDelivery.
// Client fields: status (accepted/cancelled only — to accept a quote or cancel the request).
// Payment flags (depositPaid, finalPaid) are set exclusively by Stripe webhook handlers and cannot be set here by either party.
router.patch("/commissions/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [commission] = await db.select().from(commissionsTable).where(eq(commissionsTable.id, req.params.id));
  if (!commission) { res.status(404).json({ error: "Not found" }); return; }

  const isArtist = commission.artistId === req.user.id;
  const isClient = commission.clientId === req.user.id;
  if (!isArtist && !isClient) { res.status(403).json({ error: "Forbidden" }); return; }

  const { status, quotedPrice, artistNotes, milestone, estimatedDelivery } = req.body;

  // Determine the effective role. Artist takes precedence when both flags are true
  // (e.g. a self-commission edge case), ensuring the status whitelist always fires.
  const effectiveRole: "artist" | "client" = isArtist ? "artist" : "client";

  const ARTIST_STATUSES = new Set(["quoted", "declined", "in_progress", "revision", "completed"]);
  const CLIENT_STATUSES = new Set(["accepted", "cancelled"]);

  if (status !== undefined) {
    if (effectiveRole === "artist" && !ARTIST_STATUSES.has(status)) {
      res.status(403).json({ error: "Artists may only set status to: quoted, declined, in_progress, revision, completed" }); return;
    }
    if (effectiveRole === "client" && !CLIENT_STATUSES.has(status)) {
      res.status(403).json({ error: "Clients may only set status to: accepted, cancelled" }); return;
    }
  }

  // Clients may not touch artist-only fields
  if (effectiveRole === "client") {
    if (quotedPrice !== undefined || artistNotes !== undefined || milestone !== undefined || estimatedDelivery !== undefined) {
      res.status(403).json({ error: "Clients may not update artist fields (quotedPrice, artistNotes, milestone, estimatedDelivery)" }); return;
    }
  }

  const artistUpdate = effectiveRole === "artist" ? {
    ...(quotedPrice !== undefined && { quotedPrice: Number(quotedPrice) }),
    ...(artistNotes !== undefined && { artistNotes }),
    ...(milestone !== undefined && { milestone }),
    ...(estimatedDelivery && { estimatedDelivery: new Date(estimatedDelivery) }),
  } : {};

  const [updated] = await db.update(commissionsTable).set({
    ...(status !== undefined && { status }),
    ...artistUpdate,
  }).where(eq(commissionsTable.id, req.params.id)).returning();

  if (status && isArtist && !isClient) {
    const notifText = status === "quoted"
      ? `sent you a quote for your commission`
      : status === "in_progress"
      ? `accepted your commission and started work`
      : status === "completed"
      ? `marked your commission as completed`
      : status === "declined"
      ? `declined your commission request`
      : `updated your commission: ${status}`;
    await db.insert(notificationsTable).values({ id: crypto.randomUUID(), userId: commission.clientId, type: "commission", fromId: req.user.id, fromName: commission.artistName, fromAvatarUrl: req.user.profileImageUrl ?? null, text: notifText, link: `/commissions` });
    const clientEmail = commission.clientEmail ?? (await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, commission.clientId)).then(r => r[0]?.email));
    if (clientEmail) {
      sendEmail({ to: clientEmail, subject: `Commission update from ${commission.artistName}`, html: commissionUpdateEmail(commission.artistName, status, commission.workType ?? "") }).catch(() => {});
    }
  }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(), estimatedDelivery: updated.estimatedDelivery?.toISOString() ?? null });
});

export default router;
