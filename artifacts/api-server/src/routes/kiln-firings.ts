import { Router } from "express";
import { db } from "@workspace/db";
import { kilnFiringsTable } from "@workspace/db";
import { eq, desc, isNull, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /kiln-firings — active community firings + own firings
router.get("/kiln-firings", async (req, res): Promise<void> => {
  try {
    const community = await db.select().from(kilnFiringsTable)
      .where(and(eq(kilnFiringsTable.isPublic, true), isNull(kilnFiringsTable.clearedAt)))
      .orderBy(desc(kilnFiringsTable.startedAt)).limit(30);
    const userId = req.isAuthenticated() ? req.user.id : null;
    const mine = userId
      ? await db.select().from(kilnFiringsTable)
          .where(and(eq(kilnFiringsTable.userId, userId), isNull(kilnFiringsTable.clearedAt)))
          .orderBy(desc(kilnFiringsTable.startedAt)).limit(5)
      : [];
    const serialize = (f: typeof community[0]) => ({
      ...f,
      startedAt: f.startedAt.toISOString(),
      completedAt: f.completedAt?.toISOString() ?? null,
      clearedAt: f.clearedAt?.toISOString() ?? null,
    });
    res.json({ community: community.map(serialize), mine: mine.map(serialize) });
  } catch (err) {
    req.log.error({ err }, "getKilnFirings error");
    res.status(500).json({ error: "Failed" });
  }
});

// POST /kiln-firings — start a firing
router.post("/kiln-firings", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { kilnName, cone, fuel, notes, estimatedHours, pieces, isPublic } = req.body;
  if (!cone) { res.status(400).json({ error: "cone required" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  const piecesNum = Number.isFinite(Number(pieces)) ? Math.max(0, Math.min(999, Math.round(Number(pieces)))) : 0;
  const [firing] = await db.insert(kilnFiringsTable).values({
    id: crypto.randomUUID(), userId: user.id, userName: name,
    userAvatarUrl: user.profileImageUrl ?? null,
    kilnName: kilnName ?? "Studio Kiln", cone, fuel: fuel ?? "Electric",
    notes: notes ?? "", estimatedHours: estimatedHours ?? 8, pieces: piecesNum,
    isPublic: isPublic ?? true,
  }).returning();
  res.status(201).json({ ...firing, startedAt: firing.startedAt.toISOString(), completedAt: null, clearedAt: null });
});

// PATCH /kiln-firings/:id/complete
router.patch("/kiln-firings/:id/complete", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [firing] = await db.update(kilnFiringsTable)
    .set({ completedAt: new Date() })
    .where(and(eq(kilnFiringsTable.id, req.params.id), eq(kilnFiringsTable.userId, req.user.id)))
    .returning();
  if (!firing) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...firing, startedAt: firing.startedAt.toISOString(), completedAt: firing.completedAt?.toISOString() ?? null, clearedAt: null });
});

// DELETE /kiln-firings/:id — clear from feed
router.delete("/kiln-firings/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.update(kilnFiringsTable).set({ clearedAt: new Date() })
    .where(and(eq(kilnFiringsTable.id, req.params.id), eq(kilnFiringsTable.userId, req.user.id)));
  res.json({ ok: true });
});

export default router;
