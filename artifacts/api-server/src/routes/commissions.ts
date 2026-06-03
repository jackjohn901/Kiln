import { Router } from "express";
import { db } from "@workspace/db";
import { commissionsTable, commissionUpdatesTable, notificationsTable, usersTable, userSettingsTable } from "@workspace/db";
import { eq, or, desc, asc } from "drizzle-orm";
import crypto from "crypto";
import { sendEmailWithRetry, newCommissionEmail, commissionUpdateEmail, commissionQuotedEmail } from "../lib/email";
import { generateUnsubscribeToken } from "../lib/unsubscribeTokens";
import { isEmailPaused, prependSnoozeRecap } from "../lib/emailPaused";

const STORAGE_PATH_RE = /^\/api\/storage\/objects\/[a-zA-Z0-9_\-/.]+$/;

const router = Router();

// POST /commissions — submit a commission request
router.post("/commissions", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { artistId, artistName, workType, description, budgetRange, timeline, dimensions, referenceUrls } = req.body;
  if (!artistId || !description) { res.status(400).json({ error: "artistId and description required" }); return; }
  const MAX_REF_IMAGES = 5;
  if (referenceUrls !== undefined && referenceUrls !== null) {
    if (!Array.isArray(referenceUrls)) {
      res.status(400).json({ error: "referenceUrls must be an array" }); return;
    }
    if (referenceUrls.length > MAX_REF_IMAGES) {
      res.status(400).json({ error: `referenceUrls may contain at most ${MAX_REF_IMAGES} images` }); return;
    }
    for (const url of referenceUrls) {
      if (typeof url !== "string" || !STORAGE_PATH_RE.test(url)) {
        res.status(400).json({ error: "Each referenceUrl must be a same-origin storage path (/api/storage/objects/…)" }); return;
      }
    }
  }
  try {
    const user = req.user;
    const clientName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Collector";
    const [commission] = await db.insert(commissionsTable).values({
      id: crypto.randomUUID(), artistId, artistName: artistName ?? "Artist",
      clientId: user.id, clientName, clientEmail: user.email ?? undefined,
      workType, description, budgetRange, timeline, dimensions,
      referenceUrls: referenceUrls ?? [], status: "pending",
    }).returning();
    const commissionNotifId = crypto.randomUUID();
    await db.insert(notificationsTable).values({ id: commissionNotifId, userId: artistId, type: "commission", fromId: user.id, fromName: clientName, fromAvatarUrl: user.profileImageUrl ?? null, text: `sent you a commission request`, link: `/commissions/${commission.id}` });
    const [[artistUser], [artistSettings]] = await Promise.all([
      db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, artistId)),
      db.select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt }).from(userSettingsTable).where(eq(userSettingsTable.userId, artistId)),
    ]);
    const emailSettings = (artistSettings?.settings as Record<string, unknown> | null);
    const emailSnoozed = isEmailPaused(emailSettings, artistSettings?.notifEmailResumeAt);
    const wantsEmail = !emailSnoozed && emailSettings?.notif_email_new_commission !== false;
    if (emailSnoozed) {
      db.update(notificationsTable).set({ emailSkipped: true }).where(eq(notificationsTable.id, commissionNotifId)).catch(() => {});
    }
    if (wantsEmail && artistUser?.email) {
      const unsubToken = generateUnsubscribeToken(artistId);
      const unsubscribeUrl = `https://kilndrop.com/api/unsubscribe/commissions?token=${encodeURIComponent(unsubToken)}`;
      const commissionHtml = await prependSnoozeRecap(artistId, newCommissionEmail(clientName, workType ?? "", description, commission.id, unsubscribeUrl));
      await sendEmailWithRetry({ to: artistUser.email, subject: `New commission request from ${clientName}`, html: commissionHtml }, { label: "new commission notification" });
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

// GET /commissions/:id/updates — fetch the update thread for a commission
router.get("/commissions/:id/updates", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [commission] = await db.select({ artistId: commissionsTable.artistId, clientId: commissionsTable.clientId })
    .from(commissionsTable).where(eq(commissionsTable.id, req.params.id));
  if (!commission) { res.status(404).json({ error: "Not found" }); return; }
  if (commission.artistId !== req.user.id && commission.clientId !== req.user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  const updates = await db.select().from(commissionUpdatesTable)
    .where(eq(commissionUpdatesTable.commissionId, req.params.id))
    .orderBy(asc(commissionUpdatesTable.createdAt));
  res.json({ updates: updates.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })) });
});

// POST /commissions/:id/updates — post a new update to a commission thread
router.post("/commissions/:id/updates", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [commission] = await db.select().from(commissionsTable).where(eq(commissionsTable.id, req.params.id));
  if (!commission) { res.status(404).json({ error: "Not found" }); return; }

  const isArtist = commission.artistId === req.user.id;
  const isClient = commission.clientId === req.user.id;
  if (!isArtist && !isClient) { res.status(403).json({ error: "Forbidden" }); return; }

  const { text, attachmentUrl, milestone } = req.body;
  if (!text && !attachmentUrl) {
    res.status(400).json({ error: "text or attachmentUrl is required" }); return;
  }

  if (attachmentUrl !== undefined && attachmentUrl !== null && !STORAGE_PATH_RE.test(attachmentUrl)) {
    res.status(400).json({ error: "Invalid attachmentUrl — must be a storage object path" }); return;
  }

  // Only artists may set milestone labels on their updates
  if (milestone !== undefined && !isArtist) {
    res.status(403).json({ error: "Only artists may set a milestone on updates" }); return;
  }

  const user = req.user;
  const authorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";

  const [update] = await db.insert(commissionUpdatesTable).values({
    id: crypto.randomUUID(),
    commissionId: commission.id,
    authorId: user.id,
    authorName,
    text: text ?? null,
    attachmentUrl: attachmentUrl ?? null,
    milestone: milestone ?? null,
  }).returning();

  // Notify the other party
  const recipientId = isArtist ? commission.clientId : commission.artistId;
  const notifText = attachmentUrl && !text
    ? `shared a photo on your commission`
    : `sent an update on your commission`;
  await db.insert(notificationsTable).values({
    id: crypto.randomUUID(), userId: recipientId, type: "commission",
    fromId: user.id, fromName: authorName, fromAvatarUrl: user.profileImageUrl ?? null,
    text: notifText, link: `/commission-tracker`,
  });

  res.status(201).json({ ...update, createdAt: update.createdAt.toISOString() });
});

// PATCH /commissions/:id — update commission state with per-role field authorization.
// Artist fields: status (quoted/declined/in_progress/revision/completed), quotedPrice, artistNotes, milestone, estimatedDelivery.
// Client fields: status (accepted/cancelled/countered only). When countered, may also send counterPrice and counterNote.
// Payment flags (depositPaid, finalPaid) are set exclusively by Stripe webhook handlers and cannot be set here by either party.
router.patch("/commissions/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [commission] = await db.select().from(commissionsTable).where(eq(commissionsTable.id, req.params.id));
  if (!commission) { res.status(404).json({ error: "Not found" }); return; }

  const isArtist = commission.artistId === req.user.id;
  const isClient = commission.clientId === req.user.id;
  if (!isArtist && !isClient) { res.status(403).json({ error: "Forbidden" }); return; }

  const { status, quotedPrice, artistNotes, milestone, estimatedDelivery, counterPrice, counterNote } = req.body;

  // Determine the effective role. Artist takes precedence when both flags are true
  // (e.g. a self-commission edge case), ensuring the status whitelist always fires.
  const effectiveRole: "artist" | "client" = isArtist ? "artist" : "client";

  const ARTIST_STATUSES = new Set(["quoted", "declined", "in_progress", "revision", "completed"]);
  // Artists may also accept a buyer's counter-offer (status countered → accepted)
  if (commission.status === "countered") ARTIST_STATUSES.add("accepted");
  const CLIENT_STATUSES = new Set(["accepted", "cancelled", "countered"]);

  if (status !== undefined) {
    if (effectiveRole === "artist" && !ARTIST_STATUSES.has(status)) {
      res.status(403).json({ error: "Artists may only set status to: quoted, declined, in_progress, revision, completed (or accepted when buyer has countered)" }); return;
    }
    if (effectiveRole === "client" && !CLIENT_STATUSES.has(status)) {
      res.status(403).json({ error: "Clients may only set status to: accepted, cancelled, countered" }); return;
    }
  }

  // Clients may not touch artist-only fields
  if (effectiveRole === "client") {
    if (quotedPrice !== undefined || artistNotes !== undefined || milestone !== undefined || estimatedDelivery !== undefined) {
      res.status(403).json({ error: "Clients may not update artist fields (quotedPrice, artistNotes, milestone, estimatedDelivery)" }); return;
    }
  }

  // Counter-offer validation: counterPrice and counterNote are client-only, only valid when countering
  if (counterPrice !== undefined || counterNote !== undefined) {
    if (effectiveRole !== "client") {
      res.status(403).json({ error: "Only clients may set counterPrice / counterNote" }); return;
    }
    if (status !== "countered") {
      res.status(400).json({ error: "counterPrice / counterNote may only be set when status is 'countered'" }); return;
    }
    if (counterPrice !== undefined && (typeof counterPrice !== "number" || counterPrice <= 0)) {
      res.status(400).json({ error: "counterPrice must be a positive number" }); return;
    }
  }

  const artistUpdate = effectiveRole === "artist" ? {
    ...(quotedPrice !== undefined && { quotedPrice: Number(quotedPrice) }),
    ...(artistNotes !== undefined && { artistNotes }),
    ...(milestone !== undefined && { milestone }),
    ...(estimatedDelivery && { estimatedDelivery: new Date(estimatedDelivery) }),
  } : {};

  const clientUpdate = effectiveRole === "client" && status === "countered" ? {
    ...(counterPrice !== undefined && { counterPrice: Math.round(Number(counterPrice)) }),
    counterNote: typeof counterNote === "string" ? counterNote.trim() || null : null,
  } : {};

  const [updated] = await db.update(commissionsTable).set({
    ...(status !== undefined && { status }),
    ...artistUpdate,
    ...clientUpdate,
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
    await db.insert(notificationsTable).values({ id: crypto.randomUUID(), userId: commission.clientId, type: "commission", fromId: req.user.id, fromName: commission.artistName, fromAvatarUrl: req.user.profileImageUrl ?? null, text: notifText, link: `/commissions/${commission.id}` });
    const clientEmail = commission.clientEmail ?? (await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, commission.clientId)).then(r => r[0]?.email));
    if (clientEmail) {
      const effectivePrice = updated.quotedPrice ?? commission.quotedPrice;
      if (status === "quoted" && effectivePrice != null) {
        await sendEmailWithRetry({
          to: clientEmail,
          subject: `You have a quote from ${commission.artistName}`,
          html: commissionQuotedEmail(
            commission.artistName,
            commission.workType ?? "",
            effectivePrice,
            "USD",
            updated.artistNotes ?? commission.artistNotes ?? null,
          ),
        }, { label: "commission quoted notification" });
      } else {
        await sendEmailWithRetry({ to: clientEmail, subject: `Commission update from ${commission.artistName}`, html: commissionUpdateEmail(commission.artistName, status, commission.workType ?? "") }, { label: "commission update notification" });
      }
    }
  }

  // When a client submits a counter-offer: auto-post an update thread message and notify the artist
  if (status === "countered" && isClient && !isArtist) {
    const user = req.user;
    const authorName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Client";
    const priceStr = updated.counterPrice != null ? `$${updated.counterPrice.toLocaleString()}` : "(no price specified)";
    const noteStr = updated.counterNote ? `\n\n"${updated.counterNote}"` : "";
    const updateText = `Counter offer: ${priceStr}${noteStr}`;
    await db.insert(commissionUpdatesTable).values({
      id: crypto.randomUUID(),
      commissionId: commission.id,
      authorId: user.id,
      authorName,
      text: updateText,
    });
    await db.insert(notificationsTable).values({
      id: crypto.randomUUID(),
      userId: commission.artistId,
      type: "commission",
      fromId: user.id,
      fromName: authorName,
      fromAvatarUrl: user.profileImageUrl ?? null,
      text: `sent a counter offer on your commission`,
      link: `/commission-tracker?highlight=${commission.id}`,
    });
  }

  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString(), estimatedDelivery: updated.estimatedDelivery?.toISOString() ?? null });
});

export default router;
