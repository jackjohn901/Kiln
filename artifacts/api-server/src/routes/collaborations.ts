import { Router } from "express";
import { db } from "@workspace/db";
import { listingCollaboratorsTable, listingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { autoPostToConnectedPlatforms } from "../lib/socialAutoPost";

const router = Router();

function serialize(c: typeof listingCollaboratorsTable.$inferSelect) {
  return {
    id: c.id,
    listingId: c.listingId,
    collaboratorId: c.collaboratorId,
    collaboratorName: c.collaboratorName,
    collaboratorAvatarUrl: c.collaboratorAvatarUrl,
    role: c.role,
    contributionPercent: c.contributionPercent,
    socialPosted: c.socialPosted,
    addedAt: c.addedAt.toISOString(),
  };
}

// GET /api/listings/:id/collaborators
router.get("/listings/:id/collaborators", async (req, res): Promise<void> => {
  const collabs = await db
    .select()
    .from(listingCollaboratorsTable)
    .where(eq(listingCollaboratorsTable.listingId, req.params.id!));
  res.json({ collaborators: collabs.map(serialize) });
});

// POST /api/listings/:id/collaborators — add a collaborator (owner only)
router.post("/listings/:id/collaborators", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const listingId = req.params.id!;

  const [listing] = await db
    .select()
    .from(listingsTable)
    .where(and(eq(listingsTable.id, listingId), eq(listingsTable.artistId, req.user.id)));
  if (!listing) { res.status(403).json({ error: "Forbidden" }); return; }

  const { collaboratorId, collaboratorName, collaboratorAvatarUrl, role, contributionPercent } = req.body as {
    collaboratorId?: string; collaboratorName?: string; collaboratorAvatarUrl?: string;
    role?: string; contributionPercent?: number;
  };
  if (!collaboratorName?.trim()) { res.status(400).json({ error: "collaboratorName required" }); return; }

  const [collab] = await db.insert(listingCollaboratorsTable).values({
    id: crypto.randomUUID(),
    listingId,
    collaboratorId: collaboratorId || `user-${Date.now()}`,
    collaboratorName: collaboratorName.trim(),
    collaboratorAvatarUrl: collaboratorAvatarUrl || null,
    role: role?.trim() || null,
    contributionPercent: Math.min(100, Math.max(0, contributionPercent || 0)),
    socialPosted: false,
  }).returning();

  res.status(201).json(serialize(collab!));
});

// DELETE /api/listings/:id/collaborators/:collaboratorId
router.delete("/listings/:id/collaborators/:collaboratorId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const listingId = req.params.id!;

  const [listing] = await db
    .select()
    .from(listingsTable)
    .where(and(eq(listingsTable.id, listingId), eq(listingsTable.artistId, req.user.id)));
  if (!listing) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(listingCollaboratorsTable).where(
    and(eq(listingCollaboratorsTable.listingId, listingId), eq(listingCollaboratorsTable.id, req.params.collaboratorId!))
  );
  res.json({ ok: true });
});

// POST /api/listings/:id/collaborators/announce — auto-post to all collaborators' social accounts
router.post("/listings/:id/collaborators/announce", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const listingId = req.params.id!;

  const [listing] = await db
    .select()
    .from(listingsTable)
    .where(and(eq(listingsTable.id, listingId), eq(listingsTable.artistId, req.user.id)));
  if (!listing) { res.status(403).json({ error: "Forbidden" }); return; }

  const collabs = await db
    .select()
    .from(listingCollaboratorsTable)
    .where(and(eq(listingCollaboratorsTable.listingId, listingId), eq(listingCollaboratorsTable.socialPosted, false)));

  const ownerName = [req.user.firstName, req.user.lastName].filter(Boolean).join(" ") || "An artist";
  const posted: string[] = [];

  for (const collab of collabs) {
    if (!collab.collaboratorId || collab.collaboratorId.startsWith("user-")) continue;
    const contribText = collab.contributionPercent > 0 ? ` (${collab.contributionPercent}% ${collab.role || "contribution"})` : "";
    const caption = `✨ Collaboration drop — "${listing.title}" by ${ownerName} + ${collab.collaboratorName}${contribText}. Made together on Kiln 🏺`;
    try {
      await autoPostToConnectedPlatforms(collab.collaboratorId, {
        id: listingId,
        caption,
        thumbnailUrl: listing.imageUrl ?? null,
      });
      await db.update(listingCollaboratorsTable)
        .set({ socialPosted: true })
        .where(eq(listingCollaboratorsTable.id, collab.id));
      posted.push(collab.collaboratorName);
    } catch (err) {
      req.log.warn({ err, collaboratorId: collab.collaboratorId }, "collab announce post failed");
    }
  }

  res.json({ posted, total: collabs.length });
});

export default router;
