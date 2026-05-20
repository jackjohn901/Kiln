import { Router } from "express";
import { db } from "@workspace/db";
import { artworkProvenanceTable, provenanceRecordsTable } from "@workspace/db";
import { eq, desc, asc, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function serializePiece(
  piece: typeof artworkProvenanceTable.$inferSelect,
  records: (typeof provenanceRecordsTable.$inferSelect)[],
) {
  return {
    id: piece.id,
    title: piece.listingTitle,
    artistName: piece.artistName,
    artistId: piece.artistId,
    medium: piece.medium ?? "Mixed Media",
    year: String(piece.yearMade ?? new Date().getFullYear()),
    imageUrl: piece.imageUrl ?? `https://picsum.photos/seed/${piece.id}/400/300`,
    royaltyPercent: piece.royaltyPercent,
    registeredAt: piece.registeredAt.toISOString(),
    chain: records.map((r) => ({
      id: r.id,
      ownerName: r.ownerName,
      ownerId: r.ownerId,
      acquiredAt: r.acquiredAt.toISOString(),
      acquiredFor: r.acquiredFor ?? undefined,
      note: r.note ?? undefined,
      isArtist: r.isArtist ?? false,
    })),
  };
}

// GET /api/me/provenance
router.get("/me/provenance", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const pieces = await db
      .select()
      .from(artworkProvenanceTable)
      .where(eq(artworkProvenanceTable.artistId, req.user.id))
      .orderBy(desc(artworkProvenanceTable.registeredAt));

    if (pieces.length === 0) { res.json({ pieces: [] }); return; }

    const allRecords = await db
      .select()
      .from(provenanceRecordsTable)
      .where(
        eq(provenanceRecordsTable.provenanceId, pieces[0]!.id)
      );

    const recordMap: Record<string, (typeof provenanceRecordsTable.$inferSelect)[]> = {};
    for (const piece of pieces) {
      recordMap[piece.id] = [];
    }

    const pieceIds = pieces.map((p) => p.id);
    const records = await db
      .select()
      .from(provenanceRecordsTable)
      .orderBy(asc(provenanceRecordsTable.acquiredAt));

    for (const r of records) {
      if (recordMap[r.provenanceId]) {
        recordMap[r.provenanceId]!.push(r);
      }
    }

    res.json({ pieces: pieces.map((p) => serializePiece(p, recordMap[p.id] ?? [])) });
  } catch (err) {
    req.log.error({ err }, "getProvenance error");
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/me/provenance — register a piece
router.post("/me/provenance", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, medium, year, royaltyPercent, imageUrl } = req.body as {
    title?: string; medium?: string; year?: string; royaltyPercent?: string; imageUrl?: string;
  };
  if (!title?.trim()) { res.status(400).json({ error: "title required" }); return; }

  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  const id = crypto.randomUUID();
  const royalty = Math.min(25, Math.max(0, parseInt(royaltyPercent ?? "10") || 10));

  await db.insert(artworkProvenanceTable).values({
    id,
    listingId: `manual-${id}`,
    listingTitle: title.trim(),
    artistId: user.id,
    artistName: name,
    imageUrl: imageUrl?.trim() || null,
    medium: medium?.trim() || null,
    yearMade: year ? parseInt(year) : null,
    royaltyPercent: royalty,
  });

  const recordId = crypto.randomUUID();
  await db.insert(provenanceRecordsTable).values({
    id: recordId,
    provenanceId: id,
    ownerId: user.id,
    ownerName: name,
    acquiredAt: new Date(),
    note: "Piece registered at creation",
    isArtist: true,
  });

  res.status(201).json({
    id,
    title: title.trim(),
    artistName: name,
    artistId: user.id,
    medium: medium?.trim() || "Mixed Media",
    year: year || String(new Date().getFullYear()),
    imageUrl: imageUrl?.trim() || `https://picsum.photos/seed/${id}/400/300`,
    royaltyPercent: royalty,
    registeredAt: new Date().toISOString(),
    chain: [{
      id: recordId,
      ownerName: name,
      ownerId: user.id,
      acquiredAt: new Date().toISOString(),
      note: "Piece registered at creation",
      isArtist: true,
    }],
  });
});

// POST /api/me/provenance/:id/transfer — record a new ownership transfer
router.post("/me/provenance/:id/transfer", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [piece] = await db
    .select()
    .from(artworkProvenanceTable)
    .where(and(eq(artworkProvenanceTable.id, req.params.id!), eq(artworkProvenanceTable.artistId, req.user.id)));
  if (!piece) { res.status(404).json({ error: "Not found" }); return; }

  const { ownerName, acquiredFor, note } = req.body as {
    ownerName?: string; acquiredFor?: string; note?: string;
  };
  if (!ownerName?.trim()) { res.status(400).json({ error: "ownerName required" }); return; }

  const recordId = crypto.randomUUID();
  await db.insert(provenanceRecordsTable).values({
    id: recordId,
    provenanceId: piece.id,
    ownerId: ownerName.toLowerCase().replace(/\s+/g, "-"),
    ownerName: ownerName.trim(),
    acquiredAt: new Date(),
    acquiredFor: acquiredFor?.trim() || null,
    note: note?.trim() || null,
    isArtist: false,
  });

  const records = await db
    .select()
    .from(provenanceRecordsTable)
    .where(eq(provenanceRecordsTable.provenanceId, piece.id))
    .orderBy(asc(provenanceRecordsTable.acquiredAt));

  res.json(serializePiece(piece, records));
});

// GET /api/provenance/listing/:listingId — public provenance chain
router.get("/provenance/listing/:listingId", async (req, res): Promise<void> => {
  const [piece] = await db
    .select()
    .from(artworkProvenanceTable)
    .where(eq(artworkProvenanceTable.listingId, req.params.listingId!));
  if (!piece) { res.status(404).json({ error: "Not found" }); return; }

  const records = await db
    .select()
    .from(provenanceRecordsTable)
    .where(eq(provenanceRecordsTable.provenanceId, piece.id))
    .orderBy(asc(provenanceRecordsTable.acquiredAt));

  res.json(serializePiece(piece, records));
});

export default router;
