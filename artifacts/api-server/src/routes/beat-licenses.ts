import { Router } from "express";
import { db } from "@workspace/db";
import { beatLicensesTable, beatsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /beats/licenses — my purchased licenses
router.get("/beats/licenses", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const licenses = await db.select().from(beatLicensesTable)
    .where(eq(beatLicensesTable.licenseeId, req.user.id));
  res.json({ licenses: licenses.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })) });
});

// GET /beats/creator-licenses — licenses for beats I created
router.get("/beats/creator-licenses", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const licenses = await db.select().from(beatLicensesTable)
    .where(eq(beatLicensesTable.creatorId, req.user.id));
  res.json({ licenses: licenses.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })) });
});

// POST /beats/:id/license — purchase or record a license
router.post("/beats/:id/license", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const beatId = req.params.id;
  const userId = req.user.id;
  // Check already licensed
  const existing = await db.select().from(beatLicensesTable)
    .where(and(eq(beatLicensesTable.beatId, beatId), eq(beatLicensesTable.licenseeId, userId)));
  if (existing.length) {
    res.json({ license: { ...existing[0], createdAt: existing[0]!.createdAt.toISOString() }, alreadyOwned: true });
    return;
  }
  // Look up beat
  const [beat] = await db.select().from(beatsTable).where(eq(beatsTable.id, beatId));
  const { licenseType, pricePaid } = req.body;
  const [license] = await db.insert(beatLicensesTable).values({
    id: crypto.randomUUID(), beatId,
    beatTitle: beat?.title ?? "Beat",
    creatorId: beat?.userId ?? "unknown",
    creatorHandle: beat?.userId ?? "unknown",
    licenseeId: userId,
    licenseType: licenseType ?? beat?.license ?? "community",
    pricePaid: pricePaid ?? 0,
  }).returning();
  res.status(201).json({ license: { ...license, createdAt: license.createdAt.toISOString() }, alreadyOwned: false });
});

// POST /beats/:id/license/use — increment use count
router.post("/beats/:id/license/use", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [license] = await db.select().from(beatLicensesTable)
    .where(and(eq(beatLicensesTable.beatId, req.params.id), eq(beatLicensesTable.licenseeId, req.user.id)));
  if (!license) { res.status(404).json({ error: "Not licensed" }); return; }
  await db.update(beatLicensesTable).set({ usageCount: license.usageCount + 1 })
    .where(eq(beatLicensesTable.id, license.id));
  res.json({ usageCount: license.usageCount + 1 });
});

export default router;
