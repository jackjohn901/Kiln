import { Router } from "express";
import { db } from "@workspace/db";
import { materialSourcesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /api/me/material-sources
router.get("/me/material-sources", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const sources = await db
      .select()
      .from(materialSourcesTable)
      .where(eq(materialSourcesTable.artistId, req.user.id))
      .orderBy(desc(materialSourcesTable.createdAt));
    res.json({
      sources: sources.map((s) => ({
        id: s.id,
        name: s.name,
        materialType: s.materialType,
        sourceLocation: s.sourceLocation,
        sourceDescription: s.sourceDescription,
        latitude: s.latitude ? Number(s.latitude) : null,
        longitude: s.longitude ? Number(s.longitude) : null,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "getMaterialSources error");
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/me/material-sources
router.post("/me/material-sources", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, materialType, sourceLocation, sourceDescription, latitude, longitude } = req.body as {
    name?: string; materialType?: string; sourceLocation?: string;
    sourceDescription?: string; latitude?: number; longitude?: number;
  };
  if (!name?.trim()) { res.status(400).json({ error: "name required" }); return; }

  const [source] = await db.insert(materialSourcesTable).values({
    id: crypto.randomUUID(),
    artistId: req.user.id,
    name: name.trim(),
    materialType: materialType?.trim() || null,
    sourceLocation: sourceLocation?.trim() || null,
    sourceDescription: sourceDescription?.trim() || null,
    latitude: latitude ? String(latitude) : null,
    longitude: longitude ? String(longitude) : null,
  }).returning();

  res.status(201).json({
    id: source!.id,
    name: source!.name,
    materialType: source!.materialType,
    sourceLocation: source!.sourceLocation,
    sourceDescription: source!.sourceDescription,
    latitude: source!.latitude ? Number(source!.latitude) : null,
    longitude: source!.longitude ? Number(source!.longitude) : null,
    createdAt: source!.createdAt.toISOString(),
  });
});

// DELETE /api/me/material-sources/:id
router.delete("/me/material-sources/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.delete(materialSourcesTable).where(
    and(eq(materialSourcesTable.id, req.params.id!), eq(materialSourcesTable.artistId, req.user.id))
  );
  res.json({ ok: true });
});

export default router;
