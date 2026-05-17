import { Router } from "express";
import { db } from "@workspace/db";
import { badgeDefinitionsTable, userBadgesTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

router.get("/badges", async (_req, res): Promise<void> => {
  const defs = await db.select().from(badgeDefinitionsTable).orderBy(badgeDefinitionsTable.category, badgeDefinitionsTable.rarity);
  res.json({ badges: defs });
});

router.get("/me/badges", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const earned = await db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, userId));
  if (earned.length === 0) { res.json({ badges: [] }); return; }
  const ids = earned.map(b => b.badgeId);
  const defs = await db.select().from(badgeDefinitionsTable).where(inArray(badgeDefinitionsTable.id, ids));
  const defMap = Object.fromEntries(defs.map(d => [d.id, d]));
  res.json({
    badges: earned.map(e => ({ ...defMap[e.badgeId], earnedAt: e.earnedAt })).filter(b => b.name),
  });
});

router.get("/users/:id/badges", async (req, res): Promise<void> => {
  const earned = await db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, req.params.id));
  if (earned.length === 0) { res.json({ badges: [] }); return; }
  const ids = earned.map(b => b.badgeId);
  const defs = await db.select().from(badgeDefinitionsTable).where(inArray(badgeDefinitionsTable.id, ids));
  const defMap = Object.fromEntries(defs.map(d => [d.id, d]));
  res.json({
    badges: earned.map(e => ({ ...defMap[e.badgeId], earnedAt: e.earnedAt })).filter(b => b.name),
  });
});

export async function awardBadge(userId: string, badgeId: string): Promise<boolean> {
  const existing = await db.select().from(userBadgesTable).where(eq(userBadgesTable.userId, userId)).limit(100);
  if (existing.some(b => b.badgeId === badgeId)) return false;
  await db.insert(userBadgesTable).values({ id: randomUUID(), userId, badgeId });
  return true;
}

export default router;
