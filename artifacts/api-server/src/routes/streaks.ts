import { Router } from "express";
import { db } from "@workspace/db";
import { streaksTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

export async function updateStreak(userId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId)).limit(1);
  if (existing.length === 0) {
    await db.insert(streaksTable).values({ userId, currentStreak: 1, longestStreak: 1, lastPostDate: today });
    return;
  }
  const row = existing[0];
  const last = row.lastPostDate;
  if (last === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = last === yesterday ? (row.currentStreak + 1) : 1;
  const longest = Math.max(newStreak, row.longestStreak);
  await db.update(streaksTable)
    .set({ currentStreak: newStreak, longestStreak: longest, lastPostDate: today, updatedAt: new Date() })
    .where(eq(streaksTable.userId, userId));
}

router.get("/me/streak", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const rows = await db.select().from(streaksTable).where(eq(streaksTable.userId, userId)).limit(1);
  if (rows.length === 0) { res.json({ currentStreak: 0, longestStreak: 0, lastPostDate: null }); return; }
  const row = rows[0];
  res.json({ currentStreak: row.currentStreak, longestStreak: row.longestStreak, lastPostDate: row.lastPostDate });
});

router.get("/users/:id/streak", async (req, res): Promise<void> => {
  const rows = await db.select().from(streaksTable).where(eq(streaksTable.userId, req.params.id)).limit(1);
  if (rows.length === 0) { res.json({ currentStreak: 0, longestStreak: 0 }); return; }
  const row = rows[0];
  res.json({ currentStreak: row.currentStreak, longestStreak: row.longestStreak });
});

export default router;
